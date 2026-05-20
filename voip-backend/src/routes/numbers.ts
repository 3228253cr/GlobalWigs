import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin, AuthedRequest } from '../middleware/auth';
import {
  assignNumberToUser,
  listAvailableNumbers,
  releaseAssignment,
} from '../services/number.service';
import { buyTwilioNumber, releaseTwilioNumber, searchTwilioNumbers } from '../services/twilio.service';
import { HttpError } from '../middleware/error';

export const numbersRouter = Router();

numbersRouter.get('/available', requireAuth, async (req, res, next) => {
  try {
    const country = typeof req.query.country === 'string' ? req.query.country.toUpperCase() : undefined;
    const numbers = await listAvailableNumbers(country);
    res.json({
      numbers: numbers.map((n) => ({
        id: n.id,
        e164: n.e164,
        countryIso2: n.countryIso2,
        countryName: n.countryName,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const claimSchema = z.object({
  phoneNumberId: z.string().min(1),
  days: z.number().int().positive().max(90).optional(),
});

numbersRouter.post('/claim', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const body = claimSchema.parse(req.body);
    const assignment = await assignNumberToUser({
      userId,
      phoneNumberId: body.phoneNumberId,
      days: body.days,
    });
    res.json({ assignment });
  } catch (err) {
    next(err);
  }
});

numbersRouter.post('/release/:assignmentId', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const role = (req as AuthedRequest).userRole;
    const assignmentId = req.params.assignmentId;

    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new HttpError(404, 'Assignment not found', 'assignment_not_found');
    if (assignment.userId !== userId && role !== 'ADMIN') {
      throw new HttpError(403, 'Cannot release another user assignment', 'forbidden');
    }

    await releaseAssignment(assignmentId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- Admin: manage the pool ---

numbersRouter.get('/all', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const numbers = await prisma.phoneNumber.findMany({
      orderBy: [{ status: 'asc' }, { countryIso2: 'asc' }],
      include: {
        assignments: {
          where: { status: 'ACTIVE' },
          include: { user: { select: { id: true, email: true, displayName: true } } },
        },
      },
    });
    res.json({ numbers });
  } catch (err) {
    next(err);
  }
});

const searchSchema = z.object({
  countryIso2: z.string().length(2),
  type: z.enum(['local', 'mobile', 'tollfree']).optional(),
  areaCode: z.string().optional(),
});

numbersRouter.get('/search', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const params = searchSchema.parse({
      countryIso2: req.query.countryIso2,
      type: req.query.type,
      areaCode: req.query.areaCode,
    });
    const results = (await searchTwilioNumbers(params)) as Array<{
      phoneNumber: string;
      friendlyName: string;
      locality: string | null;
      region: string | null;
      capabilities: unknown;
    }>;
    res.json({
      results: results.map((r) => ({
        phoneNumber: r.phoneNumber,
        friendlyName: r.friendlyName,
        locality: r.locality,
        region: r.region,
        capabilities: r.capabilities,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const buySchema = z.object({
  phoneNumber: z.string().regex(/^\+\d{6,15}$/),
  countryIso2: z.string().length(2),
  countryName: z.string().min(1),
});

numbersRouter.post('/buy', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = buySchema.parse(req.body);
    const created = await buyTwilioNumber(body);
    res.json({ number: created });
  } catch (err) {
    next(err);
  }
});

numbersRouter.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await releaseTwilioNumber(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
