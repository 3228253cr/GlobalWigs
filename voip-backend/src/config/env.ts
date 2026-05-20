import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_BASE_URL: z.string().url(),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_EXPIRES_IN: z.string().default('30d'),

  TWILIO_ACCOUNT_SID: z.string().startsWith('AC'),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_API_KEY_SID: z.string().startsWith('SK'),
  TWILIO_API_KEY_SECRET: z.string().min(1),
  TWILIO_TWIML_APP_SID: z.string().startsWith('AP'),
  TWILIO_WEBHOOK_SIGNATURE_VALIDATION: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  VOICENTER_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  VOICENTER_API_KEY: z.string().optional(),
  VOICENTER_SIP_DOMAIN: z.string().optional(),
  VOICENTER_SIP_USERNAME: z.string().optional(),
  VOICENTER_SIP_PASSWORD: z.string().optional(),

  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().default('./firebase-service-account.json'),
  FIREBASE_PROJECT_ID: z.string().min(1),

  NUMBER_QUARANTINE_DAYS: z.coerce.number().int().positive().default(30),
  DEFAULT_ASSIGNMENT_DAYS: z.coerce.number().int().positive().default(14),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
