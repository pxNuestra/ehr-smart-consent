import {
  PrismaClient,
  UserRole,
  ConsentStatus,
  AccessRequestStatus,
  AccessDecision,
  BiometricStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { encrypt, hashData, metadataHash } from '../src/utils/crypto';

const prisma = new PrismaClient();

const diagnoses = [
  'Hypertension Stage 2',
  'Type 2 Diabetes Mellitus',
  'Acute Bronchitis',
  'Migraine without aura',
  'Gastroesophageal reflux disease',
  'Hypothyroidism',
  'Osteoarthritis knee',
  'Anxiety disorder',
  'Iron deficiency anemia',
  'Urinary tract infection',
];

const treatments = [
  'ACE inhibitor therapy, lifestyle modification',
  'Metformin 500mg BID, dietary counseling',
  'Bronchodilator, rest, hydration',
  'Sumatriptan PRN, trigger avoidance',
  'PPI therapy, dietary changes',
  'Levothyroxine 50mcg daily',
  'NSAIDs, physical therapy',
  'CBT referral, SSRI consideration',
  'Iron supplementation 3 months',
  'Antibiotic course 7 days',
];

async function main() {
  console.log('Seeding database...');
  await prisma.$transaction([
    prisma.accessLog.deleteMany(),
    prisma.accessRequest.deleteMany(),
    prisma.consentShadow.deleteMany(),
    prisma.medicalRecord.deleteMany(),
    prisma.biometricLog.deleteMany(),
    prisma.fingerprintTemplate.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.systemConfig.deleteMany(),
    prisma.patient.deleteMany(),
    prisma.doctor.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // Admins
  const admins = await Promise.all(
    [1, 2].map((i) =>
      prisma.user.create({
        data: {
          username: `admin${i}`,
          email: `admin${i}@ehr.local`,
          passwordHash,
          role: UserRole.ADMIN,
        },
      })
    )
  );

  // Auditors
  const auditors = await Promise.all(
    [1, 2].map((i) =>
      prisma.user.create({
        data: {
          username: `auditor${i}`,
          email: `auditor${i}@ehr.local`,
          passwordHash,
          role: UserRole.AUDITOR,
        },
      })
    )
  );

  // Doctors
  const specialties = [
    'Cardiology', 'Internal Medicine', 'Pediatrics', 'Neurology', 'Orthopedics',
    'Dermatology', 'Psychiatry', 'Oncology', 'Radiology', 'General Practice',
  ];
  const doctorUsers = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.user.create({
        data: {
          username: `doctor${i + 1}`,
          email: `doctor${i + 1}@ehr.local`,
          passwordHash,
          role: UserRole.DOCTOR,
        },
      })
    )
  );
  const doctors = await Promise.all(
    doctorUsers.map((u, i) =>
      prisma.doctor.create({
        data: {
          userId: u.id,
          specialty: specialties[i],
          licenseDummy: `LIC-DOC-${String(i + 1).padStart(4, '0')}`,
        },
      })
    )
  );

  // Patients
  const patientUsers = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      prisma.user.create({
        data: {
          username: `patient${i + 1}`,
          email: `patient${i + 1}@ehr.local`,
          passwordHash,
          role: UserRole.PATIENT,
        },
      })
    )
  );
  const patients = await Promise.all(
    patientUsers.map((u, i) =>
      prisma.patient.create({
        data: {
          userId: u.id,
          patientCode: `PAT-${String(i + 1).padStart(4, '0')}`,
          gender: i % 2 === 0 ? 'Male' : 'Female',
          age: 25 + (i * 3) % 50,
        },
      })
    )
  );

  // Fingerprint templates for all active users
  const allUsers = [...patientUsers, ...doctorUsers, ...admins, ...auditors];
  for (const user of allUsers) {
    const fpHash = hashData(`${user.id}:demo-fingerprint:DEV-SCANNER-001`);
    await prisma.fingerprintTemplate.create({
      data: {
        userId: user.id,
        templateId: `TPL-${user.username}`,
        fingerprintHash: fpHash,
        deviceId: 'DEV-SCANNER-001',
      },
    });
  }

  // Medical records (50)
  const records = [];
  for (let i = 0; i < 50; i++) {
    const patient = patients[i % patients.length];
    const doctor = doctors[i % doctors.length];
    const idx = i % diagnoses.length;
    const clinical = {
      diagnosis: diagnoses[idx],
      treatment: treatments[idx],
      prescription: `Rx-${1000 + i}: Medication as prescribed`,
      labResult: `Lab-${1000 + i}: Within normal limits / see details`,
      visitNote: `Visit note for ${patient.patientCode} on ${new Date().toISOString().split('T')[0]}`,
    };
    const record = await prisma.medicalRecord.create({
      data: {
        patientId: patient.id,
        recordCode: `REC-${String(i + 1).padStart(5, '0')}`,
        diagnosisEncrypted: encrypt(clinical.diagnosis),
        treatmentEncrypted: encrypt(clinical.treatment),
        prescriptionEncrypted: encrypt(clinical.prescription),
        labResultEncrypted: encrypt(clinical.labResult),
        visitNoteEncrypted: encrypt(clinical.visitNote),
        recordHash: hashData(JSON.stringify(clinical)),
        recordDate: new Date(Date.now() - i * 86400000 * 3),
        createdByDoctorId: doctor.id,
      },
    });
    records.push(record);
  }

  // Consents (50)
  const consentStatuses: ConsentStatus[] = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'REVOKED', 'EXPIRED'];
  const consents = [];
  for (let i = 0; i < 50; i++) {
    const patient = patients[i % patients.length];
    const doctor = doctorUsers[i % doctorUsers.length];
    const record = records[i];
    const status = consentStatuses[i % consentStatuses.length];
    const startTime = new Date(Date.now() - 30 * 86400000);
    let endTime = new Date(Date.now() + 30 * 86400000);
    if (status === 'EXPIRED') endTime = new Date(Date.now() - 86400000);
    const meta = { patientId: patient.id, doctorId: doctor.id, scope: 'full_ehr', purpose: 'treatment' };
    const consent = await prisma.consentShadow.create({
      data: {
        blockchainConsentId: i + 1,
        patientId: patient.id,
        granteeUserId: doctor.id,
        accessScope: 'full_ehr',
        purpose: 'treatment',
        startTime,
        endTime,
        status,
        recordHash: record.recordHash,
        metadataHash: metadataHash(meta),
        txHash: `0x${String(i + 1).padStart(64, '0')}`,
      },
    });
    consents.push(consent);
  }

  // Access requests (100)
  const requests = [];
  for (let i = 0; i < 100; i++) {
    const patient = patients[i % patients.length];
    const doctor = doctorUsers[i % doctorUsers.length];
    const record = records[i % records.length];
    const request = await prisma.accessRequest.create({
      data: {
        requesterUserId: doctor.id,
        patientId: patient.id,
        recordId: record.id,
        purpose: 'treatment',
        status: i % 3 === 0 ? AccessRequestStatus.COMPLETED : i % 3 === 1 ? AccessRequestStatus.DENIED : AccessRequestStatus.PENDING,
        reason: i % 3 === 1 ? 'No active consent' : undefined,
      },
    });
    requests.push(request);
  }

  // Access logs (100)
  for (let i = 0; i < 100; i++) {
    const request = requests[i];
    const allowed = i % 4 !== 1;
    await prisma.accessLog.create({
      data: {
        requestId: request.id,
        actorUserId: request.requesterUserId,
        patientId: request.patientId,
        recordId: request.recordId,
        biometricStatus: allowed ? BiometricStatus.VERIFIED : BiometricStatus.FAILED,
        consentStatus: allowed ? 'ACTIVE' : 'DENIED',
        decision: allowed ? AccessDecision.ALLOWED : AccessDecision.DENIED,
        reason: allowed ? 'Access granted' : i % 4 === 1 ? 'Fingerprint failed' : 'Consent revoked',
        metadataHash: metadataHash({ i, requestId: request.id }),
        txHash: `0xlog${String(i + 1).padStart(60, '0')}`,
      },
    });
  }

  // Audit logs
  for (let i = 0; i < 50; i++) {
    const actor = allUsers[i % allUsers.length];
    await prisma.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: ['LOGIN', 'GRANT_CONSENT', 'ACCESS_EHR', 'REVOKE_CONSENT'][i % 4],
        targetType: ['user', 'consent', 'medical_record'][i % 3],
        targetId: `target-${i}`,
        decision: i % 5 === 0 ? 'DENIED' : 'ALLOWED',
        reason: i % 5 === 0 ? 'Policy violation' : undefined,
        metadataHash: metadataHash({ audit: i }),
        txHash: i % 2 === 0 ? `0xaudit${String(i).padStart(58, '0')}` : undefined,
      },
    });
  }

  // System config
  await prisma.systemConfig.createMany({
    data: [
      { key: 'app_name', value: 'PatientCentric Access Control Rekam Medis Elektronik' },
      { key: 'fingerprint_mode', value: 'development' },
      { key: 'consent_default_days', value: '30' },
      { key: 'blockchain_network', value: 'localhost' },
    ],
  });

  console.log('Seed completed!');
  console.log('\nDemo accounts (password: Password123!):');
  console.log('  Patient:  patient1@ehr.local / patient1');
  console.log('  Doctor:   doctor1@ehr.local / doctor1');
  console.log('  Admin:    admin1@ehr.local / admin1');
  console.log('  Auditor:  auditor1@ehr.local / auditor1');
  console.log('\nFingerprint demo sample: demo-fingerprint (device: DEV-SCANNER-001)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
