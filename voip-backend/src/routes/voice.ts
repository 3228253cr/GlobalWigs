import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { createVoiceAccessToken } from '../services/token.service';
import { getUserActiveNumber } from '../services/number.service';
import { HttpError } from '../middleware/error';

export const voiceRouter = Router();

/**
 * Issue a short-lived Twilio Voice JWT so the Android Voice SDK can
 * register for incoming calls and place outgoing calls.
 */
voiceRouter.post('/token', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).userId;
    // Use a stable identity tied to user id — Twilio sees this as the SDK identity
    const identity = `user_${userId}`;
    const { token, expiresAt } = createVoiceAccessToken({ identity });
    res.json({ token, identity, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    next(err);
  }
});

/**
 * Return which CallerID this user should present on outgoing calls.
 * The Android app calls this before initiating a dial.
 */
voiceRouter.get('/caller-id', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const number = await getUserActiveNumber(userId);
    if (!number) {
      throw new HttpError(409, 'No active number assignment', 'no_active_number');
    }
    res.json({ callerId: number.e164, countryIso2: number.countryIso2 });
  } catch (err) {
    next(err);
  }
});

/**
 * Lookup call logs for the authenticated user (most recent first).
 */
const logsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(50),
});

voiceRouter.get('/logs', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const { limit } = logsQuerySchema.parse(req.query);
    const { prisma } = await import('../lib/prisma');
    const logs = await prisma.callLog.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});
