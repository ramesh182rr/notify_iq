package com.notifyiq

import android.content.Context
import androidx.sqlite.SQLiteConnection
import androidx.sqlite.SQLiteStatement
import androidx.sqlite.execSQL
import androidx.sqlite.driver.bundled.BundledSQLiteDriver
import java.io.File
import java.security.MessageDigest
import java.util.Calendar
import org.json.JSONObject

private fun JSONObject.optNullableString(name: String): String? = if (!has(name) || isNull(name)) null else getString(name)

internal data class NotificationFilters(
  val query: String = "",
  val packageName: String = "",
  val category: String = "",
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
    connection.execSQL("PRAGMA foreign_keys = ON")
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
    if (version == 2) {
      transaction {
        connection.execSQL("CREATE TABLE notification_analysis (event_id INTEGER PRIMARY KEY NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE, category TEXT NOT NULL, priority TEXT NOT NULL, confidence REAL NOT NULL, explanation TEXT NOT NULL, method TEXT NOT NULL, version TEXT NOT NULL, category_override TEXT, priority_override TEXT, corrected_at INTEGER)")
        backfillAnalysis()
        connection.execSQL("CREATE INDEX idx_analysis_category ON notification_analysis(category, priority)")
        connection.execSQL("PRAGMA user_version = 3")
      }
      version = 3
    }
    if (version == 3) {
      transaction {
        connection.execSQL("CREATE TABLE duplicate_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, package_name TEXT NOT NULL, content_fingerprint TEXT NOT NULL, window_start INTEGER NOT NULL, UNIQUE(package_name, content_fingerprint, window_start))")
        connection.execSQL("CREATE TABLE duplicate_group_members (event_id INTEGER PRIMARY KEY NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE, group_id INTEGER NOT NULL REFERENCES duplicate_groups(id) ON DELETE CASCADE)")
        connection.execSQL("CREATE INDEX idx_duplicate_members_group ON duplicate_group_members(group_id)")
        backfillDuplicateGroups()
        connection.execSQL("PRAGMA user_version = 4")
      }
      version = 4
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

  fun getUserRules(): String = synchronized(connection) {
    scalarText("SELECT value FROM app_preferences WHERE key = 'user_rules_v1'") ?: UserRuleSet(emptyList()).toJson()
  }

  fun setUserRules(json: String) = synchronized(connection) {
    val canonical = UserRuleCodec.parse(json).toJson()
    execute("INSERT OR REPLACE INTO app_preferences(key, value) VALUES ('user_rules_v1', ?)", canonical)
  }

  fun previewUserRules(ruleJson: String, sampleJson: String): String = synchronized(connection) {
    val sample = JSONObject(sampleJson)
    val result = UserRuleCodec.parse(ruleJson).evaluate(
      RuleSubject(
        packageName = sample.getString("packageName"),
        title = sample.optNullableString("title"),
        body = sample.optNullableString("body"),
        subtext = sample.optNullableString("subtext"),
        category = sample.getString("category"),
        priority = sample.getString("priority"),
      ),
    )
    JSONObject().put("matchedRuleIds", org.json.JSONArray(result.matchedRuleIds))
      .put("category", result.category).put("save", result.save)
      .put("includeInDigest", result.includeInDigest?.let { it } ?: JSONObject.NULL)
      .put("important", result.important?.let { it } ?: JSONObject.NULL)
      .put("groups", org.json.JSONArray(result.groups)).toString()
  }

  fun setExcluded(packageName: String, excluded: Boolean) = synchronized(connection) {
    transaction {
      if (excluded) execute("INSERT OR REPLACE INTO app_preferences(key, value) VALUES (?, '1')", "excluded:$packageName")
      else execute("DELETE FROM app_preferences WHERE key = ?", "excluded:$packageName")
      if (excluded) execute("DELETE FROM notification_events WHERE package_name = ?", packageName)
      if (excluded) cleanupDuplicateGroups()
    }
  }

  fun upsert(item: CapturedNotification) = synchronized(connection) {
    transaction {
      val existingId = scalarLong("SELECT id FROM notification_events WHERE package_name = ? AND notification_key = ? AND removed_at IS NULL", item.identity.packageName, item.identity.notificationKey)
      val oldGroupKey = existingId?.let(::duplicateGroupKeyForEvent)
      execute(
        "INSERT INTO notification_events(package_name, notification_key, title, body, subtext, posted_at, received_at) VALUES (?, ?, ?, ?, ?, ?, ?) " +
          "ON CONFLICT(package_name, notification_key) WHERE removed_at IS NULL DO UPDATE SET title=excluded.title, body=excluded.body, subtext=excluded.subtext, posted_at=excluded.posted_at, received_at=excluded.received_at",
        item.identity.packageName, item.identity.notificationKey, item.title, item.body, item.subtext, item.postedAt, item.receivedAt,
      )
      val id = scalarLong("SELECT id FROM notification_events WHERE package_name = ? AND notification_key = ? AND removed_at IS NULL", item.identity.packageName, item.identity.notificationKey)
        ?: error("Unable to resolve stored notification identity")
      saveAnalysis(id, NotificationAnalyzer.analyze(item.title, item.body, item.subtext))
      val newGroupKey = duplicateGroupKey(item)
      if (oldGroupKey != null && oldGroupKey != newGroupKey) rebuildDuplicateGroup(oldGroupKey)
      if (newGroupKey != null) rebuildDuplicateGroup(newGroupKey)
    }
  }

  fun deleteActive(packageName: String, key: String) = synchronized(connection) {
    transaction {
      execute("DELETE FROM notification_events WHERE package_name = ? AND notification_key = ? AND removed_at IS NULL", packageName, key)
      cleanupDuplicateGroups()
    }
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
    if (filters.category.isNotBlank()) { where += "COALESCE(a.category_override, a.category) = ?"; args += filters.category }
    if (filters.from > 0) { where += "e.received_at >= ?"; args += filters.from }
    if (filters.to > 0) { where += "e.received_at < ?"; args += filters.to }
    if (!filters.includeArchived) where += "e.archived_at IS NULL"
    if (filters.beforeReceivedAt > 0 && filters.beforeId > 0) {
      where += "(e.received_at < ? OR (e.received_at = ? AND e.id < ?))"
      args += filters.beforeReceivedAt; args += filters.beforeReceivedAt; args += filters.beforeId
    }
    args += filters.limit.coerceIn(1, 100)
    val sql = "SELECT e.id, e.package_name, e.title, e.body, e.subtext, e.posted_at, e.received_at, e.removed_at, e.is_saved, e.archived_at, " +
    "COALESCE(a.category_override, a.category), COALESCE(a.priority_override, a.priority), a.confidence, a.explanation, a.method, a.version, a.category_override, m.group_id, " +
      "CASE WHEN m.group_id IS NULL THEN 1 ELSE (SELECT COUNT(*) FROM duplicate_group_members gm WHERE gm.group_id = m.group_id) END " +
      "FROM notification_events e LEFT JOIN notification_analysis a ON a.event_id = e.id LEFT JOIN duplicate_group_members m ON m.event_id = e.id ${if (where.isEmpty()) "" else "WHERE ${where.joinToString(" AND ")}"} " +
      "ORDER BY e.received_at DESC, e.id DESC LIMIT ?"
    val records = mutableListOf<NotificationRecord>()
    connection.prepare(sql).use { statement ->
      args.forEachIndexed { index, value -> statement.bindValue(index + 1, value) }
      while (statement.step()) records += statement.toNotificationRecord()
    }
    records
  }

  fun dailyOverview(now: Long = System.currentTimeMillis()): DailyOverviewResult = synchronized(connection) {
    cleanupIfDue(now)
    val startCalendar = Calendar.getInstance().apply {
      timeInMillis = now
      set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }
    val start = startCalendar.timeInMillis
    startCalendar.add(Calendar.DAY_OF_MONTH, 1)
    val end = startCalendar.timeInMillis
    val total = scalarLong("SELECT COUNT(*) FROM notification_events WHERE received_at >= ? AND received_at < ?", start, end)?.toInt() ?: 0
    val appCount = scalarLong("SELECT COUNT(DISTINCT package_name) FROM notification_events WHERE received_at >= ? AND received_at < ?", start, end)?.toInt() ?: 0
    val categories = overviewCounts(
      "SELECT COALESCE(a.category_override, a.category), COUNT(*) FROM notification_events e LEFT JOIN notification_analysis a ON a.event_id=e.id WHERE e.received_at >= ? AND e.received_at < ? GROUP BY COALESCE(a.category_override, a.category) ORDER BY COUNT(*) DESC, 1 ASC",
      start, end,
    )
    val apps = overviewCounts(
      "SELECT package_name, COUNT(*) FROM notification_events WHERE received_at >= ? AND received_at < ? GROUP BY package_name ORDER BY COUNT(*) DESC, package_name ASC LIMIT 5",
      start, end,
    )
    val hours = overviewCounts(
      "SELECT strftime('%H:00', received_at / 1000, 'unixepoch', 'localtime'), COUNT(*) FROM notification_events WHERE received_at >= ? AND received_at < ? GROUP BY 1 ORDER BY COUNT(*) DESC, 1 ASC LIMIT 5",
      start, end,
    )
    val sources = notifications(NotificationFilters(from = start, to = end, includeArchived = true, limit = 5))
    DailyOverviewResult(start, end, total, appCount, categories, apps, hours, sources)
  }

  fun setSaved(id: Long, saved: Boolean) = synchronized(connection) {
    execute("UPDATE notification_events SET is_saved = ? WHERE id = ?", if (saved) 1L else 0L, id)
  }

  fun setArchived(id: Long, archived: Boolean, now: Long = System.currentTimeMillis()) = synchronized(connection) {
    if (archived) execute("UPDATE notification_events SET archived_at = ? WHERE id = ?", now, id)
    else execute("UPDATE notification_events SET archived_at = NULL WHERE id = ?", id)
  }

  fun delete(id: Long) = synchronized(connection) { transaction { execute("DELETE FROM notification_events WHERE id = ?", id); cleanupDuplicateGroups() } }

  fun setCategoryOverride(id: Long, category: String?) = synchronized(connection) {
    require(category == null || NotificationCategory.fromWireValue(category) != null)
    execute("UPDATE notification_analysis SET category_override = ?, corrected_at = ? WHERE event_id = ?", category, System.currentTimeMillis(), id)
  }

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

  fun clear() = synchronized(connection) { transaction { connection.execSQL("DELETE FROM notification_events"); cleanupDuplicateGroups() } }

  private fun cleanupIfDue(now: Long) {
    val lastCleanup = scalarText("SELECT value FROM app_preferences WHERE key = 'retention_cleanup_at'")?.toLongOrNull() ?: 0L
    if (now - lastCleanup < MILLIS_PER_DAY) return
    transaction {
      val days = getRetentionDays()
      if (days > 0) deleteExpired(now - days.toLong() * MILLIS_PER_DAY)
      execute("INSERT OR REPLACE INTO app_preferences(key, value) VALUES ('retention_cleanup_at', ?)", now.toString())
    }
  }

  private fun deleteExpired(cutoff: Long) {
    execute("DELETE FROM notification_events WHERE received_at < ? AND is_saved = 0", cutoff)
    cleanupDuplicateGroups()
  }

  private data class DuplicateGroupKey(val packageName: String, val fingerprint: String, val windowStart: Long)

  private fun duplicateGroupKeyForEvent(id: Long): DuplicateGroupKey? = connection.prepare(
    "SELECT g.package_name, g.content_fingerprint, g.window_start FROM duplicate_groups g JOIN duplicate_group_members m ON m.group_id = g.id WHERE m.event_id = ?",
  ).use { statement ->
    statement.bindLong(1, id)
    if (statement.step()) DuplicateGroupKey(statement.getText(0), statement.getText(1), statement.getLong(2)) else null
  }

  private fun duplicateGroupKey(item: CapturedNotification): DuplicateGroupKey? {
    val normalized = listOf(item.title, item.body, item.subtext).joinToString("\u0000") { normalizeForGrouping(it.orEmpty()) }
    if (normalized.replace("\u0000", "").isBlank()) return null
    val fingerprintInput = "${item.identity.packageName}\u0000$normalized"
    val fingerprint = MessageDigest.getInstance("SHA-256").digest(fingerprintInput.toByteArray(Charsets.UTF_8))
      .joinToString("") { byte -> "%02x".format(byte) }
    val windowStart = Math.floorDiv(item.receivedAt, DUPLICATE_WINDOW_MILLIS) * DUPLICATE_WINDOW_MILLIS
    return DuplicateGroupKey(item.identity.packageName, fingerprint, windowStart)
  }

  private fun normalizeForGrouping(value: String): String = value.trim().lowercase().replace(Regex("\\s+"), " ")

  private fun rebuildDuplicateGroup(key: DuplicateGroupKey) {
    execute("DELETE FROM duplicate_groups WHERE package_name = ? AND content_fingerprint = ? AND window_start = ?", key.packageName, key.fingerprint, key.windowStart)
    val eventIds = mutableListOf<Long>()
    connection.prepare("SELECT id, title, body, subtext FROM notification_events WHERE package_name = ? AND received_at >= ? AND received_at < ?").use { statement ->
      statement.bindText(1, key.packageName)
      statement.bindLong(2, key.windowStart)
      statement.bindLong(3, key.windowStart + DUPLICATE_WINDOW_MILLIS)
      while (statement.step()) {
        val text = listOf(statement.nullableText(1), statement.nullableText(2), statement.nullableText(3)).joinToString("\u0000") { normalizeForGrouping(it.orEmpty()) }
        val input = "${key.packageName}\u0000$text"
        val hash = MessageDigest.getInstance("SHA-256").digest(input.toByteArray(Charsets.UTF_8)).joinToString("") { byte -> "%02x".format(byte) }
        if (hash == key.fingerprint) eventIds += statement.getLong(0)
      }
    }
    if (eventIds.size < 2) return
    execute("INSERT INTO duplicate_groups(package_name, content_fingerprint, window_start) VALUES (?, ?, ?)", key.packageName, key.fingerprint, key.windowStart)
    val groupId = scalarLong("SELECT id FROM duplicate_groups WHERE package_name = ? AND content_fingerprint = ? AND window_start = ?", key.packageName, key.fingerprint, key.windowStart)
      ?: return
    eventIds.forEach { eventId -> execute("INSERT OR IGNORE INTO duplicate_group_members(event_id, group_id) VALUES (?, ?)", eventId, groupId) }
  }

  private fun backfillDuplicateGroups() {
    val keys = mutableSetOf<DuplicateGroupKey>()
    connection.prepare("SELECT id, package_name, notification_key, title, body, subtext, posted_at, received_at FROM notification_events").use { statement ->
      while (statement.step()) {
        val item = CapturedNotification(
          NotificationIdentity(statement.getText(1), statement.getText(2)),
          statement.nullableText(3), statement.nullableText(4), statement.nullableText(5), statement.getLong(6), statement.getLong(7),
        )
        duplicateGroupKey(item)?.let(keys::add)
      }
    }
    keys.forEach(::rebuildDuplicateGroup)
  }

  private fun cleanupDuplicateGroups() {
    connection.execSQL("DELETE FROM duplicate_groups WHERE id IN (SELECT g.id FROM duplicate_groups g LEFT JOIN duplicate_group_members m ON m.group_id = g.id GROUP BY g.id HAVING COUNT(m.event_id) < 2)")
  }

  private fun saveAnalysis(id: Long, analysis: NotificationAnalysis) {
    execute(
      "INSERT INTO notification_analysis(event_id, category, priority, confidence, explanation, method, version) VALUES (?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(event_id) DO UPDATE SET category=excluded.category, priority=excluded.priority, confidence=excluded.confidence, explanation=excluded.explanation, method=excluded.method, version=excluded.version",
      id, analysis.category.wireValue, analysis.priority, analysis.confidence, analysis.explanation, analysis.method, analysis.version,
    )
  }

  private fun backfillAnalysis() {
    val existing = mutableListOf<Pair<Long, NotificationAnalysis>>()
    connection.prepare("SELECT id, title, body, subtext FROM notification_events").use { statement ->
      while (statement.step()) {
        existing += statement.getLong(0) to NotificationAnalyzer.analyze(statement.nullableText(1), statement.nullableText(2), statement.nullableText(3))
      }
    }
    existing.forEach { (id, analysis) -> saveAnalysis(id, analysis) }
  }

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

  private fun scalarLong(sql: String, vararg values: Any?): Long? = connection.prepare(sql).use { statement ->
    values.forEachIndexed { index, value -> statement.bindValue(index + 1, value) }
    if (statement.step() && statement.getColumnType(0) != SQLITE_NULL) statement.getLong(0) else null
  }

  private fun overviewCounts(sql: String, from: Long, to: Long): List<OverviewCount> {
    val result = mutableListOf<OverviewCount>()
    connection.prepare(sql).use { statement ->
      statement.bindLong(1, from); statement.bindLong(2, to)
      while (statement.step()) result += OverviewCount(statement.getText(0), statement.getLong(1).toInt())
    }
    return result
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
    category = nullableText(10) ?: NotificationCategory.OTHER.wireValue, priority = nullableText(11) ?: "normal", confidence = getDouble(12),
    analysisExplanation = nullableText(13) ?: "No classification is available.", analysisMethod = nullableText(14) ?: "deterministic_rules",
    analysisVersion = nullableText(15) ?: NotificationAnalysis.VERSION, categoryOverride = nullableText(16), duplicateGroupId = nullableLong(17), duplicateCount = getLong(18).toInt(),
  )

  private fun SQLiteStatement.nullableText(index: Int): String? = if (getColumnType(index) == SQLITE_NULL) null else getText(index)
  private fun SQLiteStatement.nullableLong(index: Int): Long? = if (getColumnType(index) == SQLITE_NULL) null else getLong(index)

  companion object {
    private const val DB_NAME = "notifyiq.db"
    private const val SCHEMA_VERSION = 4
    private const val DEFAULT_RETENTION_DAYS = 30
    private const val MILLIS_PER_DAY = 86_400_000L
    private const val SQLITE_NULL = 5
    private const val MAX_SEARCH_TERMS = 10
    private const val DUPLICATE_WINDOW_MILLIS = 30L * 60_000L
    val RETENTION_OPTIONS = setOf(7, 30, 90, -1)
    private val connections = mutableMapOf<String, SQLiteConnection>()
    private val driver = BundledSQLiteDriver()

    @Synchronized private fun connectionFor(file: File): SQLiteConnection {
      file.parentFile?.mkdirs()
      return connections.getOrPut(file.absolutePath) { driver.open(file.absolutePath) }
    }
  }
}
