import app from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`EHR Smart Consent API running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Fingerprint mode: ${config.fingerprintMode}`);
});
