# Host-Controlled Meeting & Live-Streaming Application

A production-grade, strictly typed React Native application for host-controlled video meetings and live streaming across Android phones, tablets, Chromebooks running Android apps, iPhones, and iPads.

---

## 1. Pinned Version & Environment Matrix

| Dependency / Tool | Pinned Version | Notes |
|---|---|---|
| **Node.js** | `>= 22.11.0` | Node LTS runtime |
| **React Native** | `0.87.1` | Community CLI, New Architecture enabled |
| **React** | `19.2.3` | React 19 core library |
| **TypeScript** | `^6.0.3` | Strict mode: `strictNullChecks`, `exactOptionalPropertyTypes`, `noImplicitAny` |
| **JavaScript Engine** | Hermes | Default RN Hermes engine |
| **Android Compile SDK** | `37` | Android 16 baseline |
| **Android Target SDK** | `36` | Target modern Android platform |
| **Android Min SDK** | `24` | Android 7.0 Nougat minimum |
| **Gradle** | `9.4.1` | Android Gradle wrapper |
| **Java JDK** | `17.0.10 LTS` | JDK 17 baseline |
| **iOS Target** | `15.1` | Minimum iOS / iPadOS deployment target |
| **Redux Toolkit** | `^2.13.0` | RTK Query with tag-based cache invalidation |
| **React Redux** | `^9.3.0` | Redux bindings |
| **React Navigation** | `^7.5.0` | Native stack navigator v7 |
| **Storage (MMKV)** | `^4.3.2` | Ultra-fast key-value storage engine |
| **Credentials** | `^10.0.0` | `react-native-keychain` hardware-backed keystore |
| **Styling** | NativeWind `^4.2.7` / Tailwind `^3.4.17` | Semantic design token bridge |

---

## 2. Key Architecture & Features

### Host-Controlled Moderation Model
- **Roles**:
  - **Host**: The meeting organizer with full moderation authority.
  - **Co-Host**: Elevated participant granted identical permissions to the primary host (admit/deny participants, mute all, disable cameras, lock meeting, decide requests).
  - **Participant**: Registered user joining meetings with selective capability toggles.
  - **Guest**: Ephemeral user onboarding without registration (display name + avatar selection). Cannot create meetings; joins via meeting code or direct link.
- **Privacy-First Lobby**:
  - Microphone broadcasting disabled on entry.
  - Private local camera preview to check lighting/framing.
  - Interactive speaker test.
  - Host admission workflow with real-time push updates.
- **In-Room Moderation**:
  - Presenter stage grid with active speaker indication and manual participant pinning.
  - Granular host controls: **Mute All**, **Disable All Cameras**, **Lock Meeting** (preventing entry), and **Broadcast Announcement**.
  - Permission queue: In-app permission requests for mic, camera, screen-share, and chat with instant host approval/denial.
  - Ordered raised hands queue with numbered speaking priority and host lower/invite actions.
  - In-meeting text chat and broadcast announcement banners.
- **Meeting Management & Post-Meeting**:
  - Instant meeting creation (launches immediately).
  - Scheduled meetings with start time, timezone, guest access toggle, and default permissions.
  - Multi-method invitee import: Manual input, device contacts picker, and RFC-4180 compliant CSV import (with quoted names, phone/email validation, and duplicate filtering).
  - Scheduled join eligibility: Joining enabled strictly within 5 minutes of scheduled start time or once live.
  - Comprehensive meeting summary with attendee roster, joined/left timestamps, and duration.
  - Notifications center for meeting invites, cancellations, and host requests.

---

## 3. Form Factor Compositions & Theming

The application provides dedicated, adaptive layouts responsive to device geometry and window dimensions:

1. **Mobile (`< 600dp`)**:
   - Single-column stacked layouts.
   - Expandable bottom sheets for Chat, Lobby Approvals, Raised Hands Queue, and Permission Requests.
   - Pinned participant picture-in-picture with 2x2 grid paging.
2. **Tablet (`600dp - 1023dp`)**:
   - Split-view dashboard with persistent sidebar navigation.
   - 3x3 participant grid layout with side-drawer moderation.
3. **Chromebook / Desktop (`>= 1024dp`)**:
   - Full expanded desktop composition.
   - Fixed side navigation rail, 4x4 participant gallery, and right-hand split moderation and chat panels.
   - Keyboard accessibility and mouse hover states.

### Theme Modes
- **System (Default)**: Automatically respects OS-level dark/light mode switches.
- **Light Theme**: Clean, high-contrast surfaces (`#FFFFFF`, `#F5F7FB`, `#4F46E5` primary).
- **Dark Theme**: Low-glare surfaces (`#0F172A`, `#1E293B`, `#6366F1` primary).
- Configurable anytime via **Settings -> Appearance**.

---

## 4. Mock Identities & Verification Credentials

The mock backend includes pre-seeded identities ready for immediate sign-in and testing:

| Role | Name | Email | Phone (E.164) | Seed ID |
|---|---|---|---|---|
| **Organizer (Host)** | Taylor Kim | `taylor.kim@company.com` | `+14155550100` | `user-organizer` |
| **Accepted Co-Host** | Alex Chen | `alex.chen@company.com` | `+14155550101` | `user-cohost-accepted` |
| **Pending Co-Host** | Jordan Lee | `jordan.lee@company.com` | `+14155550102` | `user-cohost-pending` |
| **Participant** | Priya Shah | `priya.shah@company.com` | `+14155550103` | `user-participant` |
| **Guest** | Casey Park | `casey.park@example.com` | `+14155550104` | `user-casey` |

