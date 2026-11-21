package com.notifyiq

import android.content.Context
import androidx.sqlite.SQLiteConnection
import androidx.sqlite.SQLiteStatement
import androidx.sqlite.execSQL
import androidx.sqlite.driver.bundled.BundledSQLiteDriver
import java.io.File

internal data class NotificationFilters(
  val query: String = "",
  val packageName: String = "",
  val from: Long = 0,
  val to: Long = 0,
  val beforeReceivedAt: Long = 0,
  val beforeId: Long = 0,
  val includeArchived: Boolean = false,
  val limit: Int = 50,
)

internal class NotificationRepository private constructor(private val connection: SQLiteConnection) {
  constructor(context: Context) : this(connectionFor(context.getDatabasePath(DB_NAME)))
  internal constructor(databaseFile: File) : this(connectionFor(databaseFile))

  init { synchronized(connection) { migrate() } }

  private fun migrate() {
    var version = pragmaInt("user_version")
    if (version > SCHEMA_VERSION) error("Database version is newer than this application.")

    if (version == 0) {
      transaction {
        connection.execSQL("CREATE TABLE app_preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)")
        connection.execSQL("CREATE TABLE notification_events (id INTEGER PRIMARY KEY AUTOINCREMENT, package_name TEXT NOT NULL, notification_key TEXT NOT NULL, title TEXT, body TEXT, subtext TEXT, posted_at INTEGER NOT NULL, received_at INTEGER NOT NULL, removed_at INTEGER)")
        connection.execSQL("CREATE UNIQUE INDEX idx_active_event ON notification_events(package_name, notification_key) WHERE removed_at IS NULL")
        connection.execSQL("CREATE INDEX idx_events_received ON notification_events(received_at DESC, id DESC)")
        connection.execSQL("PRAGMA user_version = 1")
      }
      version = 1
    }

    if (version == 1) {
      transaction {
        connection.execSQL("ALTER TABLE notification_events ADD COLUMN is_saved INTEGER NOT NULL DEFAULT 0")
        connection.execSQL("ALTER TABLE notification_events ADD COLUMN archived_at INTEGER")
        connection.execSQL("CREATE VIRTUAL TABLE notification_events_fts USING fts5(title, body, subtext, content='notification_events', content_rowid='id', tokenize='unicode61')")
        connection.execSQL("INSERT INTO notification_events_fts(notification_events_fts) VALUES('rebuild')")
        connection.execSQL("CREATE TRIGGER notification_events_fts_insert AFTER INSERT ON notification_events BEGIN INSERT INTO notification_events_fts(rowid, title, body, subtext) VALUES (new.id, new.title, new.body, new.subtext); END")
        connection.execSQL("CREATE TRIGGER notification_events_fts_delete AFTER DELETE ON notification_events BEGIN INSERT INTO notification_events_fts(notification_events_fts, rowid, title, body, subtext) VALUES ('delete', old.id, old.title, old.body, old.subtext); END")
        connection.execSQL("CREATE TRIGGER notification_events_fts_update AFTER UPDATE OF title, body, subtext ON notification_events BEGIN INSERT INTO notification_events_fts(notification_events_fts, rowid, title, body, subtext) VALUES ('delete', old.id, old.title, old.body, old.subtext); INSERT INTO notification_events_fts(rowid, title, body, subtext) VALUES (new.id, new.title, new.body, new.subtext); END")
        connection.execSQL("INSERT OR IGNORE INTO app_preferences(key, value) VALUES ('retention_days', '30')")
        connection.execSQL("PRAGMA user_version = 2")
      }
      version = 2
    }
    check(version == SCHEMA_VERSION)
  }

  fun getExcludedPackages(): Set<String> = synchronized(connection) {
    val values = mutableSetOf<String>()
    connection.prepare("SELECT substr(key, 10) FROM app_preferences WHERE key LIKE 'excluded:%' AND value = '1'").use { statement ->
      while (statement.step()) values += statement.getText(0)
    }
    values
  }

