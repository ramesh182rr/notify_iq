# NotifyIQ Implementation Plan

**Status:** Planning baseline; no application features implemented.  
**Source of truth:** `NotifyIQ-Development-Kit/` and accepted decisions recorded in `DECISIONS_LOG.md`.

## 1. Product and architecture understanding

NotifyIQ is an Android companion for reviewing, organising and searching notification events exposed by Android. It does not replace the notification shade, guarantee capture of every event, recover arbitrary missed history, or verify bank transactions. The privacy-first baseline is useful without an account, network connection or model.

The Android `NotificationListenerService` is responsible for lifecycle-aware capture. It must check app exclusions before reading content, apply a deterministic sensitive-content gate before persistence, and persist safely without requiring React Native JavaScript to be running. SQLite on the device is authoritative. TypeScript owns product UI and domain presentation through a typed native repository boundary. Optional Python/FastAPI, Neon and R2 services are outside the live capture path. Deterministic rules come before any optional local model; Qwen3-0.6B remains unselected until a physical-device benchmark supports it.

The UX is calm and transparent, with Home, Inbox, Search, Insights and Rules navigation, accessible components, system/light/dark appearance, explicit permission education, privacy controls and clear stale/incomplete-history states. Supplied images are visual direction; written requirements and privacy rules control behavior.

## 2. Current repository baseline

- The repository contains the 69-file NotifyIQ development kit, including product/UX/architecture/AI/backend/setup documentation, SQLite and Neon SQL, TypeScript contracts, a Kotlin listener skeleton, and a minimal FastAPI starter.
- There is no root React Native project, Gradle project, test suite, dependency manifest, or built application. The kit explicitly describes itself as a blueprint, not a finished app.
- Git is on `main`, has no commits yet, and reports `origin/main` as gone. `origin` is configured. The kit directory is untracked. No Git history or remote state was changed.
- Environment inspection found Node.js 18.20.8, npm 10.8.2, Java 17.0.19, Android Debug Bridge 1.0.41, and Python 3.15.2; `ANDROID_HOME` is configured. These versions were observed, not validated as a compatible React Native toolchain. Confirm current supported versions before scaffolding. The kit documents Python 3.11+, so the installed Python version also needs compatibility confirmation before backend work.

## 3. Recommended project layout

Keep the development kit intact as product documentation. Add app code only as milestones require.

```text
AGENTS.md
IMPLEMENTATION_PLAN.md
DEVELOPMENT_STATUS.md
DECISIONS_LOG.md
NotifyIQ-Development-Kit/            # supplied source specifications and references
mobile/                              # React Native Bare app (after foundation milestone)
  android/                           # manifest, Kotlin listener, native SQLite repository
  src/
    app/                             # navigation and app composition
    components/                      # shared accessible UI components
    features/                        # inbox, search, privacy, settings, etc.
    domain/                          # product types and use cases
    data/                            # typed native repository adapter
    theme/                           # semantic light/dark/system tokens
    native/                          # typed module contract and adapter
    __tests__/                       # focused unit/component tests as requested
backend/                             # optional FastAPI service, when cloud scope is approved
docs/                                # implementation notes / device test records as needed
```

Do not create empty directories in advance. The kit currently locates its backend and mobile references under `NotifyIQ-Development-Kit/06_Backend` and `07_Mobile_App`; decide whether to promote or adapt these when the app foundation is created, avoiding duplicated active implementations.

## 4. Technology and dependency choices

| Area | Recommendation | Selection gate |
|---|---|---|
| Mobile | React Native Bare, TypeScript strict mode | Use current official setup guide; validate Node/JDK/Gradle/SDK compatibility before choosing versions. |
| Android integration | Minimal Kotlin `NotificationListenerService` and typed native module | Verify lifecycle, manifest, permission-status APIs and New Architecture interop against Android/RN docs at implementation time. |
| Local storage | One Kotlin-owned SQLite database shared by listener and UI queries | Preferred because the service must persist while JS is unavailable. Validate SQLite/FTS5 availability and bridge performance; document migration owner. |
| Navigation/state | React Navigation; keep local UI state simple | Add only after checking current RN compatibility; Zustand is optional, not a baseline requirement. TanStack Query is only for remote server state if needed. |
| Search | SQLite FTS5 over permitted retained fields | Define transactional insert/update/delete behavior and migration tests before enabling search. |
| Backend | Python + FastAPI, initially health/readiness/capabilities only | Keep outside capture path. Validate Python and dependency compatibility when backend work begins. |
| Optional metadata | Neon PostgreSQL | Only for a scoped account/preferences/sync feature; migration-based schema, no raw notification content by default. |
| Optional object storage | Private Cloudflare R2 | Only encrypted user-requested export/backup or permitted model artifacts; use scoped access and short-lived signed URLs. |
| Local model | Qwen3-0.6B candidate | No production runtime choice until ONNX Runtime Android and LiteRT-LM (at least) are benchmarked on target devices. |
| Encryption | Android Keystore-backed key management and a vetted encrypted SQLite option if required | Threat-model and compatibility review; do not invent cryptography or claim secure deletion on flash storage. |

