# PhysioLock plan API

## Current status

### Local fictional-data demo

Run `node server/dev-demo.mjs` and `npm start` in separate terminals. The demo reads the server-only Gemini settings, listens on LAN port 8787, and creates `.expo/physiolock-demo.json` containing an Expo pairing URL. Only private-network requests with a valid pairing code can obtain a six-hour demo session. Pairing requires the synthetic-data flag. Every demo request must acknowledge fictional data; licensed clinical adapters are disabled for demo sessions. This is an opt-in LAN development path, not production patient authentication. LAN traffic is not encrypted, so use fictional data only and a trusted Wi-Fi network. Production routes still require HTTPS and verified patient JWTs.

Scan the generated pairing URL as an Expo QR code. The app stores the temporary session in SecureStore; the Gemini key never enters the manifest or phone bundle. Sessions and pairing codes change when the server restarts. Personal AI sends messages to Gemini with retry/error states; it no longer uses preset reply matching. After pairing, the support-plan screen automatically requests AI organization using saved answers. Read the provider’s unpaid-service data terms before any real-data deployment.

The mobile flow supports offline plans and the paired fictional-data Gemini demo: saved profile → missing-detail follow-ups → support plan → editable preferences and local check-ins. The production patient service and trusted exercise-library adapters are not deployed or connected. No exercise-provider access or clinical approval is implied by website links.

Demo sign-in (`demo` / `Physio123`) is not patient authentication and cannot call this API. Do not use it for real patient records. The Expo prototype stores a single demo profile and check-ins using SecureStore; before enabling real accounts, namespace all device storage by the authenticated subject and clear patient state on account switching. There is no production patient login UI yet.

## Configure live generation

For the hypothetical-data Gemini demo, set `AI_PROVIDER=gemini`, `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-3.5-flash-lite` on the server. Gemini responses use the same catalog-only output validation as OpenAI. The unpaid Gemini tier is for synthetic demo data here; do not send real personal, confidential, or patient data to it. HTTPS and real patient authentication requirements below remain in force. Provider API credentials are separate from the app-server authentication token.

1. Deploy `server/index.mjs` under Node 24 behind HTTPS. There are no additional server dependencies.
2. Set the server variables listed in `.env.example` through your host’s secret manager. `OPENAI_API_KEY` is server-only. `OPENAI_MODEL` must be a model available to your account with Responses structured-output support. The example uses `gpt-4.1-mini`.
3. Connect a real identity provider. Set `AUTH_JWKS_URL`, `AUTH_ISSUER`, and `AUTH_AUDIENCE`. The server validates RS256 signatures, expiry, issuer, audience, and subject. Wrong or missing credentials fail closed.
4. Have a real mobile sign-in flow store its short-lived access token under SecureStore key `physiolock.patient-access-token`; implement token refresh with the chosen identity provider. Never store an OpenAI key on the phone. This is a required integration step, not implemented by demo login.
5. Set mobile `EXPO_PUBLIC_PLAN_API_URL` to the HTTPS server origin, then restart Metro. This variable is public and must not contain credentials.
6. Start the API with `node --env-file=server/.env server/index.mjs` for local development, or let your production host provide environment variables. Loopback binding is the default. Direct HTTP requests are rejected. `TRUST_TLS_PROXY=1` is allowed only when your trusted proxy terminates TLS and direct origin access is blocked. `ALLOW_LOCAL_TEST_HTTP=1` is only for synthetic automated tests, never patient use.

`GET /health` reports configuration status without patient information. `POST /v1/plans/generate` requires a validated patient access token, consent, JSON, and a saved profile. It rate-limits by subject and sends `Cache-Control: no-store`. Request bodies and tokens are not logged or stored by this process. Hosting-level logs, retention, access controls, and health-data obligations still need deployment review.

