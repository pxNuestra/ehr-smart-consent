import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Wajib login dulu' });
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token tidak valid atau sudah kedaluwarsa' });
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Wajib login dulu' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Akses ditolak, peran tidak cukup' });
    }
    next();
  };
}

export async function createAuditLog(params: {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  decision: string;
  reason?: string;
  metadataHash: string;
  txHash?: string;
}) {
  return prisma.auditLog.create({ data: params });
}
