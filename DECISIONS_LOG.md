# NotifyIQ Decisions Log

This log distinguishes decisions already present in the supplied development kit from recommendations. The user approved applying the recommended defaults on 2026-11-21; the decisions below are now the working implementation baseline.

## Accepted baseline from the development kit

### D-001 — Android-first companion, not notification-shade replacement

**Status:** Accepted baseline  
**Decision:** NotifyIQ organizes and helps retrieve notifications exposed by Android; it does not replace the system shade or promise universal interception/suppression.  
**Source:** Product Vision, PRD, `NotifyIQ-Development-Kit/AGENTS.md`.

### D-002 — React Native Bare + TypeScript with minimal Kotlin

**Status:** Accepted baseline  
**Decision:** TypeScript implements the mobile UI/product layer; Kotlin implements Android APIs such as `NotificationListenerService`.  
**Source:** Kit README, architecture ADR-001 and Android integration specification.

### D-003 — On-device SQLite is authoritative

**Status:** Accepted baseline  
**Decision:** Notification history and local derived data live on-device. Neon is optional metadata/sync storage; R2 is for user-requested encrypted exports/backups and permitted model assets.  
**Source:** Kit README, architecture ADR-002, database design.

### D-004 — Native capture cannot depend on React Native JS lifecycle

**Status:** Accepted baseline  
**Decision:** The native listener must persist safely without JS running; raw event delivery to JS cannot be the sole persistence mechanism.  
**Source:** Android integration specification and system architecture.

### D-005 — Privacy-first defaults

**Status:** Accepted baseline  
**Decision:** Exclusions and sensitive screening precede persistence; raw notification content is not uploaded by default; cloud AI requires explicit opt-in; do not log content or credentials.  
**Source:** Security and Privacy, kit `AGENTS.md`, API and AI policies.

### D-006 — Deterministic baseline; Qwen requires benchmark

**Status:** Accepted baseline  
**Decision:** Rules run first. Qwen3-0.6B is a candidate only; compare at least ONNX Runtime Android and LiteRT-LM on devices, validate structured output, and fall back deterministically.  
**Source:** AI model strategy, runtime benchmark plan, kit ADR-004.

### D-007 — Light and dark themes from the start

**Status:** Accepted baseline  
**Decision:** Support system/light/dark appearance with semantic tokens and accessible components.  
**Source:** Design system and kit ADR-005.

## Approved implementation decisions

### R-001 — Kotlin owns the single SQLite database

**Status:** Approved by user, 2026-11-21  
**Recommendation:** Implement the authoritative SQLite repository in Kotlin and expose typed queries/actions to React Native.  
**Reason:** This aligns direct listener writes with the requirement to persist while JavaScript is inactive, while preventing two databases. It requires validating a suitable SQLite/FTS5/migration approach and bridge API.  
**Implementation:** Kotlin owns the one SQLite database. React Native uses a typed repository bridge for reads and supported actions; it must not create a second database.

### R-002 — Define a capture-first MVP boundary

**Status:** Approved by user, 2026-11-21  
**Recommendation:** First prove permission, exclusion/privacy screening, native persistence, basic inbox and delete. Add search/retention afterward, then deterministic analytics/digest. Keep model, advanced rules, accounts and cloud outside the first capture milestone.  
**Reason:** The PRD, feature catalogue, roadmap and generated graphics disagree on MVP membership and ordering. Capture/privacy correctness is the product's trust foundation.  
**Implementation:** Phase 1 focuses on permission, exclusion/privacy screening, native persistence, basic inbox and delete. Search/retention comes next. Deterministic classification and overview follow stable capture. Model, advanced rules, account and cloud features remain later work.

### R-003 — Class-specific fail-closed sensitive-data policy

**Status:** Approved by user, 2026-11-21  
**Recommendation:** Specify which high-risk classes are discarded entirely versus field-redacted, and what happens when screening is uncertain. Prefer default-deny for OTP/authentication/password/card-like content until the policy is explicit and tested.  
**Reason:** Current text says “redact or discard” without defining class behavior; pattern screening cannot guarantee zero false positives/negatives.  
**Implementation:** If deterministic screening finds OTP/authentication code, password or payment-card-like content in any extracted field, discard the entire notification event before persistence; retain no title, body, package/key, or event metadata for that item. Excluded packages are checked before extraction and also leave no stored event. Never claim detection is complete; add safe-field and false-positive fixtures before capture ships.

### R-004 — Make schema versioning and FTS invariants part of migration 001

