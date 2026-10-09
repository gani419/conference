# Conference backend — Phase 1

Hosted project: **Conference**, **Gangadi's Org**, **Mumbai / ap-south-1**.
Project ref is read from the root `.env`, not embedded in application source.

## Configuration

The root `.env` is the local source of configuration. It is ignored by Git. `node backend/scripts/sync-env.mjs` writes backend, mobile, and web environment files from explicit allowlists. Public clients receive only the project ID, URL, publishable key, and LiveKit URL. Management tokens, database passwords, LiveKit API credentials, and email credentials remain server-side. Mobile/browser environment values are visible in compiled applications; `.env` is not an encryption mechanism.

Supabase injects its own database/API credentials into deployed Edge Functions. Custom credentials are uploaded from `.env` to Supabase's encrypted environment, rather than committing or uploading a plaintext `.env` as application source.

Once `SUPABASE_ACCESS_TOKEN` is set locally:

```powershell
node backend/scripts/configure-auth.mjs
node backend/scripts/link-project.mjs
node backend/scripts/upload-secrets.mjs
node backend/scripts/configure-worker.mjs
```

The auth configuration currently enables email/password accounts without inbox confirmation and anonymous guest sessions, disables phone login, and adds `conference://auth/callback` plus the web callback. Account creation, login, logout, recovery, and session refresh use Supabase Auth's API/client library. Guest display names and avatars are profile data; anonymous users cannot create meetings or become co-hosts. Since email ownership is unchecked, accepting an email invitation never grants co-host authority: the organizer must admit the user and explicitly grant that role.

Email confirmation is deferred at the user's request. Password recovery still requires delivery through Supabase Auth's email service; configure custom SMTP for external users when enabling it. Invitation emails use Resend and require `RESEND_API_KEY` and a verified `EMAIL_FROM`. Without email credentials, use meeting-code/link sharing; email jobs are not reported as delivered. Device push tokens are persisted, but FCM/APNs delivery requires separate platform credentials in a later integration.

## Database and API

`supabase/migrations/` tracks the deployed schema. `schema.sql`, `read-model.sql`, `outbox.sql`, and `cloud-worker.sql` are readable reference sources; apply the migrations, not all reference files again. All public tables have RLS. Public clients have read access scoped to their identity and meeting membership; privileged state changes run through identity-checked transactional functions in the private schema. User-editable JWT metadata never grants authority.

`conference-api` accepts a signed-in user's JWT in `Authorization: Bearer ...` and a publishable API key in `apikey`. Guests also receive real Supabase user JWTs. Requests use:

```json
{
  "mode": "command",
  "action": "join_meeting",
  "payload": { "meetingId": "uuid" }
}
```

Read mode supports `meetings`, `meeting_details`, `participants`, `permission_requests`, `chat`, `invitations`, `notifications`, and `attendance`. Pagination uses `limit` (maximum 100) and `offset`; the read response uses database field names. Only hosts receive a full attendance roster; participants see their own records. Meeting resolution uses `resolve_meeting` with `{ "code": "MEETINGCODE" }` and returns a limited lobby preview.

Commands support `create_meeting`, `update_meeting`, `join_meeting`, `leave_meeting`, `start_meeting`, `end_meeting`, `cancel_meeting`, `accept_invitation`, `decline_invitation`, `save_meeting`, `send_invitations`, `admit_participant`, `remove_participant`, `change_role`, `request_permission`, `decide_permission`, `update_permissions`, `bulk_permissions`, `raise_hand`, `lower_hand`, `send_chat`, `send_announcement`, `mark_notification_read`, `mark_all_notifications_read`, and `register_push_token`. Payloads use the mobile application's camelCase fields. Updates/cancellation require `expectedVersion`; meeting timing kind is fixed after creation. Invitations currently require email addresses; SMS delivery is unsupported.

Realtime Postgres Changes is enabled for meetings, participants, requests, chat, invitations, and notifications. Clients must set their session JWT and subscribe to their specific meeting. RLS applies to subscribed rows. The clients should refresh authoritative state when notifications arrive and reconnect.

## LiveKit Cloud media

The current configuration uses LiveKit Cloud. No Linux server or custom media domain is required. The URL, API key, and API secret are read from root `.env`; only the URL is exposed to clients. The deployed media-token function signs room access on the backend.

