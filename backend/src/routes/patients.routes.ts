import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { paramId } from '../utils/params';

const router = Router();
router.use(authenticate);

router.get('/', authorize('ADMIN', 'DOCTOR', 'PATIENT', 'AUDITOR'), async (_req, res) => {
  const patients = await prisma.patient.findMany({
    include: {
      user: { select: { id: true, username: true, email: true, status: true } },
      _count: { select: { medicalRecords: true, consents: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(patients.map((p: { id: string; patientCode: string; gender: string; age: number; user: { username: string; email: string; status: string }; _count: { medicalRecords: number; consents: number } }) => ({
    id: p.id,
    patientCode: p.patientCode,
    gender: p.gender,
    age: p.age,
    username: p.user.username,
    email: p.user.email,
    status: p.user.status,
    recordCount: p._count.medicalRecords,
    consentCount: p._count.consents,
  })));
});

router.get('/:id', authorize('ADMIN', 'DOCTOR', 'PATIENT'), async (req, res) => {
  const patient = await prisma.patient.findUnique({
    where: { id: paramId(req.params.id) },
    include: { user: { select: { id: true, username: true, email: true, role: true } } },
  });
  if (!patient) return res.status(404).json({ error: 'Pasien tidak ditemukan' });
  if (req.user!.role === 'PATIENT') {
    const own = await prisma.patient.findUnique({ where: { userId: req.user!.id } });
    if (own?.id !== patient.id) return res.status(403).json({ error: 'Akses ditolak' });
  }
  res.json({
    id: patient.id,
    patientCode: patient.patientCode,
    gender: patient.gender,
    age: patient.age,
    user: patient.user,
  });
});

router.post('/', authorize('ADMIN'), async (req, res) => {
  const { userId, patientCode, gender, age } = req.body;
  const patient = await prisma.patient.create({
    data: { userId, patientCode, gender, age },
  });
  res.status(201).json(patient);
});

router.put('/:id', authorize('ADMIN', 'PATIENT'), async (req, res) => {
  const { gender, age } = req.body;
  if (req.user!.role === 'PATIENT') {
    const own = await prisma.patient.findUnique({ where: { userId: req.user!.id } });
    if (own?.id !== paramId(req.params.id)) return res.status(403).json({ error: 'Akses ditolak' });
  }
  const patient = await prisma.patient.update({
    where: { id: paramId(req.params.id) },
    data: { gender, age },
  });
  res.json(patient);
});

export default router;
