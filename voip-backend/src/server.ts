import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/error';
import { authRouter } from './routes/auth';
import { numbersRouter } from './routes/numbers';
import { devicesRouter } from './routes/devices';
import { voiceRouter } from './routes/voice';
import { webhooksRouter } from './routes/webhooks';
import { getFirebaseAdmin } from './lib/firebase';
import { expireQuarantines } from './services/number.service';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('tiny'));

// Webhook routes need raw form-encoded body BEFORE json parser
app.use('/webhooks', express.urlencoded({ extended: false }), webhooksRouter);

app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'globalwigs-voip', env: env.NODE_ENV });
});

app.use('/auth', authRouter);
app.use('/numbers', numbersRouter);
app.use('/devices', devicesRouter);
app.use('/voice', voiceRouter);

app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'VoIP backend listening');
  getFirebaseAdmin(); // best-effort init
});

// Hourly quarantine sweep so numbers come back to the pool when their cooldown expires
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;
const sweepTimer = setInterval(async () => {
  try {
    const count = await expireQuarantines();
    if (count > 0) logger.info({ count }, 'Released numbers from quarantine');
  } catch (err) {
    logger.error({ err }, 'Quarantine sweep failed');
  }
}, SWEEP_INTERVAL_MS);
sweepTimer.unref();

function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
