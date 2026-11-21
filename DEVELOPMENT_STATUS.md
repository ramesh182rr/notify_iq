# NotifyIQ Development Status

**Last updated:** 2026-11-21  
**Current phase:** Phase 4 — local-model benchmark spike; LiteRT trial and ONNX graph-load probe complete, ONNX text inference open
**Application implementation:** Listener, privacy gate, bundled SQLite/FTS, retention, inbox actions, Privacy Centre, deterministic analysis, duplicate/rule-group browsing, daily overview, user rules and saved searches are implemented; ONNX text-inference benchmarking and physical-device capture verification remain
**Git:** `HEAD` is `be075d2` on `main`, tracking `origin/main`. That planning commit appeared since the initial audit; I did not create it. Current implementation changes are uncommitted local work.

**Roadmap count:** 44 numbered tasks across Phases 0–7. Thirty-one are implemented (Phase 0: 4; Phase 1: 8; Phase 2: 6; Phase 3: 6; Phase 4: 3; Phase 5: 4); 13 remain, including ONNX text-inference benchmarking, optional cloud foundations and release readiness.

## Completed

- Inspected all 69 development-kit files: product/feature/persona requirements, architecture/privacy/database/API/Android references, SQL, AI strategy/benchmark contract, UI/UX and visual references, backend and Kotlin/TypeScript starter code, roadmap/checklists, setup guides and Codex workflow prompts.
- Inspected repository status, branch, configured origin, current source layout, starter `.gitignore` files and local tool versions.
- Created root project instructions with permanent Git restrictions and NotifyIQ implementation constraints.
- Created the implementation plan and decision log.
- User approved the recommended defaults for unresolved product/technical questions; these are recorded as working decisions in `DECISIONS_LOG.md`.
- Verified Node 22.23.4, JDK 17, Watchman, Android Studio, SDK/build tools, an attached API 36 emulator, and a successful ADB device listing.
- Generated a React Native Bare 0.88.1 TypeScript application under `mobile/` with the Community CLI and installed its declared dependencies.
- Implemented the initial five-tab shell and semantic system/light/dark theme tokens; no notification or cloud feature has been added.
- Added the project-level `.gitignore` for build output, credentials, local databases and downloaded model artifacts.
- Built and installed the debug app on the attached Pixel API 36 emulator; Metro served the JavaScript bundle and the launcher activity started.
- Added a focused foundation rendering test; typecheck, lint and test pass.
- Implemented notification-access education/status/settings handoff and app-resume status refresh.
- Implemented a Kotlin notification listener, pre-extraction package exclusion check, whole-event sensitive-content discard, bounded serialized persistence queue, SQLite schema v2, repository bridge, recent-event inbox, and confirmed history deletion.
- Added synthetic Kotlin unit fixtures for OTP, password, payment card and ordinary notification content.
- Migrated the repository to AndroidX BundledSQLiteDriver. Schema v2 adds FTS5 with transactional triggers, saved/archive state and retention cleanup.
- Added FTS search, app/date/archive filters, keyset pagination, per-item save/archive/delete actions and configurable 7/30/90/never retention.
- Added notification detail modal with source, posted/received timestamps, stored content and provenance; documented local deletion limitations in Inbox.
- Added a dedicated Privacy Centre for notification access status/settings, retention choices, excluded package management and local history deletion. App exclusions currently use exact package-name entry; an installed-app picker remains a usability improvement.
- Added a five-second undo affordance for save/archive changes; individual and bulk deletes remain confirmation-gated and irreversible within the app.
- Added deterministic Kotlin category and conservative priority rules behind the privacy gate. Analysis persists separately from source notifications in schema v3, including confidence, explanation, method/version and category correction; FTS/app/category/date filters now use the derived category.
- Added synthetic English, Hindi and code-mixed classification fixtures covering ambiguous, prompt-like and false-urgent text. These focused fixtures validate known examples; they do not establish broad classification accuracy.
- Added exact same-app duplicate grouping within fixed 30-minute windows. Group metadata is separate and source rows remain intact.
- Added a deterministic local-day overview with volume, app/category counts, busiest arrival hours, recent source links and explicit listener-coverage caveats.
- Added five Android instrumentation tests for v1→v3 migration/backfill, FTS maintenance, retention, archive, package exclusion, classification and category override; all pass on the Pixel 8 API 35 emulator.
- Added a synthetic multilingual evaluation corpus of 108 unique cases (nine categories, 12 each; English, Hindi and code-mixed examples) and a JUnit evaluator reporting category accuracy/macro-F1, priority accuracy, urgent false positives/negatives and language slices.
- Recorded the evaluation baseline and pinned both candidate model artifacts, revisions, SHA-256 checksums, licenses and runtime versions in `docs/MODEL_BENCHMARK_CANDIDATES.md`.
- Recorded exact deterministic quality metrics for the 108-case synthetic corpus in `docs/MODEL_BENCHMARK_DETERMINISTIC_BASELINE.md`; the test is JVM-only and does not claim model or emulator inference.
- Added an isolated Kotlin 2.4.0 LiteRT-LM benchmark app and completed the pinned model's 108-case CPU trial on a temporary 6 GiB API 35 AVD. Results: 0.139 category accuracy, 0.071 macro-F1, 0.713 priority accuracy, two strict-JSON failures, 1.85 GiB process high-water RSS and 2.27 s median latency. It underperformed the deterministic baseline; see `docs/MODEL_BENCHMARK_LITERT_EMULATOR.md`.
- Added an isolated ONNX Runtime 1.29.0 graph-load probe. The pinned Q4F16 file opened on the 6 GiB AVD in 1.44 s at 1.28 GiB high-water RSS. Its decoder inputs expose a tokenizer and past/present KV-cache loop requirement; text generation and ONNX corpus scoring remain open. See `docs/MODEL_BENCHMARK_ONNX_EMULATOR.md`.
- Recorded the Phase 4 runtime decision: do not adopt this LiteRT candidate for classification because its measured quality was far below deterministic rules; defer ONNX until text generation and corpus quality can be measured. Production remains deterministic and carries no model runtime or weights.
- Added a repeatable benchmark run sheet for corpus quality, device metadata, latency, memory, download/package size, battery and thermal observations.
- Added a benchmark-only prompt contract with strict JSON schema, untrusted-notification handling, greedy generation settings and parser failure semantics.
- Added a constrained Kotlin rule codec/evaluator with ordered matching, schema v2 reminder actions, preview, and explicit re-evaluation of stored history. Reminders use inexact alarms, generic lock-screen text, Android 13+ notification permission, and reboot rescheduling. Existing rule effects are replaced only by the explicit user action; manual saved/category overrides remain authoritative, past reminder times are skipped, and alarms are canceled when their record is deleted.
- Added saved searches to the Search screen. Names and bounded filter metadata are validated natively and stored locally; users can apply or delete them. Search metadata is capped at 20 entries and contains no notification content.
- Added app-package/literal-text custom rule conditions and package-aware preview. Inbox and Search now discover assigned rule groups and filter on the exact group label; saved searches retain that filter and old entries without `groupName` remain compatible.
- Ran TypeScript typecheck, Android debug assembly and unit tests, and the Android instrumentation suite on the Pixel 8 AVD. Fourteen instrumentation tests pass, including reminder validation/preview, explicit re-evaluation, manual save/category override preservation, and prior synthetic rule coverage.

