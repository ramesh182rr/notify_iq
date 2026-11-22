# NotifyIQ — Claude Code instructions

@AGENTS.md

The rules in `AGENTS.md` apply in full. The notes below add Claude-specific working context; they do not relax any rule there.

## Git (absolute)

Never commit, amend, push, pull, merge, rebase, reset, or switch/create branches. Leave every change uncommitted. When a logical task or milestone is complete, end the report with a **Suggested Commit** section (conventional message, summary, affected areas, checks run, review readiness) for the owner to run.

## Read first

1. `DEVELOPMENT_STATUS.md` — current phase, completed work, checks already run.
2. `IMPLEMENTATION_PLAN.md` — the 44 numbered tasks, per-phase acceptance criteria, and the "Next task" pointer in §9.
3. `DECISIONS_LOG.md` — approved decisions (R-00x / D-00x). Don't silently change privacy or product behavior; record proposals there.
4. `docs/` — model benchmark records and the user-rule spec.
5. `NotifyIQ-Development-Kit/` — product/engineering source of truth. Generated images are not authoritative (R-007).

Keep those three root status files current when task status or decisions change, including the task count in the plan and the status file.

## Toolchain and commands

The default shell Node is 18; the project needs Node 22.23.4. Prefix Node/Gradle commands with `fnm exec --using=22.23.4 --`. JDK 17.

From `mobile/`:

- `npm run typecheck`, `npm run lint`, `npm test -- --runInBand --watchman=false`

From `mobile/android/`:

- `./gradlew --no-daemon :app:assembleDebug :app:testDebugUnitTest`
- `./gradlew --no-daemon :app:connectedDebugAndroidTest` (needs the emulator; add `-Pandroid.testInstrumentationRunnerArguments.class=<FQCN>` for one class)

Model benchmark app (isolated Kotlin 2.4.0 project, never part of the production APK):

- `./gradlew -p ../model-benchmark :app:assembleDebug :app:assembleDebugAndroidTest` from `mobile/android/`
- Model files go in the benchmark app's external files dir on the emulator. Weights never go in Git or the production app.

Run tests only when asked or when verifying a completed task, and report exact commands and outcomes.

## Environment facts

- AVDs: `Pixel_8` (API 35, start with `-memory 6144`) is the default. `NotifyIQ_API29` (Android 10, 4 GB RAM) is for minimum-version and low-memory checks; set `ANDROID_SERIAL` when both run. `sdkmanager`/`avdmanager` are in `$ANDROID_HOME/cmdline-tools/latest/bin` (need `JAVA_HOME` set to JDK 17). There is no physical device, so never claim physical-device or OEM verification.
- Pinned benchmark model files may be present in `/private/tmp` (`notifyiq-qwen3-onnx-q4f16.onnx`, `notifyiq-qwen3-lite-8d42ab5.litertlm`). Verify SHA-256 against `docs/MODEL_BENCHMARK_CANDIDATES.md` before use.
- Metro for NotifyIQ runs on port **8093**. Port 8081 belongs to another project on this host, so never use it for NotifyIQ. Run `adb reverse tcp:8093 tcp:8093` before launching the debug app.
- Live capture fixtures: build/install `mobile/dev-fixture-poster` (`./gradlew -p ../dev-fixture-poster :app:installDebug`, then `pm grant com.notifyiq.fixtureposter android.permission.POST_NOTIFICATIONS`). Post with `adb shell "am start -n com.notifyiq.fixtureposter/.PostActivity --ei id N --es title '…' --es text '…'"`; add `--ez cancel true` to remove. Android 15 redacts OTP/card-like text before listeners see it (R-012).
- Release signing: private key at `~/.android/notifyiq/notifyiq-upload.jks`; Gradle reads `NOTIFYIQ_UPLOAD_*` from `~/.gradle/gradle.properties`. Never print, copy into the repo, or commit the key or its password. Release builds cannot install over debug builds; uninstall first on emulators.
- Use synthetic notification fixtures only. The 108-case corpus is `mobile/android/app/src/test/resources/notifyiq/notification-evaluation.tsv`.
- After emulator checks, restore notification access to off and remove synthetic rows, exclusions and test rules you added. Record the cleanup in the status file.

## Architecture reminders

- Kotlin owns the one SQLite database (BundledSQLiteDriver, FTS5, numbered migrations). TypeScript reads through the typed native bridge (`mobile/src/native`), which is a plain `ReactContextBaseJavaModule` via legacy interop. TurboModule registration failed on RN 0.88.1.
- Capture path: package exclusion → sensitive-content gate (discard the whole event) → persist → deterministic analysis. No network or model work in listener callbacks.
- Production classification is deterministic. No model runtime or weights ship until a runtime passes the D-012 gate.
