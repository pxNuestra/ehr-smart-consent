export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'AUDITOR';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  profile?: Record<string, unknown>;
}

export interface Consent {
  id: string;
  blockchainConsentId: number;
  patientId: string;
  granteeUserId: string;
  accessScope: string;
  purpose: string;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'LIMITED' | 'REVOKED' | 'EXPIRED';
  recordHash: string;
  metadataHash: string;
  txHash: string;
  grantee?: { id: string; username: string; email: string };
}

export interface AccessRequest {
  id: string;
  patientId: string;
  recordId: string;
  purpose: string;
  status: string;
  reason?: string;
  requestTime: string;
  patient?: { patientCode: string };
  record?: { recordCode: string; recordDate: string };
  requester?: { username: string };
}

export interface EhrData {
  id: string;
  recordCode: string;
  recordDate: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
  labResult: string;
  visitNote: string;
  accessScope: string;
}
