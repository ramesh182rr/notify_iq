# NotifyIQ Quick Start

## Before you start

You need a development machine capable of Android builds, Node.js, Java JDK compatible with the chosen React Native release, Android Studio/SDK, Python 3.11+, Git, VS Code, and Codex CLI or the Codex IDE extension. Use a physical Android phone for notification-listener testing; an emulator alone is insufficient for OEM battery behaviour.

## Step 1 — Create the React Native Bare app

Use the current React Native Community CLI instructions from the official documentation. Do not copy an old CLI command or pin an arbitrary React Native version from this kit. Create the app in a clean workspace, then copy/adapt the `07_Mobile_App/src` contracts and theme tokens.

Suggested app identifier: `com.notifyiq`.

## Step 2 — Add the minimal Kotlin listener module

Follow `02_Technical_Architecture/ANDROID_NOTIFICATION_INTEGRATION.md`. Register a `NotificationListenerService` in `AndroidManifest.xml`; the system permission is `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE` on the service declaration. The app must send the user to Android's notification access settings and must never try to grant access silently.

The service must write permitted events to the local store independently of the React Native screen lifecycle. The React Native bridge is for reading status, requesting settings navigation, and observing database changes—not the sole persistence mechanism.

## Step 3 — Establish local storage

Use one authoritative SQLite database on the device. Choose either a Kotlin-owned SQLite/Room implementation exposed through a repository bridge, or a tested React Native SQLite library with a native listener writing through the same database. Do not create two divergent databases. The recommended first implementation is Kotlin-owned SQLite access for the listener plus a typed native repository interface; decide the exact library only after validating New Architecture compatibility.

Run the SQL reference in `02_Technical_Architecture/SQLITE_SCHEMA.sql` as the initial schema. Use migrations from day one.

## Step 4 — Build the first vertical slice

Implement only:

1. Onboarding explanation.
2. Permission status and settings deep link.
3. Listener connected/disconnected status.
4. App exclusion preferences.
5. Capture one notification event.
6. Persist it locally.
7. Display it in a simple Inbox list.
8. Delete local history.

Do not add Qwen, Render, Neon, R2, analytics or complex rules until this works on a real device.

## Step 5 — Start the Python backend

From `06_Backend/` create a virtual environment, install `requirements.txt`, copy `.env.example` to `.env`, and run the FastAPI development server. Initially expose health and model capability endpoints only. Never send raw notification content to the backend in the first slice.

## Step 6 — Add Neon and R2 only when needed

Neon is for account/profile/preferences and opt-in sync metadata. R2 is for encrypted export packages or downloadable model artifacts. Do not use either as the live notification event store. Do not store secrets in the mobile app.

## Step 7 — Codex workflow

Open the project root in VS Code or the Codex app/CLI. Codex should automatically use `AGENTS.md` as project instructions; if it does not, explicitly ask it to read that file. Begin with `09_Codex_Instructions/CODEX_START_HERE.md`, then use the task prompts one at a time from `09_Codex_Instructions/prompts/`. Ask Codex to inspect the current repository, provide a plan and files to change, implement a small vertical slice, run validation, and report test results plus manual device steps.

## Definition of first success

With the screen closed and the phone online or offline, a permitted test notification is captured by the Android listener, screened, persisted locally, and appears in NotifyIQ after reopening. An excluded app's notification content is not persisted. Revoking notification access produces a clear disabled state rather than a crash.