AI only selects and orders IDs from vetted preparation and therapist-question catalogs. It cannot write treatment activities, dose, source URLs, diagnoses, or progressions. Input text is treated as untrusted data. OpenAI requests use `store: false` (not a claim of zero retention). The distinct name field and raw therapist instructions are excluded from the OpenAI payload, but free-text goals can still contain personal information. Patients see a consent prompt before transmission.

## Wibbi / HEP2go access

- Wibbi: https://wibbi.com/ and https://wibbi.com/partners/.
- HEP2go: the user-supplied exercise listing is preserved in `activity-sources.mjs`. It is a listing, not an API credential or an individual verified exercise.
- HEP2go’s published FAQ states that reusing its information/pictures in other apps or media requires written approval: https://www.hep2go.com/faqs_answer4.php.

Set `ACTIVITY_ADAPTER_MODULE` to an absolute server-side module path supplied by your licensed integration. It must export `{ async retrieve({patientSubject, profile, includeCandidates}) { return {activities: [...]}; } }`. The adapter must enforce provider permissions and patient ownership, verify source IDs and suitability, and return only appropriately scoped records. There are no invented Wibbi/HEP2go API endpoints in this repository.

An optional `licensed-export-adapter.mjs` can read a **provider-authorized normalized export**. Set `LICENSED_ACTIVITY_EXPORT_PATH` and `SOURCE_LICENSE_REFERENCE`. The file requires `authorizationConfirmed: true`, a matching `licenseReference`, and an `activities` array. These flags are an operator assertion, not a replacement for provider permission or verification. Keep this file and all media URLs outside the mobile bundle and source repository.

Each activity record requires:

| Field | Contract |
| --- | --- |
| `id`, `name`, `therapyType`, `patientSubject` | Exact source activity name; authenticated patient scope. |
| `source` | `{name: "Wibbi" or "HEP2go", identifier or https url, authorized: true, verified: true}`. Other approved resources require `APPROVED_ACTIVITY_SOURCES` on the server. |
| `goal`, `equipment`, `instructions`, `precautions` | Verified goal match, string arrays for equipment/precautions, exact authorized instruction text. |
| `dosage`, `frequency`, `supervision` | Exact clinician-provided strings or null; never AI-generated. Missing details keep practice locked. |
| `approval` | `{status: "pending"}` or clinician-verified `{status: "approved", clinicianId, approvedAt}`. Demonstrations additionally require `homePracticeAuthorized: true` and `supervisionConfirmed: true` from the clinician integration. Only trusted provider/clinician records may assign approval. |
| `media` | Array of `{type: "image", "video", or "provider-page", url: HTTPS, authorized: true, verified: true, authorizationReference, caption}`. URLs must come from the provider; use signed/appropriately scoped links where required. |

Only Wibbi/HEP2go or explicitly configured approved sources are accepted. Client-supplied activity and approval records are discarded. Candidates require sufficient profile details and remain in “Draft for clinician review.” Candidate demonstrations do not unlock. Approved demonstrations require source authorization, clinician approval, missing details resolved, and no symptom pause. Images render natively; videos/provider pages open the authorized provider player, preserving its access controls. No media is scraped, downloaded, or bundled.

Pasted therapist instructions are preserved verbatim but labeled patient-entered and unverified. If prescribed frequency/duration cannot be checked against preferences, the plan flags clarification instead of inventing a compatible routine. No scheduler interprets prose into medical dosage.

## Updates and tests

Preference changes regenerate organizational sections and retain exact cached clinician records. Reconnecting live refreshes trusted provider approval. Offline clinician records can become stale; this prototype has no offline guided-practice player, so it does not claim real-time approval verification. New/worsening symptoms pause activity recommendations and demonstrations. Possible emergency symptoms direct the patient to local emergency services.

Run `node --test questionnaire.test.mjs plan-engine.test.mjs server/service.test.mjs` from the app directory. The tests use synthetic records and mocked OpenAI responses; they do not demonstrate a live provider connection. Run `node node_modules/expo/bin/cli export --platform ios --platform android --output-dir dist` to verify mobile bundling.
