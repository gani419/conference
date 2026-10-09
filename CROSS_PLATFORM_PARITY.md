# Cross-platform dashboard and appearance

Updated 2026-10-09.

- Web, Android, and the shared iOS UI use the four dashboard sections from `shared/dashboard.ts`: Upcoming, Recent, Invitations, Notifications.
- Mobile invitation actions use the existing authenticated backend: accept, decline, and open. Notifications support marking one/all read and opening the related meeting.
- Web Settings provides account information, appearance, push notification controls, and sign out. Settings opens as a dialog so opening it during a meeting does not disconnect the call.
- Web and native colors come from `shared/theme.ts`. System, Light, and Dark choices are saved on each device/browser; appearance preferences do not synchronize across devices.
- Native dashboards use one responsive implementation. Phones show four horizontally scrollable tabs; wider devices use side-by-side hero cards and a meeting grid. Meeting forms and Settings have readable maximum widths. Existing meeting-room tablet layouts remain available.

## Validation

- Native TypeScript: passed. Jest: 9 suites, 26 tests passed, including invitation and notification actions.
- Web build and public-configuration scan: passed. Chrome checks passed at 390, 820, and 1280 pixels, including invitation acceptance, notification read state, Settings, persisted dark mode, and overflow checks.
- Updated Android build installed on the connected Redmi phone. All four sections and live-backend Invitations/Notifications loading checked. Android tablet width simulated by temporarily changing display density; original density restored.
- Web deployed to https://conference-79cf2.web.app.
- Physical Android-to-web receive-only call checks passed on 2026-10-09: real camera video, received microphone packets, Android screen sharing, two-way chat, admission, mute/request/approve, and leave/rejoin. See [test evidence and coverage limits](WEB_ANDROID_TESTING.md). A PC without camera/audio hardware cannot validate PC media publishing or audible playback.

## Remaining platform validation

- iOS/iPad uses the updated shared UI but has not been compiled or tested on Apple hardware here. iOS background push still requires Firebase/APNs configuration; currently push delivery is implemented for Android and web.
- These checks cover dashboard and appearance parity. They do not replace full call regression tests on a physical Android tablet or iPad. Email verification/recovery delivery remains intentionally deferred until SMTP is configured.
## Meeting updates (2026-10-08)

- The native dashboard scrolls vertically with long meeting histories; its tabs scroll horizontally. Instant opens setup with optional guests/co-hosts before creating a live meeting.
- Native scheduling uses calendar/date and time pickers. Native and web forms save an explicit meeting expiry (two-hour default for newly created meetings). Existing meetings keep their prior expiry behavior unless edited.
- Manual invitations use full-width name/email fields and email-only contact selection. Autocomplete returns recent invitees and registered accounts by exact email, without exposing a global partial-name directory. Contacts and CSV require email.
- Upcoming opens by meeting UUID; Details and Lobby show expiry, active count, and current participants.
- Mobile informational alerts use toasts. Destructive actions use themed confirmation dialogs, including Stay/Logout. Modal forms can display their own toasts.
- Avatar palettes are shared by web/native registration and dashboards. Missing avatars use the default user icon.
- Call controls use a four-column icon grid on phones and icons with labels on wider screens. Leave and End for everyone are separate actions on web and native.
- Leave keeps the meeting live; hosts/co-hosts retain roles on rejoin. Android waits for refreshed admission data before opening the room to avoid using a cached left record. Expiry rejects backend joins, limits media token lifetime, and schedules media-room closure. Signed LiveKit leave webhooks update membership without affecting a more recent rejoin.

Validation: rollback-only Supabase tests passed for next-minute/day/year scheduling, custom/default expiry, Details access, host/co-host leave and rejoin, autocomplete privacy, expired joins, and cleanup. Deno media tests passed. The hosted browser host/guest call passed admission, media, moderation, chat, and attendance. Physical Redmi checks covered Recent scrolling, Instant setup, manual invite sizing, logout Stay, Upcoming details, call controls, and real LiveKit reconnection. iOS/iPad remains uncompiled on this Windows workstation.


On 2026-10-09, physical Android-to-web testing exposed an end-of-meeting navigation race. Android now refreshes meeting status before routing a left participant. The rebuilt APK was installed on the Redmi and the web-host end action correctly opened Android Meeting Summary. All 10 Jest suites / 30 tests and TypeScript passed. See WEB_ANDROID_TESTING.md for the verified checks and remaining coverage.

Web invitation import was deployed on 2026-10-09. CSV supports a local review step, guest/co-host roles, email validation, duplicate skipping, and a downloadable template. Supported browsers offer selected device contacts; desktop browsers fall back to CSV/manual entry. See web/INVITATION_IMPORT.md for browser support and verification.
