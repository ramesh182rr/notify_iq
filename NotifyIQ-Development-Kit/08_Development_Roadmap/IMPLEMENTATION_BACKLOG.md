# Implementation Backlog — Solo Developer

Work in vertical slices. Each task should result in a runnable app or a testable backend capability.

## Phase 0 — Environment and skeleton
- [ ] Install Node, JDK, Android Studio/SDK, Python, Git, VS Code and Codex.
- [ ] Create React Native Bare app using current official setup.
- [ ] Confirm debug build on physical Android device.
- [ ] Add TypeScript strict mode, lint, formatting and basic navigation.
- [ ] Create Python FastAPI service and health endpoint.
- [ ] Add README, env examples and secret exclusions.

## Phase 1 — Native notification capture
- [ ] Add Kotlin NotificationListenerService and manifest declaration.
- [ ] Add permission explanation and settings deep link.
- [ ] Implement listener status and lifecycle.
- [ ] Implement local SQLite repository and schema migration 001.
- [ ] Add app exclusion store and native pre-persistence check.
- [ ] Add sensitive-data redaction/discard rules and tests.
- [ ] Capture permitted notification while UI is closed.
- [ ] Handle removal event without deleting history.
- [ ] Add status/recovery UI.

## Phase 2 — Core product
- [ ] Home dashboard shell and theme tokens.
- [ ] Inbox chronological list.
- [ ] Notification detail screen.
- [ ] Category filters and app filters.
- [ ] Save/archive/delete actions.
- [ ] SQLite FTS5 search and index maintenance.
- [ ] Retention cleanup job.
- [ ] Light/dark/system theme.

## Phase 3 — Deterministic intelligence
- [ ] Rule-based category parser.
- [ ] Conservative priority rules.
- [ ] Classification explanation and correction.
- [ ] Duplicate detection.
- [ ] Basic notification grouping.
- [ ] Daily overview and digest templates.
- [ ] Daily/app/category insights.

## Phase 4 — Qwen runtime spike
- [ ] Create synthetic evaluation dataset.
- [ ] Run ONNX Runtime Android Qwen3-0.6B sample.
- [ ] Benchmark LiteRT-LM artifact.
- [ ] Optional llama.cpp comparison.
- [ ] Record memory, latency, thermal, battery, accuracy and JSON validity.
- [ ] Select runtime and quantisation for supported devices.
- [ ] Add inference adapter and deterministic fallback.
- [ ] Add model download manager, checksum and Wi-Fi-only setting if needed.

## Phase 5 — Rules and automation
- [ ] Rule list and editor.
- [ ] Conditions: app/category/keyword/priority/time.
- [ ] Actions: categorise/save/digest/reminder/group/mark important.
- [ ] Rule preview, enable/pause/delete.
- [ ] Rule execution tests.

## Phase 6 — Cloud foundations
- [ ] Create Neon project and apply schema.
- [ ] Add account auth provider (choose only when needed).
- [ ] Add user preferences sync, no raw notification content.
- [ ] Deploy FastAPI to Render.
- [ ] Add R2 bucket and least-privilege credentials.
- [ ] Add presigned upload/download for encrypted export only.
- [ ] Add privacy and account deletion procedures.

## Phase 7 — QA and beta
- [ ] Test supported Android API levels and at least 3 OEM families if available.
- [ ] Test permission revoke/regrant, reboot, listener disconnect.
- [ ] Test notification formats and redacted content.
- [ ] Test 1k/10k/50k local records and search performance.
- [ ] Test database migration and data deletion.
- [ ] Test battery and thermal impact.
- [ ] Review Play policy, privacy policy and Data Safety disclosure.
- [ ] Closed beta and feedback cycle.

## Solo-developer cadence
- One milestone at a time.
- Keep issues small enough to finish in 1–2 focused sessions.
- Require Codex to explain changed files and tests.
- Commit after each working slice.
- Keep a `DECISIONS.md` log when changing dependencies or architecture.