- **Password**: Any password with at least 8 characters (e.g. `Password123!`).
- **OTP Verification Code**: `123456` (universal bypass code for mock phone and email verification).

---

## 5. Seeded Meetings & Scenarios

| Meeting ID | Meeting Code | Status | Title | Description |
|---|---|---|---|---|
| `meet-seed-live` | `CONF-7701` | `live` | Executive Product Review | Active live meeting with 4 participants and pending lobby requests. |
| `meet-seed-now` | `SYNC-8821` | `scheduled` | Design Workshop & Review | Scheduled meeting starting in 2 minutes (eligible to join immediately). |
| `meet-seed-future` | `PLAN-9932` | `scheduled` | Q4 Engineering All-Hands | Scheduled meeting 2 days out (locked until start window). |
| `meet-seed-ended` | `RETRO-1102` | `ended` | Sprint 42 Retrospective | Completed meeting with full attendance log for testing Summary screen. |

---

## 6. Developer Scenario Controls

Interactive scenario controls are exposed programmatically in `src/backend/mock/scenarios.ts` to simulate real-time socket events:

```typescript
import { mockScenarioControls } from './src/backend/mock/scenarios';

// Admit participant from lobby
mockScenarioControls.simulateHostApproval('meet-seed-live', 'user-lobby-1');

// Deny entry from lobby
mockScenarioControls.simulateHostDenial('meet-seed-live', 'user-lobby-1');

// Revoke participant speaking/camera permissions
mockScenarioControls.simulatePermissionRevocation('meet-seed-live', 'user-participant');

// Simulate host ending meeting remotely
mockScenarioControls.simulateMeetingEnded('meet-seed-live');

// Reset mock database to clean seed state
mockScenarioControls.resetDatabase();
```

---

## 7. Replaceable Adapters Guide (Mock -> Production)

The application adheres to clean architecture boundaries. To transition from mock simulations to production infrastructure, edit `src/config/environment.ts`:

```typescript
export const ENV = {
  backendMode: 'http',  // Switch from 'mock' to 'http'
  mediaMode: 'livekit', // Switch from 'mock' to 'livekit'
  apiBaseUrl: 'https://api.yourconference.com/v1',
  liveKitServerUrl: 'wss://livekit.yourconference.com',
};
```

1. **Backend API (`src/backend/HttpBackendAdapter.ts`)**:
   - Implements the strict `BackendAdapter` interface.
   - Handles JWT token rotation and standard HTTP REST / GraphQL endpoints.
2. **Media Engine (`src/services/mediaService.ts`)**:
   - Swap `MockMediaEngine` with `@livekit/react-native` by implementing the `MediaService` adapter.
   - Screen sharing uses standard foreground services on Android and Broadcast Upload Extensions on iOS.
3. **Push Notifications (`src/services/notificationService.ts`)**:
   - Register FCM / APNS device tokens with `appApi.endpoints.registerPushToken`.

---

## 8. Available Commands & Verification

### Install Dependencies
```sh
npm install
```

### Type Checking (Strict TypeScript)
```sh
npm run typecheck
```
*Executes `tsc --noEmit` with zero errors.*

### Unit & Integration Tests
```sh
npm test
```
*Runs Jest suites covering CSV parsing, schema validation, permission boundaries, and root rendering.*

### ESLint Check
```sh
npm run lint
```

### Run on Android
```sh
npm run android
```

### Run on iOS (macOS / Xcode required)
```sh
bundle exec pod install --project-directory=ios
npm run ios
```

---

## 9. Implemented vs. Simulated Capabilities

| Feature | Implementation Status | Notes |
|---|---|---|
| Complete UI & Form Factors | ✅ Implemented | Dedicated mobile, tablet, and Chromebook layouts. |
| Theme System | ✅ Implemented | System default with full Light / Dark theme tokens. |
| Auth & Ephemeral Guest Flow | ✅ Implemented | KeyStore/Keychain token storage, MMKV caching, guest setup. |
| Host Moderation Controls | ✅ Implemented | Mute all, stop cameras, lock meeting, admit/deny, lower hand. |
| Permission Request Workflow | ✅ Implemented | Real-time event-driven permission lifecycle. |
| CSV & Contact Importer | ✅ Implemented | PapaParse RFC-4180 compliant CSV parser + device contact picker. |
| Media Tracks | 🔄 Simulated | Mock media engine emits simulated speaking states, audio levels, and camera frames. |
| Push Notifications | 🔄 Simulated | In-memory notification service with background dispatch triggers. |

---

## 10. Platform Limitations & Unrun Checks

- **iOS Builds**: Pod installation and Xcode native builds require macOS and was not executed in this Windows host environment.
- **Hardware Peripherals**: Camera capture, microphone encoding, and Bluetooth headset routing are simulated via typed adapters until deployed to physical test devices with LiveKit credentials.

## Web application (Phase 3)

The browser application is in `web/` and shares the deployed Supabase backend and LiveKit Cloud meetings with mobile. Run `npm.cmd --prefix web ci` once, then `npm.cmd run web`, and open http://localhost:5173. Build with `npm.cmd run web:build`. See [web setup, features, verification, and deployment](web/README.md). Root `.env` supplies generated public-only client configuration; private credentials remain on the backend.

Public client demo: **https://conference-79cf2.web.app**, hosted on Firebase Spark. Use this URL for backend-connected browser tests; local Vite remains available for UI development, but current backend CORS permits the public origin.

Firebase invitation notifications: [setup and verification](FIREBASE_PUSH.md).