## Current state

The development kit and planning baseline are tracked in `be075d2`; implementation and documentation changes are local and uncommitted. The kit's FastAPI and Kotlin files remain starter/reference artifacts. Node 22.23.4 and JDK 17 were used for the RN 0.88.1 scaffold; Node 18.20.8 remains the default outside the pinned project toolchain. Python 3.15.2 is not relevant until optional backend work. A Pixel 8 API 35 emulator is attached; no physical Android device is attached.

## Outstanding tasks

### Planned phases

- [x] Phase 0 — RN foundation and emulator build proof; physical-device verification remains outstanding.
- [ ] Phase 1 — permission UX, native listener, privacy gate, SQLite persistence and basic inbox. API 35 emulator Settings grant/revoke, background capture and app-exclusion UI checks pass; process-death capture, reliable live sensitive-fixture injection, removal/reconnect and physical-device lifecycle checks remain.
- [x] Phase 2 — inbox actions, retention, filters and FTS search are implemented; manual visual theme QA remains for release verification.
- [x] Phase 3 — deterministic classification, separate analysis persistence, focused fixtures, repeat grouping, daily overview and aggregate insights are implemented.
- [x] Phase 4 task 1 — 108-case synthetic evaluation set and deterministic baseline established. No production model dependency is selected.
- [x] Phase 4 task 2 — pin model revisions, artifact checksums, licenses and runtime versions for LiteRT-LM and ONNX Runtime Android candidates.
- [ ] Phase 4 — Qwen runtime benchmark spike; no production adoption before evidence.
- [x] Phase 5 task 1 — versioned constrained user-rule schema and deterministic evaluation semantics documented.
- [x] Phase 5 — rule evaluation, package/text custom conditions, saved searches, exact rule-group browsing and saved group filters are implemented and covered by emulator fixtures.
- [ ] Phase 6 — optional cloud foundations scoped to explicit features.
- [ ] Phase 7 — device/OEM QA, privacy/release review and beta.