  fun setExcluded(packageName: String, excluded: Boolean) = synchronized(connection) {
    transaction {
      if (excluded) execute("INSERT OR REPLACE INTO app_preferences(key, value) VALUES (?, '1')", "excluded:$packageName")
      else execute("DELETE FROM app_preferences WHERE key = ?", "excluded:$packageName")
      if (excluded) execute("DELETE FROM notification_events WHERE package_name = ?", packageName)
    }
  }

  fun upsert(item: CapturedNotification) = synchronized(connection) {
    execute(
      "INSERT INTO notification_events(package_name, notification_key, title, body, subtext, posted_at, received_at) VALUES (?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(package_name, notification_key) WHERE removed_at IS NULL DO UPDATE SET title=excluded.title, body=excluded.body, subtext=excluded.subtext, posted_at=excluded.posted_at, received_at=excluded.received_at",
      item.identity.packageName, item.identity.notificationKey, item.title, item.body, item.subtext, item.postedAt, item.receivedAt,
    )
  }

  fun deleteActive(packageName: String, key: String) = synchronized(connection) {
    execute("DELETE FROM notification_events WHERE package_name = ? AND notification_key = ? AND removed_at IS NULL", packageName, key)
  }

  fun markRemoved(packageName: String, key: String, at: Long) = synchronized(connection) {
    execute("UPDATE notification_events SET removed_at = ? WHERE package_name = ? AND notification_key = ? AND removed_at IS NULL", at, packageName, key)
  }

  fun notifications(filters: NotificationFilters): List<NotificationRecord> = synchronized(connection) {
    cleanupIfDue(System.currentTimeMillis())
    val where = mutableListOf<String>()
    val args = mutableListOf<Any?>()
    val queryExpression = toFtsExpression(filters.query)
    if (queryExpression.isNotEmpty()) {
      where += "e.id IN (SELECT rowid FROM notification_events_fts WHERE notification_events_fts MATCH ?)"
      args += queryExpression
    }
    if (filters.packageName.isNotBlank()) { where += "e.package_name = ?"; args += filters.packageName.trim() }
    if (filters.from > 0) { where += "e.received_at >= ?"; args += filters.from }
    if (filters.to > 0) { where += "e.received_at < ?"; args += filters.to }
    if (!filters.includeArchived) where += "e.archived_at IS NULL"
    if (filters.beforeReceivedAt > 0 && filters.beforeId > 0) {
      where += "(e.received_at < ? OR (e.received_at = ? AND e.id < ?))"
      args += filters.beforeReceivedAt; args += filters.beforeReceivedAt; args += filters.beforeId
    }
    args += filters.limit.coerceIn(1, 100)
    val sql = "SELECT e.id, e.package_name, e.title, e.body, e.subtext, e.posted_at, e.received_at, e.removed_at, e.is_saved, e.archived_at " +
      "FROM notification_events e ${if (where.isEmpty()) "" else "WHERE ${where.joinToString(" AND ")}"} " +
      "ORDER BY e.received_at DESC, e.id DESC LIMIT ?"
    val records = mutableListOf<NotificationRecord>()
    connection.prepare(sql).use { statement ->
      args.forEachIndexed { index, value -> statement.bindValue(index + 1, value) }
      while (statement.step()) records += statement.toNotificationRecord()
    }
    records
  }

  fun setSaved(id: Long, saved: Boolean) = synchronized(connection) {
    execute("UPDATE notification_events SET is_saved = ? WHERE id = ?", if (saved) 1L else 0L, id)
  }

  fun setArchived(id: Long, archived: Boolean, now: Long = System.currentTimeMillis()) = synchronized(connection) {
    if (archived) execute("UPDATE notification_events SET archived_at = ? WHERE id = ?", now, id)
    else execute("UPDATE notification_events SET archived_at = NULL WHERE id = ?", id)
  }

  fun delete(id: Long) = synchronized(connection) { execute("DELETE FROM notification_events WHERE id = ?", id) }

  fun getRetentionDays(): Int = synchronized(connection) {
    scalarText("SELECT value FROM app_preferences WHERE key = 'retention_days'")?.toIntOrNull() ?: DEFAULT_RETENTION_DAYS
  }

  fun applyRetentionPolicy(now: Long = System.currentTimeMillis()) = synchronized(connection) { cleanupIfDue(now) }

