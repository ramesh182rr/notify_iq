# Database Design

## Data ownership
- Device SQLite: notification events, derived classification, groups, saved state, rules, digest, local preferences, FTS index.
- Neon PostgreSQL: account profile, subscription metadata, user settings, sync metadata and opt-in device registration. Do not store raw notification content by default.
- R2: encrypted user-requested exports, backup packages and model assets. No public bucket for private user data.

## Main entities
- `notification_events`: source event, permitted text, timestamps and lifecycle.
- `notification_analysis`: derived category, priority, confidence, explanation, model version.
- `app_preferences`: include/exclude and per-app category overrides.
- `notification_groups`: grouping metadata; source rows remain intact.
- `saved_items`: bookmark/archive state.
- `rules`: user-created conditions/actions.
- `digest_runs`: generated summaries and source record references.
- `daily_stats`: aggregate counts only.
- `privacy_settings`: retention, exclusions, cloud consent.

## Important schema rules
- Use UUID or stable random IDs generated locally.
- Use UTC ISO timestamps / epoch milliseconds consistently.
- Store original notification text only if the privacy gate permits it.
- Store `content_redacted` and `sensitive_flags` metadata where useful; never retain the secret itself.
- Store `analysis_method`, `model_name`, `model_version`, `confidence` and `created_at` for inferred fields.
- Use SQLite FTS5 for title/body search; update index transactionally.
- Keep schema migrations numbered and tested.

See `SQLITE_SCHEMA.sql` and `06_Backend/sql/neon_schema.sql`.
