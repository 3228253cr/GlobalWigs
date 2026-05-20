# GlobalWigs VoIP — Backend (MVP)

A backend that lets GlobalWigs employees temporarily claim foreign phone
numbers (UK, DE, IL, …) and route inbound calls to an Android app while
making outbound calls that present the assigned number as CallerID.

This is the **Week 1 deliverable** of the 4-week MVP plan: number pool,
auth, Twilio integration, FCM push pipeline, deployed on Railway.

---

## Stack

- Node.js 20+ • TypeScript • Express
- PostgreSQL via Prisma ORM
- Twilio Voice (incoming + outgoing via TwiML App)
- Firebase Admin (FCM push to Android)
- JWT auth (bcrypt), Zod validation, pino logs
- Deploys on Railway

---

## Local quickstart

```bash
cd voip-backend
cp .env.example .env       # fill in real values, see below
npm install
npx prisma migrate dev --name init
npm run dev
# → http://localhost:3000/health
```

Then create the first admin user (it auto-promotes the first signup to ADMIN):

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@globalwigs.local","password":"changeme123","displayName":"Admin"}'
```

---

## What you (the operator) need to provide

### 1. Twilio (paid, ~$25 to start)

1. Sign up at <https://www.twilio.com/try-twilio>, top up $20+.
2. Go to **Console → Account → API keys & tokens** and copy:
   - `Account SID` → `TWILIO_ACCOUNT_SID`
   - `Auth Token` → `TWILIO_AUTH_TOKEN`
3. Create an **API Key** (Console → Account → API keys → Create new):
   - `SID` → `TWILIO_API_KEY_SID`
   - `Secret` → `TWILIO_API_KEY_SECRET` (only shown once — save it!)
4. Create a **TwiML App** (Console → Voice → TwiML Apps → Create):
   - Voice **Request URL**: `https://<your-railway-url>/webhooks/twilio/voice/outgoing`
   - Voice **Status Callback URL**: `https://<your-railway-url>/webhooks/twilio/voice/status`
   - Copy the App SID → `TWILIO_TWIML_APP_SID`
5. Buy 1–3 test numbers (Console → Phone Numbers → Buy a Number):
   - Country: **United Kingdom**, type: **Local** (or **Mobile** if you want +44 7…)
   - Capabilities: ✅ Voice (SMS optional)
   - **After purchase**: set Voice → **A Call Comes In** → Webhook →
     `https://<your-railway-url>/webhooks/twilio/voice/incoming` (POST)
   - Or, easier: add the number to the backend via `POST /numbers/buy` once
     the server is deployed — the webhook is wired automatically.
   - Suggested first numbers: 1× GB, 1× DE (note: DE requires address proof),
     1× FR.

### 2. Firebase Cloud Messaging (free)

1. Go to <https://console.firebase.google.com> → **Add project**, call it
   `globalwigs-voip`.
