# NotifyIQ Development Status

**Last updated:** 2026-11-21  
**Current phase:** Phase 3 — deterministic classification and overview
**Application implementation:** Listener, privacy gate, bundled SQLite/FTS, retention, inbox actions, Privacy Centre, category/priority analysis and typed bridge implemented; broader classification evaluation and physical-device capture verification remain
**Git:** `HEAD` is `be075d2` on `main`, tracking `origin/main`. That planning commit appeared since the initial audit; I did not create it. Current implementation changes are uncommitted local work.

**Roadmap count:** 44 numbered tasks across Phases 0–7. Twenty-one are implemented (Phase 0: 4; Phase 1: 8; Phase 2: 6; Phase 3: 3); 23 remain, including optional cloud foundations and release readiness.

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
- Added five Android instrumentation tests for v1→v3 migration/backfill, FTS maintenance, retention, archive, package exclusion, classification and category override; all pass on the Pixel 8 API 35 emulator.

## Current state

The development kit and planning baseline are tracked in `be075d2`; implementation and documentation changes are local and uncommitted. The kit's FastAPI and Kotlin files remain starter/reference artifacts. Node 22.23.4 and JDK 17 were used for the RN 0.88.1 scaffold; Node 18.20.8 remains the default outside the pinned project toolchain. Python 3.15.2 is not relevant until optional backend work. A Pixel 8 API 35 emulator is attached; no physical Android device is attached.

## Outstanding tasks

### Planned phases

- [x] Phase 0 — RN foundation and emulator build proof; physical-device verification remains outstanding.
- [ ] Phase 1 — permission UX, native listener, privacy gate, SQLite persistence and basic inbox. Implementation is present; physical capture/revocation/removal verification remains.
- [x] Phase 2 — inbox actions, retention, filters and FTS search are implemented; manual visual theme QA remains for release verification.
- [ ] Phase 3 — deterministic classification, grouping, overview/digest and insights. Classification, separate analysis persistence and focused synthetic fixtures are implemented; grouping, overview and insights remain.
- [ ] Phase 4 — Qwen runtime benchmark spike; no production adoption before evidence.
- [ ] Phase 5 — user rules and richer organisation.
- [ ] Phase 6 — optional cloud foundations scoped to explicit features.
- [ ] Phase 7 — device/OEM QA, privacy/release review and beta.

See `IMPLEMENTATION_PLAN.md` for tasks, acceptance criteria, test strategy, risks and the recommended first implementation task.

## Working decisions

- Accepted by the kit: RN Bare + TypeScript, minimal Kotlin, device SQLite as authority, local-first operation, optional cloud, cloud AI off by default, Qwen as benchmark candidate, light/dark themes.
- Approved defaults: Kotlin-owned SQLite; Android 10/API 29+; English UI with synthetic English/Hindi/code-mixed evaluation; full discard of sensitive events; 30-day default retention with saved exemption; no account/cloud/telemetry in initial release; deterministic overview in MVP; organizational-only rules; measurable model gate. Details are in `DECISIONS_LOG.md`.
- Remaining decisions are limited to which physical OEM devices are available, legal markets/privacy wording, and whether a future feature justifies optional cloud services.

## Blockers and follow-up

- Physical-device capture lifecycle verification remains outstanding. Notification access was not enabled during emulator testing.
- The debug APK installed and Metro served the JS bundle; Android logcat confirmed `Running NotifyIQ`. Notification access remains off and no live capture flow was exercised.

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
- `fnm exec --using=22.23.4 -- ./gradlew --no-daemon :app:assembleDebug` — passed; debug APK installed on Pixel_8 API 36 emulator and `com.notifyiq/.MainActivity` launched. Gradle/AGP and safe-area generated code reported deprecation warnings.
- Metro ran on port 8093 because ports 8081 and 8082 were already occupied. It served the app bundle and logcat confirmed the JS app started without a JavaScript exception.
- Notification access remains off during implementation checks. The physical listener callback path has not yet been exercised with live notifications; no physical device is attached.
