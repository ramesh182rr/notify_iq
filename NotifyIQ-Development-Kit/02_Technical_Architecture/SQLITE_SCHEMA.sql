PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_preferences (
  package_name TEXT PRIMARY KEY,
  app_label TEXT,
  excluded INTEGER NOT NULL DEFAULT 0,
  category_override TEXT,
  priority_override TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_events (
  id TEXT PRIMARY KEY,
  package_name TEXT NOT NULL,
  app_label TEXT,
  notification_key TEXT,
  group_key TEXT,
  title TEXT,
  body TEXT,
  subtext TEXT,
  category_hint TEXT,
  channel_id TEXT,
  posted_at INTEGER NOT NULL,
  removed_at INTEGER,
  received_at INTEGER NOT NULL,
  content_hash TEXT,
  redacted INTEGER NOT NULL DEFAULT 0,
  sensitive_flags TEXT,
  is_saved INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  retention_expires_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_events_received ON notification_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_package ON notification_events(package_name, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_group ON notification_events(group_key);
CREATE INDEX IF NOT EXISTS idx_events_hash ON notification_events(content_hash);

CREATE TABLE IF NOT EXISTS notification_analysis (
  notification_id TEXT PRIMARY KEY REFERENCES notification_events(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'other',
  priority TEXT NOT NULL DEFAULT 'normal',
  confidence REAL NOT NULL DEFAULT 0,
  explanation_code TEXT,
  analysis_method TEXT NOT NULL DEFAULT 'rules',
  model_name TEXT,
  model_version TEXT,
  user_corrected INTEGER NOT NULL DEFAULT 0,
  analysed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_groups (
  id TEXT PRIMARY KEY,
  group_type TEXT NOT NULL,
  label TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS notification_group_members (
  group_id TEXT NOT NULL REFERENCES notification_groups(id) ON DELETE CASCADE,
  notification_id TEXT NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE,
  PRIMARY KEY(group_id, notification_id)
);

CREATE TABLE IF NOT EXISTS user_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 100,
  conditions_json TEXT NOT NULL,
  actions_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS digest_runs (
  id TEXT PRIMARY KEY,
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  summary TEXT NOT NULL,
  generated_by TEXT NOT NULL DEFAULT 'template',
  model_name TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS digest_items (
  digest_id TEXT NOT NULL REFERENCES digest_runs(id) ON DELETE CASCADE,
  notification_id TEXT NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  PRIMARY KEY(digest_id, notification_id)
);

CREATE TABLE IF NOT EXISTS daily_stats (
  day_utc TEXT PRIMARY KEY,
  total_count INTEGER NOT NULL DEFAULT 0,
  category_counts_json TEXT NOT NULL DEFAULT '{}',
  app_counts_json TEXT NOT NULL DEFAULT '{}',
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  computed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS privacy_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  retention_days INTEGER NOT NULL DEFAULT 30,
  cloud_ai_enabled INTEGER NOT NULL DEFAULT 0,
  cloud_sync_enabled INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
INSERT OR IGNORE INTO privacy_settings(id, updated_at) VALUES(1, strftime('%s','now') * 1000);

CREATE VIRTUAL TABLE IF NOT EXISTS notification_fts USING fts5(
  notification_id UNINDEXED,
  title,
  body,
  app_label,
  tokenize='unicode61'
);