**Status:** Approved by user, 2026-11-21  
**Recommendation:** Add numbered migrations and transactional FTS insert/update/delete/retention/clear behavior, with tests from a fresh DB. Define stable event identity, update/removal semantics, saved-item retention and digest coverage fields first.  
**Reason:** Supplied SQLite SQL is a reference schema, not a migration, and does not define FTS maintenance behavior or all lifecycle semantics.  
**Implementation:** Use numbered Kotlin-owned migrations recorded with `PRAGMA user_version`. Migration 001 includes transactional event/analysis writes, FTS5 triggers for insert/update/delete, foreign keys, and indexes. An active notification is keyed by Android user + package + notification key; posts while active update that event, removal marks it removed, and a later post after removal starts a new event. Content-hash deduplication is deferred. Saved rows are exempt from age-based cleanup until unsaved or explicitly deleted.

### R-005 — Separate daily overview from generated digest in scope

**Status:** Approved by user, 2026-11-21  
**Recommendation:** Decide whether deterministic daily count cards are MVP while source-linked digest generation is later.  
**Reason:** PRD says digest is MVP; feature catalogue labels daily digest V1.1; other docs allow deterministic templates.  
**Implementation:** MVP includes a deterministic daily overview from retained rows and clearly reports capture gaps. Source-linked generated digest is deferred to V1.1. No model-generated digest in MVP.

### R-006 — Keep rules organizational until a separate Android-control decision

**Status:** Approved by user, 2026-11-21  
**Recommendation:** Initial rules only change NotifyIQ categorization, saved state, digest inclusion, reminders or grouping. Any DND/quiet-hours/notification dismissal behavior needs separate permission, UX and platform review.  
**Reason:** Generated visuals suggest mute/scheduling, while written requirements disallow silent suppression and the Android listener does not grant universal delivery control.  
**Implementation:** V1 rules only affect NotifyIQ categorisation, saved state, digest inclusion, reminders or grouping. DND, quiet hours, Android dismissal and suppression are out of scope until separately designed and approved.

### D-008 — Android and device support baseline

**Status:** Approved by user, 2026-11-21  
**Decision:** Initial support target is Android 10 (API 29) and newer. Do not promise support for work-profile notifications. Test current API and API 29 where tooling/devices permit, plus a lower-memory 4 GB device; 4 GB is a test target, not a hard install gate. Report OEM and low-memory limitations clearly.  
**Reason:** This bounds initial compatibility work without pretending all OEM listener behaviors are uniform.

### D-009 — Initial language scope

**Status:** Approved by user, 2026-11-21  
**Decision:** V1 interface language is English. Classification evaluation uses synthetic English, Hindi, and code-mixed fixtures. Do not claim Hindi/code-mixed model quality until benchmark results meet the model gate.  
**Reason:** UI localization and model language quality are separate work; synthetic evaluation avoids collecting personal messages.

### D-010 — Retention and deletion defaults

**Status:** Approved by user, 2026-11-21  
**Decision:** Default local retention is 30 days, with 7, 30, 90 days and never-expire options. Saved items survive the age-based cleanup until unsaved or explicitly deleted. Logical deletion and backup exclusion are required; explain that flash storage cannot guarantee forensic erasure.  
**Reason:** A clear, conservative default supports local history while preserving explicit user control.

### D-011 — No initial cloud or telemetry dependency

**Status:** Approved by user, 2026-11-21  
**Decision:** Initial release requires no account, cloud sync, cloud AI, analytics or third-party crash reporting. Native diagnostics use stable error codes only; no notification content, app package, notification key, tokens or request bodies in logs.  
**Reason:** Cloud foundations are not necessary for the first local product value and increase the sensitive-data surface.

### D-012 — Qwen adoption gate

**Status:** Approved working gate, 2026-11-21  
**Decision:** Benchmark ONNX Runtime Android and LiteRT-LM with synthetic held-out fixtures on lower-memory, mid-range and flagship devices when available. Consider adoption only if structured output validity is at least 99%, macro-F1 improves at least 5 percentage points over deterministic classification, p95 inference after model load is under 2 seconds, peak process memory attributable to inference stays under 600 MiB on a 4 GB device, and no safety/priority regression occurs. Model output cannot independently assign urgent priority. Any failed gate means deterministic-only fallback. Measure battery, thermal and download size and document them; do not infer acceptable values without results.  
**Reason:** Requires measurable benefit while keeping safety and low-memory constraints ahead of model novelty.

### R-007 — Treat generated visual boards as non-authoritative

**Status:** Accepted interpretation of kit guidance  
**Decision:** Use images for composition/color inspiration only. Written product, architecture, privacy and design docs govern stack and behavior.  
**Reason:** Images include illustrative and conflicting claims (including “notification OS,” alternate technology choices, completed-feature checklists and mute/schedule behavior).

## Remaining questions

- Which Pixel/AOSP, Samsung and additional OEM devices can be used for manual capture lifecycle verification?
- What legal markets and privacy-policy wording will apply before public launch?
- What explicit feature, if any, will justify adding account, sync, cloud AI or encrypted export after the local release?

## Change control

When a baseline changes, record the date and rationale and update `IMPLEMENTATION_PLAN.md` / `DEVELOPMENT_STATUS.md` if scope or acceptance criteria change. Do not silently change privacy or product behavior.
