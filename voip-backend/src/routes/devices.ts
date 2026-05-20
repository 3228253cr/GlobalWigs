import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthedRequest } from '../middleware/auth';

export const devicesRouter = Router();

const registerSchema = z.object({
  fcmToken: z.string().min(20),
  model: z.string().optional(),
  osVersion: z.string().optional(),
  appVersion: z.string().optional(),
});

devicesRouter.post('/register', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const body = registerSchema.parse(req.body);
    const device = await prisma.device.upsert({
      where: { fcmToken: body.fcmToken },
      create: {
        userId,
        fcmToken: body.fcmToken,
        model: body.model,
        osVersion: body.osVersion,
        appVersion: body.appVersion,
      },
      update: {
        userId,
        model: body.model,
        osVersion: body.osVersion,
        appVersion: body.appVersion,
        lastSeenAt: new Date(),
      },
    });
    res.json({ device: { id: device.id, registeredAt: device.createdAt } });
  } catch (err) {
    next(err);
  }
});

devicesRouter.post('/unregister', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const fcmToken = z.object({ fcmToken: z.string() }).parse(req.body).fcmToken;
    await prisma.device.deleteMany({ where: { userId, fcmToken } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
