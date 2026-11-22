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

- The only attached device is the `Pixel_8` AVD (API 35, 6 GiB guest RAM override used for model trials). There is no physical device, so never claim physical-device or OEM verification.
- Pinned benchmark model files may be present in `/private/tmp` (`notifyiq-qwen3-onnx-q4f16.onnx`, `notifyiq-qwen3-lite-8d42ab5.litertlm`). Verify SHA-256 against `docs/MODEL_BENCHMARK_CANDIDATES.md` before use.
- Use synthetic notification fixtures only. The 108-case corpus is `mobile/android/app/src/test/resources/notifyiq/notification-evaluation.tsv`.
- After emulator checks, restore notification access to off and remove synthetic rows, exclusions and test rules you added. Record the cleanup in the status file.

## Architecture reminders

- Kotlin owns the one SQLite database (BundledSQLiteDriver, FTS5, numbered migrations). TypeScript reads through the typed native bridge (`mobile/src/native`), which is a plain `ReactContextBaseJavaModule` via legacy interop. TurboModule registration failed on RN 0.88.1.
- Capture path: package exclusion → sensitive-content gate (discard the whole event) → persist → deterministic analysis. No network or model work in listener callbacks.
- Production classification is deterministic. No model runtime or weights ship until a runtime passes the D-012 gate.
