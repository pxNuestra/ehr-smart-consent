import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, createAuditLog } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { paramId } from '../utils/params';
import { decrypt, encrypt, hashData, metadataHash } from '../utils/crypto';

const router = Router();

const ehrSchema = z.object({
  patientId: z.string().uuid(),
  diagnosis: z.string().min(1),
  treatment: z.string().min(1),
  prescription: z.string().optional(),
  labResult: z.string().optional(),
  visitNote: z.string().optional(),
  recordDate: z.string().datetime().optional(),
});

router.use(authenticate);

router.get('/patient/:patientId', authorize('DOCTOR', 'PATIENT', 'ADMIN'), async (req, res) => {
  if (req.user!.role === 'PATIENT') {
    const own = await prisma.patient.findUnique({ where: { userId: req.user!.id } });
    if (own?.id !== paramId(req.params.patientId)) return res.status(403).json({ error: 'Forbidden' });
    // Patients see metadata only, not decrypted clinical data via this endpoint
    const records = await prisma.medicalRecord.findMany({
      where: { patientId: paramId(req.params.patientId) },
      select: {
        id: true,
        recordCode: true,
        recordDate: true,
        recordHash: true,
        createdAt: true,
      },
    });
    return res.json(records);
  }

  if (req.user!.role === 'ADMIN') {
    return res.status(403).json({
      error: 'Admin cannot access clinical data',
      message: 'Administrators manage accounts only, not patient clinical records.',
    });
  }

  // Doctors need consent flow - return metadata only
  const records = await prisma.medicalRecord.findMany({
    where: { patientId: paramId(req.params.patientId) },
    select: {
      id: true,
      recordCode: true,
      recordDate: true,
      recordHash: true,
      createdAt: true,
    },
  });
  res.json(records);
});

router.post('/', authorize('DOCTOR', 'ADMIN'), validateBody(ehrSchema), async (req, res) => {
  const doctor = await prisma.doctor.findUnique({ where: { userId: req.user!.id } });
  const recordCode = `REC-${Date.now()}`;
  const clinical = {
    diagnosis: req.body.diagnosis,
    treatment: req.body.treatment,
    prescription: req.body.prescription || '',
    labResult: req.body.labResult || '',
    visitNote: req.body.visitNote || '',
  };
  const recordHash = hashData(JSON.stringify(clinical));

  const record = await prisma.medicalRecord.create({
    data: {
      patientId: req.body.patientId,
      recordCode,
      diagnosisEncrypted: encrypt(clinical.diagnosis),
      treatmentEncrypted: encrypt(clinical.treatment),
      prescriptionEncrypted: encrypt(clinical.prescription),
      labResultEncrypted: encrypt(clinical.labResult),
      visitNoteEncrypted: encrypt(clinical.visitNote),
      recordHash,
      recordDate: req.body.recordDate ? new Date(req.body.recordDate) : new Date(),
      createdByDoctorId: doctor?.id,
    },
    select: { id: true, recordCode: true, recordHash: true, recordDate: true, createdAt: true },
  });

  await createAuditLog({
    actorUserId: req.user!.id,
    action: 'CREATE_EHR',
    targetType: 'medical_record',
    targetId: record.id,
    decision: 'ALLOWED',
    metadataHash: metadataHash({ recordCode, recordHash }),
  });

  res.status(201).json(record);
});

router.put('/:id', authorize('DOCTOR'), async (req, res) => {
  const existing = await prisma.medicalRecord.findUnique({ where: { id: paramId(req.params.id) } });
  if (!existing) return res.status(404).json({ error: 'Record not found' });

  const clinical = {
    diagnosis: req.body.diagnosis ? req.body.diagnosis : decrypt(existing.diagnosisEncrypted),
    treatment: req.body.treatment ? req.body.treatment : decrypt(existing.treatmentEncrypted),
    prescription: req.body.prescription ?? decrypt(existing.prescriptionEncrypted),
    labResult: req.body.labResult ?? decrypt(existing.labResultEncrypted),
    visitNote: req.body.visitNote ?? decrypt(existing.visitNoteEncrypted),
  };

  const recordHash = hashData(JSON.stringify(clinical));
  const record = await prisma.medicalRecord.update({
    where: { id: paramId(req.params.id) },
    data: {
      diagnosisEncrypted: encrypt(clinical.diagnosis),
      treatmentEncrypted: encrypt(clinical.treatment),
      prescriptionEncrypted: encrypt(clinical.prescription),
      labResultEncrypted: encrypt(clinical.labResult),
      visitNoteEncrypted: encrypt(clinical.visitNote),
      recordHash,
    },
    select: { id: true, recordCode: true, recordHash: true, recordDate: true },
  });
  res.json(record);
});

router.get('/:id/hash', authorize('DOCTOR', 'PATIENT', 'AUDITOR'), async (req, res) => {
  const record = await prisma.medicalRecord.findUnique({
    where: { id: paramId(req.params.id) },
    select: { id: true, recordCode: true, recordHash: true, recordDate: true },
  });
  if (!record) return res.status(404).json({ error: 'Record not found' });
  res.json(record);
});

export default router;
