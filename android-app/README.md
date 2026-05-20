# GlobalWigs VoIP — Android App (Week 2 deliverable)

This directory will hold the Android client. **Not yet implemented** — it's
the Week 2 deliverable per the project plan.

## Planned stack

- **Kotlin** + **Jetpack Compose** (modern Android UI)
- **Twilio Voice Android SDK** (`com.twilio:voice-android:6.+`)
- **Android Telecom / ConnectionService** for native incoming-call UI
  (full-screen ringer, integrated with the system's call log)
- **Firebase Cloud Messaging (FCM)** for incoming-call push wake-up
- **Retrofit + OkHttp** for backend REST calls
- **DataStore** for token persistence
- **Hilt** for DI

## Screens (MVP)

1. **Sign in** — email + password → JWT
2. **Home** — current assigned number (or "Claim a number" CTA)
3. **Claim number** — country picker → list of AVAILABLE pool numbers → claim
4. **Dial** — phone-pad UI, places outbound call using assigned CallerID
5. **Incoming call** — handled by ConnectionService, full-screen native UI
6. **Call history** — pulls `/voice/logs`
7. **Settings** — release number, sign out

## Permissions needed (AndroidManifest)

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>
<uses-permission android:name="android.permission.READ_PHONE_STATE"/>
<uses-permission android:name="android.permission.MANAGE_OWN_CALLS"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL"/>
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
<uses-permission android:name="android.permission.READ_CONTACTS"/>
```

## Build prerequisites (when we start week 2)

- Android Studio Ladybug or later
- minSdk 26 (Android 8.0 — covers ~95% of devices, gives us ConnectionService features we need)
- targetSdk 35 (Android 15)
- A real Android device (preferably 2) for testing — emulator works for UI
  but call quality testing needs hardware.

## What you need to provide

- `google-services.json` from Firebase Console (Android app entry) →
  place at `app/google-services.json`
- The Twilio + backend URLs as `BuildConfig` fields injected from
  `local.properties` (never commit)
