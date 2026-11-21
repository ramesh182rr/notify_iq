# NotifyIQ Decisions Log

This log distinguishes decisions already present in the supplied development kit from recommendations that still need product-owner review. Recommendations do not override the kit until accepted.

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

## Recommendations pending review

### R-001 — Kotlin owns the single SQLite database

**Status:** Proposed; not yet approved  
**Recommendation:** Implement the authoritative SQLite repository in Kotlin and expose typed queries/actions to React Native.  
**Reason:** This aligns direct listener writes with the requirement to persist while JavaScript is inactive, while preventing two databases. It requires validating a suitable SQLite/FTS5/migration approach and bridge API.  
**Review before:** Phase 1 implementation.

### R-002 — Define a capture-first MVP boundary

**Status:** Proposed; not yet approved  
**Recommendation:** First prove permission, exclusion/privacy screening, native persistence, basic inbox and delete. Add search/retention afterward, then deterministic analytics/digest. Keep model, advanced rules, accounts and cloud outside the first capture milestone.  
**Reason:** The PRD, feature catalogue, roadmap and generated graphics disagree on MVP membership and ordering. Capture/privacy correctness is the product's trust foundation.  
**Review before:** Phase 0 completion / Phase 1 scope lock.

### R-003 — Class-specific fail-closed sensitive-data policy

**Status:** Proposed; not yet approved  
**Recommendation:** Specify which high-risk classes are discarded entirely versus field-redacted, and what happens when screening is uncertain. Prefer default-deny for OTP/authentication/password/card-like content until the policy is explicit and tested.  
**Reason:** Current text says “redact or discard” without defining class behavior; pattern screening cannot guarantee zero false positives/negatives.  
**Review before:** Any notification content is persisted.

### R-004 — Make schema versioning and FTS invariants part of migration 001

**Status:** Proposed; not yet approved  
**Recommendation:** Add numbered migrations and transactional FTS insert/update/delete/retention/clear behavior, with tests from a fresh DB. Define stable event identity, update/removal semantics, saved-item retention and digest coverage fields first.  
**Reason:** Supplied SQLite SQL is a reference schema, not a migration, and does not define FTS maintenance behavior or all lifecycle semantics.  
**Review before:** Phase 1 database implementation.

### R-005 — Separate daily overview from generated digest in scope

**Status:** Proposed; not yet approved  
**Recommendation:** Decide whether deterministic daily count cards are MVP while source-linked digest generation is later.  
**Reason:** PRD says digest is MVP; feature catalogue labels daily digest V1.1; other docs allow deterministic templates.  
**Review before:** Phase 3.

### R-006 — Keep rules organizational until a separate Android-control decision

**Status:** Proposed; not yet approved  
**Recommendation:** Initial rules only change NotifyIQ categorization, saved state, digest inclusion, reminders or grouping. Any DND/quiet-hours/notification dismissal behavior needs separate permission, UX and platform review.  
**Reason:** Generated visuals suggest mute/scheduling, while written requirements disallow silent suppression and the Android listener does not grant universal delivery control.  
**Review before:** Phase 5.

### R-007 — Treat generated visual boards as non-authoritative

**Status:** Accepted interpretation of kit guidance  
**Decision:** Use images for composition/color inspiration only. Written product, architecture, privacy and design docs govern stack and behavior.  
**Reason:** Images include illustrative and conflicting claims (including “notification OS,” alternate technology choices, completed-feature checklists and mute/schedule behavior).

## Unresolved product/technical questions

- What Android API range, minimum device RAM, locale coverage and initial OEM/device set should V1 support?
- Is “not retaining OTPs/authentication codes” satisfied by discarding the complete notification or redacting only the sensitive value? What about payment-card/account identifiers?
- How should a redacted notification appear in the inbox, and should any safe metadata remain?
- What should duplicate detection consider an update versus a new event when notification keys are reused or unstable?
- Should saved items override retention expiry? What is the default retention period and how does the user learn deletion limitations on flash storage/backups?
- Which exact daily overview/digest functions are MVP, and should any generated text be model-backed in early releases?
- Does any initial release need accounts, sync, cloud AI or encrypted export? If so, what feature requires each?
- What are acceptable benchmark thresholds for model load time, peak memory, thermal/battery cost, schema validity and false-positive high priority?
- How will support diagnostics work without sending notification content or sensitive identifiers?

## Change control

When a recommendation is approved or a baseline changes, update its status, record the date and rationale, and update `IMPLEMENTATION_PLAN.md` / `DEVELOPMENT_STATUS.md` if scope or acceptance criteria change. Do not silently change privacy or product behavior.
