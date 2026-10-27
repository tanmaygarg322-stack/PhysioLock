# PhysioLock — Expo Go

Native React Native prototype with demo sign-in, accessible branching onboarding, per-day scheduling preferences, a saved support-plan screen, local patient-reported check-ins, and a demo companion chat.

## Run on your phone

1. Install Node.js LTS and Expo Go compatible with SDK 58.
2. In this folder, run `npm install` (or use the included pnpm lockfile with pnpm).
3. Run `npm start` and scan the QR code. Keep the phone and computer on the same Wi-Fi.
4. On iPhone, use the same Expo account in the CLI and Expo Go (`npx expo login`).
5. Demo credentials: username `demo`, password `Physio123`.

If LAN is blocked, use `npx expo start --go --tunnel`. Expo guide: https://docs.expo.dev/get-started/start-developing/.

## Working flow

Onboarding starts with physical, occupational, speech-language, multiple therapies, or unsure. Questions branch into relevant activities, goals, assistance, therapy stage, optional demographic details, app preferences, and therapist instructions. Written answers are optional. Choose at least three days and a separate time for each day from 5 AM through 9 PM.

The editable summary preserves answers when going back and removes irrelevant answers when therapy types change. Larger text, simpler prompts, and read-aloud are available from the first screen. Read-aloud on iPhone needs silent mode off.

After onboarding, **Your Plan** opens automatically. It reuses saved answers and asks only for missing details. A local support plan is available immediately. It shows goals, preparation steps, unchanged patient-entered therapist instructions, clinician-verified routines when available, day/time preferences, reminder status, therapist questions, pending review, and check-ins. Follow-up answers can be reviewed or edited. Organizational regeneration does not change clinician dosage.

Profile edits preserve cached clinician instructions. New or worsening symptom reports pause activity recommendations and demonstrations. The app never treats preferences as medical clearance. There is no guided-practice player yet. Reminders are preferences only; no device notifications are scheduled. App Lock, camera verification, and rewards remain placeholders.

## Live AI and exercise providers

For this fictional-data demo, live Gemini chat and plan organization are connected through `node server/dev-demo.mjs`. Scan the latest pairing QR while Expo runs on port 8081 and the API on 8787. Pairing creates a temporary local demo session, not a real patient account. The robot now uses live model replies. After pairing, plans use Gemini automatically on entering the plan screen. Keep both processes running and both devices on the same trusted Wi-Fi. Real patient use still requires the production HTTPS/identity deployment described in the server guide.

The local fictional-data demo uses live Gemini through temporary paired sessions. Production patient services still need an HTTPS deployment and a real identity provider. The demo login cannot call production patient routes.

Wibbi and the user-provided HEP2go listing are the intended exercise/image/video sources. They are **not connected**. No exercise catalog or copyrighted demonstrations have been copied. Only authorized provider records with verified identifiers can enter the routine or review queue. Media requires explicit authorized and verified provenance. Unapproved demonstrations stay locked; approved videos open the provider player rather than being downloaded.

Read [server/README.md](server/README.md) for setup, identity requirements, provider adapter format, licensed-export option, permission links, and limitations. Never put API keys in `EXPO_PUBLIC_` variables or the mobile bundle.

## Storage and privacy scope

Completed profiles, plans, and check-ins are stored on this phone in encrypted SecureStore chunks. Sign-out ends the session, but saved records remain so the same demo user can return. Explicit onboarding drafts use Save & return and can be resumed/deleted. This is a **single demo profile**, not a production multi-patient system. Demo login provides no real identity security; use synthetic data. Real account integration must scope local storage by authenticated patient and implement account switching/deletion before production use.

No answers are uploaded in offline mode. Pairing the fictional-data demo enables live Gemini requests and automatic plan organization. Chat messages and profile goals are sent to Gemini through the local service; use only hypothetical information. The server excludes the distinct name field and raw therapist instructions from plan-organization prompts, but free-text goals can still contain personal information. Chat replies are live, not preset. See the server guide for deployment requirements.

## Validation

`npm test` runs the questionnaire, plan safety, media provenance, AI-output validation, JWT, and HTTP endpoint checks. Tests use synthetic records and mocked AI/provider responses; they do not prove a live provider connection.

`node node_modules/expo/bin/cli export --platform ios --platform android --output-dir dist` verifies both native bundles.
