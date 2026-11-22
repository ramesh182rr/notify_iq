# NotifyIQ Development Status

**Last updated:** 2026-11-22  
**Current phase:** Phase 7 release readiness (emulator-verifiable parts); tasks 1–3 partially complete
**Application implementation:** Listener, privacy gate, bundled SQLite/FTS, retention, inbox actions, Privacy Centre, deterministic analysis, duplicate/rule-group browsing, daily overview, user rules and saved searches are implemented; physical-device capture verification remains
**Git:** `HEAD` is `3c175de` on `main`. Changes since then are uncommitted local work for owner review: CLAUDE.md, ONNX benchmark (Phase 4 close), dev Metro port, Home screen, Android 15 redaction handling and the fixture poster.

**Roadmap count:** 48 numbered tasks. Thirty-eight are implemented; 10 remain: Phase 1 device lifecycle verification, optional cloud foundations (6) and Phase 7 tasks 1, 2 and 4 (1 and 2 partial).

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
- Added a dependency-free Kotlin byte-level BPE tokenizer for the pinned Qwen3 `tokenizer.json` and a greedy float16 KV-cache generation loop for ORT 1.29.0, both only in the isolated benchmark app. A host reference script (HF `tokenizers` + ORT Python 1.29.0) produced checked-in prompt-id and output fixtures. On the emulator, tokenization matched 108/108 prompts and decoding matched 108/108 outputs; 84/108 generations were token-identical to the host, with the rest consistent with float16 kernel differences.
- Completed the ONNX 108-case emulator trial: strict valid JSON 15/108, category accuracy 0.065, macro-F1 0.097, priority accuracy 0.111, urgent FP/FN 0/1, p50/p95 latency 3.7/4.1 s, prefill p50 2.9 s, decode 22.5 tokens/s, process high-water RSS ~1.44 GiB. Most outputs were Markdown-fenced. With the fence stripped as a diagnostic only, scores rise to accuracy 0.315 and macro-F1 0.216, still far below the deterministic 0.955. Recorded decision R-011: reject both runtime candidates for classification and close Phase 4. See `docs/MODEL_BENCHMARK_ONNX_EMULATOR.md`.
- Fixed the dev app attaching to another project's Metro: port 8081 on this host is used by a different React Native project, so the NotifyIQ debug build loaded a foreign or stale bundle. NotifyIQ now uses a dedicated Metro port, 8093 (`reactNativeDevServerPort` in `android/gradle.properties`, `metro.config.js`, and the `npm start` / `npm run android` scripts). Run `adb reverse tcp:8093 tcp:8093` for the emulator.
- Replaced the Phase 0 "Foundation build" Home placeholder with a real Home screen: notification-access card plus shortcuts to Inbox, Today's overview, Rules and Privacy. Fixed the Inbox Jest mock, which was missing the rule-group and saved-search bridge functions (5 tests had been failing).
- Added `mobile/dev-fixture-poster`, a debug-only, dependency-free app that posts or cancels synthetic notifications from `am start` extras, so multiword sensitive fixtures arrive intact.
- Live emulator lifecycle checks (API 35): normal capture; password fixture discarded by NotifyIQ's gate; OTP and card fixtures redacted by Android 15 before delivery; removal marks `removed_at` and keeps the row; capture resumes after process kill (system rebind ~8 s) and after force-stop; nothing captured while access is revoked; capture resumes after re-grant.
- Found and fixed (R-012): OS-redacted sensitive notifications were stored as placeholder rows, and Android autogroup summaries were stored as empty rows. Both are now discarded or skipped in the listener (`SystemRedaction.kt`), and the fix was re-verified live.
- Cleanup: deleted all synthetic rows through Privacy → Delete all notification history (0 events/analysis rows; retention preference 30 days kept), revoked NotifyIQ notification access, cancelled fixtures, uninstalled the poster and probe listener, removed the 8093 ADB reverse mapping.
- Phase 7 hardening: removed `INTERNET` from the release manifest (debug-only for Metro); added data-extraction rules that exclude all data from cloud backup and device transfer; release signing now reads untracked `NOTIFYIQ_UPLOAD_*` properties with a debug-key fallback for local smoke tests; enabled R8 and resource shrinking; native/JS logging reduced to error codes. Release smoke test on the emulator passed: launch, all tabs, live capture plus classification, OTP/password discard. Checklist and privacy/data-safety draft are in `docs/RELEASE_READINESS.md`.
- Added an opt-in `RepositoryScaleTest` (1k/10k/50k synthetic rows) covering search, paging, category filter, overview, retention cleanup and clear, with FTS consistency assertions.
- UI refresh (2026-11-22), still deterministic and local, no new dependencies:
  - Home is now a dashboard: greeting, a "Today" hero with category share, a "may need a look" card for urgent/high items, an hourly rhythm chart, top apps, latest items, quick actions, a daily tip and a privacy promise. With access off it shows a 3-step onboarding hero.
  - Inbox cards gain category avatars, readable app names, relative time, category/priority/group pills and chip-style actions.
  - Insights gains a hero, category and app bars, and a 24-hour chart. The native overview now returns all hourly buckets instead of the top 5.
  - New shared primitives in `src/components/ui.tsx` (View-drawn tab icons, reduced-motion-aware fade-in), a compact header, an icon tab bar, and an adaptive launcher icon.
  - Verified on the emulator in light and dark themes with synthetic data, which was then deleted.