Do not pin dependency versions in this plan. The kit's package ranges and provider-tier statements are time-sensitive; re-check primary official sources before adding dependencies or deploying.

## 5. Phases and independently reviewable tasks

### Phase 0 — Foundation and build proof

**Why first:** There is no runnable mobile app. A verified bare RN shell establishes toolchain compatibility, navigation/theme conventions and a reproducible Android build before adding sensitive OS integration.

Tasks:

1. Confirm current Node, JDK, Android SDK/platform/build-tools, React Native CLI and device prerequisites against official docs; record exact selected versions and device/API target.
2. Scaffold a React Native Bare TypeScript application in the agreed mobile location; enable strict TypeScript, lint/format configuration and a minimal CI/local validation command set.
3. Add semantic system/light/dark tokens and navigation shells for Home, Inbox, Search, Insights and Rules, plus shared screen/header/tab components and useful loading/empty/error placeholders.
4. Build and launch a debug app on an emulator and at least one physical Android device; document reproducible commands and any device setup.

**Definition of done:** Fresh checkout can install declared dependencies and build/launch the shell with documented versions; strict type checking succeeds; theme and navigation states render; no notification capture, fake production data, cloud calls or secrets are added. Physical-device build proof is recorded.

### Phase 1 — Permission and native capture foundation

Tasks:

1. Finalise a single authoritative database ownership decision, event identity/deduplication rules, migration numbering and sensitive-content retention policy.
2. Implement onboarding explanation, permission status, settings deep link, resume re-check and actionable access-off state.
3. Implement Kotlin listener declaration and connection/disconnection/rebind handling; avoid model/network work in callbacks.
4. Implement app exclusion storage and verify package exclusion before content extraction.
5. Implement deterministic privacy screening/redaction for synthetic OTP, authentication, password and card test fixtures before persistence; define false-positive and fail-closed behavior explicitly.
6. Implement initial SQLite migration, native repository, safe event extraction and bounded database-error handling; keep all content out of logs.
7. Expose typed status/query/preferences/clear-history APIs to TypeScript; UI reads the repository rather than relying on raw event emission.
8. Add a minimal recent-event inbox and local-history deletion only after durable capture works.
9. Verify capture with UI closed, exclusion, sensitive fixtures, listener reconnect, access revocation and Android notification removal semantics on a physical device.

**Definition of done:** A synthetic permitted notification is retained and readable after reopening with JS inactive during capture; excluded content is not extracted/persisted; sensitive fixtures follow documented policy; removal updates lifecycle metadata without erasing history; permission revocation and DB errors show safe states; migrations and repository behavior are verified. No cloud upload.

### Phase 2 — Core inbox, retention and search

Tasks:

1. Implement notification list/detail with source identity, timestamp, permitted original content and provenance labels.
2. Add save/archive/delete actions and confirmation/undo behavior; keep Android shade behavior untouched.
3. Add app/category/date filters and stable pagination.
4. Add FTS5 search and transactional maintenance for all CRUD, retention cleanup and history clear paths.
5. Add configurable retention and Privacy Centre controls; document local delete limitations.
6. Complete accessible light/dark/system UI states and offline/permission/stale-coverage cues.

**Definition of done:** Search/filter results match retained rows; deleting/expiring/clearing rows removes derived and FTS rows consistently; saved/archive states survive restart; core workflows work offline and are manually checked in both themes.

### Phase 3 — Deterministic intelligence and overview

Tasks:

1. Implement category and conservative priority rules on privacy-screened content.
2. Store analysis separately from source events with reason code, confidence, method/version and user correction.
3. Build synthetic gold fixtures and test ambiguous, multilingual/code-mixed, malicious-looking and false-urgent cases.
4. Add duplicate detection/grouping without deleting source records.
5. Add deterministic daily overview/digest templates with source links and listener-coverage caveats.
6. Add aggregate volume/app/category/peak-time insights with non-judgemental copy.

**Definition of done:** Results are explainable and correctable; low-confidence results are not urgent; derived data remains traceable to source rows; digest identifies generated content and observed coverage; aggregate calculations are reproducible.

