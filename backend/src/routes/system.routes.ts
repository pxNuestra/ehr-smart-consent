import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { getBlockchainService } from '../blockchain/service';

const router = Router();

router.get('/health', async (_req, res) => {
  let dbStatus = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  const { available } = getBlockchainService();

  res.json({
    status: dbStatus === 'ok' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      blockchain: available ? 'connected' : 'unavailable',
    },
    version: '1.0.0',
  });
});

router.get('/config', authenticate, authorize('ADMIN'), async (_req, res) => {
  const configs = await prisma.systemConfig.findMany();
  res.json(configs);
});

router.put('/config', authenticate, authorize('ADMIN'), async (req, res) => {
  const { key, value } = req.body;
  const config = await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  res.json(config);
});

export default router;