- Play compatibility verified: target API 36, 16 KB-aligned native libraries, AAB built. The release APK installed and launched cleanly on the emulator. Local artifacts were copied to git-ignored `dist/`.
- Money and upcoming insights (R-013, Phase 5b):
  - Deterministic extractor (`InsightExtractor.kt`), schema v7 `notification_insights` with backfill, money/upcoming/recurring queries, dismiss, and insight reminders.
  - UI: Insights → Money / Coming up, plus Home cards.
  - Accuracy: dev 88 cases at 1.000 on all extraction metrics. The first unseen runs gave money precision 0.933 (holdout) and 0.846 (holdout 2), with amounts and dates always correct when detected. All sets pass after generic fixes. Details in `docs/MONEY_AND_UPCOMING_INSIGHTS.md`.
- Found (R-014): Android 15 redacts bank alerts containing OTP-like tokens such as "A/c XX1234" for NotifyIQ. Probed on the emulator; the Money screen discloses it.
- Emulator end-to-end check: synthetic alerts produced correct spent/received totals and categories. Offer, failed and balance lines were ignored. Coming up grouped the items, and a reminder was scheduled (alarm at 09:00 next day), then cancelled. Cleanup: history deleted through the Privacy UI (0 events/insights), access revoked, poster uninstalled, no pending NotifyIQ alarms.
- Detailed money categories and dashboard (R-015):
  - `MoneyCategorizer`: 19 spending and 6 income categories.
  - Schema v8: per-payment category overrides plus "always for this place" rules; insights auto-recompute when the extractor version changes.
  - `moneyAnalytics`: previous-period comparison, projection, daily flow, weekday and time-of-day patterns, highlights.
  - UI: View-based charts (treemap, flow, calendar heatmap, columns) and a category picker.
  - Category evaluation: 0.982 on first run, 1.000 after fixing completed reversals.
  - Emulator check: 15 live synthetic alerts all categorised correctly. Cleanup left 0 events, 0 insights, no category rules and no alarms.
- Accessibility and release hardening (Phase 7):
  - WCAG contrast test suite: found and fixed white-on-brand in the dark theme via a new `onBrand` token, plus automatic tile and pill text colour.
  - Touch targets raised to ≥ 48 dp across all screens.
  - No unlabelled controls found.
  - Large-text support at 1.3× and 2.0× (adaptive header, capped tab labels).
  - Reproducible release contents verified (404/404 entries identical). Phase 7 task 3 complete; the owner creates the upload key.
  - Emulator restored afterwards: 0 events/insights, access off, poster removed, font scale 1.0, no alarms.
- Header fix: the theme switch had stretched over the brand after the touch-target change; it now keeps its natural width, and the selected theme is a solid brand pill.
- Android 10 (API 29, 4 GB AVD):
  - 23/23 instrumentation tests pass.
  - NotifyIQ's gate discards OTP, password and card fixtures.
  - Bank alerts with "XX1234" are captured and extracted (no platform redaction on Android 10).
  - Dismissal, real process kill, force-stop, revoke/re-grant and reboot (alarm rescheduled, capture resumes) all verified.
  - UI renders correctly.
  - Cleaned up afterwards. Details in `docs/RELEASE_READINESS.md`.
- Security and in-app legal (R-016): screen protection on by default (verified screenshots blocked), optional App lock via the system prompt (enable, relaunch, cancel, unlock and 30 s relock all verified), in-app Privacy policy / Terms / Security, and a manifest-drift test. Found and fixed: the prompt needs `USE_BIOMETRIC`. Exposure review confirmed no `inet` group on the app process and no AI or analytics libraries. Emulator test PIN and settings removed afterwards.
- R-017:
  - Screen protection removed at the owner's request; policy and security text updated.
  - Floating pill bottom navigation, checked in light and dark themes and when scrolled.
  - Private RSA-4096 release key generated outside the repo. Version 1.6 is signed with it (cert `38886f7f…`), and Android rejects debug-signed updates over it.
  - Old debug-signed APKs moved to `dist/old-debug-signed/`.
