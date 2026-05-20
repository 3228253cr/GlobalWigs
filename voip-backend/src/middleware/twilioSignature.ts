import { Request, Response, NextFunction } from 'express';
import twilio from 'twilio';
import { env } from '../config/env';
import { logger } from '../lib/logger';

/**
 * Validate that a request truly came from Twilio by checking the
 * X-Twilio-Signature header. Skipped in dev unless explicitly enabled.
 */
export function validateTwilioSignature(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!env.TWILIO_WEBHOOK_SIGNATURE_VALIDATION) {
    next();
    return;
  }
  const signature = req.header('X-Twilio-Signature');
  if (!signature) {
    logger.warn('Missing X-Twilio-Signature header');
    res.status(403).type('text/xml').send('<Response><Reject/></Response>');
    return;
  }
  const url = `${env.PUBLIC_BASE_URL}${req.originalUrl}`;
  const valid = twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, req.body);
  if (!valid) {
    logger.warn({ url }, 'Twilio signature validation failed');
    res.status(403).type('text/xml').send('<Response><Reject/></Response>');
    return;
  }
  next();
}
