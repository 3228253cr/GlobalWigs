/**
 * Twilio Function: /voice
 * ------------------------------------------------------------------
 * This is the "Voice Request URL" of your TwiML App. When the browser
 * dialer starts a call, Twilio sends a request HERE to ask what to do.
 * We respond with TwiML that dials the requested phone number, using
 * your Twilio number as the caller ID.
 *
 * Required Environment Variable (set in the Twilio Functions service):
 *   CALLER_ID  - Your Twilio phone number in E.164 format, e.g. +12025550123
 *
 * The browser passes the destination as the "To" parameter.
 * ------------------------------------------------------------------
 */
exports.handler = function (context, event, callback) {
  const twiml = new Twilio.twiml.VoiceResponse();
  const to = (event.To || '').toString().trim();

  if (!to) {
    twiml.say(
      { language: 'en-US' },
      'No destination number was provided. Goodbye.'
    );
    return callback(null, twiml);
  }

  // Dial the destination using the Twilio number as caller ID.
  const dial = twiml.dial({ callerId: context.CALLER_ID });

  // If it looks like a phone number (E.164 / digits), dial a number.
  // Otherwise treat it as another client identity.
  const isPhoneNumber = /^[\d+\-()\s]+$/.test(to);
  if (isPhoneNumber) {
    dial.number(to.replace(/[^\d+]/g, ''));
  } else {
    dial.client(to);
  }

  return callback(null, twiml);
};
