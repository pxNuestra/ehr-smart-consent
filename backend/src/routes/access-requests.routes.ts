import { Router } from 'express';
import { z } from 'zod';
import { AccessDecision, AccessRequestStatus, BiometricStatus, ConsentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, createAuditLog } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { decrypt, metadataHash, pseudonymousId } from '../utils/crypto';
import { checkConsentOnChain, logAccessOnChain } from '../blockchain/service';
import { verifyFingerprint } from '../services/fingerprint.service';
import { paramId } from '../utils/params';

const router = Router();

const requestSchema = z.object({
  patientId: z.string().uuid(),
  recordId: z.string().uuid(),
  purpose: z.string().min(1),
  reason: z.string().optional(),
});

const verifyOpenSchema = z.object({
  fingerprintSample: z.string().min(1),
  deviceId: z.string().min(1),
});

router.use(authenticate);

router.post('/', authorize('DOCTOR'), validateBody(requestSchema), async (req, res) => {
  const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.id } });
  if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

  const record = await prisma.medicalRecord.findUnique({ where: { id: req.body.recordId } });
  if (!record || record.patientId !== req.body.patientId) {
    return res.status(400).json({ error: 'Invalid record for patient' });
  }

  const request = await prisma.accessRequest.create({
    data: {
      requesterUserId: req.user!.id,
      patientId: req.body.patientId,
      recordId: req.body.recordId,
      purpose: req.body.purpose,
      reason: req.body.reason,
      status: AccessRequestStatus.PENDING,
    },
    include: {
      patient: { select: { patientCode: true } },
      record: { select: { recordCode: true, recordDate: true } },
    },
  });

  res.status(201).json(request);
});

router.get('/', authorize('DOCTOR', 'PATIENT', 'ADMIN', 'AUDITOR'), async (req, res) => {
  const { status, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  if (req.user!.role === 'DOCTOR') where.requesterUserId = req.user!.id;
  if (req.user!.role === 'PATIENT') {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user!.id } });
    if (patient) where.patientId = patient.id;
  }

  const [data, total] = await Promise.all([
    prisma.accessRequest.findMany({
      where,
      skip,
      take: parseInt(limit as string),
      include: {
        patient: { select: { id: true, patientCode: true } },
        record: { select: { id: true, recordCode: true, recordDate: true } },
        requester: { select: { username: true } },
      },
      orderBy: { requestTime: 'desc' },
    }),
    prisma.accessRequest.count({ where }),
  ]);

  res.json({ data, total, page: parseInt(page as string) });
});

router.get('/:id', authorize('DOCTOR', 'PATIENT', 'ADMIN', 'AUDITOR'), async (req, res) => {
  const request = await prisma.accessRequest.findUnique({
    where: { id: paramId(req.params.id) },
    include: {
      patient: { select: { id: true, patientCode: true } },
      record: { select: { id: true, recordCode: true, recordDate: true } },
      requester: { select: { username: true } },
      accessLogs: true,
    },
  });
  if (!request) return res.status(404).json({ error: 'Request not found' });
  res.json(request);
});

router.post('/:id/verify-and-open', authorize('DOCTOR'), validateBody(verifyOpenSchema), async (req, res) => {
  const accessRequest = await prisma.accessRequest.findUnique({
    where: { id: paramId(req.params.id) },
    include: {
      record: true,
      patient: true,
    },
  });
  if (!accessRequest) return res.status(404).json({ error: 'Request not found' });
  if (accessRequest.requesterUserId !== req.user!.id) {
    return res.status(403).json({ error: 'Not your access request' });
  }

  const fpResult = await verifyFingerprint(
    req.user!.id,
    req.body.fingerprintSample,
    req.body.deviceId
  );

  const biometricStatus = fpResult.success ? BiometricStatus.VERIFIED : BiometricStatus.FAILED;
  let decision: AccessDecision = AccessDecision.DENIED;
  let reason = fpResult.reason;
  let ehrData = null;

  if (!fpResult.success) {
    reason = 'Fingerprint failed';
  } else {
    const patientPseudo = pseudonymousId('patient', accessRequest.patientId);
    const requesterPseudo = pseudonymousId('doctor', req.user!.id);

    const shadowConsent = await prisma.consentShadow.findFirst({
      where: {
        patientId: accessRequest.patientId,
        granteeUserId: req.user!.id,
        purpose: accessRequest.purpose,
        status: { in: [ConsentStatus.ACTIVE, ConsentStatus.LIMITED] },
        startTime: { lte: new Date() },
        endTime: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    const consentCheck = await checkConsentOnChain({
      patientId: patientPseudo,
      requesterId: requesterPseudo,
      role: 'Doctor',
      dataType: shadowConsent?.accessScope || 'full_ehr',
      purpose: accessRequest.purpose,
      timestamp: Math.floor(Date.now() / 1000),
    });

    if (!shadowConsent) {
      reason = 'No active consent';
    } else if (shadowConsent.status === ConsentStatus.REVOKED) {
      reason = 'Consent revoked';
    } else if (shadowConsent.endTime < new Date()) {
      reason = 'Consent expired';
    } else if (!consentCheck.allowed && consentCheck.reason !== 'Blockchain unavailable') {
      reason = consentCheck.reason;
    } else {
      decision = AccessDecision.ALLOWED;
      reason = 'Access granted';
      ehrData = {
        id: accessRequest.record.id,
        recordCode: accessRequest.record.recordCode,
        recordDate: accessRequest.record.recordDate,
        diagnosis: decrypt(accessRequest.record.diagnosisEncrypted),
        treatment: decrypt(accessRequest.record.treatmentEncrypted),
        prescription: decrypt(accessRequest.record.prescriptionEncrypted),
        labResult: decrypt(accessRequest.record.labResultEncrypted),
        visitNote: decrypt(accessRequest.record.visitNoteEncrypted),
        accessScope: shadowConsent.accessScope,
      };
    }
  }

  const metaHash = metadataHash({
    requestId: accessRequest.id,
    biometricStatus,
    decision,
    reason,
  });

  let txHash: string | null = null;
  if (fpResult.success) {
    txHash = await logAccessOnChain({
      patientId: pseudonymousId('patient', accessRequest.patientId),
      requesterId: pseudonymousId('doctor', req.user!.id),
      dataType: 'full_ehr',
      purpose: accessRequest.purpose,
      biometricStatus: biometricStatus,
      decision: decision,
      metadataHash: metaHash,
    });
  }

  await prisma.accessLog.create({
    data: {
      requestId: accessRequest.id,
      actorUserId: req.user!.id,
      patientId: accessRequest.patientId,
      recordId: accessRequest.recordId,
      biometricStatus,
      consentStatus: decision === AccessDecision.ALLOWED ? 'ACTIVE' : reason || 'DENIED',
      decision,
      reason,
      metadataHash: metaHash,
      txHash,
    },
  });

  await prisma.accessRequest.update({
    where: { id: accessRequest.id },
    data: {
      status: decision === AccessDecision.ALLOWED ? AccessRequestStatus.COMPLETED : AccessRequestStatus.DENIED,
      reason,
    },
  });

  await createAuditLog({
    actorUserId: req.user!.id,
    action: 'ACCESS_EHR',
    targetType: 'medical_record',
    targetId: accessRequest.recordId,
    decision: decision,
    reason,
    metadataHash: metaHash,
    txHash: txHash || undefined,
  });

  if (decision === AccessDecision.DENIED) {
    return res.status(403).json({ error: reason, decision, biometricStatus });
  }

  res.json({ decision, ehrData, txHash, biometricStatus });
});

export default router;
