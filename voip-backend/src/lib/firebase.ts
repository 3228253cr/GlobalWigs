import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { env } from '../config/env';
import { logger } from './logger';

let initialized = false;

export function getFirebaseAdmin(): typeof admin | null {
  if (initialized) return admin;

  const credPath = path.resolve(env.FIREBASE_SERVICE_ACCOUNT_PATH);
  if (!fs.existsSync(credPath)) {
    logger.warn(
      { credPath },
      'Firebase service account file not found — push notifications disabled',
    );
    return null;
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: env.FIREBASE_PROJECT_ID,
    });
    initialized = true;
    logger.info('Firebase Admin initialized');
    return admin;
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Firebase Admin');
    return null;
  }
}
