import { Router } from 'express';
import { z } from 'zod';
import { ConsentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, createAuditLog } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { metadataHash, pseudonymousId } from '../utils/crypto';
import { paramId } from '../utils/params';
import {
  grantAccessOnChain,
  limitAccessOnChain,
  revokeAccessOnChain,
  checkConsentOnChain,
} from '../blockchain/service';

const router = Router();

const grantSchema = z.object({
  granteeUserId: z.string().uuid(),
  accessScope: z.string().min(1),
  purpose: z.string().min(1),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime(),
  recordId: z.string().uuid().optional(),
});

const limitSchema = z.object({
  limitationType: z.enum(['endTime', 'dataType', 'purpose']),
  newValue: z.string().min(1),
});

router.use(authenticate);

router.post('/grant', authorize('PATIENT'), validateBody(grantSchema), async (req, res) => {
  const patient = await prisma.patient.findUnique({ where: { userId: req.user!.id } });
  if (!patient) return res.status(404).json({ error: 'Profil pasien tidak ditemukan' });

  const grantee = await prisma.user.findUnique({ where: { id: req.body.granteeUserId } });
  if (!grantee || grantee.role !== 'DOCTOR') {
    return res.status(400).json({ error: 'Penerima akses harus dokter' });
  }

  let recordHash = metadataHash({ patientId: patient.id, scope: req.body.accessScope });
  if (req.body.recordId) {
    const record = await prisma.medicalRecord.findUnique({ where: { id: req.body.recordId } });
    if (!record || record.patientId !== patient.id) {
      return res.status(400).json({ error: 'Rekam medis tidak valid' });
    }
    recordHash = record.recordHash;
  }

  const startTime = req.body.startTime ? new Date(req.body.startTime) : new Date();
  const endTime = new Date(req.body.endTime);
  if (endTime <= startTime) return res.status(400).json({ error: 'Waktu akhir harus setelah waktu mulai' });

  const meta = {
    patientId: patient.id,
    granteeUserId: req.body.granteeUserId,
    accessScope: req.body.accessScope,
    purpose: req.body.purpose,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  };
  const metaHash = metadataHash(meta);

  const patientPseudo = pseudonymousId('patient', patient.id);
  const requesterPseudo = pseudonymousId('doctor', req.body.granteeUserId);

  const { txHash, consentId } = await grantAccessOnChain({
    patientId: patientPseudo,
    requesterId: requesterPseudo,
    role: 'Doctor',
    dataType: req.body.accessScope,
    purpose: req.body.purpose,
    startTime: Math.floor(startTime.getTime() / 1000),
    endTime: Math.floor(endTime.getTime() / 1000),
    recordHash: recordHash,
    metadataHash: metaHash,
  });

  const consent = await prisma.consentShadow.create({
    data: {
      blockchainConsentId: consentId,
      patientId: patient.id,
      granteeUserId: req.body.granteeUserId,
      accessScope: req.body.accessScope,
      purpose: req.body.purpose,
      startTime,
      endTime,
      status: ConsentStatus.ACTIVE,
      recordHash,
      metadataHash: metaHash,
      txHash,
    },
    include: {
      grantee: { select: { username: true, email: true } },
    },
  });

  await createAuditLog({
    actorUserId: req.user!.id,
    action: 'GRANT_CONSENT',
    targetType: 'consent',
    targetId: consent.id,
    decision: 'ALLOWED',
    metadataHash: metaHash,
    txHash,
  });

  res.status(201).json(consent);
});

router.put('/:id/limit', authorize('PATIENT'), validateBody(limitSchema), async (req, res) => {
  const patient = await prisma.patient.findUnique({ where: { userId: req.user!.id } });
  const consent = await prisma.consentShadow.findUnique({ where: { id: paramId(req.params.id) } });
  if (!consent || consent.patientId !== patient?.id) {
    return res.status(404).json({ error: 'Consent tidak ditemukan' });
  }
  if (consent.status === 'REVOKED') {
    return res.status(400).json({ error: 'Consent already revoked' });
  }

  const txHash = await limitAccessOnChain(
    consent.blockchainConsentId,
    req.body.limitationType,
    req.body.newValue
  );

  const updateData: Record<string, unknown> = { status: ConsentStatus.LIMITED, txHash };
  if (req.body.limitationType === 'endTime') updateData.endTime = new Date(parseInt(req.body.newValue) * 1000);
  if (req.body.limitationType === 'purpose') updateData.purpose = req.body.newValue;
  if (req.body.limitationType === 'dataType') updateData.accessScope = req.body.newValue;

  const updated = await prisma.consentShadow.update({
    where: { id: consent.id },
    data: updateData,
  });

  await createAuditLog({
    actorUserId: req.user!.id,
    action: 'LIMIT_CONSENT',
    targetType: 'consent',
    targetId: consent.id,
    decision: 'ALLOWED',
    metadataHash: metadataHash(req.body),
    txHash,
  });

  res.json(updated);
});

router.post('/:id/revoke', authorize('PATIENT'), async (req, res) => {
  const patient = await prisma.patient.findUnique({ where: { userId: req.user!.id } });
  const consent = await prisma.consentShadow.findUnique({ where: { id: paramId(req.params.id) } });
  if (!consent || consent.patientId !== patient?.id) {
    return res.status(404).json({ error: 'Consent tidak ditemukan' });
  }

  const txHash = await revokeAccessOnChain(consent.blockchainConsentId);
  const updated = await prisma.consentShadow.update({
    where: { id: consent.id },
    data: { status: ConsentStatus.REVOKED, txHash },
  });

  await createAuditLog({
    actorUserId: req.user!.id,
    action: 'REVOKE_CONSENT',
    targetType: 'consent',
    targetId: consent.id,
    decision: 'ALLOWED',
    metadataHash: metadataHash({ consentId: consent.id }),
    txHash,
  });

  res.json(updated);
});

router.get('/patient/:patientId', authorize('PATIENT', 'DOCTOR', 'ADMIN', 'AUDITOR'), async (req, res) => {
  if (req.user!.role === 'PATIENT') {
    const own = await prisma.patient.findUnique({ where: { userId: req.user!.id } });
    if (own?.id !== paramId(req.params.patientId)) return res.status(403).json({ error: 'Akses ditolak' });
  }

  const consents = await prisma.consentShadow.findMany({
    where: { patientId: paramId(req.params.patientId) },
    include: { grantee: { select: { id: true, username: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();
  const enriched = consents.map((c: { status: ConsentStatus; endTime: Date; [key: string]: unknown }) => {
    let status = c.status;
    if (status === 'ACTIVE' && c.endTime < now) status = ConsentStatus.EXPIRED;
    return { ...c, status };
  });

  res.json(enriched);
});

router.get('/check', authorize('DOCTOR', 'ADMIN'), async (req, res) => {
  const { patientId, granteeUserId, dataType, purpose } = req.query;
  if (!patientId || !granteeUserId || !dataType || !purpose) {
    return res.status(400).json({ error: 'Missing query parameters' });
  }

  const patientPseudo = pseudonymousId('patient', patientId as string);
  const requesterPseudo = pseudonymousId('doctor', granteeUserId as string);

  const result = await checkConsentOnChain({
    patientId: patientPseudo,
    requesterId: requesterPseudo,
    role: 'Doctor',
    dataType: dataType as string,
    purpose: purpose as string,
    timestamp: Math.floor(Date.now() / 1000),
  });

  res.json(result);
});

export default router;
