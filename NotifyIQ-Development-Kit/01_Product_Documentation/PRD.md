# Product Requirements Document (PRD)

**Version:** 1.0 · **Status:** Implementation baseline · **Platform:** Android

## 1. Problem
People receive a high volume of notifications from messaging, finance, shopping, travel, social and utility apps. Chronological delivery makes important information hard to find and repetitive or promotional alerts create noise.

## 2. Goals
- Reliable capture of permitted notifications on supported Android devices.
- Local searchable history.
- Useful categorisation and priority hints.
- Clear unified inbox and category filters.
- Daily digest generated from retained notification events.
- User-controlled app exclusions and retention.
- Basic rules and aggregated insights after the capture foundation is stable.

## 3. Non-goals
NotifyIQ does not replace Android's shade, promise universal suppression, read private app databases, reconstruct full conversations, or verify financial transactions against bank systems.

## 4. Personas
- Everyday user: wants a clean overview and a way to find a notification again.
- Professional: wants important communication and time-sensitive updates surfaced.
- Power user: wants custom rules, detailed filters and analytics.

## 5. Core user journeys
1. Install → understand access → open Android settings → grant access → choose apps to exclude → dashboard.
2. Notification arrives → native service screens app exclusion and sensitive patterns → local event persisted → deterministic classification → inbox update.
3. Search phrase → filter by app/category/date → inspect result → optionally open originating app if launch intent is available.
4. Daily digest → review grouped observations → tap an item to see source notifications.
5. Rule creation → choose trigger/condition/action → preview → save → rule applies to future captured events.

## 6. Functional requirements

### FR-01 Capture and lifecycle
- Receive `onNotificationPosted` and `onNotificationRemoved` events.
- Wait for `onListenerConnected` before querying active notifications or processing listener operations.
- Store package name, stable notification key, event timestamp, allowed text fields, app label/icon reference, channel/category metadata where available, and lifecycle timestamps.
- Handle listener disconnect, permission revocation, process recreation, database errors and device reboot.
- Provide status screen showing access state and last successful capture time.

### FR-02 Privacy gate
- Apply app exclusions before extracting/persisting content.
- Apply sensitive-data detection/redaction before storage.
- Default-deny storage for OTP/authentication code patterns, password-like content, payment card data and user-defined exclusions.
- Avoid logging raw notification content.
- Make data retention configurable and deletions verifiable.

### FR-03 Inbox and history
- Chronological list with app, title, preview, received time and category.
- Filters: all, important, personal, finance, delivery/travel, social, promotions, system, other.
- Grouped view and chronological view.
- Saved and archived views.
- Notification detail shows source and original permitted content separately from AI-generated interpretation.

### FR-04 Categorisation
Initial labels: personal, finance, delivery_shopping, travel, social, promotion, reminder_calendar, system, other. Rules first; optional Qwen inference for uncertain cases. Store category, confidence, method and model version. Allow user correction.

### FR-05 Priority
Use four user-facing levels: urgent, high, normal, low. The initial rules must be conservative. A low-confidence prediction becomes normal/unknown, not urgent. Show explanation such as “matched payment-failure pattern”; never claim certainty.

### FR-06 Search
MVP: SQLite FTS5 keyword search, app filter, category filter and date range. Later: natural-language query parser and local embeddings. Search only records retained by user settings.

### FR-07 Grouping and deduplication
Deduplicate using package, notification key, group key, timestamp window and content hash. Cross-notification event grouping is a separate derived object; never delete source records because they were grouped.

### FR-08 Digest
Generate a daily digest from local retained records. Summaries must link to source records and identify generated text. If model unavailable, use deterministic templates. Do not imply completeness if listener access was off.

### FR-09 Rules
MVP rules: include/exclude from digest, assign category, save/bookmark, mark as important, create an in-app follow-up reminder, and group by app/keyword. Rules do not silently suppress Android alerts. Quiet-hours recommendations are advisory initially; DND policy access is a later opt-in capability.

### FR-10 Insights
Daily/weekly volume, top apps, category mix, peak arrival windows, duplicates and promotional volume. Use aggregate counts. Avoid cross-app behavioural profiling outside the product's stated purpose.

### FR-11 Cloud services
Optional account and preferences; explicit opt-in sync; cloud AI requests only after consent. Do not sync raw notification text by default. R2 stores encrypted user-requested exports or model files, not a live event stream.

## 7. MVP release definition
- Onboarding and permission state.
- App exclusion list.
- Native capture and local persistence.
- Inbox/history.
- Basic deterministic categorisation and priority.
- Search by keyword, app and date.
- Save/archive/delete.
- Daily overview using deterministic summaries.
- Basic volume insights.
- Privacy centre and configurable retention.
- Light/dark theme.

## 8. Acceptance criteria
- A permitted test notification is captured while the React Native UI is closed and appears after reopening.
- An excluded app's content is not persisted.
- OTP-like test content is redacted or discarded according to policy and test fixtures.
- Revoking access produces an actionable status, not a crash.
- Search finds known retained test records.
- Deleting history removes rows and FTS index entries.
- No raw content appears in logs or crash telemetry.
- Core inbox/search/history work offline.
- App survives listener reconnect and database migration tests.

## 9. Risks
Android/OEM background policies, permission revocation, notification redaction, low-RAM/work-profile restrictions, notification format variability, false-positive sensitive-data filtering, LLM hallucinations, model memory/thermal costs and cloud free-tier cold starts.
