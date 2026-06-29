import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  blockchainRpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545',
  contractAddress: process.env.CONTRACT_ADDRESS || '',
  privateKey: process.env.PRIVATE_KEY || '',
  fingerprintMode: (process.env.FINGERPRINT_MODE || 'development') as 'development' | 'production',
};