### Phase 4 — Local-model benchmark spike

Tasks:

1. Create a synthetic, labelled evaluation set (100–300 cases) covering relevant notification types, languages and prompt-injection-like text; never use personal content.
2. Freeze model revisions, artifact checksums, licence details and runtime versions.
3. Run official/sample ONNX Runtime Android Qwen path and LiteRT-LM path on physical lower-memory, mid-range and flagship devices where available.
4. Measure cold load, memory/RSS, prefill/decode speed, battery/thermal behavior, package/download size, JSON validity, category/priority metrics and false-positive urgency.
5. Decide whether to adopt, defer or reject each runtime based on recorded thresholds and supported devices; keep deterministic fallback.

**Definition of done:** Reproducible benchmark report includes devices/artifact hashes/results/limitations and a product decision. Until accepted, no production model dependency or weights in Git.

### Phase 5 — User rules and richer organisation

Tasks:

1. Define a versioned, constrained rule schema and deterministic evaluation semantics.
2. Implement rule list/editor, preview, pause/enable/delete and actions limited to NotifyIQ organisation (categorise/save/digest/reminder/group/mark important).
3. Test precedence, conflicts, migration, rule edits and actions against synthetic fixtures.
4. Add custom rules, saved searches and richer grouping only after basic semantics are stable.

**Definition of done:** Rule outcomes are predictable, previewable, reversible where possible and never silently suppress Android delivery; rule execution is covered by fixtures and documented examples.

### Phase 6 — Optional cloud foundations

Tasks:

1. Scope a concrete account/preferences/export feature and consent/data lifecycle before provisioning providers.
2. Harden FastAPI health/readiness/capabilities and add endpoint validation/auth only when needed.
3. Add Neon migrations for metadata only; document ownership, deletion and sync conflicts.
4. Add R2 private bucket and short-lived presigned operations for encrypted, user-requested exports only.
5. Add per-feature opt-in, payload previews/minimisation, timeouts, rate limits and no-body logging before any cloud AI endpoint.
6. Verify account deletion, local-only operation and provider failure/cold-start behavior.

**Definition of done:** No cloud path is required for capture/search; cloud payloads are explicit/minimal; credentials remain server-side; deletion and error behavior are tested; provider cost/limits are rechecked.

### Phase 7 — Release readiness and beta

Tasks:

1. Run functional/privacy/security checklist, Android API/OEM matrix, migration/deletion/search scale, battery/thermal and accessibility checks.
2. Review current Android/Play policy, privacy policy, data safety disclosures, retention, incident and account-deletion procedures for target regions.
3. Secure signing, release configuration, crash reporting policy and reproducible build artifacts without sensitive payload capture.
4. Run closed beta, triage feedback and fix release blockers; prepare rollback and support process.

**Definition of done:** No unresolved critical privacy/data-loss/lifecycle bugs; release evidence and limitations are documented; store/privacy review is complete; owner approves release. This plan does not itself claim compliance.

## 6. Testing and verification strategy

- **Unit:** domain mapping, timestamp/key behavior, deterministic redaction, classification, rule evaluation, retention, schema validation and API validation. Use synthetic data only.
- **Database:** numbered migrations from empty and prior schema, transaction rollback, FTS consistency after insert/update/delete/clear/expiry, foreign-key behavior and restart persistence.
- **Native integration:** service declaration, listener lifecycle, permission checks, callback behavior, exclusion-before-extraction, safe persistence and typed module contract.
- **UI/component:** permission/no-permission, empty/loading/error/offline/stale states, accessible labels/touch targets, both themes, save/archive/delete confirmation.
- **End-to-end/manual:** real device with UI killed/closed, notification access grant/revoke, reboot/reconnect, synthetic notification formats, app exclusions, OTP-like fixture, battery saver and at least Pixel/AOSP plus Samsung and another OEM where available.
- **Performance/privacy:** 1k/10k/50k synthetic records, search latency, retention/deletion, logs/crash payload audit, model memory/thermal/battery benchmark.
- **Cloud (only if implemented):** auth/ownership, consent, payload caps, TLS, timeouts/rate limits, secret scan, deletion, R2 expiry and provider outage behavior.

Run checks requested for the individual task. Report exact command, environment, result and omitted device-dependent checks. Never represent an unrun test as passed.

## 7. Android constraints and key risks

