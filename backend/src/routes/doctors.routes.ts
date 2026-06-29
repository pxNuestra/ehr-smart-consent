import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { paramId } from '../utils/params';

const router = Router();
router.use(authenticate);

router.get('/', authorize('ADMIN', 'PATIENT', 'DOCTOR'), async (_req, res) => {
  const doctors = await prisma.doctor.findMany({
    include: { user: { select: { id: true, username: true, email: true, status: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(doctors.map((d: { id: string; userId: string; specialty: string; licenseDummy: string; user: { username: string; email: string; status: string } }) => ({
    id: d.id,
    userId: d.userId,
    specialty: d.specialty,
    licenseDummy: d.licenseDummy,
    username: d.user.username,
    email: d.user.email,
    status: d.user.status,
  })));
});

router.get('/:id', authorize('ADMIN', 'PATIENT', 'DOCTOR'), async (req, res) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: paramId(req.params.id) },
    include: { user: { select: { id: true, username: true, email: true } } },
  });
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
  res.json({
    id: doctor.id,
    userId: doctor.userId,
    specialty: doctor.specialty,
    licenseDummy: doctor.licenseDummy,
    user: doctor.user,
  });
});

export default router;
