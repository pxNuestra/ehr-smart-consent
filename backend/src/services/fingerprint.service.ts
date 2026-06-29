import crypto from 'crypto';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { hashData } from '../utils/crypto';

export interface FingerprintVerifyResult {
  success: boolean;
  reason: string;
  templateId?: string;
}

export interface FingerprintEnrollResult {
  success: boolean;
  templateId: string;
  fingerprintHash: string;
}

class DevelopmentFingerprintAdapter {
  async enroll(userId: string, sampleData: string, deviceId: string): Promise<FingerprintEnrollResult> {
    const templateId = `TPL-${userId.slice(0, 8)}-${Date.now()}`;
    const fingerprintHash = hashData(`${userId}:${sampleData}:${deviceId}`);
    return { success: true, templateId, fingerprintHash };
  }

  async verify(userId: string, sampleData: string, deviceId: string): Promise<FingerprintVerifyResult> {
    const template = await prisma.fingerprintTemplate.findFirst({
      where: { userId },
      orderBy: { enrolledAt: 'desc' },
    });

    if (!template) {
      return { success: false, reason: 'Sidik jari belum terdaftar' };
    }

    const expectedHash = hashData(`${userId}:${sampleData}:${deviceId}`);
    const altHash = hashData(`${userId}:demo-fingerprint:${deviceId}`);

    if (expectedHash === template.fingerprintHash || altHash === template.fingerprintHash) {
      return { success: true, reason: 'Sidik jari terverifikasi', templateId: template.templateId };
    }

    // Allow "demo-fingerprint" as universal dev sample
    if (sampleData === 'demo-fingerprint') {
      return { success: true, reason: 'Sidik jari demo terverifikasi', templateId: template.templateId };
    }

    return { success: false, reason: 'Sidik jari gagal, tidak cocok' };
  }
}

class ProductionFingerprintAdapter {
  async enroll(userId: string, sampleData: string, deviceId: string): Promise<FingerprintEnrollResult> {
    // Production: integrate with vendor SDK via sampleData (template from scanner)
    const templateId = `PROD-TPL-${crypto.randomUUID()}`;
    const fingerprintHash = hashData(sampleData);
    return { success: true, templateId, fingerprintHash };
  }

  async verify(userId: string, sampleData: string, deviceId: string): Promise<FingerprintVerifyResult> {
    const template = await prisma.fingerprintTemplate.findFirst({
      where: { userId, deviceId },
      orderBy: { enrolledAt: 'desc' },
    });
    if (!template) return { success: false, reason: 'Sidik jari belum terdaftar untuk device ini' };
    const scanHash = hashData(sampleData);
    if (scanHash === template.fingerprintHash) {
      return { success: true, reason: 'Sidik jari terverifikasi', templateId: template.templateId };
    }
    return { success: false, reason: 'Sidik jari gagal, tidak cocok' };
  }
}

const adapter =
  config.fingerprintMode === 'production'
    ? new ProductionFingerprintAdapter()
    : new DevelopmentFingerprintAdapter();

export async function enrollFingerprint(
  userId: string,
  sampleData: string,
  deviceId: string
): Promise<FingerprintEnrollResult> {
  const result = await adapter.enroll(userId, sampleData, deviceId);
  if (result.success) {
    await prisma.fingerprintTemplate.create({
      data: {
        userId,
        templateId: result.templateId,
        fingerprintHash: result.fingerprintHash,
        deviceId,
      },
    });
    await prisma.biometricLog.create({
      data: { userId, status: 'ENROLLED', deviceId, reason: 'Sidik jari terdaftar' },
    });
  }
  return result;
}

export async function verifyFingerprint(
  userId: string,
  sampleData: string,
  deviceId: string
): Promise<FingerprintVerifyResult> {
  const result = await adapter.verify(userId, sampleData, deviceId);
  await prisma.biometricLog.create({
    data: {
      userId,
      status: result.success ? 'VERIFIED' : 'FAILED',
      deviceId,
      reason: result.reason,
    },
  });
  return result;
}
