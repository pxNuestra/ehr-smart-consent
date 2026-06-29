import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { authenticate, createAuditLog } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { metadataHash } from '../utils/crypto';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['PATIENT', 'DOCTOR', 'ADMIN', 'AUDITOR']).optional(),
});

router.post('/login', validateBody(loginSchema), async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: username }] },
  });
  if (!user || user.status !== 'ACTIVE') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
  );

  await createAuditLog({
    actorUserId: user.id,
    action: 'LOGIN',
    targetType: 'user',
    targetId: user.id,
    decision: 'ALLOWED',
    metadataHash: metadataHash({ username }),
  });

  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
});

router.post('/logout', authenticate, async (req, res) => {
  await createAuditLog({
    actorUserId: req.user!.id,
    action: 'LOGOUT',
    targetType: 'user',
    targetId: req.user!.id,
    decision: 'ALLOWED',
    metadataHash: metadataHash({ action: 'logout' }),
  });
  res.json({ message: 'Logged out' });
});

router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, username: true, email: true, role: true, status: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  let profile = null;
  if (user.role === 'PATIENT') {
    profile = await prisma.patient.findUnique({ where: { userId: user.id } });
  } else if (user.role === 'DOCTOR') {
    profile = await prisma.doctor.findUnique({ where: { userId: user.id } });
  }

  res.json({ ...user, profile });
});

router.post('/register', validateBody(registerSchema), async (req, res) => {
  const setupMode = process.env.SETUP_MODE === 'true' || process.env.NODE_ENV === 'development';
  if (!setupMode) {
    return res.status(403).json({ error: 'Registration disabled. Contact admin.' });
  }

  const { username, email, password, role } = req.body;
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) return res.status(409).json({ error: 'User already exists' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      role: role || 'ADMIN',
    },
    select: { id: true, username: true, email: true, role: true },
  });

  res.status(201).json(user);
});

export default router;
