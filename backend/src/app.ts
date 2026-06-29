import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/error';

import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import patientsRoutes from './routes/patients.routes';
import doctorsRoutes from './routes/doctors.routes';
import biometricRoutes from './routes/biometric.routes';
import consentsRoutes from './routes/consents.routes';
import accessRequestsRoutes from './routes/access-requests.routes';
import ehrRoutes from './routes/ehr.routes';
import auditRoutes from './routes/audit.routes';
import systemRoutes from './routes/system.routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/biometric', biometricRoutes);
app.use('/api/consents', consentsRoutes);
app.use('/api/access-requests', accessRequestsRoutes);
app.use('/api/ehr', ehrRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/system', systemRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
