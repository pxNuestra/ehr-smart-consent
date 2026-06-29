-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'DOCTOR', 'ADMIN', 'AUDITOR');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE "ConsentStatus" AS ENUM ('ACTIVE', 'LIMITED', 'REVOKED', 'EXPIRED');
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'COMPLETED');
CREATE TYPE "BiometricStatus" AS ENUM ('VERIFIED', 'FAILED', 'NOT_ATTEMPTED');
CREATE TYPE "AccessDecision" AS ENUM ('ALLOWED', 'DENIED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "patient_code" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "doctors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "license_dummy" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "medical_records" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "record_code" TEXT NOT NULL,
    "diagnosis_encrypted" TEXT NOT NULL,
    "treatment_encrypted" TEXT NOT NULL,
    "prescription_encrypted" TEXT NOT NULL,
    "lab_result_encrypted" TEXT NOT NULL,
    "visit_note_encrypted" TEXT NOT NULL,
    "record_hash" TEXT NOT NULL,
    "record_date" TIMESTAMP(3) NOT NULL,
    "created_by_doctor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fingerprint_templates" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "fingerprint_hash" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fingerprint_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consents_shadow" (
    "id" TEXT NOT NULL,
    "blockchain_consent_id" INTEGER NOT NULL,
    "patient_id" TEXT NOT NULL,
    "grantee_user_id" TEXT NOT NULL,
    "access_scope" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'ACTIVE',
    "record_hash" TEXT NOT NULL,
    "metadata_hash" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "consents_shadow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "access_requests" (
    "id" TEXT NOT NULL,
    "requester_user_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "request_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "access_logs" (
    "id" TEXT NOT NULL,
    "request_id" TEXT,
    "actor_user_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "record_id" TEXT,
    "biometric_status" "BiometricStatus" NOT NULL,
    "consent_status" TEXT NOT NULL,
    "decision" "AccessDecision" NOT NULL,
    "reason" TEXT,
    "metadata_hash" TEXT NOT NULL,
    "tx_hash" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "biometric_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "attempt_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    CONSTRAINT "biometric_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "metadata_hash" TEXT NOT NULL,
    "tx_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");
CREATE UNIQUE INDEX "patients_patient_code_key" ON "patients"("patient_code");
CREATE UNIQUE INDEX "doctors_user_id_key" ON "doctors"("user_id");
CREATE UNIQUE INDEX "medical_records_record_code_key" ON "medical_records"("record_code");
CREATE UNIQUE INDEX "fingerprint_templates_user_id_template_id_key" ON "fingerprint_templates"("user_id", "template_id");
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- Foreign Keys
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_created_by_doctor_id_fkey" FOREIGN KEY ("created_by_doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "fingerprint_templates" ADD CONSTRAINT "fingerprint_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consents_shadow" ADD CONSTRAINT "consents_shadow_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consents_shadow" ADD CONSTRAINT "consents_shadow_grantee_user_id_fkey" FOREIGN KEY ("grantee_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "access_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "medical_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "biometric_logs" ADD CONSTRAINT "biometric_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
