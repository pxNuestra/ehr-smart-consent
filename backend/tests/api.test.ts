import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('EHR Smart Consent API', () => {
  let patientToken: string;
  let doctorToken: string;
  let adminToken: string;
  let patientId: string;
  let doctorUserId: string;
  let recordId: string;
  let consentId: string;

  beforeAll(async () => {
    // Ensure test users exist or use seeded data
    const patientUser = await prisma.user.findFirst({ where: { role: 'PATIENT' } });
    const doctorUser = await prisma.user.findFirst({ where: { role: 'DOCTOR' } });
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    if (!patientUser || !doctorUser || !adminUser) {
      throw new Error('Run seed before tests');
    }

    const loginPatient = await request(app).post('/api/auth/login').send({
      username: patientUser.username,
      password: 'Password123!',
    });
    patientToken = loginPatient.body.token;

    const loginDoctor = await request(app).post('/api/auth/login').send({
      username: doctorUser.username,
      password: 'Password123!',
    });
    doctorToken = loginDoctor.body.token;
    doctorUserId = doctorUser.id;

    const loginAdmin = await request(app).post('/api/auth/login').send({
      username: adminUser.username,
      password: 'Password123!',
    });
    adminToken = loginAdmin.body.token;

    const patient = await prisma.patient.findFirst({ where: { userId: patientUser.id } });
    patientId = patient!.id;

    const record = await prisma.medicalRecord.findFirst({ where: { patientId } });
    recordId = record!.id;
  });

  it('should login successfully', async () => {
    const user = await prisma.user.findFirst({ where: { role: 'PATIENT' } });
    const res = await request(app).post('/api/auth/login').send({
      username: user!.username,
      password: 'Password123!',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('should enforce role guard', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(res.status).toBe(403);
  });

  it('should grant consent', async () => {
    const endTime = new Date(Date.now() + 30 * 86400000).toISOString();
    const res = await request(app)
      .post('/api/consents/grant')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        granteeUserId: doctorUserId,
        accessScope: 'full_ehr',
        purpose: 'treatment',
        endTime,
        recordId,
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    consentId = res.body.id;
  });

  it('should revoke consent', async () => {
    const res = await request(app)
      .post(`/api/consents/${consentId}/revoke`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REVOKED');
  });

  it('should verify biometric success', async () => {
    const res = await request(app)
      .post('/api/biometric/verify')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ sampleData: 'demo-fingerprint', deviceId: 'DEV-SCANNER-001' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should verify biometric failed', async () => {
    const res = await request(app)
      .post('/api/biometric/verify')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ sampleData: 'wrong-fingerprint', deviceId: 'DEV-SCANNER-001' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
  });

  it('should deny access without consent', async () => {
    const accessReq = await request(app)
      .post('/api/access-requests')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ patientId, recordId, purpose: 'treatment' });
    expect(accessReq.status).toBe(201);

    const res = await request(app)
      .post(`/api/access-requests/${accessReq.body.id}/verify-and-open`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ fingerprintSample: 'demo-fingerprint', deviceId: 'DEV-SCANNER-001' });
    expect(res.status).toBe(403);
  });

  it('should allow access with active consent', async () => {
    const endTime = new Date(Date.now() + 30 * 86400000).toISOString();
    await request(app)
      .post('/api/consents/grant')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        granteeUserId: doctorUserId,
        accessScope: 'full_ehr',
        purpose: 'treatment',
        endTime,
        recordId,
      });

    const accessReq = await request(app)
      .post('/api/access-requests')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ patientId, recordId, purpose: 'treatment' });

    const res = await request(app)
      .post(`/api/access-requests/${accessReq.body.id}/verify-and-open`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ fingerprintSample: 'demo-fingerprint', deviceId: 'DEV-SCANNER-001' });
    expect(res.status).toBe(200);
    expect(res.body.decision).toBe('ALLOWED');
    expect(res.body.ehrData).toBeDefined();
  });

  it('should deny access after revoke', async () => {
    const endTime = new Date(Date.now() + 30 * 86400000).toISOString();
    const grant = await request(app)
      .post('/api/consents/grant')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        granteeUserId: doctorUserId,
        accessScope: 'full_ehr',
        purpose: 'treatment',
        endTime,
        recordId,
      });

    await request(app)
      .post(`/api/consents/${grant.body.id}/revoke`)
      .set('Authorization', `Bearer ${patientToken}`);

    const accessReq = await request(app)
      .post('/api/access-requests')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ patientId, recordId, purpose: 'treatment' });

    const res = await request(app)
      .post(`/api/access-requests/${accessReq.body.id}/verify-and-open`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ fingerprintSample: 'demo-fingerprint', deviceId: 'DEV-SCANNER-001' });
    expect(res.status).toBe(403);
  });

  it('should create audit log on login', async () => {
    const before = await prisma.auditLog.count({ where: { action: 'LOGIN' } });
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    await request(app).post('/api/auth/login').send({
      username: user!.username,
      password: 'Password123!',
    });
    const after = await prisma.auditLog.count({ where: { action: 'LOGIN' } });
    expect(after).toBeGreaterThan(before);
  });
});
