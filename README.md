# EHR Smart Consent System

Patient-Centric Access Control for Electronic Health Records (EHR) with **Smart Contract Informed Consent** and **fingerprint authentication**.

## Architecture Overview

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| Frontend | React, Vite, TypeScript, Tailwind | Role-based UI, consent management, EHR viewer |
| Backend | Node.js, Express, Prisma, PostgreSQL | Auth, encryption, API, blockchain integration |
| Blockchain | Solidity, Hardhat, Ethers.js | Consent registry, access audit (hashes only) |
| Database | PostgreSQL | Users, encrypted EHR, consent shadow, logs |

### On-Chain vs Off-Chain

**On-chain (blockchain):** pseudonymous IDs, role, data type, purpose, time bounds, consent status, record hash, metadata hash, transaction hash, audit events.

**Off-chain (PostgreSQL, AES-256-GCM encrypted):** diagnosis, treatment, prescription, lab results, visit notes, fingerprint template hashes.

Clinical data is **never** stored raw on blockchain. Hashes enable integrity verification without exposing PHI.

## Prerequisites

- Node.js 18+
- PostgreSQL 16 (or Docker)
- npm

## Quick Start

```bash
# 1. Clone / enter project
cd ehr-smart-consent

# 2. Environment
cp .env.example .env
# Edit DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY as needed

# 3. Start PostgreSQL
docker compose up postgres -d

# 4. Install dependencies
npm install

# 5. Database migrate & seed
npm run migrate
npm run seed

# 6. (Optional) Blockchain local
npm run contract:compile
npx hardhat node --hostname 127.0.0.1   # separate terminal
npm run contract:deploy:local
# Copy CONTRACT_ADDRESS from output into .env

# 7. Run app
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Health check:** http://localhost:3001/api/system/health

## Demo Accounts

Password for all: `Password123!`

| Role | Username | Email |
|------|----------|-------|
| Patient | patient1 | patient1@ehr.local |
| Doctor | doctor1 | doctor1@ehr.local |
| Admin | admin1 | admin1@ehr.local |
| Auditor | auditor1 | auditor1@ehr.local |

**Fingerprint (development mode):** sample `demo-fingerprint`, device `DEV-SCANNER-001`

## Demo Flow

1. **Patient login** → Consent Management → Grant Access to doctor1 (purpose: treatment, scope: full_ehr)
2. **Doctor login** → Request Access → select patient & record → submit
3. **Doctor** → EHR Viewer → verify fingerprint → view decrypted EHR
4. **Patient** → Revoke consent
5. **Doctor** → retry EHR access → **denied** (consent revoked)
6. **Auditor** → Audit Logs → filter by decision/biometric → view transaction hash

## Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install all workspaces |
| `npm run dev` | Backend + frontend dev servers |
| `npm run build` | Production build |
| `npm run start` | Start backend production |
| `npm run migrate` | Prisma migrate deploy |
| `npm run seed` | Seed demo data |
| `npm run test` | Backend + contract tests |
| `npm run contract:compile` | Compile Solidity |
| `npm run contract:test` | Smart contract unit tests |
| `npm run contract:deploy:local` | Deploy to Hardhat localhost |
| `npm run contract:deploy:sepolia` | Deploy to Sepolia testnet |

## Environment Variables

```env
DATABASE_URL=postgresql://ehr_user:ehr_password@localhost:5432/ehr_smart_consent
JWT_SECRET=your-secret
ENCRYPTION_KEY=64-char-hex (32 bytes)
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x...
PRIVATE_KEY=0x...
FRONTEND_URL=http://localhost:5173
FINGERPRINT_MODE=development
```

## API Endpoints

### Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/register` (setup mode)

### Users / Patients / Doctors
- `GET|POST|PUT|DELETE /api/users`
- `GET|POST|PUT /api/patients`
- `GET /api/doctors`

### Biometric
- `POST /api/biometric/enroll`
- `POST /api/biometric/verify`
- `GET /api/biometric/logs`

### Consent
- `POST /api/consents/grant`
- `PUT /api/consents/:id/limit`
- `POST /api/consents/:id/revoke`
- `GET /api/consents/patient/:patientId`
- `GET /api/consents/check`

### Access & EHR
- `POST|GET /api/access-requests`
- `POST /api/access-requests/:id/verify-and-open`
- `GET|POST|PUT /api/ehr`
- `GET /api/ehr/:id/hash`

### Audit & System
- `GET /api/audit/logs`
- `GET /api/audit/transactions/:txHash`
- `GET /api/system/health`

## Smart Contract Functions

- `grantAccess(patientId, requesterId, role, dataType, purpose, startTime, endTime, recordHash, metadataHash)`
- `limitAccess(consentId, limitationType, newValue)`
- `revokeAccess(consentId)`
- `checkConsent(patientId, requesterId, dataType, purpose, timestamp)`
- `checkConsentWithRole(...)` — includes role mismatch check
- `logAccess(patientId, requesterId, dataType, purpose, biometricStatus, decision, metadataHash)`

### Events
`ConsentGranted`, `ConsentLimited`, `ConsentRevoked`, `ConsentChecked`, `AccessLogged`

## Docker

```bash
# PostgreSQL only
docker compose up postgres -d

# Full stack (with profiles)
docker compose --profile full up -d

# Hardhat node (optional)
docker compose --profile blockchain up hardhat -d
```

## Testing

```bash
npm run contract:test    # 10 smart contract tests
npm run test             # Backend API integration tests (requires DB + seed)
```

## Security Notes

- Clinical fields encrypted with AES-256-GCM server-side
- JWT role-based route protection on frontend and backend
- Admin/Auditor cannot decrypt clinical EHR via API
- Fingerprint adapter supports `development` (simulation) and `production` (vendor SDK ready)
- Rate limiting, Helmet, CORS enabled on backend

## Project Structure

```
ehr-smart-consent/
├── frontend/          React + Vite + Tailwind
├── backend/           Express + Prisma + PostgreSQL
├── contracts/         Solidity + Hardhat
├── docker-compose.yml
├── .env.example
└── README.md
```

## License

MIT — Research / Academic Demo
