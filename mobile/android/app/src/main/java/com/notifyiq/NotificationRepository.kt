package com.notifyiq

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

internal class NotificationRepository(context: Context) : SQLiteOpenHelper(context, "notifyiq.db", null, 1) {
  init { setWriteAheadLoggingEnabled(true) }

  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL("CREATE TABLE app_preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)")
    db.execSQL("CREATE TABLE notification_events (id INTEGER PRIMARY KEY AUTOINCREMENT, package_name TEXT NOT NULL, notification_key TEXT NOT NULL, title TEXT, body TEXT, subtext TEXT, posted_at INTEGER NOT NULL, received_at INTEGER NOT NULL, removed_at INTEGER)")
    db.execSQL("CREATE UNIQUE INDEX idx_active_event ON notification_events(package_name, notification_key) WHERE removed_at IS NULL")
    db.execSQL("CREATE INDEX idx_events_received ON notification_events(received_at DESC)")
  }

  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    throw IllegalStateException("A versioned database migration is required before opening this schema.")
  }

  fun getExcludedPackages(): Set<String> {
    val values = mutableSetOf<String>()
    readableDatabase.rawQuery("SELECT substr(key, 10) FROM app_preferences WHERE key LIKE 'excluded:%' AND value = '1'", null).use { c ->
      while (c.moveToNext()) values += c.getString(0)
    }
    return values
  }

  fun setExcluded(packageName: String, excluded: Boolean) {
    writableDatabase.beginTransaction()
    try {
      val key = "excluded:$packageName"
      if (excluded) writableDatabase.insertWithOnConflict("app_preferences", null,
        ContentValues().apply { put("key", key); put("value", "1") }, SQLiteDatabase.CONFLICT_REPLACE)
      else writableDatabase.delete("app_preferences", "key = ?", arrayOf(key))
      if (excluded) writableDatabase.delete("notification_events", "package_name = ?", arrayOf(packageName))
      writableDatabase.setTransactionSuccessful()
    } finally { writableDatabase.endTransaction() }
  }

  fun upsert(item: CapturedNotification) {
    val values = ContentValues().apply {
      put("package_name", item.identity.packageName); put("notification_key", item.identity.notificationKey)
      put("title", item.title); put("body", item.body); put("subtext", item.subtext)
      put("posted_at", item.postedAt); put("received_at", item.receivedAt); putNull("removed_at")
    }
    writableDatabase.insertWithOnConflict("notification_events", null, values, SQLiteDatabase.CONFLICT_REPLACE)
  }

  fun deleteActive(packageName: String, key: String) {
    writableDatabase.delete("notification_events", "package_name = ? AND notification_key = ? AND removed_at IS NULL", arrayOf(packageName, key))
  }

  fun markRemoved(packageName: String, key: String, at: Long) {
    writableDatabase.execSQL("UPDATE notification_events SET removed_at = ? WHERE package_name = ? AND notification_key = ? AND removed_at IS NULL", arrayOf<Any>(at, packageName, key))
  }

  fun recent(limit: Int): List<NotificationRecord> {
    val records = mutableListOf<NotificationRecord>()
    readableDatabase.rawQuery("SELECT id, package_name, title, body, received_at, removed_at FROM notification_events ORDER BY received_at DESC LIMIT ?", arrayOf(limit.coerceIn(1, 200).toString())).use { c ->
      while (c.moveToNext()) records += NotificationRecord(c.getLong(0).toString(), c.getString(1), c.getString(2), c.getString(3), c.getLong(4), if (c.isNull(5)) null else c.getLong(5))
    }
    return records
  }

  fun clear() = writableDatabase.delete("notification_events", null, null).let { Unit }
}