- Listener access is special user-granted access and can be revoked; UX must be explicit and recoverable.
- OEM background restrictions, process death, rebind timing, force-stop, reboot and battery-saver behavior vary. Do not promise complete historical capture.
- Work profiles, Android versions, low-memory devices, redacted notifications and app-specific notification formats limit available data.
- The listener must persist independently of JS. Native and JS must not write separate authoritative stores.
- Generic sensitive-content detection can have false positives and false negatives. Decide whether each high-risk class is discarded or field-redacted; never claim perfect detection.
- Notification keys are not globally stable; updates/removals/dedupe need scoped identity and time semantics.
- FTS5 availability and encryption choice may constrain SQLite library/runtime design.
- Encryption-at-rest, Android backup exclusions, WAL/SHM handling, deletion and export require explicit design and compatibility testing.
- Local LLM performance, artifact licensing, packaging, battery and thermal costs are unknown until measured.
- Render free-tier cold starts/ephemeral storage, Neon limits and R2 prices can change; cloud must remain optional.

## 8. Contradictions, gaps and recommendations

1. **MVP scope:** PRD MVP includes deterministic intelligence, search, retention, privacy centre, daily overview and insights. Feature catalogue places digest at V1.1 and rules at MVP, while the backlog places rules in Phase 5 and moves insights/digest earlier/later differently. **Recommendation:** define a capture-first MVP boundary: reliable permission/capture/privacy/storage/inbox/delete first; search/retention next; deterministic labels and overview after capture stability. Explicitly mark advanced rules and model-backed digest outside initial capture milestone.
2. **Rules vs safe delivery:** PRD/backlog mention “mute/quiet hours” in generated concepts, but architecture forbids silent suppression and Android notification access does not provide universal control. **Recommendation:** limit initial rules to NotifyIQ organisation; treat quiet-hours/DND integration as a separate, explicit later opt-in decision.
3. **SQLite ownership:** Quick Start allows Kotlin-owned or RN SQLite, while listener requirements require native persistence independent of JS. **Recommendation:** Kotlin owns one DB and repository; TypeScript uses typed query/action APIs. Revisit only with evidence that a single JS DB is safely writable by the service.
4. **Schema readiness:** reference SQLite schema has no numbered migration wrapper and no FTS maintenance triggers/transaction contract. It lacks an explicit stable notification identity policy, retention policy for saved items, sensitive screening version, and a direct digest coverage/source count field. **Recommendation:** treat it as a draft for migration 001, define semantics and add migration/invariant tests before implementation.
5. **Sensitive screening semantics:** documents say “redact or discard” for OTP/auth/card/password but do not define class-specific policy or how redacted field data is represented. **Recommendation:** default-deny high-risk credential-like content, test deterministic fixtures, and review false-positive behavior before capture release.
6. **Digest status:** PRD lists daily digest in goals/MVP while feature catalogue says V1.1 and template-based digest supports baseline. **Recommendation:** separate deterministic daily overview (MVP candidate) from generated multi-source digest (later) and decide acceptance criteria before Phase 3.
7. **Backend readiness:** starter `/ready` reports whether `DATABASE_URL` is configured, not an actual database health check; API contract says readiness includes DB connectivity. Current backend has no tests/auth/migrations runtime. **Recommendation:** keep it prototype-only until cloud phase and implement actual readiness semantics if a database is introduced.
8. **Visual references:** generated boards contain illustrative stack claims and features (including alternate AI/backend choices, notification “OS” language, mute/schedule, and completed-feature claims) that conflict with written architecture/privacy requirements. **Recommendation:** use only the written docs and design tokens as authority; treat graphics as composition/color reference.
9. **Setup/version facts:** source notes were checked 16 Nov 2026 and state provider limits that can change. Installed environment is not proven compatible; Python is 3.15.2 despite the kit's 3.11+ baseline. **Recommendation:** verify current official RN/Android/Python/provider documentation when selecting actual versions, not during this planning-only milestone.
10. **Kit execution instruction:** kit `AGENTS.md` says to implement the first backlog item after presenting a plan; the user explicitly scoped this session to planning files and no app feature implementation. **Resolution:** this task's explicit scope governs this milestone; root instructions record future constraints and this plan recommends the next task without starting it.

## 9. Recommended first implementation task

Start with **Phase 0, Task 1: validate and record a compatible Android/RN toolchain and target device**, then complete the Phase 0 RN shell and physical-device debug build as one small foundation milestone. No feature code should begin before that build proof. This task is the smallest prerequisite that resolves whether the repository and installed environment can produce an Android app, while avoiding high-sensitivity notification capture until build, module, and single-database decisions are reviewable.

Before Phase 1, review the Kotlin-owned SQLite recommendation, the migration/FTS strategy, and class-specific sensitive-data retention policy. Those affect the core trust boundary and are more expensive to change after native code and persisted user data exist.
