import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, createAuditLog } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { enrollFingerprint, verifyFingerprint } from '../services/fingerprint.service';

const router = Router();

const enrollSchema = z.object({
  sampleData: z.string().min(1),
  deviceId: z.string().min(1),
});

const verifySchema = z.object({
  sampleData: z.string().min(1),
  deviceId: z.string().min(1),
});

router.use(authenticate);

router.post('/enroll', validateBody(enrollSchema), async (req, res) => {
  const result = await enrollFingerprint(req.user!.id, req.body.sampleData, req.body.deviceId);
  if (!result.success) return res.status(400).json({ error: 'Enrollment failed' });
  res.status(201).json(result);
});

router.post('/verify', validateBody(verifySchema), async (req, res) => {
  const result = await verifyFingerprint(req.user!.id, req.body.sampleData, req.body.deviceId);
  res.json(result);
});

router.get('/logs', authorize('ADMIN', 'AUDITOR', 'DOCTOR'), async (req, res) => {
  const { userId, status, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (req.user!.role === 'DOCTOR') where.userId = req.user!.id;

  const [logs, total] = await Promise.all([
    prisma.biometricLog.findMany({
      where,
      skip,
      take: parseInt(limit as string),
      include: { user: { select: { username: true, role: true } } },
      orderBy: { attemptTime: 'desc' },
    }),
    prisma.biometricLog.count({ where }),
  ]);
  res.json({ data: logs, total });
});

export default router;
