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

### R-004 — Version the local schema and gate FTS on driver support

**Status:** Approved by user, 2026-11-21  
**Recommendation:** Use numbered Kotlin-owned migrations and transactional FTS insert/update/delete/retention/clear behavior with a driver that guarantees FTS5. Define stable event identity, update/removal semantics, and saved-item retention first.
**Reason:** The platform SQLite available through `SQLiteOpenHelper` does not provide an app-level FTS5 guarantee. AndroidX documents that FTS5 depends on the selected SQLite driver and that its bundled driver supports it ([AndroidX FTS5 API](https://developer.android.com/reference/androidx/room3/Fts5), [bundled driver API](https://developer.android.com/reference/kotlin/androidx/sqlite/driver/bundled/BundledSQLiteDriver)).
**Implementation:** The Kotlin repository now uses AndroidX `BundledSQLiteDriver`. Schema version 1 stores preferences and notification events with active identity `(package_name, notification_key)`; migration 2 adds saved/archive state, an external-content FTS5 index and transactional maintenance triggers. Migration 3 stores classification separately with a foreign key to the source event. Posts update active rows, removal marks them removed, and a later post creates a new row. Retention cleanup and history clearing delete corresponding FTS/analysis rows consistently. Saved rows are exempt from age-based cleanup until unsaved or explicitly deleted. Instrumentation tests cover migrations and index maintenance.

### R-008 — Keep deterministic classification local, explainable and correctable

**Status:** Implementation choice, 2026-11-21
**Decision:** Run deterministic category/priority rules only after sensitive-content screening. Store results separately from notification source fields with rule version, explanation, heuristic confidence score and user category override. Explicit phrases are required for urgent/high priority; unmatched priority remains normal. The numeric score is not a calibrated probability and must not be displayed as one.
**Reason:** Enables category filtering without coupling analysis to the source event or overstating what keyword rules know. Focused synthetic multilingual and ambiguity fixtures exist; broader accuracy evaluation remains unproven.

### R-009 — Group only exact same-app notification repeats

**Status:** Implementation choice, 2026-11-21
**Decision:** Group notifications only when package and normalized title/body/subtext match exactly within the same fixed, epoch-aligned 30-minute window. Store a local SHA-256 match key and group membership separately; keep every source notification row. The hash is an internal lookup key, not a privacy boundary. Show repeats as a count and disclose that originals remain available.
**Reason:** This avoids speculative semantic or cross-app grouping in the first implementation. The digest cannot determine whether two similar messages represent the same real-world event.

### R-010 — Keep the daily overview deterministic and source linked

**Status:** Implementation choice, 2026-11-21
**Decision:** Generate today's overview from rows received during the device-local calendar day. Show volume, app/category counts, busiest local clock hours, and recent source notifications that open their saved local details. Always state that the overview reflects retained NotifyIQ rows and may be incomplete when listener coverage is unavailable.
**Reason:** Provides a useful local summary without a model or account and avoids implying Android supplies a complete notification history.

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

### R-011 — Close Phase 4: reject both Qwen3-0.6B runtime candidates for classification

**Status:** Applied under the approved D-012 gate, 2026-11-22
**Decision:** Do not adopt the tested LiteRT-LM 0.19.0 or ONNX Runtime 1.29.0 (Q4F16) Qwen3-0.6B configurations for notification classification. Production stays deterministic-only with no model runtime or weights. The benchmark harness, Kotlin tokenizer and reference fixtures stay in the isolated `mobile/model-benchmark/` project for future candidates.
**Evidence:** Same 108-case synthetic corpus and prompt, greedy decoding, strict JSON scoring, 6 GiB Pixel_8 API 35 AVD. LiteRT: macro-F1 0.071, valid JSON 106/108. ONNX: macro-F1 0.097, valid JSON 15/108, mostly Markdown-fenced; 0.216 macro-F1 even with fences stripped as a diagnostic. Deterministic baseline: macro-F1 0.955, priority accuracy 1.000, zero urgent errors. Both candidates fail every D-012 threshold; latency and memory figures are emulator-only.
**Reopen when:** a different model, prompt or fine-tune shows on the same corpus that it can plausibly clear the gate (+5 pp macro-F1 over deterministic, ≥ 99% valid JSON) before device benchmarking is repeated. Prompt changes alone should first be tried on the host reference harness, which is cheap.

### R-012 — Discard platform-redacted and contentless notification events

**Status:** Implementation choice under R-003, 2026-11-22
**Decision:** On Android 15+ the platform redacts notifications it classifies as sensitive (OTP-like, and in emulator testing a payment-card fixture) before an untrusted listener receives them. The title becomes the app label and the text a system placeholder. NotifyIQ treats such an event as sensitive and discards it entirely, including package/key/time metadata, exactly as it does for its own gate. Detection is locale-independent: the builder `android.appInfo` extra belongs to the `android` package instead of the posting app. A fallback compares the text with the platform's own `redacted_notification_message` string. Events with no title, text, big text or subtext (for example Android's `ranker_group` autogroup summaries) are not stored.
**Reason:** Before this change, these events produced placeholder or empty rows in history. No secret was stored, but R-003 requires leaving no event metadata for sensitive items, and empty rows are noise. The public SDK exposes no `Ranking` sensitivity flag; the internal `hasSensitiveContent` is hidden API.
**Limits:** Relies on current AOSP redaction behavior on API 35+. OEM builds may differ and need device verification. NotifyIQ's own deterministic gate remains the primary control.

### R-013 — Deterministic money and upcoming insights, precision first

**Status:** Approved by user, 2026-11-22 ("go ahead … consider the accuracy")
**Decision:**
- Extract money movements (amount, debit/credit, merchant, spend category), dated actions (bill due, subscription renewal, expiry, appointment, task) and recurring payments from privacy-screened notification text using deterministic local rules. No model or network is involved.
- Store results separately (`notification_insights`, cascade-deleted with the source).
- Link every item to its source and let the user dismiss it.
- Totals are labelled as "from payment alerts saved on this phone", never as a statement, consistent with the PRD non-goal of verifying transactions.
- Ambiguous text yields nothing.
- Accuracy is tracked on synthetic dev and held-out sets. The dev set gates the build; held-out sets are reported only.

**Evidence:** `docs/MONEY_AND_UPCOMING_INSIGHTS.md`. On first unseen runs, money precision was 0.85–0.93, and amounts and dates were never misread when detected.

### R-014 — Android 15 hides OTP-like bank alerts from NotifyIQ

**Status:** Observed limitation, 2026-11-22
**Decision:** Accept and disclose. Android 15 redacts notifications it classifies as OTP-like (including standalone 4–8 digit tokens such as "A/c XX1234") for third-party listeners. NotifyIQ cannot read them and discards them per R-012. The Money screen explains that some bank alerts will be missing. Do not seek SMS permissions or any workaround. Verify the impact on physical Pixel and Samsung devices.

### R-015 — Detailed money categories with user corrections

**Status:** Approved by user, 2026-11-22 ("categorise … food, snacks, fuel, entertainment, tickets, transport … received as well … charts")
**Decision:**
- Use deterministic spending categories (19) and income categories (6).
- Users can recategorise a payment and optionally remember the choice for that place, stored locally only.
- Charts use plain Views rather than a new native dependency, which avoids repeating the Play/16 KB checks.
- Totals remain labelled as derived from saved alerts.
- The category evaluation set gates the build at ≥ 0.90.

### R-016 — Screen protection on by default, optional App lock, in-app legal documents

**Status:** Requested by user, 2026-11-22 ("no where the data is exposed … fully secured … privacy, terms and policy within the app")
**Decision:**
- `FLAG_SECURE` is on by default and applied before first draw. It blocks screenshots and screen recording and hides content in Recents; users can turn it off.
- Optional App lock uses the platform `BiometricPrompt` (biometric or device credential) with no new dependency. It adds the normal `USE_BIOMETRIC` permission and relocks after 30 s in the background.
- Switch state lives in a private SharedPreferences file, excluded from backup and transfer.
- The privacy policy, terms of use and security overview ship in the app (`src/features/legal/legalContent.ts`).
- A Jest test fails the build if the manifest gains a permission or exported component the policy does not describe.
**Residual risks recorded:**
- No app-level database encryption; Android file-based encryption protects data at rest while the phone is locked.
- Sideloaded APKs signed with the public React Native debug key can be replaced by any APK signed with that same key. Real releases must use the private upload key and Play App Signing.
- A rooted or compromised device, and people who know the phone PIN, are out of scope.

### R-017 — Remove screen-capture blocking; private signing key; floating navigation

**Status:** Requested by user, 2026-11-22
**Decision:**
- Remove `FLAG_SECURE` screen protection: the user found blocking screenshots and recording too restrictive. The Security page now says screenshots and the Recents preview are not blocked. App lock remains.
- Sign releases with a private RSA-4096 key (`~/.android/notifyiq/notifyiq-upload.jks`, alias `notifyiq-upload`, cert SHA-256 `38886f7f…a4ee9872`). The key path and password are only in the user-level `~/.gradle/gradle.properties` (mode 600), never in the repo. Android now refuses debug-key-signed "updates" over these builds.
- The bottom navigation becomes a floating pill bar above the gesture area; content pads itself clear of it.
**Owner action:** back up the keystore file and its password (from `~/.gradle/gradle.properties`) to a password manager. A lost key means sideloaded installs cannot be updated, and Play uploads need an upload-key reset.

### R-018 — Usability and portability batch (owner items 1–6, 15, 17, 18)

**Status:** Approved by user, 2026-11-22
**Decision:**
- The theme choice persists (private SharedPreferences).
- Real app names and icons come from the poster's ApplicationInfo carried in notification extras, so no package-visibility permission is needed. They are stored in `app_directory` (schema v9) with icons cached as private PNGs. Clearing history clears them.
- First-run onboarding, including the "Allow restricted settings" step only for sideloaded installs on Android 13+.
- "View source" opens the original notification from Money and Coming up.
- An app picker for exclusions and the Inbox filter. It lists apps seen in history plus manual package entry, because QUERY_ALL_PACKAGES is deliberately not requested.
- Encrypted export/import:
  - Format: `.niqbackup`, an AES-256-GCM authenticated header with PBKDF2-HMAC-SHA256 (310,000 iterations) from a user password of at least 8 characters.
  - Saved and opened through the Storage Access Framework, so no storage permission and still no internet.
  - Import replaces all data after migrating older backups and rejects newer ones.
- Duplicate grouping uses a stored, indexed `content_fingerprint`.
- The native module is a real TurboModule (extends the generated `NativeNotifyIQSpec`; verified resolving via TurboModuleRegistry).
- A repeatable adb-driven end-to-end suite lives at `mobile/e2e/notifyiq_e2e.py`.
- Each tab now opens at the top, fixing scroll position leaking between tabs. This bug was found by the end-to-end suite.
**Privacy:** the policy (v1.1) discloses the app-name/icon cache and user-initiated encrypted exports. Exports leave the device only where the user chooses to save them.

### R-019 — Brand-agnostic listener self-repair; four-tab navigation

**Status:** Requested by user, 2026-11-22 ("needs to work on all … from the base model", "make the UI clean")
**Decision:**
- Connection status is probed from the live listener (`activeNotifications` succeeds only while bound) instead of a process-local flag. A stale flag was the likely cause of the "Reconnecting" report.
- Self-repair uses only `NotificationListenerService.requestRebind` (a no-op while bound). It runs at app start, `BOOT_COMPLETED`, `MY_PACKAGE_REPLACED`, on status checks, and from a persisted 15-minute JobScheduler job (no new permission or library). The app also escalates to a native repair after about 6 s of polling.
- **Rejected:** the widely suggested component enable/disable "force rebind". Measured on Android 15, disabling unbinds the listener and re-enabling did not re-bind it within 60 s, so it would stop capture.
- The help card is brand-neutral and appears only if repair fails for about 30 s.
- Navigation is reduced to Home, Inbox (search, filters panel, saved searches), Insights and Settings (Rules, notification access & apps, backup, App lock, appearance, about/legal). The theme switch moves out of the header into Settings. "Settings" was chosen over "Profile" because there is no account.

### R-020 — Choose apps by name and icon; no package names in the UI

**Status:** Requested by user, 2026-11-22 ("users might not be technical … app name and icon kind of lists")
**Decision:**
- The manifest declares a `<queries>` intent filter for `MAIN`/`LAUNCHER`. This lets NotifyIQ list apps that have a launcher icon without `QUERY_ALL_PACKAGES`, which stays forbidden by the manifest drift test. The list is read on the device only and is never stored or sent anywhere.
- The app picker shows icon and name, with "Apps with notifications" first and then the other apps, plus search. In Privacy, "Choose apps" opens per-app Kept/Not kept switches. Switching off an app that already has history asks for confirmation, because exclusion deletes that history.
- Manual package-name entry is removed. Package names are never shown; excluded apps are listed by name and icon with a "Keep again" action.
- The policy is updated to version 1.3 with an "Apps on your phone" section.

### R-021 — Listener repair that works after the phone force-stops NotifyIQ (supersedes R-019's repair)

**Status:** Fix for owner's real-device report on 1.9/1.10, 2026-11-22 (clearing the app from Recents leaves Home on "Connecting…" even with battery unrestricted)
**Findings (AOSP 10/13/15 source, verified on emulators):**
- Clearing from Recents force-stops the app on many phones, which kills Android's listener binding. Stock Android re-binds at once (package-restarted handling; measured on API 29 and 35). Otherwise Android retries only once, 10 s later (`ManagedServices.onBindingDied`), and never again if that retry is blocked.
- `requestRebind` only un-snoozes a listener that called `requestUnbind` (`setComponentState` returns early otherwise), so R-019's repair was a no-op in this state.
- The interruption-filter query is not a valid connection probe, because Android answers it without checking the listener token.
- The earlier component-toggle failure is explained by Android 14+ `trimApprovedListsForInvalidServices`: disabling the listener itself drops its approval.
**Decision:**
- Probe with `getActiveNotifications(emptyArray())`. It is token-checked and transfers no data.
- Repair ladder, only while access is granted and the listener is not connected:
  1. `requestRebind`.
  2. Android 14+: static `requestUnbind(component)` followed by `requestRebind(component)`.
  3. All versions: flip a private, unexported, do-nothing receiver (`ListenerRebindTrigger`). The resulting package-changed event makes Android re-bind every approved listener. The listener component itself is never disabled.
- The ladder runs after app start (6 s grace), from the UI at about 4 s and 20 s, on boot and update, and from the 15-minute job. Escalation is rate-limited to once every 20 s.
- If it still fails, the help card asks the user to switch NotifyIQ off and on in Notification access (works on every phone) instead of battery settings.
**Limit:** the emulators cannot reproduce a phone that blocks the re-bind. The ladder is verified safe on API 29 and 35, and the Android 14+ cycle is verified to re-bind an unbound listener. Confirmation on the owner's phone is pending.

### R-022 — Recover from the tray after a pause; record and show pauses

**Status:** Approved by user, 2026-11-22 (items 1 and 2 of the OEM-robustness proposal)
**Decision:**
- On every listener connection, NotifyIQ saves notifications still in the tray that it has not stored (same exclusions, sensitive-content gate and redaction checks as live capture). An item is skipped if the same key with the same post time is already stored, so stock-Android reconnects are idempotent. This also means the tray contents at the moment access is first granted are kept, which the policy (v1.4) discloses.
- Pauses are stored in a new `listener_gaps` table (schema v10): start, end, recovered count, whether the start is exact, and whether it was seen. There is no notification content, rows are pruned after 30 days, and they are cleared with history.
- Start of a pause:
  - The first process exit after the last-alive time (ApplicationExitInfo, API 30+, exact).
  - Otherwise the last-alive time. The marker is refreshed at connect, on capture (at most once a minute), on UI status checks and from the 15-minute job. A pause with an approximate start is only recorded if tray items from that time were recovered.
  - Time before boot is excluded, and pauses under 2 minutes are ignored.
  - The marker is cleared when access is turned off, so the person's own off/on is not reported.
- UI:
  - Home shows "NotifyIQ was paused" (time range, duration, recovered count) until the person taps "Got it".
  - Settings → Notification access & apps lists pauses from the last 7 days.
  - After 3 or more pauses in 7 days, both suggest NotifyIQ's App settings page with brand-neutral wording.


### R-023 — User feedback batch: simple view, same-payment merging, plain rules, open in app, substring search, local-merchant categories

**Status:** Requested by owner from user feedback, 2026-11-23 (version 1.13)
**Decision:**
- **Simple view** (Settings → Appearance; also asked once in onboarding), stored as `ui_mode`. It hides the Today charts, the Home rhythm card, quick tiles and tips, the money flow, calendar and pattern charts, and the Inbox filters, saved searches, Archive/Details and technical hints, and uses larger text in Latest. Nothing is removed from the full view. Switching to simple view clears hidden Inbox filters.
- **Same payment from several alerts** counts once in money totals, recurring detection and Coming up. Every source notification stays in the Inbox.
  - Rule: same amount, currency and direction within 15 minutes, from different sources. A source is the app plus the SMS sender or chat title, so a bank SMS and a UPI SMS in one SMS app count as different sources.
  - Merchants must not conflict.
  - From the same source, only an identical re-post merges.
  - The kept row is the most informative one, and it shows "N alerts, counted once".
- **Rules** are rewritten as plain sentences ("When a notification from Bank mentions 'salary', put it in Finance and save it"). Apps are chosen by name and icon, there is an optional phrase, the actions are switches and chips, a live summary is shown, and there is a "Try your rules" check. No package names appear anywhere. The app directory also knows installed apps (launcher `<queries>`) for apps that have not posted yet.
- **Open in app:** tapping a notification (or its Open button) runs the original notification's own tap action while it is still in the shade (opens the exact chat or transaction), otherwise it opens the app. Android 14+ needs explicit background-activity-start opt-in, which is granted only while NotifyIQ is visible.
- **Search** (schema v11): a trigram FTS5 index replaces the word index, so any part of a word matches, all terms must match in any order, and terms under 3 characters use LIKE. The app's name also matches.
- **Categories:** a merchant-type layer (filling station, petroleum, oil, departmental, provision, supermarket, medicals, chemist, mess, canteen, textiles, jewellers, mobiles, RTC buses, PG and so on) is checked after brand names. Brand clashes are fixed ("Max Fashion" no longer matches Max hospital; "Milk Parlour" no longer matches beauty parlour). Insight version 3 re-computes history; user overrides are kept.
  - Measured accuracy:
    - Original set: 56/56.
    - Local-merchant set: 46.7% before, 100% after. The rules were tuned on this set, so it is not a held-out measure.
    - Untouched second set: 93.3% on first run, then 96.7% after adding "supermart". The remaining miss is generic "…Stores", left as other/transfer on purpose.
- **Onboarding (sideloaded installs, Android 13+):** the order is now try access → Allow restricted settings in App info → turn access on, because the ⋮ menu item only appears after a blocked attempt.

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
