# Free Firebase Hosting deployment

Live site: **https://meet-conference.web.app**. Project ID is stored in root `.env`. Billing was verified disabled before the Hosting-only release.

Use **Firebase Hosting** with the **Spark** plan for the Conference static React/Vite website. Existing Supabase and LiveKit services continue providing the backend and calls. Firebase Messaging provides push notifications. Firebase Auth, Firestore, Cloud Functions, and App Hosting are not used.

## Google account setup

1. Open https://console.firebase.google.com/ and sign in.
2. Choose **Create a project** (or **Add project**) and name it Conference. Choose an available unique Project ID. A display name and Project ID are different.
3. Google Analytics is optional for this demo; leave it disabled if offered. Complete project creation.
4. Confirm the project is on **Spark**. Do not link a Cloud Billing account if you want to remain on Spark. If an existing Google Cloud project already has billing linked, it will use Blaze; create a separate project for this free demo instead.
5. In **Project settings > General**, copy the **Project ID**. Only the Project ID needs to be shared in chat. Never share your Google password, CLI token, or service account key.

## Sign in locally

In PowerShell:

```powershell
cd D:\mywork\Conference
npx.cmd --yes firebase-tools@15.33.0 login
npx.cmd --yes firebase-tools@15.33.0 projects:list
```

Complete Google's login in the browser and approve Firebase CLI access. The CLI manages its local Google session; no token needs to be pasted into chat or committed to the repository.

## Configure the public origin

Add the chosen Project ID and public website origin to the ignored root `.env`. Replace the example project ID with the real value:

```dotenv
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_HOSTING_SITE_ID=your-hosting-site-id
FIREBASE_HOSTING_LEGACY_SITE_ID=your-project-id
WEB_ORIGIN=https://your-hosting-site-id.web.app
WEB_ADDITIONAL_ORIGINS=https://your-project-id.web.app
```

Keep all existing Supabase/LiveKit values. `FIREBASE_PROJECT_ID` selects the project. Hosting site IDs select the primary and optional legacy sites; they remain in root `.env`. Public Firebase project configuration is included in the browser.

Apply the public origin to the existing hosted backend:

```powershell
node backend/scripts/upload-secrets.mjs
node backend/scripts/configure-auth.mjs
```

These commands use the existing root Supabase access token. Auth configuration preserves this application's selected policy: email/password without confirmation, anonymous guests, and no phone login. The upload script also synchronizes the existing backend secrets, so root values must be current. The backend permits `WEB_ORIGIN` plus the exact comma-separated origins in `WEB_ADDITIONAL_ORIGINS`. It rejects other origins. Native mobile calls are unaffected. Redeploy Edge Functions after changing the CORS code.

## Deploy

The root `firebase.json` is already prepared. **Do not run firebase init or overwrite index.html.**

```powershell
npm.cmd run web:deploy
```

The command reads the Firebase Project ID from root `.env`, runs Firebase Hosting only, and triggers a fresh web build with the private-credential scan. The free public HTTPS URL is:

```text
https://your-hosting-site-id.web.app
```

Share that URL with the client after checking login, guest access, invitation refresh, admission, camera/microphone, screen sharing, and the ongoing Android interoperability test. Firebase Hosting transfer quotas cover web files; Supabase and LiveKit usage retain their separate plan limits. On Spark, excess hosting transfer can disable the website until the next monthly reset rather than create a paid overage.

## Official documentation

- Setup: https://firebase.google.com/docs/hosting/quickstart
- Spark and billing: https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- Hosting quotas: https://firebase.google.com/docs/hosting/usage-quotas-pricing

The first Hosting release is published. Future releases use `npm.cmd run web:deploy` after changes and appropriate checks. Backend CORS currently permits the public web.app origin.
## Shorter address

Primary: https://meet-conference.web.app. Legacy: https://conference-79cf2.web.app. The default Firebase site cannot be renamed; the shorter name is an additional site in the same project. Both serve the same build. The deployment script creates a temporary ignored CLI configuration from root `.env`, then removes it after deployment. All sites share project Hosting quotas.