See `IMPLEMENTATION_PLAN.md` for tasks, acceptance criteria, test strategy and risks. Candidate pins and the per-run report template are in `docs/`.

## Working decisions

- Accepted by the kit: RN Bare + TypeScript, minimal Kotlin, device SQLite as authority, local-first operation, optional cloud, cloud AI off by default, Qwen as benchmark candidate, light/dark themes.
- Approved defaults: Kotlin-owned SQLite; Android 10/API 29+; English UI with synthetic English/Hindi/code-mixed evaluation; full discard of sensitive events; 30-day default retention with saved exemption; no account/cloud/telemetry in initial release; deterministic overview in MVP; organizational-only rules; measurable model gate. Details are in `DECISIONS_LOG.md`.
- Remaining decisions are limited to which physical OEM devices are available, legal markets/privacy wording, and whether a future feature justifies optional cloud services.

## Blockers and follow-up

- Physical-device capture lifecycle verification remains outstanding. The API 35 emulator now verifies the real Settings grant/revoke path and capture while the app is backgrounded; it does not verify process-death lifecycle or OEM behavior.
- The debug APK installed and Metro served the JS bundle; Android logcat confirmed `Running NotifyIQ`. Notification access remained disabled and no live capture flow was exercised.
- The first bridgeless registration path marked `NotifyIQ` as a TurboModule, but the RN 0.88.1 JS runtime exposed no `global.__turboModuleProxy`. Switched to a plain `ReactContextBaseJavaModule` through legacy interop. Pixel 8 API 35 verified access status, rule persistence across reinstall, preview output, and deletion of the synthetic test rule. The test rule was removed after the smoke check.
- Emulator listener smoke check: shell-granted access, posted a synthetic “Payment/payment” notification, and verified it was captured as Finance. This preceded the newer Settings-flow check and did not cover UI-closed capture.
- API 35 Settings-flow check: started from access-off, granted permission through NotifyIQ's Privacy control and Android's confirmation sheet, then verified the app reported access on. A normal synthetic `com.android.shell` notification was captured while the app was backgrounded. Excluding that package through the Privacy UI suppressed a later synthetic post; removing the exclusion returned the setting to its initial state.
- The `cmd notification post` utility did not preserve the intended multiword sensitive fixture and surfaced generic shell content, so the live sensitive-capture attempt is inconclusive. Synthetic privacy-gate fixtures remain the evidence for OTP/password/card screening. No live sensitive event is claimed.
- Restored notification access to off, removed the temporary package exclusion, individually deleted the three timestamped synthetic shell rows, removed the temporary ADB reverse mapping, and stopped the Metro server started for this check. Inbox is empty; the already installed debug app remains on the emulator.
- Production has no model inference runtime or bundled weights. LiteRT and ONNX are only in `mobile/model-benchmark/`; LiteRT failed the quality comparison, and ONNX has only passed graph loading. Physical-device verification remains. See the model benchmark preflight and runtime reports in `docs/`.

## Checks performed

