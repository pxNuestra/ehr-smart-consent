import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { getTransactionReceipt } from '../blockchain/service';

const router = Router();
router.use(authenticate, authorize('AUDITOR', 'ADMIN'));

router.get('/logs', async (req, res) => {
  const {
    startDate,
    endDate,
    role,
    biometricStatus,
    consentStatus,
    decision,
    page = '1',
    limit = '20',
  } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const where: Record<string, unknown> = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate as string);
    if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate as string);
  }
  if (decision) where.decision = decision;

  const [auditLogs, accessLogs, auditTotal, accessTotal] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: parseInt(limit as string),
      include: { actor: { select: { username: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.accessLog.findMany({
      where: {
        ...(biometricStatus ? { biometricStatus: biometricStatus as never } : {}),
        ...(consentStatus ? { consentStatus: consentStatus as string } : {}),
        ...(decision ? { decision: decision as never } : {}),
        ...(startDate || endDate
          ? {
              timestamp: {
                ...(startDate ? { gte: new Date(startDate as string) } : {}),
                ...(endDate ? { lte: new Date(endDate as string) } : {}),
              },
            }
          : {}),
      },
      skip,
      take: parseInt(limit as string),
      include: {
        actor: { select: { username: true, role: true } },
        patient: { select: { patientCode: true } },
      },
      orderBy: { timestamp: 'desc' },
    }),
    prisma.auditLog.count({ where }),
    prisma.accessLog.count(),
  ]);

  let filteredAccess = accessLogs;
  if (role) {
    filteredAccess = accessLogs.filter((l: { actor: { role: string } }) => l.actor.role === role);
  }

  res.json({
    auditLogs: { data: auditLogs, total: auditTotal },
    accessLogs: { data: filteredAccess, total: accessTotal },
    page: parseInt(page as string),
    limit: parseInt(limit as string),
  });
});

router.get('/transactions/:txHash', async (req, res) => {
  const { txHash } = req.params;

  const [auditEntries, accessEntries, receipt] = await Promise.all([
    prisma.auditLog.findMany({ where: { txHash }, include: { actor: { select: { username: true, role: true } } } }),
    prisma.accessLog.findMany({ where: { txHash }, include: { actor: { select: { username: true } } } }),
    getTransactionReceipt(txHash),
  ]);

  const consentEntries = await prisma.consentShadow.findMany({
    where: { txHash },
    select: {
      id: true,
      blockchainConsentId: true,
      accessScope: true,
      purpose: true,
      status: true,
      txHash: true,
      metadataHash: true,
      startTime: true,
      endTime: true,
    },
  });

  res.json({
    txHash,
    receipt,
    auditEntries,
    accessEntries,
    consentEntries,
  });
});

export default router;
