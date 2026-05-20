import twilio from 'twilio';
import { env } from '../config/env';

export const twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

export const TwilioVoice = twilio.jwt.AccessToken;
export const VoiceGrant = twilio.jwt.AccessToken.VoiceGrant;
export const twiml = twilio.twiml;