- Read-only Git status/branch/remote inspection and source-tree enumeration.
- Read-only local environment version checks for Node, npm, Java, adb and Python; confirmed `ANDROID_HOME` is configured.
- Inspected the light dashboard and full-product concept board as visual references.
- `fnm exec --using=22.23.4 -- npm install` — completed; npm reported zero vulnerabilities. Template dependencies emitted deprecation notices, including ESLint 8.
- `npm run typecheck` — passed after Phase 1 changes.
- `npm run lint` — passed after Phase 1 changes.
- `npm test -- --runInBand --watchman=false` — passed, 3 suites / 7 tests after classification filters and coverage cues.
- `./gradlew --no-daemon testDebugUnitTest` — passed, including three classifier unit tests with synthetic English/Hindi/code-mixed, ambiguous and false-urgent fixtures.
- `./gradlew --no-daemon generateCodegenArtifactsFromSchema compileDebugKotlin assembleDebug` — passed.
- `./gradlew --no-daemon connectedDebugAndroidTest` — passed, 4 database tests on Pixel 8 API 35.
- `./gradlew --no-daemon generateCodegenArtifactsFromSchema compileDebugKotlin assembleDebug connectedDebugAndroidTest` — passed with schema v3/category analysis; 5 Android database instrumentation tests passed on Pixel 8 API 35.
- `./gradlew --no-daemon generateCodegenArtifactsFromSchema compileDebugKotlin assembleDebug connectedDebugAndroidTest` — passed with schema v4/grouping and daily aggregates; 7 Android instrumentation tests passed on Pixel 8 API 35.
- `fnm exec --using=22.23.4 -- npm run typecheck` — passed after adding reminder rule controls and explicit history re-evaluation.
- `fnm exec --using=22.23.4 -- npm test -- --runInBand --watchman=false` — passed, 4 suites / 8 tests after updating notification model fixtures.
- `fnm exec --using=22.23.4 -- ./gradlew --no-daemon :app:assembleDebug :app:testDebugUnitTest` — passed with reminder scheduling and history re-evaluation.
- `fnm exec --using=22.23.4 -- ./gradlew --no-daemon :app:connectedDebugAndroidTest` — passed on Pixel_8 AVD; 14 instrumentation tests passed.
- `fnm exec --using=22.23.4 -- npm run typecheck` — passed after adding saved-search UI and native bridge methods.
- `fnm exec --using=22.23.4 -- ./gradlew --no-daemon :app:assembleDebug :app:assembleDebugAndroidTest` — passed; production app and instrumentation APK compiled with saved-search support.
- `fnm exec --using=22.23.4 -- ./gradlew --no-daemon :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.notifyiq.SavedSearchesTest` — passed on Pixel_8 AVD; two saved-search persistence/validation tests passed.
- `fnm exec --using=22.23.4 -- npm run typecheck` — passed after adding app-package rule conditions and package-aware preview.
- `fnm exec --using=22.23.4 -- npm run lint` — passed with warnings only; some warnings are in generated Android test reports under `mobile/model-benchmark/app/build`.
- `fnm exec --using=22.23.4 -- ./gradlew --no-daemon :app:assembleDebug :app:testDebugUnitTest` — passed after the rule editor change.
- `fnm exec --using=22.23.4 -- ./gradlew --no-daemon :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.notifyiq.UserRulesTest` — passed on Pixel_8 AVD; six rule evaluation, matching and persistence tests passed.
- `fnm exec --using=22.23.4 -- npm run typecheck` — passed after adding exact rule-group browsing and saved group filters.
- `fnm exec --using=22.23.4 -- ./gradlew --no-daemon :app:assembleDebug :app:assembleDebugAndroidTest` — passed with group filtering and saved-search integration.
- `fnm exec --using=22.23.4 -- ./gradlew --no-daemon :app:connectedDebugAndroidTest` — passed on Pixel_8 AVD; all 17 instrumentation tests passed, including exact rule-group filtering and saved group metadata.
- `fnm exec --using=22.23.4 -- ./gradlew --no-daemon :app:assembleDebug` — passed; debug APK installed on Pixel_8 API 36 emulator and `com.notifyiq/.MainActivity` launched. Gradle/AGP and safe-area generated code reported deprecation warnings.
- Metro ran on port 8093 because ports 8081 and 8082 were already occupied. It served the app bundle and logcat confirmed the JS app started without a JavaScript exception.
- Notification access remains off during implementation checks. The physical listener callback path has not yet been exercised with live notifications; no physical device is attached.
