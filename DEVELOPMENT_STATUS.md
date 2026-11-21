# NotifyIQ Development Status

**Last updated:** 2026-11-21  
**Current phase:** Initial project audit and planning  
**Application implementation:** Not started  
**Git:** `main` has no commits; `origin/main` is marked gone; development kit is untracked. No history or remote changes were made.

## Completed

- Inspected all 69 development-kit files: product/feature/persona requirements, architecture/privacy/database/API/Android references, SQL, AI strategy/benchmark contract, UI/UX and visual references, backend and Kotlin/TypeScript starter code, roadmap/checklists, setup guides and Codex workflow prompts.
- Inspected repository status, branch, configured origin, current source layout, starter `.gitignore` files and local tool versions.
- Created root project instructions with permanent Git restrictions and NotifyIQ implementation constraints.
- Created the implementation plan and decision log.
- No app feature code, scaffold, dependencies, tests or build configuration were added.

## Current state

The repository consists of the untracked `NotifyIQ-Development-Kit/`; there is no runnable mobile app or backend project at repository root. The kit's FastAPI and Kotlin files are starter/reference artifacts, not production implementations. Tool versions observed: Node 18.20.8, npm 10.8.2, Java 17.0.19, adb 1.0.41 and Python 3.15.2; compatibility and physical-device availability remain unverified.

## Outstanding tasks

### Before application implementation

- [ ] Verify current React Native/Android toolchain requirements against official documentation and select compatible versions.
- [ ] Confirm physical Android test device(s), Android API level, and whether a local emulator/device is available.
- [ ] Review/accept the proposed Kotlin-owned single SQLite database boundary.
- [ ] Decide class-specific sensitive notification handling (discard vs field redaction) and false-positive policy.
- [ ] Resolve MVP boundary for daily overview/digest/search/rules/insights.
- [ ] Specify migration 001, event identity/dedupe/removal, FTS consistency and saved-item retention semantics.

### Planned phases

- [ ] Phase 0 — RN foundation and physical Android build proof.
- [ ] Phase 1 — permission UX, native listener, privacy gate, SQLite persistence and basic inbox.
- [ ] Phase 2 — inbox actions, retention, filters and FTS search.
- [ ] Phase 3 — deterministic classification, grouping, overview/digest and insights.
- [ ] Phase 4 — Qwen runtime benchmark spike; no production adoption before evidence.
- [ ] Phase 5 — user rules and richer organisation.
- [ ] Phase 6 — optional cloud foundations scoped to explicit features.
- [ ] Phase 7 — device/OEM QA, privacy/release review and beta.

See `IMPLEMENTATION_PLAN.md` for tasks, acceptance criteria, test strategy, risks and the recommended first implementation task.

## Decisions and recommendations

- Accepted by the kit: RN Bare + TypeScript, minimal Kotlin, device SQLite as authority, local-first operation, optional cloud, cloud AI off by default, Qwen as benchmark candidate, light/dark themes.
- Proposed for review: Kotlin owns the single SQLite DB so native capture persists while JS is inactive; capture-first MVP phasing; class-specific fail-closed sensitive screening; migrations and transactional FTS maintenance from the first schema.
- No open decision has been silently changed. Details and rationale are in `DECISIONS_LOG.md`.

## Blockers

- None for planning. Application implementation is waiting on a compatible version/device baseline and review of the data ownership/privacy decisions listed above.

## Checks performed

- Read-only Git status/branch/remote inspection and source-tree enumeration.
- Read-only local environment version checks for Node, npm, Java, adb and Python; confirmed `ANDROID_HOME` is configured.
- Inspected the light dashboard and full-product concept board as visual references.
- No tests, linters, builds or dependency installs were run; no application exists to test yet.
