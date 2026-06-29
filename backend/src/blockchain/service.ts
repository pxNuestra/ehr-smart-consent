import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

let contract: ethers.Contract | null = null;
let provider: ethers.JsonRpcProvider | null = null;
let wallet: ethers.Wallet | null = null;

function loadAbi(): { abi: ethers.InterfaceAbi; address: string } {
  const abiPath = path.join(__dirname, 'abi', 'InformedConsent.json');
  if (fs.existsSync(abiPath)) {
    const data = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
    return { abi: data.abi, address: data.address || config.contractAddress };
  }
  // Fallback minimal ABI
  const fallbackAbi = [
    'function grantAccess(bytes32,bytes32,string,string,string,uint256,uint256,bytes32,bytes32) returns (uint256)',
    'function limitAccess(uint256,string,string)',
    'function revokeAccess(uint256)',
    'function checkConsent(bytes32,bytes32,string,string,uint256) returns (bool,uint256,string)',
    'function checkConsentWithRole(bytes32,bytes32,string,string,string,uint256) returns (bool,uint256,string)',
    'function logAccess(bytes32,bytes32,string,string,string,string,bytes32) returns (uint256)',
    'function getConsent(uint256) view returns (tuple(uint256 id,bytes32 patientId,bytes32 requesterId,string role,string dataType,string purpose,uint256 startTime,uint256 endTime,bytes32 recordHash,bytes32 metadataHash,uint8 status,string limitationType,string limitedValue))',
    'event ConsentGranted(uint256 indexed consentId, bytes32 indexed patientId, bytes32 indexed requesterId, string role, string dataType, string purpose, uint256 startTime, uint256 endTime, bytes32 recordHash, bytes32 metadataHash)',
    'event ConsentRevoked(uint256 indexed consentId, bytes32 indexed patientId)',
    'event AccessLogged(uint256 indexed logId, bytes32 indexed patientId, bytes32 indexed requesterId, string dataType, string purpose, string biometricStatus, string decision, bytes32 metadataHash, uint256 timestamp)',
  ];
  return { abi: fallbackAbi, address: config.contractAddress };
}

export function getBlockchainService() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(config.blockchainRpcUrl);
  }
  if (!wallet && config.privateKey) {
    wallet = new ethers.Wallet(config.privateKey, provider);
  }
  if (!contract) {
    const { abi, address } = loadAbi();
    const addr = config.contractAddress || address;
    if (!addr) {
      return { contract: null, provider, wallet, available: false };
    }
    contract = new ethers.Contract(addr, abi, wallet || provider);
  }
  return { contract, provider, wallet, available: !!contract };
}

export function toBytes32(hexHash: string): string {
  if (hexHash.startsWith('0x') && hexHash.length === 66) return hexHash;
  return '0x' + hexHash.padStart(64, '0').slice(-64);
}

export async function grantAccessOnChain(params: {
  patientId: string;
  requesterId: string;
  role: string;
  dataType: string;
  purpose: string;
  startTime: number;
  endTime: number;
  recordHash: string;
  metadataHash: string;
}): Promise<{ txHash: string; consentId: number }> {
  const { contract, available } = getBlockchainService();
  if (!available || !contract) {
    // Simulated tx for dev without blockchain
    const fakeTx = '0x' + 'simulated'.padEnd(64, '0');
    return { txHash: fakeTx, consentId: Math.floor(Math.random() * 10000) + 1 };
  }

  const tx = await contract.grantAccess(
    toBytes32(params.patientId),
    toBytes32(params.requesterId),
    params.role,
    params.dataType,
    params.purpose,
    params.startTime,
    params.endTime,
    toBytes32(params.recordHash),
    toBytes32(params.metadataHash)
  );
  const receipt = await tx.wait();
  const consentId = Number(await contract.nextConsentId()) - 1;
  return { txHash: receipt.hash, consentId };
}

export async function limitAccessOnChain(
  consentId: number,
  limitationType: string,
  newValue: string
): Promise<string> {
  const { contract, available } = getBlockchainService();
  if (!available || !contract) return '0x' + 'simulated-limit'.padEnd(64, '0');
  const tx = await contract.limitAccess(consentId, limitationType, newValue);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function revokeAccessOnChain(consentId: number): Promise<string> {
  const { contract, available } = getBlockchainService();
  if (!available || !contract) return '0x' + 'simulated-revoke'.padEnd(64, '0');
  const tx = await contract.revokeAccess(consentId);
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function checkConsentOnChain(params: {
  patientId: string;
  requesterId: string;
  role: string;
  dataType: string;
  purpose: string;
  timestamp: number;
}): Promise<{ allowed: boolean; consentId: number; reason: string }> {
  const { contract, available } = getBlockchainService();
  if (!available || !contract) {
    return { allowed: false, consentId: 0, reason: 'Blockchain tidak tersedia' };
  }
  const [allowed, consentId, reason] = await contract.checkConsentWithRole(
    toBytes32(params.patientId),
    toBytes32(params.requesterId),
    params.role,
    params.dataType,
    params.purpose,
    params.timestamp
  );
  return { allowed, consentId: Number(consentId), reason };
}

export async function logAccessOnChain(params: {
  patientId: string;
  requesterId: string;
  dataType: string;
  purpose: string;
  biometricStatus: string;
  decision: string;
  metadataHash: string;
}): Promise<string> {
  const { contract, available } = getBlockchainService();
  if (!available || !contract) return '0x' + 'simulated-log'.padEnd(64, '0');
  const tx = await contract.logAccess(
    toBytes32(params.patientId),
    toBytes32(params.requesterId),
    params.dataType,
    params.purpose,
    params.biometricStatus,
    params.decision,
    toBytes32(params.metadataHash)
  );
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function getTransactionReceipt(txHash: string) {
  const { provider, available } = getBlockchainService();
  if (!available || !provider || txHash.startsWith('0xsimulated')) {
    return { hash: txHash, status: 1, blockNumber: 0, logs: [] };
  }
  return provider.getTransactionReceipt(txHash);
}
