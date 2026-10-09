# Mobile — Phase 2

The React Native application currently builds from the repository root (`src/`, `android/`, and `ios/`). This folder contains mobile configuration and verification scripts. The native application has not been relocated into `mobile/` yet.

The app connects to Conference on Supabase and LiveKit Cloud. Email/password authentication, anonymous guests, meeting creation, invitation links, lobby admission, participant permissions, chat, announcements, raised hands, locking, removal, and attendance use the backend. LiveKit carries camera, microphone, and Android screen sharing.

## Development

Keep credentials in the ignored root `.env`. Run from the repository root:

```powershell
npm.cmd run env:mobile
npm.cmd start
npm.cmd run android
```

The generator bundles only `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `LIVEKIT_URL`. LiveKit API secrets, Supabase access tokens, and privileged credentials remain on the backend. Mobile sessions use native Keychain storage.

For two Android devices, enable USB debugging and authorize both phones. Run `adb devices -l`, then `adb -s SERIAL reverse tcp:8081 tcp:8081` for each device when using a debug build with Metro. Both phones need internet access.

For iOS, install CocoaPods dependencies and build `ios/Conference` on a Mac. Camera/microphone usage descriptions and the invitation URL scheme are configured. iOS screen sharing requires a Broadcast Upload Extension and is unavailable until that extension is configured.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd test -- --runInBand
node mobile/scripts/verify-backend.mjs
```

Hosted adapter verification creates temporary host/guest accounts and checks meeting creation, lobby admission, media-token authorization, chat, permission approval, removal, ending, and attendance. It removes temporary data afterward. Actual camera and microphone transmission need the two-device call check.

## Two-device call check

1. Register or log in on the host phone, create a meeting, and start it.
2. Share its code or `conference://join/CODE` link. Join as a guest on the second phone.
3. Confirm the guest waits in the lobby and cannot access media before admission. Admit the guest on the host phone.
4. Enable camera and microphone on both phones, granting device permissions. Check audio and video in both directions.
5. Grant and revoke participant media permissions. Check chat, announcements, raised hands, locking, removal, and ending the meeting for everyone.
6. Confirm the attendance summary.

Email confirmation, password recovery email and emailed invitations remain deferred. Firebase invitation push is implemented; see [Firebase push](../FIREBASE_PUSH.md) for opt-in and device verification. Invitation links can also be shared manually.

## Android verification on D: (7 October 2026)

The active checkout is `D:\mywork\Conference`. After the move, generated native caches that referenced E: were moved into an ignored recovery directory under `node_modules/`; application source and credentials were preserved. A fresh build completed without the previous storage I/O errors.

TypeScript, all 5 Jest suites (15 tests), and ESLint passed. The Android test APK includes both `arm64-v8a` and `x86_64` and was installed on a Redmi Note 9 Pro (Android 10) and Pixel emulator (Android 13). Build it without a Metro dependency:

```powershell
npm.cmd run env:mobile
Push-Location android
.\gradlew.bat :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64' --max-workers=2 --console=plain
Pop-Location
```

The APK is `android/app/build/outputs/apk/release/app-release.apk`. It currently uses the development signing key and is intended for device testing. Store distribution requires release signing.

Verified using the installed applications and hosted services:

- Email/password host login, persisted guest session, meeting links, lobby waiting, and host admission.
- Real microphone and camera publication on both devices, remote video rendering, and audio/video in both directions confirmed by the user.
- Host mute-all and camera-stop commands revoked guest permissions and removed the affected LiveKit tracks; guest microphone requests could be approved.
- Chat in both directions, host announcements, raised hands and host lowering, and saved lock/unlock state.
- Android screen sharing published a 1080 x 2400 screen track and rendered on the emulator. The first attempt encountered a reconnect/negotiation error; the retry after restarting the updated app succeeded. Network interruption recovery still needs extended testing.
- Ending for everyone exited both devices, closed attendance, and deleted the LiveKit room. Hosts saw the full attendance roster; the guest saw their own attendance, as enforced by backend access rules.

The device check found and fixed the mobile chat sheet overlapping Android's three-button navigation bar. The corrected APK was rebuilt, installed, and verified by sending a guest message to the host. Temporary test host, meeting, and local test credentials were removed.

`mobile/scripts/device-test.mjs` is a development helper for temporary account setup, device inspection, test reads, media verification, and cleanup. Its credentials are stored only in ignored `mobile/.env.device-test`. It rejects failed UI dumps instead of reusing stale screen data. Do not commit local credential files.

Android integration has passed the checks above. iOS compilation/device testing and its screen-sharing extension remain pending on a Mac. Email delivery remains deferred. Firebase invitation push is implemented; current receipt verification is documented separately in [Firebase push](../FIREBASE_PUSH.md). Web integration is deployed on Firebase Hosting.
## Lucide icons and Android invitation push (8 October 2026)

Mobile uses pinned lucide-react-native 1.53.0 and react-native-svg 15.15.5. src/components/icons/AppIcon.tsx provides themed SVG icons with consistent stroke widths and sizing. Dashboard actions, forms, navigation, empty states, meeting controls, participant controls and dialogs use semantic icon names. User-selected avatar artwork is preserved.

A real Firebase background invitation reached the Redmi Note 9 Pro, and tapping it opened the correct Meeting Details screen. The phone's Do Not Disturb setting was restored after the visibility check; notification opt-in remains enabled. Temporary test records were removed. mobile/scripts/push-device-test.mjs supports setup, deliver and cleanup using the root .env; setup requires exactly one registered Android recipient to avoid targeting an unintended account.
The final Lucide build was installed and its dashboard SVG rendering was verified on the phone. TypeScript, all 6 Jest suites (19 tests), and Android release builds passed. ESLint reported no errors.