- Phase 7 progress:
  - Battery/CPU measured on the emulator: about 17 ms CPU per captured notification, idle about 20 ms per 30 s, no wakelocks. Found the 50-active-notification test pitfall.
  - Play listing kit in `docs/store/`: 512 icon, feature graphic, 8 framed 2:1 screenshots from an opt-in fictional-data seeder, store text within limits, Play Console answers, and hostable privacy/terms HTML generated from the in-app legal text.
  - Emulator cleaned afterwards: demo history deleted, access off, test APK removed.
- R-018 batch:
  - Persistent theme, real app names and icons (schema v9 `app_directory`), first-run onboarding, View source from Money and Coming up, app picker, encrypted backup export/import, indexed duplicate fingerprints, and a TurboModule migration.
  - New `mobile/e2e/notifyiq_e2e.py`: 23 checks covering launch, tabs, theme persistence, capture, sensitive discard, extraction, real names, picker, View source, and an encrypted export → delete → restore round trip, with search intact.
  - Bugs found and fixed while testing:
    - `getNotification` returned a map from a consumed array, so View source showed "no longer in history".
    - Tabs inherited the previous tab's scroll offset.
  - Verified the backup file has the `NIQX` header and contains no readable notification text or SQLite header; a wrong password is rejected.
- Real-device report (owner's phone, 1.7): after closing and reopening the app, Home stayed on "Reconnecting". Cause: the listener-connected flag is process-local. When the phone restarts the app process and does not promptly re-bind the NotificationListenerService (common with OEM battery management), the flag stays false. Fix (1.8):
  - `getListenerStatus` calls `NotificationListenerService.requestRebind` (rate-limited) whenever access is granted but the listener is not connected.
  - The app re-polls every 2 s for about 30 s, showing "Connecting…".
  - If still not connected, a help card offers Reconnect, Battery settings (`ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS`, no special permission) and OEM autostart guidance.
  - The emulator re-binds promptly, so the stalled path is covered by a Jest test. The real-device fix still needs the owner's confirmation.
- R-019 (1.9): probe-based connection status, safe brand-agnostic self-repair (requestRebind at start, boot, update, status checks and a 15-minute job). The component-toggle approach was measured harmful on Android 15 and rejected. UI moves to 4 tabs: Inbox merges search and saved searches behind a Filters panel; the Settings tab groups Rules, access & apps, backup, App lock, appearance and legal; the header is slimmed. Tests: ListenerHealthTest (probe ignores a stale flag, repair is harmless while bound, job scheduled and persisted), Settings and connection-help Jest tests, e2e updated (21/21).
- R-021 (1.11): real fix for "Connecting…" after the app is cleared from Recents.
  - Root cause, from AOSP source: `requestRebind` is a no-op unless the listener is snoozed. Android retries a dead binding only once.
  - New token-checked probe and a three-step repair ladder (`requestRebind` → API 34+ unbind/rebind cycle → package-changed signal via the private `ListenerRebindTrigger`).
  - The help card now points to switching access off and on.
  - Tests:
    - ListenerHealthTest: 5/5 on API 35; on API 29, 4 passed and 1 skipped (API 34+ only). Covers escalation keeping access and binding, and an unbound listener re-bound.
    - Full instrumentation: 33 passed, 2 opt-in skipped.
    - Jest: 51/51.
    - e2e: 24/24 (the first run had one money-row timing miss; the rerun was clean).
- R-020 (1.10): choose apps by name and icon. Adds a launcher `<queries>` block (no QUERY_ALL_PACKAGES), native `getInstalledApps` with cached icons, and a toggle-mode AppPicker in Privacy. Package names are no longer shown anywhere, and manual package entry is removed. Policy is now v1.3. Tests: Jest 51/51 (new AppPicker test), instrumentation 31 passed and 2 opt-in skipped, e2e 24/24 (adds a name-only picker check and switch-off/keep-again checks). Emulator cleanup: app data cleared by the e2e cleanup; notification access is off.
- Added root `CLAUDE.md` (imports `AGENTS.md`) with Claude Code working notes: toolchain commands, environment facts and the no-commit rule.
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
- [x] Phase 4 — Qwen runtime benchmark spike complete on the emulator; both LiteRT and ONNX candidates rejected for classification (R-011). No production model dependency.
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
- Production has no model inference runtime or bundled weights. LiteRT and ONNX are only in `mobile/model-benchmark/`; both failed the quality comparison on the full synthetic corpus. Physical-device verification remains. See the model benchmark preflight and runtime reports in `docs/`.

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
- `fnm exec --using=22.23.4 -- ./gradlew --no-daemon -p ../model-benchmark :app:installDebug :app:installDebugAndroidTest` (from `mobile/android/`) — passed; benchmark app and test APK installed on the Pixel_8 API 35 AVD (6 GiB).
- `adb shell am instrument -w -e class com.notifyiq.modelbenchmark.QwenTokenizerParityTest …` — passed (1 test): 108/108 prompt-token and decode parity with Hugging Face `tokenizers`.
- `adb shell am instrument -w -e class com.notifyiq.modelbenchmark.OnnxCorpusBenchmarkTest …` — passed (1 test, 415 s): all 108 cases produced a result; metrics are in `docs/MODEL_BENCHMARK_ONNX_EMULATOR.md`.
- Host reference: `uv run --no-project --with onnxruntime==1.29.0 --with tokenizers --with jinja2 --with numpy python -I mobile/model-benchmark/tools/qwen_onnx_host_reference.py …` — completed on macOS arm64; strict valid JSON 6/108.
- Production app code was not changed in this session, so production typecheck, build and instrumentation were not re-run.
- `npm run typecheck`, `npx eslint App.tsx src __tests__` (0 errors, 6 existing warnings), `npm test -- --runInBand --watchman=false` (4 suites / 8 tests) — passed after the Home and mock changes.
- `./gradlew --no-daemon :app:installDebug :app:testDebugUnitTest` — passed with the listener change; app launched against Metro 8093 and all six tabs rendered without JS errors.
- `./gradlew --no-daemon :app:connectedDebugAndroidTest` — passed on Pixel_8 API 35: 17 tests, 0 failures, after the listener change.
- `./gradlew --no-daemon :app:assembleRelease` — passed with R8/resource shrinking; release APK installed on the emulator; `aapt2` confirmed no INTERNET permission, backup/transfer exclusions and cleartext off; launch, tabs and live capture smoke passed.
- `./gradlew --no-daemon :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.notifyiq.RepositoryScaleTest -Pandroid.testInstrumentationRunnerArguments.notifyiqScale=true` — passed. 50k rows: search p50 10 ms, overview 83 ms, insert 32.6 ms/row at test density. Details are in `docs/RELEASE_READINESS.md`.
- Release smoke cleanup: deleted history through the Privacy UI (0 rows), revoked notification access, uninstalled the fixture poster, reinstalled the debug build.

- `./gradlew --no-daemon :app:connectedDebugAndroidTest` (after Phase 7 changes) — passed: 18 tests, 0 failures, 1 skipped (the opt-in scale test).
- `npm run typecheck`, eslint (0 errors), `npm test` (4 suites / 8 tests) — passed after the UI refresh. `:app:assembleRelease :app:bundleRelease` — passed; release APK smoke on emulator passed.
- After Phase 5b: `npm run typecheck`, eslint (0 errors), `npm test` (5 suites / 10 tests); `./gradlew :app:testDebugUnitTest` (11 tests including 3 extraction evaluations); `:app:connectedDebugAndroidTest` on Pixel_8 API 35 — 22 tests, 0 failures, 1 skipped (opt-in scale).
- After R-015: `npm run typecheck`, eslint (0 errors), `npm test` (6 suites / 11 tests); `:app:testDebugUnitTest` (12 tests including extraction and category evaluations); `:app:connectedDebugAndroidTest` — 23 tests, 0 failures, 1 skipped (opt-in scale).
- After the accessibility pass: `npm run typecheck`, eslint (0 errors), `npm test` (7 suites / 44 tests including 33 contrast checks); two clean `assembleRelease` builds compared (404/404 entries identical).
- Android 10: `ANDROID_SERIAL=emulator-5556 ./gradlew :app:connectedDebugAndroidTest` — 23 tests, 0 failures, 1 skipped; live lifecycle checks as above.
- After R-016: `npm run typecheck`, eslint, `npm test` (8 suites / 47 tests); release built and audited (permissions POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, USE_BIOMETRIC; no INTERNET).
- After R-017: typecheck, eslint, `npm test` 47/47, unit tests, `assembleRelease`/`bundleRelease` signed with the private key (apksigner v2 verified), 16 KB OK, permissions POST_NOTIFICATIONS/RECEIVE_BOOT_COMPLETED/USE_BIOMETRIC; release smoke on the emulator passed.
- After R-018: typecheck, eslint (0 errors), `npm test` 8 suites / 47 tests; `:app:testDebugUnitTest` 12; `:app:connectedDebugAndroidTest` 28 tests, 0 failures, 2 opt-in skipped (includes migration v1→v9, backup crypto and round trip, app directory, fingerprint grouping); `python3 -I mobile/e2e/notifyiq_e2e.py` 23/23.
- After R-019: typecheck, eslint, `npm test` 10 suites / 50 tests; `:app:connectedDebugAndroidTest` 31 tests, 0 failures, 2 opt-in skipped; e2e 21/21.