In LiveKit Cloud select Conference, then Settings → Webhooks → Create new webhook. Use the Conference Supabase URL plus `/functions/v1/media-webhook`, and select the signing API key matching `LIVEKIT_API_KEY`. After saving, open Actions → Send a test event and send `room_started`; expect HTTP 200. Dashboard registration is a separate step from testing the deployed endpoint.

Supabase processes queued media changes automatically after database commits using pg_net. A pg_cron job retries eligible work every minute; no worker HTTP calls are made while the queue is empty. Worker credentials are provisioned from `.env` into encrypted Supabase Vault using `configure-worker.mjs`. Leases prevent concurrent delivery and acknowledge jobs only after successful processing. Host control propagation remains asynchronous.

## Optional self-hosted media

LiveKit runs on your Linux server; Supabase does not host the media server. Supply a server and a domain with DNS pointing to its public IP. Use the [LiveKit deployment guide](https://docs.livekit.io/transport/self-hosting/deployment/) for host networking, firewall, TLS, capacity, and TURN setup.

Set `LIVEKIT_URL=wss://your-domain`, `LIVEKIT_DOMAIN`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` in root `.env`. Render the ignored private configuration:

```powershell
node backend/scripts/render-livekit.mjs
node backend/scripts/sync-env.mjs
node backend/scripts/upload-secrets.mjs
```

On the Linux VM, copy only the backend deployment files and a server environment file with the necessary values. From `backend/livekit`, start:

```sh
docker compose --env-file ../../.env up -d
```

The template runs LiveKit, a Caddy TLS proxy, and the outbox worker. Allow inbound TCP 80/443 for TLS, TCP 7881, and UDP 50000–60000. Keep LiveKit's signaling port 7880 private behind the proxy. The template does not configure TURN; add TURN/TLS for users behind restrictive corporate networks before broad production rollout. Docker is not available in this development workspace, so the server stack has not been run here.

`media-token` accepts `{ "meetingId": "uuid" }` and issues a 60-second LiveKit token only when the meeting is live and the user has been admitted. Tokens contain no room-admin grants. Mic, camera, and screen-share publication sources come from database permissions; LiveKit data messages are disabled so chat uses the controlled database API.

`outbox-worker` uses a random `BACKEND_WORKER_SECRET` and synchronizes authoritative database state with LiveKit. For the optional self-host deployment, the included runner polls once per second. `media-webhook` verifies LiveKit signatures and rechecks admission on connection. A previously issued token can briefly remain usable until expiration; the webhook and worker remove unauthorized connections. Strict instantaneous revocation is not claimed.

## Verification and phases

```powershell
node --test backend/tests/*.test.mjs
npx.cmd --yes deno check --config backend/supabase/functions/deno.json backend/supabase/functions/conference-api/index.ts backend/supabase/functions/media-token/index.ts backend/supabase/functions/outbox-worker/index.ts backend/supabase/functions/media-webhook/index.ts
npx.cmd --yes deno test --allow-env --config backend/supabase/functions/deno.json backend/tests/media.test.ts
```

Run `tests/authorization.sql` against the development database. Synthetic accounts and meeting data are rolled back. Tests verify guest hosting denial, lobby admission, role protection, chat access, permission requests, RLS isolation, and removal.

Phase 1 includes backend implementation and hosted configuration. Email/password signup without confirmation, guest sessions, API authorization, LiveKit credentials, signed webhook handling, and automatic job processing can be verified independently of email delivery. The LiveKit dashboard webhook has been registered and its test event sent; Android phone/emulator calls were verified with audio/video working both ways. Email verification, SMTP password recovery, emailed invitations, and FCM/APNs delivery are deferred. Phase 2 connects the native app to Supabase and LiveKit Cloud and verifies calls on actual devices. The mobile integration is implemented in the existing root application; see [mobile verification instructions](../mobile/README.md). The native directories have not yet been relocated. Phase 3 implements the React/Vite web app using the same backend. See [web setup and verification](../web/README.md). Hosted browser tests cover admission, real LiveKit media and screen sharing, moderation, chat, and attendance. Firebase Hosting deployment is live at https://meet-conference.web.app on Spark with billing disabled. Public-site browser tests passed for authentication, guest admission, bidirectional audio/video, screen sharing, moderation, chat, and attendance. The web-to-Android physical-device check remains in progress.

Firebase invitation push: see [configuration and verification](../FIREBASE_PUSH.md).
