import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signToken, requireAuth, AuthedRequest } from '../middleware/auth';
import { HttpError } from '../middleware/error';

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80),
});

authRouter.post('/signup', async (req, res, next) => {
  try {
    const body = signupSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new HttpError(409, 'Email already registered', 'email_taken');

    const passwordHash = await bcrypt.hash(body.password, 12);

    // First user is automatically ADMIN (convenient for internal MVP bootstrap)
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'EMPLOYEE';

    const user = await prisma.user.create({
      data: { email: body.email, passwordHash, displayName: body.displayName, role },
    });

    res.json({
      token: signToken(user.id, user.role),
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) throw new HttpError(401, 'Invalid credentials', 'invalid_credentials');
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid credentials', 'invalid_credentials');

    res.json({
      token: signToken(user.id, user.role),
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        assignments: {
          where: { status: 'ACTIVE' },
          include: { phoneNumber: true },
        },
      },
    });
    if (!user) throw new HttpError(404, 'User not found', 'user_not_found');
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      activeAssignment: user.assignments[0]
        ? {
            id: user.assignments[0].id,
            endsAt: user.assignments[0].endsAt,
            number: {
              e164: user.assignments[0].phoneNumber.e164,
              countryIso2: user.assignments[0].phoneNumber.countryIso2,
              countryName: user.assignments[0].phoneNumber.countryName,
            },
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});
