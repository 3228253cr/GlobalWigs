import { Router, Response } from 'express';
import { twiml } from '../lib/twilio';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { findUserByPhoneNumber, getUserActiveNumber } from '../services/number.service';
import { notifyIncomingCall } from '../services/push.service';
import { validateTwilioSignature } from '../middleware/twilioSignature';

export const webhooksRouter = Router();

function sendVoice(res: Response, voice: { toString: () => string }) {
  res.type('text/xml').send(voice.toString());
}

/**
 * Carrier hits this when a PSTN caller dials one of our pool numbers.
 * We look up which user currently owns the number and bridge the call
 * to their Android app via Twilio's `<Dial><Client>` verb.
 */
webhooksRouter.post('/twilio/voice/incoming', validateTwilioSignature, async (req, res) => {
  const { From, To, CallSid } = req.body as { From: string; To: string; CallSid: string };
  logger.info({ From, To, CallSid }, 'Inbound call');

  const response = new twiml.VoiceResponse();

  const match = await findUserByPhoneNumber(To);

  if (!match || !match.assignment) {
    response.say(
      { language: 'en-GB', voice: 'Polly.Amy' },
      'This number is not currently assigned. Goodbye.',
    );
    response.hangup();
    sendVoice(res, response);
    return;
  }

  const userId = match.assignment.userId;

  // Persist a CallLog row in INITIATED state
  await prisma.callLog.create({
    data: {
      direction: 'INBOUND',
      fromE164: From,
      toE164: To,
      userId,
      phoneNumberId: match.number.id,
      providerCallSid: CallSid,
      status: 'RINGING',
    },
  });

  // Wake the device via FCM in parallel — non-blocking
  notifyIncomingCall({
    userId,
    callerE164: From,
    toE164: To,
    twilioCallSid: CallSid,
  }).catch((err) => logger.error({ err }, 'FCM notify failed'));

  const dial = response.dial({
    callerId: From,
    answerOnBridge: true,
    timeout: 30,
    action: `/webhooks/twilio/voice/dial-status?callSid=${encodeURIComponent(CallSid)}`,
  });
  dial.client(`user_${userId}`);

  sendVoice(res, response);
});

/**
 * Twilio TwiML App "Voice URL" — invoked when the Android Voice SDK
 * places an outgoing call. The SDK sends the destination in the `To`
 * parameter we configure in the client.
 */
webhooksRouter.post('/twilio/voice/outgoing', validateTwilioSignature, async (req, res) => {
  const { To, From, CallSid } = req.body as { To?: string; From?: string; CallSid: string };
  logger.info({ To, From, CallSid }, 'Outbound call request');

  const response = new twiml.VoiceResponse();

  if (!To) {
    response.say('Missing destination number.');
    response.hangup();
    sendVoice(res, response);
    return;
  }

  // `From` here is the Twilio Voice SDK identity (e.g. "user_<id>")
  const identity = (From ?? '').replace(/^client:/, '');
  const userIdMatch = /^user_(.+)$/.exec(identity);
  if (!userIdMatch) {
    response.say('Caller identity invalid.');
    response.hangup();
    sendVoice(res, response);
    return;
  }
  const userId = userIdMatch[1];

  const callerNumber = await getUserActiveNumber(userId);
  if (!callerNumber) {
    response.say('No outbound caller ID available. Please claim a number first.');
    response.hangup();
    sendVoice(res, response);
    return;
  }

  await prisma.callLog.create({
    data: {
      direction: 'OUTBOUND',
      fromE164: callerNumber.e164,
      toE164: To,
      userId,
      phoneNumberId: callerNumber.id,
      providerCallSid: CallSid,
      status: 'INITIATED',
    },
  });

  const dial = response.dial({ callerId: callerNumber.e164, answerOnBridge: true });
  dial.number(To);

  sendVoice(res, response);
});

/**
 * Status callbacks for both inbound and outbound calls so we can update
 * the CallLog with completion / duration / outcome.
 */
webhooksRouter.post('/twilio/voice/status', validateTwilioSignature, async (req, res) => {
  const { CallSid, CallStatus, CallDuration } = req.body as {
    CallSid: string;
    CallStatus: string;
    CallDuration?: string;
  };

  const statusMap: Record<string, 'COMPLETED' | 'BUSY' | 'NO_ANSWER' | 'FAILED' | 'CANCELED' | 'IN_PROGRESS' | 'RINGING'> = {
    completed: 'COMPLETED',
    busy: 'BUSY',
    'no-answer': 'NO_ANSWER',
    failed: 'FAILED',
    canceled: 'CANCELED',
    'in-progress': 'IN_PROGRESS',
    ringing: 'RINGING',
  };
  const status = statusMap[CallStatus];
  if (status) {
    const duration = CallDuration ? Number(CallDuration) : 0;
    await prisma.callLog.updateMany({
      where: { providerCallSid: CallSid },
      data: {
        status,
        durationSec: duration,
        endedAt: ['COMPLETED', 'BUSY', 'NO_ANSWER', 'FAILED', 'CANCELED'].includes(status)
          ? new Date()
          : undefined,
      },
    });
  }

  res.sendStatus(204);
});

webhooksRouter.post('/twilio/voice/dial-status', validateTwilioSignature, async (req, res) => {
  // No-op for now — could chain to voicemail TwiML on no-answer
  res.type('text/xml').send('<Response/>');
});
