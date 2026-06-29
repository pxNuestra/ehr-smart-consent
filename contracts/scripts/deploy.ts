import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  const InformedConsent = await ethers.getContractFactory('InformedConsent');
  const contract = await InformedConsent.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('InformedConsent deployed to:', address);

  const artifactPath = path.join(__dirname, '../artifacts/contracts/InformedConsent.sol/InformedConsent.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));

  const deployInfo = {
    address,
    abi: artifact.abi,
    deployedAt: new Date().toISOString(),
    network: (await ethers.provider.getNetwork()).name,
  };

  const outDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const networkName = process.env.HARDHAT_NETWORK || 'localhost';
  fs.writeFileSync(
    path.join(outDir, `${networkName}.json`),
    JSON.stringify(deployInfo, null, 2)
  );

  // Copy ABI to backend
  const backendAbiDir = path.join(__dirname, '../../backend/src/blockchain/abi');
  if (!fs.existsSync(backendAbiDir)) fs.mkdirSync(backendAbiDir, { recursive: true });
  fs.writeFileSync(
    path.join(backendAbiDir, 'InformedConsent.json'),
    JSON.stringify({ address, abi: artifact.abi }, null, 2)
  );

  console.log('Deployment info saved. Set CONTRACT_ADDRESS=' + address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
