# Android-to-web call verification

Test date: 2026-10-09. Hosted web: https://conference-79cf2.web.app. Android: physical Redmi Note 9 Pro connected using Wi-Fi ADB.

The work PC has no camera or installed audio driver. Chrome joined with local camera and microphone disabled, without fake media devices. This verifies receiving real Android media, not PC camera/microphone publishing or audible playback quality.

## Verified

- Android joined through a meeting link, requested admission, and was admitted using the web host UI.
- Real phone camera video arrived in Chrome. The initial sample decoded 235 frames at 360 x 640 with zero reported dropped frames. The user confirmed video was visible and updated smoothly.
- Real phone microphone packets arrived in Chrome: 1,892 packets in a sample, with nonzero audio energy. Audible playback could not be assessed on this PC.
- Android screen sharing arrived as a real screen-share track; Chrome decoded 118 frames at 540 x 1200 with zero reported drops in the sample. Capture was stopped after the check.
- Chat messages sent through the web and Android interfaces appeared on the other platform.
- Web host Mute all removed the Android microphone track and revoked microphone permission. Android requested microphone access; the web host approved it, and Android resumed publishing audio.
- Web host Leave kept the Android participant connected. The host rejoined with its host role preserved.
- Android left, requested admission again, and rejoined the same meeting. LiveKit showed one connection per identity. The browser decoded 680 new camera frames with zero reported drops in the post-rejoin sample.
- Web End for everyone closed the media room and recorded attendance intervals for both participants, including rejoin sessions. Chrome displayed the meeting summary.
- Temporary meeting and host account from the initial check were removed after globally revoking the test host's sessions. The existing phone account and notification preference were preserved.

## Issue found and correction

Android returned automatically to the Dashboard when the web host ended the meeting. Membership polls every two seconds and meeting details every five seconds: a left participant could arrive while the cached meeting still appeared live.

The room controller now refreshes meeting status before routing a left participant. Ended/cancelled meetings go to the summary; access revoked in a still-live meeting goes to the Dashboard. Pending refresh callbacks are cancelled on unmount. Regression tests cover both terminal statuses, live-meeting access revocation, and unmount cancellation.

Physical retest passed: the rebuilt APK was installed on the Redmi with existing app data preserved. After joining and being admitted in a fresh temporary meeting, the web host ended it; Android automatically opened Meeting Summary, displayed Ended, and showed the attendance roster. The phone was returned to Dashboard and the second test host/meeting were cleaned up. TypeScript passed; all 10 Jest suites / 30 tests passed using --runInBand --testTimeout=30000. The first run under concurrent Gradle load exceeded the five-second timeout in an existing control-bar test; the rerun passed. The arm64-v8a/x86_64 Android test APK built successfully and remains development-signed.

## Remaining coverage

- Real PC microphone/camera publishing to Android and audible playback quality require a suitably equipped PC or another device.
- Web-to-Android screen sharing was not exercised in this check; Android-to-web screen sharing was verified.
- Android acting as host with a browser guest, additional browsers, physical Android tablets, network switching/recovery, and larger/longer calls remain further regression coverage.
- iOS/iPad is deferred at the user's request.
