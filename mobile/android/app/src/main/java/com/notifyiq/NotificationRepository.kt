package com.notifyiq

import android.content.Context
import androidx.sqlite.SQLiteConnection
import androidx.sqlite.SQLiteStatement
import androidx.sqlite.execSQL
import androidx.sqlite.driver.bundled.BundledSQLiteDriver
import java.io.File
import java.security.MessageDigest
import java.util.Calendar
import org.json.JSONArray
import org.json.JSONObject

private fun JSONObject.optNullableString(name: String): String? = if (!has(name) || isNull(name)) null else getString(name)

internal data class ListenerGap(val id: Long, val startedAt: Long, val endedAt: Long, val recovered: Int, val exact: Boolean, val seen: Boolean)

internal data class NotificationFilters(
  val query: String = "",
  val packageName: String = "",
  val category: String = "",
  val groupName: String = "",
  val from: Long = 0,
  val to: Long = 0,
  val beforeReceivedAt: Long = 0,
  val beforeId: Long = 0,
  val includeArchived: Boolean = false,
  val limit: Int = 50,
  /** When set, returns only this event (used to open the source of an insight). */
  val id: Long = 0,
)

internal class NotificationRepository private constructor(private val connection: SQLiteConnection, private val context: Context?) {
  constructor(context: Context) : this(connectionFor(context.getDatabasePath(DB_NAME)), context.applicationContext)
  internal constructor(databaseFile: File) : this(connectionFor(databaseFile), null)

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
    if (version == 4) {
      transaction {
        connection.execSQL("CREATE TABLE notification_rule_results (event_id INTEGER PRIMARY KEY NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE, category TEXT, include_in_digest INTEGER, important INTEGER, groups_json TEXT NOT NULL, matched_rule_ids_json TEXT NOT NULL)")
        connection.execSQL("PRAGMA user_version = 5")
      }
      version = 5
    }
    if (version == 5) {
      transaction {
        connection.execSQL("ALTER TABLE notification_events ADD COLUMN saved_override INTEGER")
        connection.execSQL("UPDATE notification_events SET saved_override = is_saved")
        connection.execSQL("ALTER TABLE notification_rule_results ADD COLUMN rule_saved INTEGER NOT NULL DEFAULT 0")
        connection.execSQL("ALTER TABLE notification_rule_results ADD COLUMN reminder_due_at INTEGER")
        connection.execSQL("ALTER TABLE notification_rule_results ADD COLUMN reminder_status TEXT")
        connection.execSQL("PRAGMA user_version = 6")
      }
      version = 6
    }
    if (version == 6) {
      transaction {
        connection.execSQL(
          "CREATE TABLE notification_insights (event_id INTEGER PRIMARY KEY NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE, " +
            "amount_minor INTEGER, currency TEXT, direction TEXT, merchant TEXT, merchant_key TEXT, spend_category TEXT, channel TEXT, " +
            "action_kind TEXT, due_at INTEGER, due_has_time INTEGER NOT NULL DEFAULT 0, action_amount_minor INTEGER, action_currency TEXT, " +
            "subscription INTEGER NOT NULL DEFAULT 0, evidence TEXT NOT NULL, version INTEGER NOT NULL, dismissed INTEGER NOT NULL DEFAULT 0, " +
            "reminder_at INTEGER, reminder_status TEXT)",
        )
        connection.execSQL("CREATE INDEX idx_insights_due ON notification_insights(due_at) WHERE action_kind IS NOT NULL")
        connection.execSQL("CREATE INDEX idx_insights_merchant ON notification_insights(merchant_key) WHERE amount_minor IS NOT NULL")
        backfillInsights()
        connection.execSQL("PRAGMA user_version = 7")
      }
      version = 7
    }
    if (version == 7) {
      transaction {
        connection.execSQL("ALTER TABLE notification_insights ADD COLUMN category_override TEXT")
        connection.execSQL("PRAGMA user_version = 8")
      }
      version = 8
    }
    if (version == 8) {
      transaction {
        // Indexed duplicate lookup: store each event's content fingerprint instead of rehashing the window.
        connection.execSQL("ALTER TABLE notification_events ADD COLUMN content_fingerprint TEXT")
        connection.execSQL("CREATE INDEX idx_events_fingerprint ON notification_events(package_name, content_fingerprint, received_at)")
        backfillFingerprints()
        // Readable names and icons of apps that posted captured notifications (no notification content).
        connection.execSQL("CREATE TABLE app_directory (package_name TEXT PRIMARY KEY NOT NULL, label TEXT NOT NULL, icon_file TEXT, updated_at INTEGER NOT NULL)")
        connection.execSQL("PRAGMA user_version = 9")
      }
      version = 9
    }
    if (version == 9) {
      transaction {
        // Times Android did not let NotifyIQ read notifications (no notification content).
        connection.execSQL("CREATE TABLE listener_gaps (id INTEGER PRIMARY KEY AUTOINCREMENT, started_at INTEGER NOT NULL, ended_at INTEGER NOT NULL, recovered INTEGER NOT NULL DEFAULT 0, exact INTEGER NOT NULL DEFAULT 1, seen INTEGER NOT NULL DEFAULT 0)")
        connection.execSQL("PRAGMA user_version = 10")
      }
      version = 10
    }
    // Recompute insights when the deterministic extractor changes; user overrides and dismissals are kept.
    if ((scalarLong("SELECT COUNT(*) FROM notification_insights WHERE version < ?", InsightExtractor.VERSION.toLong()) ?: 0L) > 0L) {
      transaction { backfillInsights() }
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

  fun getSavedSearches(): String = synchronized(connection) {
    scalarText("SELECT value FROM app_preferences WHERE key = 'saved_searches_v1'") ?: SavedSearchCodec.emptyJson()
  }

  fun getRuleGroups(): List<String> = synchronized(connection) {
    val groups = linkedSetOf<String>()
    connection.prepare("SELECT groups_json FROM notification_rule_results WHERE groups_json <> '[]'").use { statement ->
      while (statement.step()) {
        runCatching { JSONArray(statement.getText(0)) }.getOrNull()?.let { values ->
          for (index in 0 until values.length()) values.optString(index).takeIf(String::isNotBlank)?.let(groups::add)
        }
      }
    }
    groups.sortedWith(String.CASE_INSENSITIVE_ORDER)
  }

  fun addSavedSearch(name: String, filtersJson: String): String = synchronized(connection) {
    val updated = SavedSearchCodec.add(getSavedSearches(), name, filtersJson)
    execute("INSERT OR REPLACE INTO app_preferences(key, value) VALUES ('saved_searches_v1', ?)", updated)
    updated
  }

  fun deleteSavedSearch(id: String): String = synchronized(connection) {
    val updated = SavedSearchCodec.remove(getSavedSearches(), id)
    execute("INSERT OR REPLACE INTO app_preferences(key, value) VALUES ('saved_searches_v1', ?)", updated)
    updated
  }

  fun reevaluateUserRules(): Int = synchronized(connection) {
    val ruleJson = scalarText("SELECT value FROM app_preferences WHERE key = 'user_rules_v1'") ?: UserRuleSet(emptyList()).toJson()
    val ruleSet = UserRuleCodec.parse(ruleJson)
    var processed = 0
    transaction {
      connection.prepare(
        "SELECT e.id, e.package_name, e.title, e.body, e.subtext, e.received_at, e.saved_override, a.category_override, a.category, a.priority, rr.rule_saved, rr.reminder_status " +
          "FROM notification_events e LEFT JOIN notification_analysis a ON a.event_id=e.id LEFT JOIN notification_rule_results rr ON rr.event_id=e.id ORDER BY e.id",
      ).use { statement ->
        while (statement.step()) {
          val id = statement.getLong(0)
          val item = CapturedNotification(
            NotificationIdentity(statement.getText(1), ""),
            statement.nullableText(2), statement.nullableText(3), statement.nullableText(4), 0L, statement.getLong(5),
          )
          val savedOverride = statement.nullableLong(6)
          val priorRuleSaved = statement.getLong(10) == 1L
          if (priorRuleSaved && savedOverride == null) execute("UPDATE notification_events SET is_saved = 0 WHERE id = ?", id)
          UserReminderScheduler.cancel(context, id)
          val baseCategory = statement.nullableText(7) ?: statement.nullableText(8) ?: NotificationCategory.OTHER.wireValue
          val priority = statement.nullableText(9) ?: "normal"
          val result = ruleSet.evaluate(RuleSubject(item.identity.packageName, item.title, item.body, item.subtext, baseCategory, priority))
          if (result.matchedRuleIds.isEmpty()) {
            execute("DELETE FROM notification_rule_results WHERE event_id = ?", id)
          } else {
            val dueAt = result.reminderAfterMinutes?.let { item.receivedAt + it * 60_000L }
            val status = dueAt?.let { at ->
              when {
                at <= System.currentTimeMillis() -> "expired"
                context != null && UserReminderScheduler.schedule(context, id, at) -> "pending"
                else -> "permission_missing"
              }
            }
            execute(
              "INSERT OR REPLACE INTO notification_rule_results(event_id, category, include_in_digest, important, groups_json, matched_rule_ids_json, rule_saved, reminder_due_at, reminder_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
              id, result.category.takeIf { it != baseCategory },
              result.includeInDigest?.let { if (it) 1L else 0L },
              result.important?.let { if (it) 1L else 0L },
              org.json.JSONArray(result.groups).toString(), org.json.JSONArray(result.matchedRuleIds).toString(),
              if (result.save && savedOverride == null) 1L else 0L, dueAt, status,
            )
            if (result.save && savedOverride == null) execute("UPDATE notification_events SET is_saved = 1 WHERE id = ?", id)
          }
          processed++
        }
      }
    }
    processed
  }

  private fun applyUserRules(id: Long, item: CapturedNotification, analysis: NotificationAnalysis) {
    val ruleJson = scalarText("SELECT value FROM app_preferences WHERE key = 'user_rules_v1'") ?: return
    val result = UserRuleCodec.parse(ruleJson).evaluate(
      RuleSubject(item.identity.packageName, item.title, item.body, item.subtext, analysis.category.wireValue, analysis.priority),
    )
    if (result.matchedRuleIds.isEmpty()) return
    val reminderDueAt = result.reminderAfterMinutes?.let { item.receivedAt + it * 60_000L }
    val reminderStatus = reminderDueAt?.let { dueAt ->
      if (context != null && UserReminderScheduler.schedule(context, id, dueAt)) "pending" else "permission_missing"
    }
    execute(
      "INSERT OR REPLACE INTO notification_rule_results(event_id, category, include_in_digest, important, groups_json, matched_rule_ids_json, rule_saved, reminder_due_at, reminder_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id,
      result.category.takeIf { it != analysis.category.wireValue },
      result.includeInDigest?.let { if (it) 1L else 0L },
      result.important?.let { if (it) 1L else 0L },
      org.json.JSONArray(result.groups).toString(),
      org.json.JSONArray(result.matchedRuleIds).toString(),
      if (result.save) 1L else 0L,
      reminderDueAt,
      reminderStatus,
    )
    if (result.save) execute("UPDATE notification_events SET is_saved = 1 WHERE id = ? AND saved_override IS NULL", id)
  }

  internal fun ruleResults(id: Long): String? = synchronized(connection) {
    connection.prepare("SELECT category, include_in_digest, important, groups_json, matched_rule_ids_json FROM notification_rule_results WHERE event_id = ?").use { statement ->
      statement.bindLong(1, id)
      if (!statement.step()) return@synchronized null
      JSONObject()
        .put("category", statement.nullableText(0) ?: JSONObject.NULL)
        .put("includeInDigest", statement.nullableLong(1)?.let { it == 1L } ?: JSONObject.NULL)
        .put("important", statement.nullableLong(2)?.let { it == 1L } ?: JSONObject.NULL)
        .put("groups", statement.getText(3))
        .put("matchedRuleIds", statement.getText(4))
        .toString()
    }
  }

  internal fun pendingReminders(): List<Pair<Long, Long>> = synchronized(connection) {
    val reminders = mutableListOf<Pair<Long, Long>>()
    connection.prepare("SELECT event_id, reminder_due_at FROM notification_rule_results WHERE reminder_status = 'pending' AND reminder_due_at IS NOT NULL").use { statement ->
      while (statement.step()) reminders += statement.getLong(0) to statement.getLong(1)
    }
    reminders
  }

  /** Insight reminders use their own alarm identity so they never replace a rule reminder. */
  internal fun pendingInsightReminders(): List<Pair<Long, Long>> = synchronized(connection) {
    val reminders = mutableListOf<Pair<Long, Long>>()
    connection.prepare("SELECT event_id, reminder_at FROM notification_insights WHERE reminder_status = 'pending' AND reminder_at IS NOT NULL").use { statement ->
      while (statement.step()) reminders += statement.getLong(0) to statement.getLong(1)
    }
    reminders
  }

  internal fun markReminderDelivered(eventId: Long, insight: Boolean = false): Boolean = synchronized(connection) {
    val table = if (insight) "notification_insights" else "notification_rule_results"
    if (scalarText("SELECT reminder_status FROM $table WHERE event_id = ?", eventId) != "pending") return@synchronized false
    execute("UPDATE $table SET reminder_status = 'delivered' WHERE event_id = ?", eventId)
    true
  }

  internal fun markReminderUnavailable(eventId: Long, insight: Boolean = false) = synchronized(connection) {
    val table = if (insight) "notification_insights" else "notification_rule_results"
    execute("UPDATE $table SET reminder_status = 'permission_missing' WHERE event_id = ?", eventId)
  }

  // ---- money and upcoming insights ------------------------------------------------------

  private fun saveInsight(id: Long, insight: NotificationInsight) {
    if (insight.isEmpty) {
      execute("DELETE FROM notification_insights WHERE event_id = ?", id)
      return
    }
    val money = insight.money
    val action = insight.action
    execute(
      "INSERT INTO notification_insights(event_id, amount_minor, currency, direction, merchant, merchant_key, spend_category, channel, action_kind, due_at, due_has_time, action_amount_minor, action_currency, subscription, evidence, version) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(event_id) DO UPDATE SET amount_minor=excluded.amount_minor, currency=excluded.currency, direction=excluded.direction, " +
        "merchant=excluded.merchant, merchant_key=excluded.merchant_key, spend_category=excluded.spend_category, channel=excluded.channel, action_kind=excluded.action_kind, due_at=excluded.due_at, " +
        "due_has_time=excluded.due_has_time, action_amount_minor=excluded.action_amount_minor, action_currency=excluded.action_currency, subscription=excluded.subscription, evidence=excluded.evidence, version=excluded.version",
      id, money?.amountMinor, money?.currency, money?.direction?.wire, money?.merchant, InsightExtractor.merchantKey(money?.merchant), money?.spendCategory, money?.channel,
      action?.kind?.wire, action?.dueAt, if (action?.hasTime == true) 1L else 0L, action?.amountMinor, action?.currency, if (insight.subscription) 1L else 0L, insight.evidence, InsightExtractor.VERSION.toLong(),
    )
  }

  private fun backfillInsights() {
    val rows = mutableListOf<Pair<Long, NotificationInsight>>()
    connection.prepare("SELECT id, title, body, received_at FROM notification_events").use { statement ->
      while (statement.step()) rows += statement.getLong(0) to InsightExtractor.extract(statement.nullableText(1), statement.nullableText(2), statement.getLong(3))
    }
    rows.forEach { (id, insight) -> saveInsight(id, insight) }
  }

  private fun merchantCategoryRules(): Map<String, String> = runCatching {
    val json = JSONObject(scalarText("SELECT value FROM app_preferences WHERE key = 'merchant_categories_v1'") ?: "{}")
    json.keys().asSequence().associateWith { json.getString(it) }
  }.getOrDefault(emptyMap())

  /** Money rows in range with the effective category: per-payment override, then per-merchant rule, then extracted. */
  private fun moneyRows(from: Long, to: Long): List<MoneyRow> {
    val rules = merchantCategoryRules()
    val rows = mutableListOf<MoneyRow>()
    connection.prepare(
      "SELECT i.event_id, i.amount_minor, i.currency, i.direction, i.merchant, i.spend_category, e.received_at, e.package_name, i.subscription, i.category_override, i.merchant_key " +
        "FROM notification_insights i JOIN notification_events e ON e.id = i.event_id " +
        "WHERE i.amount_minor IS NOT NULL AND i.dismissed = 0 AND e.received_at >= ? AND e.received_at < ? ORDER BY e.received_at DESC",
    ).use { statement ->
      statement.bindLong(1, from); statement.bindLong(2, to)
      while (statement.step()) {
        val override = statement.nullableText(9)
        val rule = statement.nullableText(10)?.let { rules[it] }
        rows += MoneyRow(
          statement.getLong(0), statement.getLong(1), statement.getText(2), statement.getText(3), statement.nullableText(4),
          override ?: rule ?: statement.nullableText(5) ?: "other", statement.getLong(6), statement.getText(7), statement.getLong(8) == 1L,
          categoryEdited = override != null || rule != null,
        )
      }
    }
    return rows
  }

  private fun primaryCurrency(rows: List<MoneyRow>) = rows.groupBy { it.currency }.maxByOrNull { (_, list) -> list.sumOf { it.amountMinor } }?.key ?: "INR"

  private fun buckets(rows: List<MoneyRow>, key: (MoneyRow) -> String) =
    rows.groupBy(key).map { (name, list) -> MoneyBucket(name, list.sumOf { it.amountMinor }, list.size) }.sortedByDescending { it.amountMinor }

  fun moneySummary(from: Long, to: Long): MoneySummary = synchronized(connection) {
    val rows = moneyRows(from, to)
    val currency = primaryCurrency(rows)
    val primary = rows.filter { it.currency == currency }
    val debits = primary.filter { it.direction == MoneyDirection.DEBIT.wire }
    val credits = primary.filter { it.direction == MoneyDirection.CREDIT.wire }
    MoneySummary(
      from, to, currency,
      spentMinor = debits.sumOf { it.amountMinor }, receivedMinor = credits.sumOf { it.amountMinor },
      debitCount = debits.size, creditCount = credits.size,
      merchants = buckets(debits) { it.merchant ?: "Not named in alert" }.take(8),
      categories = buckets(debits) { it.category },
      recent = primary.take(25),
      otherCurrencies = rows.filter { it.currency != currency }.map { it.currency }.distinct(),
    )
  }

  fun moneyAnalytics(from: Long, to: Long, now: Long = System.currentTimeMillis()): MoneyAnalytics = synchronized(connection) {
    val zone = java.time.ZoneId.systemDefault()
    val length = (to - from).coerceAtLeast(MILLIS_PER_DAY)
    val all = moneyRows(from - length, to)
    val currency = primaryCurrency(all.filter { it.receivedAt >= from })
    val rows = all.filter { it.currency == currency && it.receivedAt >= from }
    val previous = all.filter { it.currency == currency && it.receivedAt < from }
    val debits = rows.filter { it.direction == MoneyDirection.DEBIT.wire }
    val credits = rows.filter { it.direction == MoneyDirection.CREDIT.wire }
    fun localDate(at: Long) = java.time.Instant.ofEpochMilli(at).atZone(zone).toLocalDate()
    fun categoryBreakdown(list: List<MoneyRow>) = list.groupBy { it.category }.map { (category, items) ->
      MoneyCategoryBreakdown(category, items.sumOf { it.amountMinor }, items.size, buckets(items) { it.merchant ?: "Not named in alert" }.take(3))
    }.sortedByDescending { it.amountMinor }

    val firstDay = localDate(from)
    val lastDay = localDate(minOf(to, now) - 1).let { if (it.isBefore(firstDay)) firstDay else it }
    val days = generateSequence(firstDay) { it.plusDays(1) }.takeWhile { !it.isAfter(lastDay) }.take(92).toList()
    val byDay = rows.groupBy { localDate(it.receivedAt) }
    val daily = days.map { day ->
      val items = byDay[day].orEmpty()
      MoneyDay(day.atStartOfDay(zone).toInstant().toEpochMilli(),
        items.filter { it.direction == MoneyDirection.DEBIT.wire }.sumOf { it.amountMinor },
        items.filter { it.direction == MoneyDirection.CREDIT.wire }.sumOf { it.amountMinor })
    }
    val weekdays = (1..7).map { dow ->
      val items = debits.filter { localDate(it.receivedAt).dayOfWeek.value == dow }
      MoneyBucket(java.time.DayOfWeek.of(dow).name.take(3).lowercase().replaceFirstChar { it.uppercase() }, items.sumOf { it.amountMinor }, items.size)
    }
    val dayparts = listOf("Morning" to 5..11, "Afternoon" to 12..16, "Evening" to 17..20, "Night" to (21..28)).map { (label, hours) ->
      val items = debits.filter { row ->
        val hour = java.time.Instant.ofEpochMilli(row.receivedAt).atZone(zone).hour
        hour in hours || (label == "Night" && hour < 5)
      }
      MoneyBucket(label, items.sumOf { it.amountMinor }, items.size)
    }
    val spent = debits.sumOf { it.amountMinor }
    val busiest = daily.maxByOrNull { it.outMinor }?.takeIf { it.outMinor > 0 }
    val frequent = debits.filter { it.merchant != null }.groupBy { it.merchant!! }.maxByOrNull { it.value.size }?.takeIf { it.value.size >= 2 }
    val small = debits.filter { it.amountMinor <= 20_000 }
    val weekend = debits.filter { localDate(it.receivedAt).dayOfWeek.value >= 6 }.sumOf { it.amountMinor }
    val today = localDate(now)
    val monthProjection = if (firstDay.dayOfMonth == 1 && firstDay.month == today.month && firstDay.year == today.year && today.dayOfMonth >= 3 && spent > 0) {
      spent / today.dayOfMonth * today.lengthOfMonth()
    } else null

    MoneyAnalytics(
      from = from, to = to, currency = currency,
      spentMinor = spent, receivedMinor = credits.sumOf { it.amountMinor },
      debitCount = debits.size, creditCount = credits.size,
      previousSpentMinor = previous.filter { it.direction == MoneyDirection.DEBIT.wire }.sumOf { it.amountMinor },
      previousReceivedMinor = previous.filter { it.direction == MoneyDirection.CREDIT.wire }.sumOf { it.amountMinor },
      spendCategories = categoryBreakdown(debits), incomeCategories = categoryBreakdown(credits),
      daily = daily, weekdays = weekdays, dayparts = dayparts,
      topMerchants = buckets(debits) { it.merchant ?: "Not named in alert" }.take(8),
      topSources = buckets(credits) { it.merchant ?: "Not named in alert" }.take(6),
      biggest = debits.maxByOrNull { it.amountMinor },
      busiestDay = busiest,
      mostFrequent = frequent?.let { MoneyBucket(it.key, it.value.sumOf { row -> row.amountMinor }, it.value.size) },
      smallSpends = MoneyBucket("small", small.sumOf { it.amountMinor }, small.size),
      weekendShare = if (spent > 0) weekend.toDouble() / spent else 0.0,
      projectedMonthSpentMinor = monthProjection,
      recent = rows.take(40),
      otherCurrencies = all.filter { it.currency != currency && it.receivedAt >= from }.map { it.currency }.distinct(),
    )
  }

  /** Recategorise one payment; optionally remember the choice for every payment to the same place. */
  fun setMoneyCategory(eventId: Long, category: String, applyToMerchant: Boolean) = synchronized(connection) {
    require(category in MoneyCategorizer.SPEND_CATEGORIES || category in MoneyCategorizer.INCOME_CATEGORIES) { "Unknown category" }
    transaction {
      execute("UPDATE notification_insights SET category_override = ? WHERE event_id = ?", category, eventId)
      val merchantKey = scalarText("SELECT merchant_key FROM notification_insights WHERE event_id = ?", eventId)
      if (applyToMerchant && merchantKey != null) {
        val rules = JSONObject(merchantCategoryRules())
        rules.put(merchantKey, category)
        execute("INSERT OR REPLACE INTO app_preferences(key, value) VALUES ('merchant_categories_v1', ?)", rules.toString())
        execute("UPDATE notification_insights SET category_override = NULL WHERE merchant_key = ? AND event_id != ?", merchantKey, eventId)
      }
    }
  }

  fun upcomingActions(now: Long = System.currentTimeMillis()): List<UpcomingAction> = synchronized(connection) {
    val result = mutableListOf<UpcomingAction>()
    connection.prepare(
      "SELECT i.event_id, i.action_kind, i.due_at, i.due_has_time, i.action_amount_minor, i.action_currency, i.reminder_at, i.reminder_status, i.merchant, " +
        "e.package_name, e.title, e.body, e.received_at FROM notification_insights i JOIN notification_events e ON e.id = i.event_id " +
        "WHERE i.action_kind IS NOT NULL AND i.dismissed = 0 AND i.due_at >= ? ORDER BY i.due_at ASC, e.received_at DESC LIMIT 100",
    ).use { statement ->
      statement.bindLong(1, now - 3 * MILLIS_PER_DAY)
      while (statement.step()) result += UpcomingAction(
        statement.getLong(0), statement.getText(1), statement.getLong(2), statement.getLong(3) == 1L,
        if (statement.getColumnType(4) == SQLITE_NULL) null else statement.getLong(4), statement.nullableText(5),
        if (statement.getColumnType(6) == SQLITE_NULL) null else statement.getLong(6), statement.nullableText(7), statement.nullableText(8),
        statement.getText(9), statement.nullableText(10), statement.nullableText(11), statement.getLong(12),
      )
    }
    // Repeated notifications about the same item (same app, kind, day and title) collapse to the newest.
    result.distinctBy { listOf(it.packageName, it.kind, it.dueAt / MILLIS_PER_DAY, (it.title ?: it.body ?: "").lowercase().take(60)) }.take(50)
  }

  /** Merchants paid repeatedly at a steady amount and interval, plus explicitly flagged subscriptions. */
  fun recurringPayments(now: Long = System.currentTimeMillis()): List<RecurringPayment> = synchronized(connection) {
    val rows = mutableListOf<Triple<String, Long, Pair<Long, Boolean>>>()
    val names = mutableMapOf<String, String>()
    val currencies = mutableMapOf<String, String>()
    connection.prepare(
      "SELECT i.merchant_key, i.merchant, i.amount_minor, i.currency, e.received_at, i.subscription FROM notification_insights i JOIN notification_events e ON e.id = i.event_id " +
        "WHERE i.amount_minor IS NOT NULL AND i.direction = 'debit' AND i.dismissed = 0 AND i.merchant_key IS NOT NULL AND e.received_at >= ? ORDER BY e.received_at ASC",
    ).use { statement ->
      statement.bindLong(1, now - 400 * MILLIS_PER_DAY)
      while (statement.step()) {
        val key = statement.getText(0)
        names[key] = statement.getText(1)
        currencies[key] = statement.getText(3)
        rows += Triple(key, statement.getLong(2), statement.getLong(4) to (statement.getLong(5) == 1L))
      }
    }
    rows.groupBy { it.first }.mapNotNull { (key, list) ->
      val flagged = list.any { it.third.second }
      val amounts = list.map { it.second }.sorted()
      val median = amounts[amounts.size / 2]
      val steady = list.filter { kotlin.math.abs(it.second - median) <= median / 10 }
      val times = steady.map { it.third.first }.sorted()
      val gaps = times.zipWithNext { a, b -> (b - a) / MILLIS_PER_DAY }.filter { it > 0 }.sorted()
      val gap = gaps.getOrNull(gaps.size / 2)
      val cadence = when (gap) {
        null -> null
        in 6L..8L -> "weekly"
        in 25L..35L -> "monthly"
        in 85L..95L -> "quarterly"
        in 355L..375L -> "yearly"
        else -> null
      }
      if (cadence == null && !flagged) return@mapNotNull null
      if (cadence != null && steady.size < 2) return@mapNotNull null
      val last = (if (cadence != null) times.last() else list.maxOf { it.third.first })
      RecurringPayment(names.getValue(key), if (cadence != null) median else list.last().second, currencies.getValue(key), cadence ?: "subscription", last,
        cadence?.let { last + gap!! * MILLIS_PER_DAY }, if (cadence != null) steady.size else list.size)
    }.sortedBy { it.nextExpectedAt ?: Long.MAX_VALUE }
  }

  fun dismissInsight(eventId: Long) = synchronized(connection) {
    UserReminderScheduler.cancel(context, eventId, insight = true)
    execute("UPDATE notification_insights SET dismissed = 1, reminder_at = NULL, reminder_status = NULL WHERE event_id = ?", eventId)
  }

  fun setInsightReminder(eventId: Long, at: Long): String = synchronized(connection) {
    val status = if (context != null && UserReminderScheduler.schedule(context, eventId, at, insight = true)) "pending" else "permission_missing"
    execute("UPDATE notification_insights SET reminder_at = ?, reminder_status = ? WHERE event_id = ?", at, status, eventId)
    status
  }

  fun clearInsightReminder(eventId: Long) = synchronized(connection) {
    UserReminderScheduler.cancel(context, eventId, insight = true)
    execute("UPDATE notification_insights SET reminder_at = NULL, reminder_status = NULL WHERE event_id = ?", eventId)
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
      .put("groups", org.json.JSONArray(result.groups))
      .put("reminderAfterMinutes", result.reminderAfterMinutes ?: JSONObject.NULL).toString()
  }

  fun setExcluded(packageName: String, excluded: Boolean) = synchronized(connection) {
    transaction {
      if (excluded) execute("INSERT OR REPLACE INTO app_preferences(key, value) VALUES (?, '1')", "excluded:$packageName")
      else execute("DELETE FROM app_preferences WHERE key = ?", "excluded:$packageName")
      if (excluded) {
        cancelReminders("SELECT id FROM notification_events WHERE package_name = ?", packageName)
        execute("DELETE FROM notification_events WHERE package_name = ?", packageName)
      }
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
      val analysis = NotificationAnalyzer.analyze(item.title, item.body, item.subtext)
      saveAnalysis(id, analysis)
      saveInsight(id, InsightExtractor.extract(item.title, item.body, item.receivedAt))
      if (existingId == null) applyUserRules(id, item, analysis)
      val newGroupKey = duplicateGroupKey(item)
      if (hasFingerprintColumn()) execute("UPDATE notification_events SET content_fingerprint = ? WHERE id = ?", newGroupKey?.fingerprint, id)
      if (oldGroupKey != null && oldGroupKey != newGroupKey) rebuildDuplicateGroup(oldGroupKey)
      if (newGroupKey != null) rebuildDuplicateGroup(newGroupKey)
    }
  }

  fun deleteActive(packageName: String, key: String) = synchronized(connection) {
    transaction {
      cancelReminders("SELECT id FROM notification_events WHERE package_name = ? AND notification_key = ? AND removed_at IS NULL", packageName, key)
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
    if (filters.id > 0) { where += "e.id = ?"; args += filters.id }
    if (filters.packageName.isNotBlank()) { where += "e.package_name = ?"; args += filters.packageName.trim() }
    if (filters.category.isNotBlank()) { where += "COALESCE(a.category_override, rr.category, a.category) = ?"; args += filters.category }
    if (filters.groupName.isNotBlank()) { where += "instr(COALESCE(rr.groups_json, '[]'), ?) > 0"; args += JSONObject.quote(filters.groupName.trim()) }
    if (filters.from > 0) { where += "e.received_at >= ?"; args += filters.from }
    if (filters.to > 0) { where += "e.received_at < ?"; args += filters.to }
    if (!filters.includeArchived) where += "e.archived_at IS NULL"
    if (filters.beforeReceivedAt > 0 && filters.beforeId > 0) {
      where += "(e.received_at < ? OR (e.received_at = ? AND e.id < ?))"
      args += filters.beforeReceivedAt; args += filters.beforeReceivedAt; args += filters.beforeId
    }
    args += filters.limit.coerceIn(1, 100)
    val sql = "SELECT e.id, e.package_name, e.title, e.body, e.subtext, e.posted_at, e.received_at, e.removed_at, e.is_saved, e.archived_at, " +
    "COALESCE(a.category_override, rr.category, a.category), COALESCE(a.priority_override, a.priority), a.confidence, a.explanation, a.method, a.version, a.category_override, m.group_id, " +
      "CASE WHEN m.group_id IS NULL THEN 1 ELSE (SELECT COUNT(*) FROM duplicate_group_members gm WHERE gm.group_id = m.group_id) END, rr.include_in_digest, rr.important, rr.groups_json, rr.matched_rule_ids_json, rr.reminder_due_at, rr.reminder_status " +
      "FROM notification_events e LEFT JOIN notification_analysis a ON a.event_id = e.id LEFT JOIN notification_rule_results rr ON rr.event_id = e.id LEFT JOIN duplicate_group_members m ON m.event_id = e.id ${if (where.isEmpty()) "" else "WHERE ${where.joinToString(" AND ")}"} " +
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
      "SELECT COALESCE(a.category_override, rr.category, a.category), COUNT(*) FROM notification_events e LEFT JOIN notification_analysis a ON a.event_id=e.id LEFT JOIN notification_rule_results rr ON rr.event_id=e.id WHERE e.received_at >= ? AND e.received_at < ? GROUP BY COALESCE(a.category_override, rr.category, a.category) ORDER BY COUNT(*) DESC, 1 ASC",
      start, end,
    )
    val apps = overviewCounts(
      "SELECT package_name, COUNT(*) FROM notification_events WHERE received_at >= ? AND received_at < ? GROUP BY package_name ORDER BY COUNT(*) DESC, package_name ASC LIMIT 5",
      start, end,
    )
    val hours = overviewCounts(
      "SELECT strftime('%H:00', received_at / 1000, 'unixepoch', 'localtime'), COUNT(*) FROM notification_events WHERE received_at >= ? AND received_at < ? GROUP BY 1 ORDER BY COUNT(*) DESC, 1 ASC LIMIT 24",
      start, end,
    )
    val sources = notifications(NotificationFilters(from = start, to = end, includeArchived = true, limit = 5))
    DailyOverviewResult(start, end, total, appCount, categories, apps, hours, sources)
  }

  fun setSaved(id: Long, saved: Boolean) = synchronized(connection) {
    execute("UPDATE notification_events SET is_saved = ?, saved_override = ? WHERE id = ?", if (saved) 1L else 0L, if (saved) 1L else 0L, id)
  }

  fun setArchived(id: Long, archived: Boolean, now: Long = System.currentTimeMillis()) = synchronized(connection) {
    if (archived) execute("UPDATE notification_events SET archived_at = ? WHERE id = ?", now, id)
    else execute("UPDATE notification_events SET archived_at = NULL WHERE id = ?", id)
  }

  fun delete(id: Long) = synchronized(connection) { transaction { UserReminderScheduler.cancel(context, id); UserReminderScheduler.cancel(context, id, insight = true); execute("DELETE FROM notification_events WHERE id = ?", id); cleanupDuplicateGroups() } }

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

  fun clear() = synchronized(connection) {
    transaction { cancelReminders("SELECT id FROM notification_events"); connection.execSQL("DELETE FROM notification_events"); cleanupDuplicateGroups(); connection.execSQL("DELETE FROM app_directory"); connection.execSQL("DELETE FROM listener_gaps") }
    context?.let { AppIconCache.clear(it) }
  }

  private fun cancelReminders(sql: String, vararg values: Any?) {
    connection.prepare(sql).use { statement ->
      values.forEachIndexed { index, value -> statement.bindValue(index + 1, value) }
      while (statement.step()) {
        UserReminderScheduler.cancel(context, statement.getLong(0))
        UserReminderScheduler.cancel(context, statement.getLong(0), insight = true)
      }
    }
  }

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
    cancelReminders("SELECT id FROM notification_events WHERE received_at < ? AND is_saved = 0", cutoff)
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

  private var fingerprintColumn: Boolean? = null

  /** False only while running pre-v9 migrations (v4 backfill) before the column exists. */
  private fun hasFingerprintColumn(): Boolean = fingerprintColumn ?: connection.prepare("PRAGMA table_info(notification_events)").use { statement ->
    var found = false
    while (statement.step()) if (statement.getText(1) == "content_fingerprint") found = true
    found
  }.also { if (it) fingerprintColumn = true }

  private fun backfillFingerprints() {
    fingerprintColumn = true
    val rows = mutableListOf<Pair<Long, String?>>()
    connection.prepare("SELECT id, package_name, notification_key, title, body, subtext, posted_at, received_at FROM notification_events").use { s ->
      while (s.step()) {
        val item = CapturedNotification(NotificationIdentity(s.getText(1), s.getText(2)), s.nullableText(3), s.nullableText(4), s.nullableText(5), s.getLong(6), s.getLong(7))
        rows += s.getLong(0) to duplicateGroupKey(item)?.fingerprint
      }
    }
    rows.forEach { (id, fingerprint) -> execute("UPDATE notification_events SET content_fingerprint = ? WHERE id = ?", fingerprint, id) }
  }

  // ---- encrypted backup support -------------------------------------------------------------

  /** Consistent single-file copy of the whole database (used as the backup payload). */
  fun snapshotTo(target: File) = synchronized(connection) {
    target.delete()
    connection.execSQL("VACUUM INTO '${target.absolutePath.replace("'", "''")}'")
  }

  fun eventCount(): Long = synchronized(connection) { scalarLong("SELECT COUNT(*) FROM notification_events") ?: 0L }

  /**
   * Replaces all NotifyIQ data with a backup copy. [source] must already be opened through
   * NotificationRepository(source) so it is migrated to this schema version.
   */
  fun replaceWith(source: File): Long = synchronized(connection) {
    cancelReminders("SELECT id FROM notification_events")
    val path = source.absolutePath.replace("'", "''")
    connection.execSQL("ATTACH DATABASE '$path' AS src")
    try {
      transaction {
        connection.execSQL("DELETE FROM notification_events")
        connection.execSQL("DELETE FROM duplicate_groups")
        connection.execSQL("DELETE FROM app_directory")
        connection.execSQL("DELETE FROM app_preferences")
        connection.execSQL("INSERT INTO app_preferences SELECT * FROM src.app_preferences")
        connection.execSQL("INSERT INTO notification_events SELECT * FROM src.notification_events")
        connection.execSQL("INSERT INTO notification_analysis SELECT * FROM src.notification_analysis")
        connection.execSQL("INSERT INTO notification_rule_results SELECT * FROM src.notification_rule_results")
        connection.execSQL("INSERT INTO notification_insights SELECT * FROM src.notification_insights")
        connection.execSQL("INSERT INTO duplicate_groups SELECT * FROM src.duplicate_groups")
        connection.execSQL("INSERT INTO duplicate_group_members SELECT * FROM src.duplicate_group_members")
        // Icon files belong to the old device; labels are kept and icons regenerate on new captures.
        connection.execSQL("INSERT INTO app_directory(package_name, label, icon_file, updated_at) SELECT package_name, label, NULL, updated_at FROM src.app_directory")
      }
    } finally {
      connection.execSQL("DETACH DATABASE src")
    }
    connection.execSQL("INSERT INTO notification_events_fts(notification_events_fts) VALUES ('rebuild')")
    context?.let { ctx ->
      pendingReminders().forEach { (id, at) -> if (!UserReminderScheduler.schedule(ctx, id, at)) markReminderUnavailable(id) }
      pendingInsightReminders().forEach { (id, at) -> if (!UserReminderScheduler.schedule(ctx, id, at, insight = true)) markReminderUnavailable(id, insight = true) }
    }
    eventCount()
  }

  // ---- app directory (labels and icons of apps that posted captured notifications) -------

  fun recordApp(packageName: String, label: String, iconFile: String?) = synchronized(connection) {
    execute(
      "INSERT INTO app_directory(package_name, label, icon_file, updated_at) VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(package_name) DO UPDATE SET label = excluded.label, icon_file = COALESCE(excluded.icon_file, app_directory.icon_file), updated_at = excluded.updated_at",
      packageName, label, iconFile, System.currentTimeMillis(),
    )
  }

  /** Last time the listener was known to be connected (null after access was turned off). */
  fun listenerAliveAt(): Long? = synchronized(connection) {
    scalarText("SELECT value FROM app_preferences WHERE key = 'listener_alive_at'")?.toLongOrNull()
  }

  fun setListenerAliveAt(at: Long?) = synchronized(connection) {
    if (at == null) execute("DELETE FROM app_preferences WHERE key = 'listener_alive_at'")
    else execute("INSERT OR REPLACE INTO app_preferences(key, value) VALUES ('listener_alive_at', ?)", at.toString())
  }

  /** posted_at of the stored, still-active copy of a notification, or null if none is stored. */
  fun storedPostedAt(packageName: String, key: String): Long? = synchronized(connection) {
    scalarLong("SELECT posted_at FROM notification_events WHERE package_name = ? AND notification_key = ? AND removed_at IS NULL", packageName, key)
  }

  fun recordListenerGap(startedAt: Long, endedAt: Long, recovered: Int, exact: Boolean) = synchronized(connection) {
    transaction {
      execute("INSERT INTO listener_gaps(started_at, ended_at, recovered, exact) VALUES (?, ?, ?, ?)", startedAt, endedAt, recovered.toLong(), if (exact) 1L else 0L)
      execute("DELETE FROM listener_gaps WHERE ended_at < ?", System.currentTimeMillis() - GAP_HISTORY_MS)
    }
  }

  fun listenerGaps(sinceMs: Long): List<ListenerGap> = synchronized(connection) {
    val gaps = mutableListOf<ListenerGap>()
    connection.prepare("SELECT id, started_at, ended_at, recovered, exact, seen FROM listener_gaps WHERE ended_at >= ? ORDER BY ended_at DESC LIMIT 50").use { s ->
      s.bindLong(1, sinceMs)
      while (s.step()) gaps += ListenerGap(s.getLong(0), s.getLong(1), s.getLong(2), s.getLong(3).toInt(), s.getLong(4) == 1L, s.getLong(5) == 1L)
    }
    gaps
  }

  fun markListenerGapsSeen() = synchronized(connection) { execute("UPDATE listener_gaps SET seen = 1 WHERE seen = 0") }

  fun appDirectory(): List<AppDirectoryEntry> = synchronized(connection) {
    val entries = mutableListOf<AppDirectoryEntry>()
    connection.prepare("SELECT package_name, label, icon_file FROM app_directory ORDER BY label COLLATE NOCASE").use { s ->
      while (s.step()) entries += AppDirectoryEntry(s.getText(0), s.getText(1), s.nullableText(2))
    }
    entries
  }

  private fun rebuildDuplicateGroup(key: DuplicateGroupKey) {
    execute("DELETE FROM duplicate_groups WHERE package_name = ? AND content_fingerprint = ? AND window_start = ?", key.packageName, key.fingerprint, key.windowStart)
    val eventIds = mutableListOf<Long>()
    if (hasFingerprintColumn()) {
      connection.prepare("SELECT id FROM notification_events WHERE package_name = ? AND content_fingerprint = ? AND received_at >= ? AND received_at < ?").use { statement ->
        statement.bindText(1, key.packageName); statement.bindText(2, key.fingerprint)
        statement.bindLong(3, key.windowStart); statement.bindLong(4, key.windowStart + DUPLICATE_WINDOW_MILLIS)
        while (statement.step()) eventIds += statement.getLong(0)
      }
    } else connection.prepare("SELECT id, title, body, subtext FROM notification_events WHERE package_name = ? AND received_at >= ? AND received_at < ?").use { statement ->
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

  private fun scalarText(sql: String, value: Any?): String? = connection.prepare(sql).use { statement ->
    statement.bindValue(1, value)
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
    includeInDigest = nullableLong(19)?.let { it == 1L }, important = nullableLong(20)?.let { it == 1L },
    ruleGroups = jsonArrayStrings(21), matchedRuleIds = jsonArrayStrings(22), reminderDueAt = nullableLong(23), reminderStatus = nullableText(24),
  )

  private fun SQLiteStatement.nullableText(index: Int): String? = if (getColumnType(index) == SQLITE_NULL) null else getText(index)
  private fun SQLiteStatement.nullableLong(index: Int): Long? = if (getColumnType(index) == SQLITE_NULL) null else getLong(index)
  private fun SQLiteStatement.jsonArrayStrings(index: Int): List<String> = nullableText(index)?.let { raw ->
    runCatching { org.json.JSONArray(raw).let { array -> (0 until array.length()).map(array::getString) } }.getOrDefault(emptyList())
  } ?: emptyList()

  companion object {
    private const val DB_NAME = "notifyiq.db"
    private const val SCHEMA_VERSION = 10
    private const val GAP_HISTORY_MS = 30L * 24 * 60 * 60 * 1000
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

    /** Closes a cached connection to a temporary database (backup import) before the file is deleted. */
    @Synchronized internal fun release(file: File) {
      connections.remove(file.absolutePath)?.let { runCatching { it.close() } }
    }
  }
}
