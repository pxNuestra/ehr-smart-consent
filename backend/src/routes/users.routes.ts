import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, createAuditLog } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { paramId } from '../utils/params';
import { metadataHash } from '../utils/crypto';

const router = Router();

const userSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(UserRole),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

router.use(authenticate);

router.get('/', authorize('ADMIN'), async (req, res) => {
  const { search, role, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { username: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
    ];
  }
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit as string),
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);
  res.json({ data: users, total, page: parseInt(page as string), limit: parseInt(limit as string) });
});

router.post('/', authorize('ADMIN'), validateBody(userSchema), async (req, res) => {
  const { username, email, password, role, status } = req.body;
  const passwordHash = await bcrypt.hash(password || 'Password123!', 12);
  const user = await prisma.user.create({
    data: { username, email, passwordHash, role, status: status || 'ACTIVE' },
    select: { id: true, username: true, email: true, role: true, status: true },
  });
  await createAuditLog({
    actorUserId: req.user!.id,
    action: 'CREATE_USER',
    targetType: 'user',
    targetId: user.id,
    decision: 'ALLOWED',
    metadataHash: metadataHash({ username, role }),
  });
  res.status(201).json(user);
});

router.put('/:id', authorize('ADMIN'), async (req, res) => {
  const { username, email, role, status, password } = req.body;
  const data: Record<string, unknown> = {};
  if (username) data.username = username;
  if (email) data.email = email;
  if (role) data.role = role;
  if (status) data.status = status;
  if (password) data.passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.update({
    where: { id: paramId(req.params.id) },
    data,
    select: { id: true, username: true, email: true, role: true, status: true },
  });
  res.json(user);
});

router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  await prisma.user.delete({ where: { id: paramId(req.params.id) } });
  res.json({ message: 'User deleted' });
});

export default router;
