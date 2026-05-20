import { getFirebaseAdmin } from '../lib/firebase';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';

/**
 * Send a high-priority FCM push to all devices belonging to a user, telling
 * the Android app that there's an incoming Twilio call to accept. The app
 * uses Twilio's incoming push payload to acknowledge to the Voice SDK.
 *
 * For our internal MVP we send a data-only message; the Android side wakes
 * the ConnectionService and presents the native ringer UI.
 */
export async function notifyIncomingCall(opts: {
  userId: string;
  callerE164: string;
  toE164: string;
  twilioCallSid: string;
}): Promise<{ delivered: number; failed: number }> {
  const fb = getFirebaseAdmin();
  if (!fb) {
    logger.warn('FCM not configured — cannot deliver incoming call notification');
    return { delivered: 0, failed: 0 };
  }

  const devices = await prisma.device.findMany({
    where: { userId: opts.userId },
  });
  if (devices.length === 0) {
    logger.warn({ userId: opts.userId }, 'User has no registered devices');
    return { delivered: 0, failed: 0 };
  }

  let delivered = 0;
  let failed = 0;
  const dead: string[] = [];

  await Promise.all(
    devices.map(async (device) => {
      try {
        await fb.messaging().send({
          token: device.fcmToken,
          android: {
            priority: 'high',
            ttl: 30_000, // call invites are short-lived
          },
          data: {
            type: 'incoming_call',
            from: opts.callerE164,
            to: opts.toE164,
            twilio_call_sid: opts.twilioCallSid,
          },
        });
        delivered += 1;
      } catch (err: unknown) {
        failed += 1;
        const code = (err as { code?: string })?.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          dead.push(device.id);
        }
        logger.warn({ err, deviceId: device.id }, 'FCM send failed');
      }
    }),
  );

  if (dead.length > 0) {
    await prisma.device.deleteMany({ where: { id: { in: dead } } });
  }

  return { delivered, failed };
}
