import { expect } from 'chai';
import { ethers } from 'hardhat';
import { InformedConsent } from '../typechain-types';

describe('InformedConsent', function () {
  let contract: InformedConsent;
  const patientId = ethers.id('patient-001');
  const requesterId = ethers.id('doctor-001');
  const recordHash = ethers.id('record-hash-001');
  const metadataHash = ethers.id('metadata-hash-001');
  const role = 'Doctor';
  const dataType = 'full_ehr';
  const purpose = 'treatment';
  let consentId: bigint;
  let startTime: number;
  let endTime: number;

  beforeEach(async function () {
    const Factory = await ethers.getContractFactory('InformedConsent');
    contract = await Factory.deploy();
    await contract.waitForDeployment();

    const now = Math.floor(Date.now() / 1000);
    startTime = now;
    endTime = now + 86400 * 30;

    const tx = await contract.grantAccess(
      patientId,
      requesterId,
      role,
      dataType,
      purpose,
      startTime,
      endTime,
      recordHash,
      metadataHash
    );
    const receipt = await tx.wait();
    consentId = 1n;
    expect(receipt).to.not.be.null;
  });

  it('should grant access valid', async function () {
    const consent = await contract.getConsent(consentId);
    expect(consent.patientId).to.equal(patientId);
    expect(consent.requesterId).to.equal(requesterId);
    expect(consent.status).to.equal(0); // Active
  });

  it('should limit access', async function () {
    const newEnd = startTime + 86400 * 7;
    await expect(contract.limitAccess(consentId, 'endTime', newEnd.toString()))
      .to.emit(contract, 'ConsentLimited')
      .withArgs(consentId, 'endTime', newEnd.toString());

    const consent = await contract.getConsent(consentId);
    expect(consent.endTime).to.equal(BigInt(newEnd));
  });

  it('should revoke access', async function () {
    await expect(contract.revokeAccess(consentId))
      .to.emit(contract, 'ConsentRevoked')
      .withArgs(consentId, patientId);

    const consent = await contract.getConsent(consentId);
    expect(consent.status).to.equal(2); // Revoked
  });

  it('should check consent valid', async function () {
    const [allowed, matchedId, reason] = await contract.checkConsent.staticCall(
      patientId,
      requesterId,
      dataType,
      purpose,
      startTime + 100
    );
    expect(allowed).to.be.true;
    expect(matchedId).to.equal(consentId);
    expect(reason).to.equal('Consent valid');
  });

  it('should check consent no consent', async function () {
    const unknownPatient = ethers.id('unknown-patient');
    const [allowed, , reason] = await contract.checkConsent.staticCall(
      unknownPatient,
      requesterId,
      dataType,
      purpose,
      startTime + 100
    );
    expect(allowed).to.be.false;
    expect(reason).to.equal('No active consent');
  });

  it('should check consent revoked', async function () {
    await contract.revokeAccess(consentId);
    const [allowed, , reason] = await contract.checkConsent.staticCall(
      patientId,
      requesterId,
      dataType,
      purpose,
      startTime + 100
    );
    expect(allowed).to.be.false;
    expect(reason).to.equal('Consent revoked');
  });

  it('should check consent expired', async function () {
    const [allowed, , reason] = await contract.checkConsent.staticCall(
      patientId,
      requesterId,
      dataType,
      purpose,
      endTime + 1000
    );
    expect(allowed).to.be.false;
    expect(reason).to.equal('Consent expired');
  });

  it('should reject role mismatch', async function () {
    const [allowed, , reason] = await contract.checkConsentWithRole.staticCall(
      patientId,
      requesterId,
      'Admin',
      dataType,
      purpose,
      startTime + 100
    );
    expect(allowed).to.be.false;
    expect(reason).to.equal('Role mismatch');
  });

  it('should reject purpose mismatch', async function () {
    const [allowed, , reason] = await contract.checkConsent.staticCall(
      patientId,
      requesterId,
      dataType,
      'research',
      startTime + 100
    );
    expect(allowed).to.be.false;
    expect(reason).to.equal('Purpose mismatch');
  });

  it('should log access event', async function () {
    const metaHash = ethers.id('access-meta-001');
    await expect(
      contract.logAccess(
        patientId,
        requesterId,
        dataType,
        purpose,
        'verified',
        'allowed',
        metaHash
      )
    )
      .to.emit(contract, 'AccessLogged')
      .withArgs(
        1n,
        patientId,
        requesterId,
        dataType,
        purpose,
        'verified',
        'allowed',
        metaHash,
        (value: bigint) => value > 0n
      );
  });
});
