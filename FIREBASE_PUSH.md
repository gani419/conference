# Firebase invitation notifications

Firebase project: Conference (conference-79cf2). Website: https://conference-79cf2.web.app.

Invitations to existing registered accounts generate an in-app notification and a private backend push job automatically when the host creates or updates the meeting invite list. Repeated Send Invitations actions do not duplicate that notification. The Supabase worker runs each minute and sends through FCM HTTP v1 using a restricted service account; Firebase Cloud Functions are not required. Firebase remains on Spark.

Android: install the current APK, sign in with email/password, open Settings, press Enable notifications and allow the Android permission. On Android 12 and earlier, use Android app settings if system notifications were disabled. Google Play services and internet access are required. Foreground invitations offer Open; background invitations appear in Android's notification tray. Tapping opens the meeting details, with the usual host admission rules.

Web: sign in with email/password at the HTTPS website, press Enable notifications in the header, and allow the browser prompt. A supported Push API browser is required. Desktop Chrome works without installing the website. Browser/OS restrictions can prevent delivery when the browser is fully shut down. Safari on iPhone requires a Home Screen web app; native iOS integration remains deferred. Tapping an invitation opens that meeting.

Guest accounts cannot register notification devices. Invitees must be existing registered users whose account email matches the host's invitation. Notifications are invitations, not incoming phone calls. Permission is optional.

## Configuration

Keep all values in the ignored root .env. Use .env.example as the blank template.

Public browser keys: FIREBASE_PROJECT_ID, FIREBASE_WEB_APP_ID, FIREBASE_WEB_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_WEB_VAPID_KEY.
Public Android keys: FIREBASE_PROJECT_ID, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_ANDROID_APP_ID, FIREBASE_ANDROID_API_KEY.
Private backend only: FCM_SERVICE_ACCOUNT_JSON, a quoted one-line JSON value. The JSON contains the service-account private key. Never add it to any VITE_ variable or client config.

The service account needs roles/firebasecloudmessaging.admin on this Firebase project. Enable the FCM, FCM Registrations and Firebase Installations APIs. Account credentials are uploaded to Supabase Edge Function secrets by backend/scripts/upload-secrets.mjs.

npm run env:mobile generates ignored android/app/google-services.json and the existing mobile public environment file. npm run web:build generates web/.env and public/firebase-messaging-sw.js using explicit public allowlists. The web build scans for private credentials before deployment. Generated app API keys are public identifiers; server authorization is enforced by Supabase and FCM credentials.

## Delivery and account safety

Push tokens are private to their owning account under RLS. Registration validates the account and device fields, and a unique token can belong to only one user. Disable notifications and logout unregister the device, delete the FCM token and clear the local preference. Web service workers additionally check recipient IDs against the current account before displaying/opening a message; Android foreground/tap handlers check the account too.

Push text is generic and does not contain meeting titles or attendee names. Already displayed Android system notifications can remain in the tray after logout; tapping cannot open the previous account's meeting under another account.

Read notifications, revoked/answered invitations and ended/cancelled meetings are skipped before delivery. Expired FCM registrations are removed. Transient failures retry after the worker lease expires; OS notification tags collapse repeated deliveries. FCM acceptance does not guarantee receipt when devices are offline or notifications are blocked. No retroactive push is sent for old invitations when permission is enabled later.

## Verification

- npm run typecheck
- npm test -- --runInBand
- npm --prefix backend test
- npx --yes deno@2.9.6 check --config backend/supabase/functions/deno.json backend/supabase/functions/outbox-worker/index.ts
- npx --yes deno@2.9.6 test --allow-env --config backend/supabase/functions/deno.json backend/tests/media.test.ts backend/tests/push.test.ts
- Execute backend/tests/push-authorization.sql against the hosted development project. Synthetic data is rolled back.
- npm run web:build
- npm run web:deploy

For actual receipt: enable notifications on a registered recipient's device/browser, create an invitation to that account email from a second host, background the receiving app, wait up to one minute, and tap the notification. Check Disable notifications and sign-out prevent future delivery; check acceptance/decline/admission normally. Physical receipt should be recorded separately from automated tests.

## Domains

conference.com is already registered. meet.conference.com requires control of conference.com; subdomains cannot be purchased independently from that parent. Firebase Hosting accepts owned custom domains and supplies HTTPS, but it does not give ownership of a paid .com domain. The current conference-79cf2.web.app address remains free within Spark Hosting limits.

## Verification recorded on 8 October 2026

The migration and cloud worker are deployed. Database tests passed registration authorization, guest denial, token ownership transfer, automatic invitation queuing, duplicate suppression and logout cleanup. All four Edge Function entry points passed Deno type checking, and four Deno tests passed for media authorization, OAuth signing, FCM error handling and skipped invitations. Native Jest passed all six suites; the final targeted push suite contains four passing lifecycle tests. The web dependency audit reports zero vulnerabilities.

Real Chrome web verification passed FCM token registration, Firebase delivery of a host invitation, foreground opening of the meeting and token removal on logout. The test uses a normal browser profile because private browsing blocks push registration. Temporary users and meeting data were revoked/deleted afterward. Background account filtering and notification tap behavior also passed service-worker unit tests; actual background notification display still needs a manual receipt check.

The Android APK built for arm64-v8a and x86_64 and was installed on the connected Redmi Note 9 Pro. Startup showed no application errors in the checked logs. Android FCM receipt and notification-tap navigation were verified on the Redmi Note 9 Pro: the background invitation appeared in Android notification records, and tapping it opened the correct Meeting Details page. Do Not Disturb was temporarily disabled for the tap check and restored afterward. Temporary host, meeting and invitation data were removed; the recipient account and notification preference were preserved. iOS remains deferred. Firebase billing was checked and remains disabled (Spark).
