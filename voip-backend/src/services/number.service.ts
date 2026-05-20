import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { HttpError } from '../middleware/error';

export async function listAvailableNumbers(countryIso2?: string) {
  return prisma.phoneNumber.findMany({
    where: {
      status: 'AVAILABLE',
      ...(countryIso2 ? { countryIso2 } : {}),
    },
    orderBy: { acquiredAt: 'asc' },
  });
}

export async function assignNumberToUser(opts: {
  userId: string;
  phoneNumberId: string;
  days?: number;
}) {
  const days = opts.days ?? env.DEFAULT_ASSIGNMENT_DAYS;

  return prisma.$transaction(async (tx) => {
    const number = await tx.phoneNumber.findUnique({
      where: { id: opts.phoneNumberId },
    });
    if (!number) throw new HttpError(404, 'Number not found', 'number_not_found');
    if (number.status !== 'AVAILABLE') {
      throw new HttpError(409, `Number is ${number.status}`, 'number_unavailable');
    }

    const existing = await tx.assignment.findFirst({
      where: { userId: opts.userId, status: 'ACTIVE' },
    });
    if (existing) {
      throw new HttpError(
        409,
        'User already has an active assignment — release it first',
        'user_has_active_assignment',
      );
    }

    const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const assignment = await tx.assignment.create({
      data: {
        userId: opts.userId,
        phoneNumberId: number.id,
        endsAt,
      },
    });

    await tx.phoneNumber.update({
      where: { id: number.id },
      data: { status: 'ASSIGNED' },
    });

    return assignment;
  });
}

export async function releaseAssignment(assignmentId: string) {
  const quarantineUntil = new Date(
    Date.now() + env.NUMBER_QUARANTINE_DAYS * 24 * 60 * 60 * 1000,
  );

  return prisma.$transaction(async (tx) => {
    const assignment = await tx.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new HttpError(404, 'Assignment not found', 'assignment_not_found');
    if (assignment.status !== 'ACTIVE') {
      throw new HttpError(409, 'Assignment is not active', 'assignment_not_active');
    }

    await tx.assignment.update({
      where: { id: assignmentId },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });

    await tx.phoneNumber.update({
      where: { id: assignment.phoneNumberId },
      data: {
        status: 'QUARANTINED',
        quarantineUntil,
      },
    });
  });
}

/**
 * Find the active inbound number for a user — used by the Android app
 * to know which CallerID to display on outgoing calls.
 */
export async function getUserActiveNumber(userId: string) {
  const assignment = await prisma.assignment.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: { phoneNumber: true },
  });
  return assignment?.phoneNumber ?? null;
}

/**
 * Find which user a given inbound number belongs to right now.
 * Used by Twilio webhook handler to route an incoming call.
 */
export async function findUserByPhoneNumber(e164: string) {
  const number = await prisma.phoneNumber.findUnique({
    where: { e164 },
    include: {
      assignments: {
        where: { status: 'ACTIVE' },
        include: { user: { include: { devices: true } } },
      },
    },
  });
  if (!number) return null;
  return {
    number,
    assignment: number.assignments[0] ?? null,
  };
}

/**
 * Promote QUARANTINED numbers back to AVAILABLE when their cooldown expires.
 * Should be invoked periodically (cron / scheduled task).
 */
export async function expireQuarantines() {
  const now = new Date();
  const result = await prisma.phoneNumber.updateMany({
    where: {
      status: 'QUARANTINED',
      quarantineUntil: { lte: now },
    },
    data: { status: 'AVAILABLE', quarantineUntil: null },
  });
  return result.count;
}