2. Add an **Android app** (you'll need this anyway for the mobile app).
   Package name: `com.globalwigs.voip`. Download `google-services.json` —
   keep it for the Android project.
3. Settings → **Service accounts** → **Generate new private key** →
   download the JSON, save it as `firebase-service-account.json` next to
   this README. **Never commit it.**
4. Note the `project_id` from the JSON → set as `FIREBASE_PROJECT_ID`.

### 3. Voicenter (Israel, optional for Week 1)

Send an email to sales@voicenter.com asking for:
- 10 Israeli numbers (077/073/03 mix)
- REST API access for assign/release
- SIP trunk supporting 2-way + outbound CallerID
- KYC requirements + setup timeline

Once they provide credentials, fill in the `VOICENTER_*` env vars and we'll
wire a second provider in Week 3.

### 4. PostgreSQL

- **Local dev**: `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`
- **Production (Railway)**: just click **+ New → Database → PostgreSQL** —
  Railway sets `DATABASE_URL` automatically.

---

## Deploy to Railway (5 minutes)

1. Create a Railway account at <https://railway.app>.
2. **New Project → Deploy from GitHub** → pick `3228253cr/globalwigs` →
   branch `claude/voip-research-CBRob` → set **Root Directory** to
   `voip-backend`.
3. **+ New → Database → PostgreSQL** (in the same project).
4. Open the service → **Variables** → paste all values from your `.env`
   (except `DATABASE_URL`, which Railway provides automatically).
5. **Settings → Networking → Generate Domain** → copy the public URL,
   put it back into `PUBLIC_BASE_URL` and into the Twilio TwiML App
   webhook URLs.
6. Upload `firebase-service-account.json` as a **Volume** mounted at
   `/app/firebase-service-account.json`, and set
   `FIREBASE_SERVICE_ACCOUNT_PATH=/app/firebase-service-account.json`.

The first deploy runs `prisma migrate deploy` automatically.

---

## API surface (v0)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/auth/signup` | — | Create user (first signup becomes ADMIN). |
| `POST` | `/auth/login` | — | Returns JWT. |
| `GET`  | `/auth/me` | user | Profile + active assignment. |
| `POST` | `/devices/register` | user | Register Android FCM token. |
| `POST` | `/devices/unregister` | user | Remove an FCM token. |
| `GET`  | `/numbers/available` | user | List free pool numbers (optional `?country=GB`). |
| `POST` | `/numbers/claim` | user | Claim a number for N days. |
| `POST` | `/numbers/release/:id` | user | Release own assignment (number → quarantine). |
| `GET`  | `/numbers/all` | admin | Full pool view incl. assigned-to. |
| `GET`  | `/numbers/search` | admin | Twilio inventory search (`?countryIso2=GB&type=local`). |
| `POST` | `/numbers/buy` | admin | Purchase a Twilio number + add to pool. |
| `DELETE` | `/numbers/:id` | admin | Release back to Twilio (RETIRED). |
| `POST` | `/voice/token` | user | Twilio Voice JWT for the Android SDK. |
| `GET`  | `/voice/caller-id` | user | Returns the user's current outbound CallerID. |
| `GET`  | `/voice/logs` | user | Recent call history. |
| `POST` | `/webhooks/twilio/voice/incoming` | Twilio sig | Inbound → `<Dial><Client>` to user's app. |
| `POST` | `/webhooks/twilio/voice/outgoing` | Twilio sig | Outbound from app → bridges to PSTN. |
| `POST` | `/webhooks/twilio/voice/status` | Twilio sig | Updates CallLog rows. |

---

## Data model (Prisma)

- **User** — employee, role ∈ {EMPLOYEE, ADMIN}
- **Device** — Android device + FCM token (one user can have many)
- **PhoneNumber** — pool entry; status ∈ {AVAILABLE, ASSIGNED, QUARANTINED, RETIRED}
- **Assignment** — user ↔ number for a time window
- **CallLog** — every inbound/outbound call with status + duration

When a number is released, it enters a **30-day quarantine** (configurable
via `NUMBER_QUARANTINE_DAYS`) so a returning caller can't reach the new
holder. An hourly sweep promotes numbers back to `AVAILABLE` when their
cooldown expires.

---

## Roadmap

- ✅ Week 1: Backend + first Twilio numbers + Railway deploy (this PR)
- ⬜ Week 2: Android app skeleton (Kotlin + Jetpack Compose + Twilio Voice SDK)
- ⬜ Week 3: Android Telecom / ConnectionService for native incoming UI + Voicenter integration
- ⬜ Week 4: Pool management UI, call history, polish, internal field test

---

## Security notes

This is an **internal MVP** — not production-grade. Before exposing to
real customers we'd need: TLS everywhere (Railway provides), proper
secret rotation, Twilio signature validation in all envs (already enabled
by default in prod), call-recording consent flows, GDPR data deletion,
proper KYC, regulatory compliance for IL/EU number assignment, and audit
logs of all admin actions.
