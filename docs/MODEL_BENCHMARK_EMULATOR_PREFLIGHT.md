# Emulator benchmark preflight

**Date:** 2026-11-21  
**Status:** Emulator smoke checks passed; model runtime measurements not run.

## Device and app checks

- ADB device: `emulator-5554`, Android emulator image `sdk_gphone64_arm64`.
- Android: API 35 / Android 15.
- Reported guest memory: 2,022,068 KiB total; 870,980 KiB available at the preflight snapshot.
- `/data` free storage: about 3.5 GiB.
- Graphics property: `emulation`; this is not a phone GPU backend result.
- Battery: 100%, not charging; emulator reported 25°C at the snapshot.
- Debug APK installed and the React Native home screen rendered when Metro was running.
- `./gradlew --no-daemon testDebugUnitTest connectedDebugAndroidTest` — passed; 8 unit tests and 11 instrumentation tests, including Android notification-access API and synthetic rule evaluation/persistence cases.
- `npm run typecheck` — passed.

The native notification-access status is still unavailable from the React Native screen, even though an instrumentation test can call Android's `isNotificationListenerAccessGranted()` API without an exception. The app currently cannot resolve `NotifyIQ` from `TurboModuleRegistry` at runtime; see the latest filtered emulator log and the native-module registration code. Do not treat screen rendering as a completed capture lifecycle test.

## Model benchmark disposition

No model benchmark run is recorded. The app does not yet include either inference runtime or model artifact. Neither pinned model file is present in the repository. A partial temporary LiteRT download was stopped before completion and deleted; no artifact checksum was verified locally or copied to the emulator. The runtime dependency and a benchmark adapter must be installed before inference can start.

The current emulator is a useful smoke-test target, but it has about 0.85 GiB available memory at the measured snapshot, and its graphics path is emulated. It cannot stand in for representative low-memory, mid-range, and flagship phones. If an emulator-only model attempt is later made, record it as a constrained emulator trial, and do not use it as a production device-support or speed claim.

## Next steps

1. Fix and verify React Native native-module discovery on the emulator; then confirm access-off and access-on states.
2. The benchmark prompt and strict output contract are recorded in `MODEL_BENCHMARK_PROMPT.md`.
3. Add a benchmark-only adapter or standalone harness for the two pinned runtimes, without bundling model weights in Git or the production APK.
4. Attempt a single emulator inference only after the runtime loads successfully; capture failures and memory use, and label results emulator-only.
5. Keep physical-device benchmark and release decisions outstanding until real devices are available.
