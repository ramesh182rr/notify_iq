# Prompt 04 — SQLite persistence and search

Implement SQLite schema and migrations from `SQLITE_SCHEMA.sql`. Pick one DB ownership strategy and document it. Implement notification repository, FTS5 insert/update/delete consistency, app preferences, retention cleanup and tests. Ensure deleting a notification removes its FTS row and derived analysis, while Android removal events do not delete history. Do not add cloud sync.
