/**
 * Twilio Function: /token
 * ------------------------------------------------------------------
 * Generates a Voice Access Token (JWT) for the browser-based dialer.
 * The browser CANNOT create this token itself, because it requires the
 * Twilio API Secret which must never be exposed in client-side code.
 *
 * Required Environment Variables (set in the Twilio Functions service):
 *   API_KEY_SID     - Twilio API Key SID      (starts with "SK...")
 *   API_KEY_SECRET  - Twilio API Key Secret
 *   TWIML_APP_SID   - TwiML App SID           (starts with "AP...")
 * ACCOUNT_SID is provided automatically by the Twilio runtime.
 *
 * Call from the browser:  GET  /token?identity=<user-identity>
 * Returns JSON:           { "identity": "...", "token": "<jwt>" }
 * ------------------------------------------------------------------
 */
exports.handler = function (context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  // CORS — allow the GitHub Pages frontend to call this endpoint.
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Pre-flight CORS request — respond OK with no body.
  if (event.request && event.request.method === 'OPTIONS') {
    return callback(null, response);
  }

  const AccessToken = Twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  // Identity of the agent placing the call (e.g. their email).
  const identity = (event.identity || 'agent').toString().slice(0, 121);

  try {
    const token = new AccessToken(
      context.ACCOUNT_SID,
      context.API_KEY_SID,
      context.API_KEY_SECRET,
      { identity: identity, ttl: 3600 } // token valid for 1 hour
    );

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: context.TWIML_APP_SID,
      incomingAllow: false, // MVP: outgoing calls only
    });
    token.addGrant(voiceGrant);

    response.setBody({ identity: identity, token: token.toJwt() });
    return callback(null, response);
  } catch (err) {
    response.setStatusCode(500);
    response.setBody({ error: err.message });
    return callback(null, response);
  }
};
