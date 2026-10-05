# 🎥 Host-Controlled Meeting & Live-Streaming Platform

[![React Native](https://img.shields.io/badge/React_Native-0.87.1-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.3_Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-2.13.0-764ABC?logo=redux&logoColor=white)](https://redux-toolkit.js.org/)
[![NativeWind](https://img.shields.io/badge/Styling-NativeWind_v4-38B2AC?logo=tailwindcss&logoColor=white)](https://www.nativewind.dev/)
[![Testing](https://img.shields.io/badge/Tests-Jest_100%25_Passing-brightgreen?logo=jest&logoColor=white)](https://jestjs.io/)
[![Platform](https://img.shields.io/badge/Platforms-Android_%7C_iOS_%7C_Chromebook-orange)](#form-factor-compositions--theming)

A production-grade, strictly typed React Native application for host-controlled video meetings, interactive webinars, and live streaming. Engineered for seamless cross-platform performance across **Android phones**, **tablets**, **Chromebooks (Android runtime)**, **iPhones**, and **iPads**.

---

## 📑 Table of Contents
1. [Key Capabilities & Architecture](#-key-capabilities--architecture)
2. [Pinned Version & Environment Matrix](#-pinned-version--environment-matrix)
3. [Project Structure](#-project-structure)
4. [Form Factor Compositions & Theming](#-form-factor-compositions--theming)
5. [Getting Started & Installation](#-getting-started--installation)
6. [Mock Identities & Credentials](#-mock-identities--credentials)
7. [Seeded Meetings & Interactive Scenarios](#-seeded-meetings--interactive-scenarios)
8. [Replaceable Adapters Guide (Mock → Production)](#-replaceable-adapters-guide-mock--production)
9. [Available Scripts & Quality Verification](#-available-scripts--quality-verification)
10. [Platform Limitations & Notes](#-platform-limitations--notes)

---

## 🚀 Key Capabilities & Architecture

### 🛡️ Host-Controlled Moderation Model
- **Role Hierarchy**:
  - **Host**: Complete moderation power (admit/deny participants, mute all, disable video feeds, toggle screen-share permissions, lock room, lower hands, broadcast announcements, end meeting).
  - **Co-Host**: Granted identical operational privileges as the primary host.
  - **Participant**: Registered user joining meetings with capability toggles managed by the host.
  - **Guest**: Ephemeral user joining without registration (display name + avatar selection). Cannot create meetings; joins via meeting code or direct link.
- **Privacy-First Lobby**:
  - Microphones automatically muted upon entry.
  - Local device preview for camera and microphone check.
  - Host admission workflow with real-time approval/denial push events.
- **In-Room Moderation**:
  - Presenter stage grid with active speaker indication and manual participant pinning.
  - Global Host Actions: **Mute All**, **Disable All Cameras**, **Lock Meeting** (preventing entry), and **Broadcast Announcement**.
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

## 📌 Pinned Version & Environment Matrix

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

## 📂 Project Structure

```
Conference/
├── __tests__/                    # Jest test suites (schemas, csvService, roles, App)
├── android/                      # Native Android project (SDK 37, Gradle 9.4.1)
├── ios/                          # Native iOS project (iOS 15.1 target)
├── src/
│   ├── api/                      # RTK Query API slice definitions
│   ├── app/                      # App root providers, Theme provider, Navigation container
│   ├── backend/                  # Clean architecture backend adapter interface & mock implementation
│   │   └── mock/                 # In-memory mock backend with scenario controls & seed data
│   ├── components/               # Reusable UI component library
│   │   ├── feedback/             # Banners, dialogs, toasts
│   │   ├── forms/                # Form inputs, buttons, checkboxes
│   │   ├── layout/               # Screen containers, safe-area wrappers, grid layouts
│   │   └── meeting/              # Participant tile, controls bar, hand raise item, permission row
│   ├── config/                   # Environment configuration (mock vs live backend/media)
│   ├── constants/                # App-wide constants, default permission profiles, role configs
│   ├── features/                 # Modular feature domains
│   │   ├── auth/                 # Sign-in, sign-up, guest onboarding, OTP verification
│   │   ├── dashboard/            # Form-factor aware dashboards (Mobile, Tablet, Chromebook)
│   │   ├── history/              # Past meeting history and detail reviews
│   │   ├── invitations/          # Invite management, CSV parsing, contact selection
│   │   ├── lobby/                # Pre-join lobby, audio/video preview, host approval gate
│   │   ├── meetings/             # Meeting creation, scheduling, and configuration
│   │   ├── notifications/        # Invite alerts and permission notifications center
│   │   ├── room/                 # In-meeting room experience (stage, gallery, moderation sidebars)
│   │   └── settings/             # User profile, theme switcher (system/light/dark), audio/video preferences
│   ├── hooks/                    # Custom hooks (form-factor detection, permissions, network state)
│   ├── navigation/               # React Navigation v7 native stack configuration & routes
│   ├── schemas/                  # Zod validation schemas for forms, meetings, and users
│   ├── services/                 # CSV importer (RFC-4180), contact picker, media engine adapters
│   ├── store/                    # Redux Toolkit store and slices (auth, meeting, room, theme)
│   ├── styles/                   # NativeWind & theme design tokens
│   ├── types/                    # Domain models, meeting state types, user role types
│   └── utils/                    # Date formatting, validators, time-zone helpers
├── App.tsx                       # Application entry point with Redux & Theme providers
├── babel.config.js               # Babel configuration with NativeWind & Reanimated plugins
├── metro.config.js               # Metro bundler with NativeWind integration
├── package.json                  # Dependencies and execution scripts
├── tailwind.config.js            # Tailwind theme colors and screen breakpoints
└── tsconfig.json                 # TypeScript strict compiler configuration
```

---

## 💻 Form Factor Compositions & Theming

The application adapts dynamically to screen geometry and window constraints:

| Device Class | Breakpoint | Composition & UI Adaptations |
|---|---|---|
| **Mobile** | `< 600dp` | Single-column stacked layouts, expandable bottom sheets for Chat, Lobby Approvals, Raised Hands, and Permission Requests. Pinned PIP with 2x2 grid paging. |
| **Tablet** | `600dp - 1023dp` | Split-view dashboard with persistent sidebar navigation, 3x3 participant grid layout with side-drawer moderation panels. |
| **Chromebook / Desktop** | `≥ 1024dp` | Full expanded desktop layout with fixed navigation rail, 4x4 participant gallery, split moderation & chat panels, and keyboard navigation. |

### 🎨 Theme Support
- **System Default**: Seamlessly follows OS dark/light mode triggers.
- **Light Theme**: High-contrast, clean surfaces (`#FFFFFF` surface, `#F5F7FB` background, `#4F46E5` primary).
- **Dark Theme**: Low-glare surfaces (`#0F172A` background, `#1E293B` surface, `#6366F1` primary).
- Configurable anytime via **Settings → Appearance**.

---

## 🛠️ Getting Started & Installation

### Prerequisites
- **Node.js**: `>= 22.11.0` (LTS recommended)
- **Package Manager**: `npm`
- **Android Studio**: Android SDK Platform 37, Build-Tools 36.x, JDK 17
- **Xcode** (for macOS iOS builds): Version 15+ with CocoaPods

### 1. Clone the Repository
```bash
git clone https://github.com/gani419/conference.git
cd conference
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Metro Bundler
```bash
npm start
```

### 4. Run on Android
```bash
npm run android
```

### 5. Run on iOS (macOS required)
```bash
bundle exec pod install --project-directory=ios
npm run ios
```

---

## 👥 Mock Identities & Credentials

The pre-seeded mock backend contains ready-to-test accounts:

| Role | Name | Email | Phone (E.164) | Seed ID |
|---|---|---|---|---|
| **Organizer (Host)** | Taylor Kim | `taylor.kim@company.com` | `+14155550100` | `user-organizer` |
| **Accepted Co-Host** | Alex Chen | `alex.chen@company.com` | `+14155550101` | `user-cohost-accepted` |
| **Pending Co-Host** | Jordan Lee | `jordan.lee@company.com` | `+14155550102` | `user-cohost-pending` |
| **Participant** | Priya Shah | `priya.shah@company.com` | `+14155550103` | `user-participant` |
| **Guest** | Casey Park | `casey.park@example.com` | `+14155550104` | `user-casey` |

> 🔑 **Credentials**:
> - **Password**: Any password with at least 8 characters (e.g., `Password123!`).
> - **OTP Code**: `123456` (universal test bypass code for SMS & Email verification).

---

## 📅 Seeded Meetings & Interactive Scenarios

| Meeting ID | Meeting Code | Status | Title | Description |
|---|---|---|---|---|
| `meet-seed-live` | `CONF-7701` | `live` | Executive Product Review | Active live meeting with 4 participants and pending lobby requests. |
| `meet-seed-now` | `SYNC-8821` | `scheduled` | Design Workshop & Review | Scheduled meeting starting in 2 minutes (eligible to join immediately). |
| `meet-seed-future` | `PLAN-9932` | `scheduled` | Q4 Engineering All-Hands | Scheduled meeting 2 days out (locked until start window). |
| `meet-seed-ended` | `RETRO-1102` | `ended` | Sprint 42 Retrospective | Completed meeting with full attendance log for testing Summary screen. |

### Simulating Real-time Events
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

## 🔌 Replaceable Adapters Guide (Mock → Production)

The architecture decouples UI from the backend and media engine. To transition to production servers, update `src/config/environment.ts`:

```typescript
export const ENV = {
  backendMode: 'http',   // 'mock' | 'http'
  mediaMode: 'livekit',  // 'mock' | 'livekit'
  apiBaseUrl: 'https://api.yourconference.com/v1',
  liveKitServerUrl: 'wss://livekit.yourconference.com',
};
```

1. **REST / GraphQL Backend Adapter (`src/backend/HttpBackendAdapter.ts`)**:
   - Implements `BackendAdapter`.
   - Handles JWT token rotation and standard HTTP REST / GraphQL endpoints.
2. **Media Engine Adapter (`src/services/mediaService.ts`)**:
   - Swap `MockMediaEngine` with `@livekit/react-native` or standard WebRTC.
3. **Push Notifications (`src/services/notificationService.ts`)**:
   - Register FCM / APNS device tokens with `appApi.endpoints.registerPushToken`.

---

## 🧪 Available Scripts & Quality Verification

| Command | Purpose |
|---|---|
| `npm run typecheck` | Strict TypeScript compilation check (`tsc --noEmit`) |
| `npm test` | Run Jest test suite across schemas, services, and components |
| `npm run lint` | ESLint static code analysis |
| `npm run android` | Launch app on connected Android device or emulator |
| `npm run ios` | Launch app on iOS Simulator (macOS only) |
| `npm start` | Start Metro development server |

---

## ⚠️ Platform Limitations & Notes

- **iOS Native Builds**: Requires macOS with Xcode and CocoaPods.
- **Hardware Peripherals**: Camera capture, microphone encoding, and Bluetooth routing are simulated via typed adapters until deployed to physical test devices with a live WebRTC/LiveKit server.
- **Security**: Auth tokens are stored in hardware-backed secure storage via `react-native-keychain` (Android Keystore / iOS Keychain).
