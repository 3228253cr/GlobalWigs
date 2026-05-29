# Global Air Export - Wig Export Management System

## 🏗️ Architecture
- **Frontend:** HTML + CSS + JavaScript (hosted on GitHub Pages)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Cost:** FREE (both GitHub Pages and Supabase free tier)

## 📁 Files
```
├── index.html          # Login page
├── dashboard.html      # Orders dashboard
├── order.html          # New/Edit order form
├── customers.html      # Customer management
├── settings.html       # Agents & Suppliers
├── css/style.css       # Shared styles
├── js/config.js        # Supabase configuration
└── supabase-schema.sql # Database schema (run in SQL Editor)
```

## 🚀 Setup Instructions

### 1. Supabase
1. Go to Supabase Dashboard → SQL Editor
2. Paste `supabase-schema.sql` and run
3. Go to Authentication → Settings → Enable email auth

### 2. GitHub
1. Create repository: `GLOBAL_AIR_EXPORT`
2. Upload all files (except .sql)
3. Settings → Pages → Source: main branch
4. Site will be at: `https://USERNAME.github.io/GLOBAL_AIR_EXPORT/`

### 3. First Login
1. Open the site
2. Click "הרשמה" (signup)
3. Enter email + password
4. Check email for confirmation
5. Login and start!

---

## 📞 VoIP Dialer (Twilio) — Setup

The browser dialer (`dialer.html`) lets you place outgoing phone calls from
the browser using Twilio. Because a phone call requires an Access Token that
is signed with a secret key, a tiny serverless backend is needed. We use
**Twilio Functions** for this (the `twilio-functions/` folder).

### Step 1 — Twilio account & phone number
1. Create an account at https://www.twilio.com/try-twilio
2. Console → **Phone Numbers → Buy a number** → choose one with **Voice**
   capability. Note the number in E.164 format (e.g. `+12025550123`).

### Step 2 — API Key
1. Console → **Account → API keys & tokens → Create API key** (Standard).
2. Save the **SID** (`SK...`) and **Secret** (shown only once!).

### Step 3 — Deploy the Twilio Functions
1. Console → **Functions & Assets → Services → Create Service**
   (e.g. name it `globalwigs-voip`).
2. Add two functions and paste the code from this repo:
   - `/token`  ← `twilio-functions/token.js`
   - `/voice`  ← `twilio-functions/voice.js`
   - Set **both** functions' visibility to **Public**.
3. Add these **Environment Variables** (Service → Settings → Environment Variables):
   | Key              | Value                                  |
   |------------------|----------------------------------------|
   | `API_KEY_SID`    | Your API Key SID (`SK...`)             |
   | `API_KEY_SECRET` | Your API Key Secret                    |
   | `TWIML_APP_SID`  | (from Step 4 below — `AP...`)          |
   | `CALLER_ID`      | Your Twilio number, e.g. `+12025550123`|
4. Click **Deploy All**. Note your domain, e.g.
   `https://globalwigs-voip-1234-dev.twil.io`.

### Step 4 — TwiML App
1. Console → **Voice → TwiML → TwiML Apps → Create new**.
2. Set the **Voice Request URL** to your deployed `/voice` function:
   `https://<your-domain>.twil.io/voice` (method: `POST`).
3. Save and copy the **TwiML App SID** (`AP...`) into the `TWIML_APP_SID`
   env var from Step 3, then **Deploy All** again.

### Step 5 — Connect the frontend
1. Open `js/voip.js` and set `tokenUrl` to your deployed `/token` URL:
   ```js
   const VOIP_CONFIG = { tokenUrl: 'https://<your-domain>.twil.io/token' };
   ```
2. Commit & push. Open `dialer.html`, allow microphone access, and call.

> **Note:** Trial Twilio accounts can only call **verified** numbers and play
> a short trial message first. Upgrade the account to call any number.

### Files
```
├── dialer.html              # Browser dialer UI
├── js/voip.js               # Twilio Voice SDK logic (set tokenUrl here)
└── twilio-functions/
    ├── token.js             # Generates Voice Access Token  (/token)
    └── voice.js             # Returns TwiML to dial the number (/voice)
```
