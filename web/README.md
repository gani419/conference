# Conference web

Public demo: **https://meet-conference.web.app** - Firebase Hosting, Spark (billing disabled). The backend browser origin is configured for this URL.

Phase 3 is a React + Vite browser application that uses the same Supabase Conference project and LiveKit Cloud rooms as Android. The backend adapter is isolated in `src/backend/`, so a later Django migration can implement the same client contract.

## Run locally

From the repository root:

```powershell
npm.cmd --prefix web ci
npm.cmd run web
```

Open **http://localhost:5173** for local UI development in Chrome or Edge. Use **https://meet-conference.web.app** for backend-connected browser testing; the current backend accepts the primary and legacy public browser origins. Email/password accounts are shared with mobile. Guests receive real Supabase anonymous sessions. Open a copied web invitation or enter the meeting code to join the lobby. The host must admit attendees before they can connect to media.

Root `.env` remains the source of configuration. Startup/build generates ignored `web/.env` using an explicit allowlist: Supabase project ID, URL, publishable key, and LiveKit URL. Supabase access tokens, service credentials, and LiveKit API keys/secrets stay on the backend. Browser permissions require HTTPS or localhost. Do not expose the development server publicly.

## Features

- Email/password signup and login, persistent sessions, anonymous guest access, and sign-out.
- Instant and scheduled meetings, editing, cancellation, saved reminders, meeting history, and attendance summaries.
- Web and mobile invitation links, invitee lists, invitation responses, in-app invitation notifications, and read status.
- Lobby camera preview, host admission/denial, host/co-host controls, removal, raised hands, meeting locking, and end-for-everyone.
- Real LiveKit camera/microphone, screen sharing, remote playback, reconnection, permission requests/approval, per-attendee controls, and bulk microphone/camera/chat controls.
- Chat, host announcements, Realtime updates with polling recovery, responsive layout, and keyboard-accessible meeting forms.

Use **Notify invitees** to create in-app notifications for registered invitees. Share links directly with other invitees. Email verification, password recovery emails, invitation emails, and push delivery remain deferred pending provider configuration. Invitations alone do not grant co-host authority; the organizer promotes an admitted registered attendee.

## Build and verification

```powershell
npm.cmd run web:build
npm.cmd run web:test
```

The build goes to `web/dist`. Its postbuild check rejects private root credentials in generated browser configuration or build artifacts. The standard browser checks use installed Google Chrome; install Chrome or change Playwright's browser channel for another environment.

The hosted test is opt-in and needs a valid `SUPABASE_ACCESS_TOKEN` in root `.env` for cleanup:

```powershell
$env:CONFERENCE_HOSTED_TEST='1'
$env:CONFERENCE_TEST_BASE_URL='https://meet-conference.web.app'
npm.cmd run web:test
Remove-Item Env:CONFERENCE_HOSTED_TEST
Remove-Item Env:CONFERENCE_TEST_BASE_URL
```

It creates temporary email/password and anonymous accounts, exercises the actual deployed backend and LiveKit rooms, revokes sessions, and deletes only those test accounts/meetings. An interrupted cleanup leaves identifiers in ignored `web/.env.browser-test`; clean that test data before rerunning. Test traces are disabled to avoid recording credentials. Test media uses Chromium's generated camera/audio input and automatic display capture; production media uses the user's devices and browser permission prompts.

Verified on this PC against the public Firebase HTTPS site: email/password and guest sessions, guest refresh before requesting admission, lobby admission without premature media connection, bidirectional video frames/audio packets, screen sharing, chat/announcements, host mute and permission approval, raised hands, lock/unlock, end-for-everyone, and host/guest attendance visibility. Physical microphone/camera quality and the web-to-Android call check are pending the connected phone.

## Publish later

Deploy `web/dist` to an HTTPS static host with an SPA fallback to `index.html`. Set root `WEB_ORIGIN` to the exact deployed origin, upload that backend secret using the existing backend script, and configure Supabase Auth site/redirect URLs for that origin. The current backend CORS origin is https://meet-conference.web.app; opening a different origin requires configuration. Rebuild whenever public root configuration changes. LiveKit signing credentials stay in Supabase Edge Functions.

Firebase Hosting deployment is live at https://meet-conference.web.app. A custom domain is optional and has not been configured. This phase does not migrate the backend to Django.
For the free Firebase Spark deployment procedure, see [Firebase Hosting steps](FIREBASE_HOSTING.md). Root `firebase.json` and `npm.cmd run web:deploy` are prepared; the Firebase target stays in root `.env`.

Firebase invitation push: registered users can enable notifications in the header. See [configuration and verification](../FIREBASE_PUSH.md).

The shorter primary address is https://meet-conference.web.app. The original https://conference-79cf2.web.app remains a working alias. Hosting site IDs are configured in root `.env`; `npm run web:deploy` deploys both sites.
