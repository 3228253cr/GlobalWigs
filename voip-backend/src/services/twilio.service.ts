import { twilioClient } from '../lib/twilio';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

/**
 * Search Twilio for purchasable numbers in a given country.
 * Returns raw results — UI/admin chooses which to buy.
 */
export async function searchTwilioNumbers(opts: {
  countryIso2: string;
  type?: 'local' | 'mobile' | 'tollfree';
  areaCode?: string;
  limit?: number;
}) {
  const country = opts.countryIso2.toUpperCase();
  const type = opts.type ?? 'local';
  const limit = opts.limit ?? 20;

  const client = twilioClient.availablePhoneNumbers(country);
  const opts2 = {
    voiceEnabled: true,
    limit,
    ...(opts.areaCode ? { areaCode: Number(opts.areaCode) } : {}),
  };
  if (type === 'mobile') return client.mobile.list(opts2);
  if (type === 'tollfree') return client.tollFree.list(opts2);
  return client.local.list(opts2);
}

/**
 * Purchase a Twilio number and add it to our pool. Wires incoming-call
 * webhook so the carrier hits our server when this number rings.
 */
export async function buyTwilioNumber(opts: {
  phoneNumber: string; // E.164
  countryIso2: string;
  countryName: string;
}) {
  const voiceUrl = `${env.PUBLIC_BASE_URL}/webhooks/twilio/voice/incoming`;
  const statusCallback = `${env.PUBLIC_BASE_URL}/webhooks/twilio/voice/status`;

  const purchased = await twilioClient.incomingPhoneNumbers.create({
    phoneNumber: opts.phoneNumber,
    voiceUrl,
    voiceMethod: 'POST',
    statusCallback,
    statusCallbackMethod: 'POST',
  });

  const created = await prisma.phoneNumber.create({
    data: {
      e164: purchased.phoneNumber,
      countryIso2: opts.countryIso2.toUpperCase(),
      countryName: opts.countryName,
      provider: 'TWILIO',
      providerNumberSid: purchased.sid,
      capabilities: {
        voice: purchased.capabilities.voice,
        sms: purchased.capabilities.sms,
        mms: purchased.capabilities.mms,
      },
      monthlyCostUsd: '1.15', // safe placeholder; real cost varies by country
      status: 'AVAILABLE',
    },
  });

  logger.info({ e164: created.e164, sid: created.providerNumberSid }, 'Bought Twilio number');
  return created;
}

/**
 * Release a number back to Twilio and mark it RETIRED in our pool.
 */
export async function releaseTwilioNumber(phoneNumberId: string) {
  const num = await prisma.phoneNumber.findUnique({ where: { id: phoneNumberId } });
  if (!num) throw new Error('number_not_found');
  if (!num.providerNumberSid) throw new Error('missing_provider_sid');

  await twilioClient.incomingPhoneNumbers(num.providerNumberSid).remove();
  await prisma.phoneNumber.update({
    where: { id: phoneNumberId },
    data: { status: 'RETIRED', releasedAt: new Date() },
  });
  logger.info({ e164: num.e164 }, 'Released Twilio number back to carrier');
}