  fun setRetentionDays(days: Int) = synchronized(connection) {
    require(days in RETENTION_OPTIONS)
    transaction {
      execute("INSERT OR REPLACE INTO app_preferences(key, value) VALUES ('retention_days', ?)", days.toString())
      if (days > 0) deleteExpired(System.currentTimeMillis() - days.toLong() * MILLIS_PER_DAY)
      execute("INSERT OR REPLACE INTO app_preferences(key, value) VALUES ('retention_cleanup_at', ?)", System.currentTimeMillis().toString())
    }
  }

  fun clear() = synchronized(connection) { transaction { connection.execSQL("DELETE FROM notification_events") } }

  private fun cleanupIfDue(now: Long) {
    val lastCleanup = scalarText("SELECT value FROM app_preferences WHERE key = 'retention_cleanup_at'")?.toLongOrNull() ?: 0L
    if (now - lastCleanup < MILLIS_PER_DAY) return
    transaction {
      val days = getRetentionDays()
      if (days > 0) deleteExpired(now - days.toLong() * MILLIS_PER_DAY)
      execute("INSERT OR REPLACE INTO app_preferences(key, value) VALUES ('retention_cleanup_at', ?)", now.toString())
    }
  }

  private fun deleteExpired(cutoff: Long) = execute("DELETE FROM notification_events WHERE received_at < ? AND is_saved = 0", cutoff)

  private fun toFtsExpression(query: String): String = Regex("[\\p{L}\\p{N}]+").findAll(query)
    .take(MAX_SEARCH_TERMS).map { "\"${it.value}\"" }.joinToString(" AND ")

  private fun transaction(block: () -> Unit) {
    connection.execSQL("BEGIN IMMEDIATE")
    try { block(); connection.execSQL("COMMIT") }
    catch (error: Throwable) { runCatching { connection.execSQL("ROLLBACK") }; throw error }
  }

  private fun execute(sql: String, vararg values: Any?) {
    connection.prepare(sql).use { statement ->
      values.forEachIndexed { index, value -> statement.bindValue(index + 1, value) }
      statement.step()
    }
  }

  private fun scalarText(sql: String): String? = connection.prepare(sql).use { statement ->
    if (statement.step() && statement.getColumnType(0) != SQLITE_NULL) statement.getText(0) else null
  }

  private fun pragmaInt(name: String): Int = connection.prepare("PRAGMA $name").use { statement ->
    if (statement.step()) statement.getLong(0).toInt() else 0
  }

  private fun SQLiteStatement.bindValue(index: Int, value: Any?) {
    when (value) {
      null -> bindNull(index)
      is String -> bindText(index, value)
      is Int -> bindLong(index, value.toLong())
      is Long -> bindLong(index, value)
      is Double -> bindDouble(index, value)
      else -> error("Unsupported SQLite binding type")
    }
  }

  private fun SQLiteStatement.toNotificationRecord() = NotificationRecord(
    id = getLong(0), packageName = getText(1), title = nullableText(2), body = nullableText(3), subtext = nullableText(4),
    postedAt = getLong(5), receivedAt = getLong(6), removedAt = nullableLong(7), saved = getLong(8) != 0L, archivedAt = nullableLong(9),
  )

  private fun SQLiteStatement.nullableText(index: Int): String? = if (getColumnType(index) == SQLITE_NULL) null else getText(index)
  private fun SQLiteStatement.nullableLong(index: Int): Long? = if (getColumnType(index) == SQLITE_NULL) null else getLong(index)

  companion object {
    private const val DB_NAME = "notifyiq.db"
    private const val SCHEMA_VERSION = 2
    private const val DEFAULT_RETENTION_DAYS = 30
    private const val MILLIS_PER_DAY = 86_400_000L
    private const val SQLITE_NULL = 5
    private const val MAX_SEARCH_TERMS = 10
    val RETENTION_OPTIONS = setOf(7, 30, 90, -1)
    private val connections = mutableMapOf<String, SQLiteConnection>()
    private val driver = BundledSQLiteDriver()

    @Synchronized private fun connectionFor(file: File): SQLiteConnection {
      file.parentFile?.mkdirs()
      return connections.getOrPut(file.absolutePath) { driver.open(file.absolutePath) }
    }
  }
}
