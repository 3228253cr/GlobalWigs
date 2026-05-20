import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

export interface AuthedRequest extends Request {
  userId: string;
  userRole: 'EMPLOYEE' | 'ADMIN';
}

export interface JwtPayload {
  sub: string;
  role: 'EMPLOYEE' | 'ADMIN';
}

export function signToken(userId: string, role: 'EMPLOYEE' | 'ADMIN'): string {
  return jwt.sign({ sub: userId, role } satisfies JwtPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing_token' });
    return;
  }

  try {
    const token = header.slice('Bearer '.length);
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      res.status(401).json({ error: 'user_not_found' });
      return;
    }
    (req as AuthedRequest).userId = user.id;
    (req as AuthedRequest).userRole = user.role;
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if ((req as AuthedRequest).userRole !== 'ADMIN') {
    res.status(403).json({ error: 'admin_required' });
    return;
  }
  next();
}
