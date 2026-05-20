import { env } from '../config/env';
import { TwilioVoice, VoiceGrant } from '../lib/twilio';

/**
 * Create a Twilio Access Token for the Android Voice SDK so the device can
 * (a) register to receive incoming calls and (b) initiate outgoing calls
 * that hit our TwiML App webhook.
 */
export function createVoiceAccessToken(opts: {
  identity: string;
  ttlSeconds?: number;
}): { token: string; identity: string; expiresAt: Date } {
  const ttl = opts.ttlSeconds ?? 60 * 60; // 1 hour default

  const token = new TwilioVoice(
    env.TWILIO_ACCOUNT_SID,
    env.TWILIO_API_KEY_SID,
    env.TWILIO_API_KEY_SECRET,
    { identity: opts.identity, ttl },
  );

  const grant = new VoiceGrant({
    outgoingApplicationSid: env.TWILIO_TWIML_APP_SID,
    incomingAllow: true,
  });
  token.addGrant(grant);

  return {
    token: token.toJwt(),
    identity: opts.identity,
    expiresAt: new Date(Date.now() + ttl * 1000),
  };
}
