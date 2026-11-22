package com.notifyiq

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import android.app.NotificationManager
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = NotifyIQModule.NAME)
class NotifyIQModule(
  private val appContext: ReactApplicationContext,
) : NativeNotifyIQSpec(appContext) {
  private class PendingBackup(val export: Boolean, val password: CharArray, val promise: Promise)
  @Volatile private var pendingBackup: PendingBackup? = null

  private val backupListener = object : com.facebook.react.bridge.BaseActivityEventListener() {
    override fun onActivityResult(activity: android.app.Activity, requestCode: Int, resultCode: Int, data: Intent?) {
      if (requestCode != REQUEST_EXPORT && requestCode != REQUEST_IMPORT) return
      val pending = pendingBackup ?: return
      pendingBackup = null
      val uri = data?.data
      if (resultCode != android.app.Activity.RESULT_OK || uri == null) {
        pending.password.fill('\u0000')
        pending.promise.resolve(Arguments.createMap().apply { putString("status", "cancelled"); putDouble("count", 0.0) })
        return
      }
      Thread { if (pending.export) runExport(uri, pending) else runImport(uri, pending) }.start()
    }
  }

  init { appContext.addActivityEventListener(backupListener) }

  @ReactMethod
  override fun getListenerStatus(promise: Promise) {
    try {
      val listener = ComponentName(appContext, NotifyIQNotificationListener::class.java)
      val notificationManager = appContext.getSystemService(NotificationManager::class.java)
      val granted = notificationManager.isNotificationListenerAccessGranted(listener)
      val connected = granted && NotificationListenerRuntimeState.probeConnected()
      // Cheap, rate-limited nudge; the full repair ladder runs from reconnectListener and app start.
      if (granted && !connected) ListenerHealth.requestRebind(appContext)
      ListenerHealth.schedulePeriodicCheck(appContext)
      val status = Arguments.createMap().apply {
        putBoolean("accessGranted", granted)
        putBoolean("connected", connected)
        if (NotificationListenerRuntimeState.lastErrorCode == null) putNull("lastErrorCode") else putString("lastErrorCode", NotificationListenerRuntimeState.lastErrorCode)
      }
      promise.resolve(status)
    } catch (error: Exception) {
      Log.e(NAME, "LISTENER_STATUS_UNAVAILABLE ${error.javaClass.simpleName}")
      promise.reject("LISTENER_STATUS_UNAVAILABLE", "Unable to read notification access status.")
    }
  }

  @ReactMethod
  override fun getRecentNotifications(limit: Double, promise: Promise) {
    try {
      val items = NotificationRepository(appContext).notifications(NotificationFilters(limit = limit.toInt()))
      promise.resolve(toWritableArray(items))
    } catch (_: Exception) { promise.reject("HISTORY_UNAVAILABLE", "Notification history is unavailable.") }
  }

  @ReactMethod
  override fun getDailyOverview(promise: Promise) {
    try {
      val overview = NotificationRepository(appContext).dailyOverview()
      val result = Arguments.createMap().apply {
        putDouble("dayStart", overview.dayStart.toDouble())
        putDouble("dayEnd", overview.dayEnd.toDouble())
        putInt("totalCount", overview.totalCount)
        putInt("appCount", overview.appCount)
        putArray("categories", toOverviewCounts(overview.categories))
        putArray("apps", toOverviewCounts(overview.apps))
        putArray("hours", toOverviewCounts(overview.hours))
        putArray("sources", toWritableArray(overview.sources))
      }
      promise.resolve(result)
    } catch (_: Exception) { promise.reject("OVERVIEW_UNAVAILABLE", "The local daily overview is unavailable.") }
  }

  @ReactMethod
  override fun getMoneySummary(from: Double, to: Double, promise: Promise) {
    try {
      val summary = NotificationRepository(appContext).moneySummary(from.toLong(), to.toLong())
      fun buckets(items: List<MoneyBucket>) = Arguments.createArray().apply {
        items.forEach { bucket -> pushMap(Arguments.createMap().apply {
          putString("label", bucket.label); putDouble("amountMinor", bucket.amountMinor.toDouble()); putInt("count", bucket.count)
        }) }
      }
      promise.resolve(Arguments.createMap().apply {
        putDouble("from", summary.from.toDouble()); putDouble("to", summary.to.toDouble())
        putString("currency", summary.currency)
        putDouble("spentMinor", summary.spentMinor.toDouble()); putDouble("receivedMinor", summary.receivedMinor.toDouble())
        putInt("debitCount", summary.debitCount); putInt("creditCount", summary.creditCount)
        putArray("merchants", buckets(summary.merchants)); putArray("categories", buckets(summary.categories))
        putArray("recent", Arguments.createArray().apply {
          summary.recent.forEach { row -> pushMap(Arguments.createMap().apply {
            putDouble("eventId", row.eventId.toDouble()); putDouble("amountMinor", row.amountMinor.toDouble())
            putString("currency", row.currency); putString("direction", row.direction)
            if (row.merchant == null) putNull("merchant") else putString("merchant", row.merchant)
            putString("category", row.category); putDouble("receivedAt", row.receivedAt.toDouble())
            putString("packageName", row.packageName); putBoolean("subscription", row.subscription)
          }) }
        })
        putArray("otherCurrencies", Arguments.createArray().apply { summary.otherCurrencies.forEach(::pushString) })
      })
    } catch (_: Exception) { promise.reject("MONEY_UNAVAILABLE", "The local money summary is unavailable.") }
  }

  private fun moneyRowMap(row: MoneyRow) = Arguments.createMap().apply {
    putDouble("eventId", row.eventId.toDouble()); putDouble("amountMinor", row.amountMinor.toDouble())
    putString("currency", row.currency); putString("direction", row.direction)
    if (row.merchant == null) putNull("merchant") else putString("merchant", row.merchant)
    putString("category", row.category); putDouble("receivedAt", row.receivedAt.toDouble())
    putString("packageName", row.packageName); putBoolean("subscription", row.subscription); putBoolean("categoryEdited", row.categoryEdited)
  }

  private fun bucketArray(items: List<MoneyBucket>) = Arguments.createArray().apply {
    items.forEach { bucket -> pushMap(Arguments.createMap().apply {
      putString("label", bucket.label); putDouble("amountMinor", bucket.amountMinor.toDouble()); putInt("count", bucket.count)
    }) }
  }

  @ReactMethod
  override fun getMoneyAnalytics(from: Double, to: Double, promise: Promise) {
    try {
      val a = NotificationRepository(appContext).moneyAnalytics(from.toLong(), to.toLong())
      fun breakdown(items: List<MoneyCategoryBreakdown>) = Arguments.createArray().apply {
        items.forEach { item -> pushMap(Arguments.createMap().apply {
          putString("category", item.category); putDouble("amountMinor", item.amountMinor.toDouble()); putInt("count", item.count)
          putArray("topMerchants", bucketArray(item.topMerchants))
        }) }
      }
      fun day(d: MoneyDay) = Arguments.createMap().apply {
        putDouble("dayStart", d.dayStart.toDouble()); putDouble("outMinor", d.outMinor.toDouble()); putDouble("inMinor", d.inMinor.toDouble())
      }
      promise.resolve(Arguments.createMap().apply {
        putDouble("from", a.from.toDouble()); putDouble("to", a.to.toDouble()); putString("currency", a.currency)
        putDouble("spentMinor", a.spentMinor.toDouble()); putDouble("receivedMinor", a.receivedMinor.toDouble())
        putInt("debitCount", a.debitCount); putInt("creditCount", a.creditCount)
        putDouble("previousSpentMinor", a.previousSpentMinor.toDouble()); putDouble("previousReceivedMinor", a.previousReceivedMinor.toDouble())
        putArray("spendCategories", breakdown(a.spendCategories)); putArray("incomeCategories", breakdown(a.incomeCategories))
        putArray("daily", Arguments.createArray().apply { a.daily.forEach { pushMap(day(it)) } })
        putArray("weekdays", bucketArray(a.weekdays)); putArray("dayparts", bucketArray(a.dayparts))
        putArray("topMerchants", bucketArray(a.topMerchants)); putArray("topSources", bucketArray(a.topSources))
        if (a.biggest == null) putNull("biggest") else putMap("biggest", moneyRowMap(a.biggest))
        if (a.busiestDay == null) putNull("busiestDay") else putMap("busiestDay", day(a.busiestDay))
        if (a.mostFrequent == null) putNull("mostFrequent") else putMap("mostFrequent", Arguments.createMap().apply {
          putString("label", a.mostFrequent.label); putDouble("amountMinor", a.mostFrequent.amountMinor.toDouble()); putInt("count", a.mostFrequent.count)
        })
        putMap("smallSpends", Arguments.createMap().apply {
          putString("label", a.smallSpends.label); putDouble("amountMinor", a.smallSpends.amountMinor.toDouble()); putInt("count", a.smallSpends.count)
        })
        putDouble("weekendShare", a.weekendShare)
        if (a.projectedMonthSpentMinor == null) putNull("projectedMonthSpentMinor") else putDouble("projectedMonthSpentMinor", a.projectedMonthSpentMinor.toDouble())
        putArray("recent", Arguments.createArray().apply { a.recent.forEach { pushMap(moneyRowMap(it)) } })
        putArray("otherCurrencies", Arguments.createArray().apply { a.otherCurrencies.forEach(::pushString) })
      })
    } catch (_: Exception) { promise.reject("MONEY_UNAVAILABLE", "Money insights are unavailable.") }
  }

  @ReactMethod
  override fun setMoneyCategory(eventId: Double, category: String, applyToMerchant: Boolean, promise: Promise) {
    try { NotificationRepository(appContext).setMoneyCategory(eventId.toLong(), category, applyToMerchant); promise.resolve(null) }
    catch (_: Exception) { promise.reject("INSIGHT_UPDATE_FAILED", "The category could not be changed.") }
  }

  private val uiPrefs get() = appContext.getSharedPreferences("notifyiq_ui", android.content.Context.MODE_PRIVATE)
  private val allowedUiKeys = setOf("theme", "onboarding_done")

  @ReactMethod
  override fun getUiPreference(key: String, promise: Promise) {
    if (key !in allowedUiKeys) { promise.reject("UNKNOWN_PREFERENCE", "Unknown preference."); return }
    promise.resolve(uiPrefs.getString(key, null))
  }

  @ReactMethod
  override fun setUiPreference(key: String, value: String, promise: Promise) {
    if (key !in allowedUiKeys || value.length > 32) { promise.reject("UNKNOWN_PREFERENCE", "Unknown preference."); return }
    uiPrefs.edit().putString(key, value).apply()
    promise.resolve(null)
  }

  /** "store" when installed by Google Play, otherwise "sideload" (restricted settings may apply on Android 13+). */
  @ReactMethod
  override fun getInstallInfo(promise: Promise) {
    val installer = runCatching {
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) appContext.packageManager.getInstallSourceInfo(appContext.packageName).installingPackageName
      else @Suppress("DEPRECATION") appContext.packageManager.getInstallerPackageName(appContext.packageName)
    }.getOrNull()
    promise.resolve(Arguments.createMap().apply {
      putString("source", if (installer == "com.android.vending") "store" else "sideload")
      putInt("sdk", android.os.Build.VERSION.SDK_INT)
      putString("versionName", runCatching { appContext.packageManager.getPackageInfo(appContext.packageName, 0).versionName }.getOrNull() ?: "")
    })
  }

  @ReactMethod
  override fun openAppDetailsSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, android.net.Uri.fromParts("package", appContext.packageName, null))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      appContext.startActivity(intent)
      promise.resolve(null)
    } catch (_: Exception) { promise.reject("SETTINGS_UNAVAILABLE", "App settings could not be opened.") }
  }

  @ReactMethod
  override fun exportBackup(password: String, promise: Promise) {
    startBackup(true, password, promise, Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
      .setType("application/octet-stream")
      .putExtra(Intent.EXTRA_TITLE, "NotifyIQ-backup-" + java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.ROOT).format(java.util.Date()) + ".niqbackup"))
  }

  @ReactMethod
  override fun importBackup(password: String, promise: Promise) {
    startBackup(false, password, promise, Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*"))
  }

  private fun startBackup(export: Boolean, password: String, promise: Promise, intent: Intent) {
    if (password.length < BackupCrypto.MIN_PASSWORD_LENGTH) { promise.reject("WEAK_PASSWORD", "Use at least ${BackupCrypto.MIN_PASSWORD_LENGTH} characters."); return }
    val activity = appContext.currentActivity ?: run { promise.reject("NO_ACTIVITY", "Open NotifyIQ and try again."); return }
    if (pendingBackup != null) { promise.reject("BUSY", "A backup is already in progress."); return }
    pendingBackup = PendingBackup(export, password.toCharArray(), promise)
    runCatching { activity.startActivityForResult(intent, if (export) REQUEST_EXPORT else REQUEST_IMPORT) }
      .onFailure { pendingBackup = null; promise.reject("PICKER_UNAVAILABLE", "The file picker could not be opened.") }
  }

  private fun runExport(uri: android.net.Uri, pending: PendingBackup) {
    val snapshot = java.io.File(appContext.cacheDir, "backup-export.db")
    try {
      val repository = NotificationRepository(appContext)
      repository.snapshotTo(snapshot)
      val out = appContext.contentResolver.openOutputStream(uri, "wt") ?: throw java.io.IOException("No output")
      out.use { stream -> snapshot.inputStream().use { BackupCrypto.encrypt(pending.password, it, stream) } }
      pending.promise.resolve(Arguments.createMap().apply { putString("status", "done"); putDouble("count", repository.eventCount().toDouble()) })
    } catch (_: Exception) {
      Log.w(NAME, "BACKUP_EXPORT_FAILED")
      pending.promise.reject("EXPORT_FAILED", "The backup could not be written.")
    } finally {
      pending.password.fill('\u0000')
      deleteDatabaseFiles(snapshot)
    }
  }

  private fun runImport(uri: android.net.Uri, pending: PendingBackup) {
    val restored = java.io.File(appContext.cacheDir, "backup-import.db")
    try {
      deleteDatabaseFiles(restored)
      val input = appContext.contentResolver.openInputStream(uri) ?: throw java.io.IOException("No input")
      input.use { stream -> restored.outputStream().use { BackupCrypto.decrypt(pending.password, stream, it) } }
      // Opening runs migrations (older backups) and rejects backups from a newer app version.
      runCatching { NotificationRepository(restored) }.getOrElse { throw IllegalStateException("NEWER_OR_INVALID") }
      NotificationRepository.release(restored)
      val count = NotificationRepository(appContext).replaceWith(restored)
      NotificationListenerRuntimeState.excludedPackages = NotificationRepository(appContext).getExcludedPackages()
      NotificationListenerRuntimeState.exclusionsReady = true
      pending.promise.resolve(Arguments.createMap().apply { putString("status", "done"); putDouble("count", count.toDouble()) })
    } catch (_: BackupCrypto.WrongPasswordOrDamaged) {
      pending.promise.reject("WRONG_PASSWORD", "Wrong password, or the file is damaged.")
    } catch (_: BackupCrypto.NotABackup) {
      pending.promise.reject("NOT_A_BACKUP", "This is not a NotifyIQ backup file.")
    } catch (error: IllegalStateException) {
      pending.promise.reject("INCOMPATIBLE_BACKUP", "This backup is from a newer version of NotifyIQ or is not valid.")
    } catch (_: Exception) {
      Log.w(NAME, "BACKUP_IMPORT_FAILED")
      pending.promise.reject("IMPORT_FAILED", "The backup could not be restored.")
    } finally {
      pending.password.fill('\u0000')
      NotificationRepository.release(restored)
      deleteDatabaseFiles(restored)
    }
  }

  private fun deleteDatabaseFiles(file: java.io.File) {
    listOf("", "-wal", "-shm", "-journal").forEach { java.io.File(file.absolutePath + it).delete() }
  }


  @ReactMethod
  override fun reconnectListener(promise: Promise) {
    // Full repair ladder (see ListenerHealth); resolves once connected or after about 17 s.
    ListenerHealth.repairIfNeeded(appContext, graceMs = 1_500L) { promise.resolve(null) }
  }

  /** Opens the system battery-optimisation list (no special permission needed) so the user can exempt NotifyIQ. */
  @ReactMethod
  override fun openBatterySettings(promise: Promise) {
    val intents = listOf(
      Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS),
      Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, android.net.Uri.fromParts("package", appContext.packageName, null)),
    )
    for (intent in intents) {
      if (runCatching { appContext.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }.isSuccess) { promise.resolve(null); return }
    }
    promise.reject("SETTINGS_UNAVAILABLE", "Battery settings could not be opened.")
  }

  @ReactMethod
  override fun getNotification(id: Double, promise: Promise) {
    try {
      val items = NotificationRepository(appContext).notifications(NotificationFilters(id = id.toLong(), includeArchived = true, limit = 1))
      if (items.isEmpty()) promise.resolve(null) else promise.resolve(toWritableMap(items.first()))
    } catch (_: Exception) { promise.reject("NOTIFICATION_UNAVAILABLE", "The notification could not be loaded.") }
  }

  /** Apps with a launcher icon (via the manifest <queries> declaration), with label and cached icon. */
  @ReactMethod
  override fun getInstalledApps(promise: Promise) {
    Thread {
      try {
        val pm = appContext.packageManager
        val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val apps = pm.queryIntentActivities(launcher, 0)
          .mapNotNull { it.activityInfo?.applicationInfo }
          .distinctBy { it.packageName }
          .filter { it.packageName != appContext.packageName }
          .map { info -> Triple(info.packageName, pm.getApplicationLabel(info).toString(), info) }
          .sortedBy { it.second.lowercase() }
        promise.resolve(Arguments.createArray().apply {
          apps.forEach { (pkg, label, info) -> pushMap(Arguments.createMap().apply {
            putString("packageName", pkg); putString("label", label)
            val icon = AppIconCache.iconFor(appContext, pm, info)
            if (icon == null) putNull("iconUri") else putString("iconUri", "file://$icon")
          }) }
        })
      } catch (_: Exception) {
        Log.w(NAME, "INSTALLED_APPS_UNAVAILABLE")
        promise.reject("APPS_UNAVAILABLE", "The app list is unavailable.")
      }
    }.start()
  }

  @ReactMethod
  override fun getAppDirectory(promise: Promise) {
    try {
      promise.resolve(Arguments.createArray().apply {
        NotificationRepository(appContext).appDirectory().forEach { entry -> pushMap(Arguments.createMap().apply {
          putString("packageName", entry.packageName); putString("label", entry.label)
          val icon = entry.iconFile?.let { java.io.File(it) }?.takeIf { it.isFile }
          if (icon == null) putNull("iconUri") else putString("iconUri", "file://" + icon.absolutePath)
        }) }
      })
    } catch (_: Exception) { promise.reject("APPS_UNAVAILABLE", "App names are unavailable.") }
  }

  @ReactMethod
  override fun getSecuritySettings(promise: Promise) {
    promise.resolve(Arguments.createMap().apply {
      putBoolean("appLock", AppSecurity.appLock(appContext))
      putBoolean("deviceSecure", AppSecurity.isDeviceSecure(appContext))
    })
  }

  @ReactMethod
  override fun setAppLock(enabled: Boolean, promise: Promise) {
    if (enabled && !AppSecurity.isDeviceSecure(appContext)) {
      promise.reject("NO_DEVICE_LOCK", "Set a screen lock in Android settings first.")
      return
    }
    AppSecurity.setAppLock(appContext, enabled)
    promise.resolve(null)
  }

  @ReactMethod
  override fun authenticate(promise: Promise) {
    val activity = appContext.currentActivity ?: run { Log.w(NAME, "AUTH_NO_ACTIVITY"); promise.resolve(false); return }
    activity.runOnUiThread { AppSecurity.authenticate(activity) { ok -> promise.resolve(ok) } }
  }

  @ReactMethod
  override fun getUpcomingActions(promise: Promise) {
    try {
      promise.resolve(Arguments.createArray().apply {
        NotificationRepository(appContext).upcomingActions().forEach { item -> pushMap(Arguments.createMap().apply {
          putDouble("eventId", item.eventId.toDouble()); putString("kind", item.kind); putDouble("dueAt", item.dueAt.toDouble())
          putBoolean("hasTime", item.hasTime)
          if (item.amountMinor == null) putNull("amountMinor") else putDouble("amountMinor", item.amountMinor.toDouble())
          if (item.currency == null) putNull("currency") else putString("currency", item.currency)
          if (item.reminderAt == null) putNull("reminderAt") else putDouble("reminderAt", item.reminderAt.toDouble())
          if (item.reminderStatus == null) putNull("reminderStatus") else putString("reminderStatus", item.reminderStatus)
          putString("packageName", item.packageName)
          if (item.title == null) putNull("title") else putString("title", item.title)
          if (item.body == null) putNull("body") else putString("body", item.body)
          putDouble("receivedAt", item.receivedAt.toDouble())
        }) }
      })
    } catch (_: Exception) { promise.reject("UPCOMING_UNAVAILABLE", "Upcoming items are unavailable.") }
  }

  @ReactMethod
  override fun getRecurringPayments(promise: Promise) {
    try {
      promise.resolve(Arguments.createArray().apply {
        NotificationRepository(appContext).recurringPayments().forEach { item -> pushMap(Arguments.createMap().apply {
          putString("merchant", item.merchant); putDouble("amountMinor", item.amountMinor.toDouble()); putString("currency", item.currency)
          putString("cadence", item.cadence); putDouble("lastPaidAt", item.lastPaidAt.toDouble())
          if (item.nextExpectedAt == null) putNull("nextExpectedAt") else putDouble("nextExpectedAt", item.nextExpectedAt.toDouble())
          putInt("occurrences", item.occurrences)
        }) }
      })
    } catch (_: Exception) { promise.reject("RECURRING_UNAVAILABLE", "Recurring payments are unavailable.") }
  }

  @ReactMethod
  override fun dismissInsight(eventId: Double, promise: Promise) {
    try { NotificationRepository(appContext).dismissInsight(eventId.toLong()); promise.resolve(null) }
    catch (_: Exception) { promise.reject("INSIGHT_UPDATE_FAILED", "The item could not be dismissed.") }
  }

  @ReactMethod
  override fun setInsightReminder(eventId: Double, at: Double, promise: Promise) {
    try { promise.resolve(NotificationRepository(appContext).setInsightReminder(eventId.toLong(), at.toLong())) }
    catch (_: Exception) { promise.reject("INSIGHT_UPDATE_FAILED", "The reminder could not be set.") }
  }

  @ReactMethod
  override fun clearInsightReminder(eventId: Double, promise: Promise) {
    try { NotificationRepository(appContext).clearInsightReminder(eventId.toLong()); promise.resolve(null) }
    catch (_: Exception) { promise.reject("INSIGHT_UPDATE_FAILED", "The reminder could not be cleared.") }
  }

  @ReactMethod
  override fun searchNotifications(query: String, packageName: String, category: String, groupName: String, from: Double, to: Double, beforeReceivedAt: Double, beforeId: Double, includeArchived: Boolean, limit: Double, promise: Promise) {
    try {
      val filters = NotificationFilters(query = query, packageName = packageName, category = category, groupName = groupName, from = from.toLong(), to = to.toLong(), beforeReceivedAt = beforeReceivedAt.toLong(), beforeId = beforeId.toLong(), includeArchived = includeArchived, limit = limit.toInt())
      promise.resolve(toWritableArray(NotificationRepository(appContext).notifications(filters)))
    } catch (_: Exception) { promise.reject("SEARCH_UNAVAILABLE", "Notification search is unavailable.") }
  }

  @ReactMethod
  override fun setNotificationSaved(id: Double, saved: Boolean, promise: Promise) = updateEvent(promise) { it.setSaved(id.toLong(), saved) }
  @ReactMethod
  override fun setNotificationArchived(id: Double, archived: Boolean, promise: Promise) = updateEvent(promise) { it.setArchived(id.toLong(), archived) }
  @ReactMethod
  override fun setNotificationCategoryOverride(id: Double, category: String?, promise: Promise) = updateEvent(promise) { it.setCategoryOverride(id.toLong(), category) }
  @ReactMethod
  override fun deleteNotification(id: Double, promise: Promise) = updateEvent(promise) { it.delete(id.toLong()) }

  @ReactMethod
  override fun getRetentionDays(promise: Promise) {
    try { promise.resolve(NotificationRepository(appContext).getRetentionDays()) }
    catch (_: Exception) { promise.reject("RETENTION_UNAVAILABLE", "Retention settings are unavailable.") }
  }

  @ReactMethod
  override fun setRetentionDays(days: Double, promise: Promise) {
    try { NotificationRepository(appContext).setRetentionDays(days.toInt()); promise.resolve(null) }
    catch (_: Exception) { promise.reject("RETENTION_UPDATE_FAILED", "Retention settings could not be saved.") }
  }

  @ReactMethod
  override fun getUserRules(promise: Promise) {
    try { promise.resolve(NotificationRepository(appContext).getUserRules()) }
    catch (_: Exception) { promise.reject("RULES_UNAVAILABLE", "User rules could not be loaded.") }
  }

  @ReactMethod
  override fun saveUserRules(rulesJson: String, promise: Promise) {
    try { NotificationRepository(appContext).setUserRules(rulesJson); promise.resolve(null) }
    catch (_: Exception) { promise.reject("RULES_INVALID", "The rule set is invalid and was not saved.") }
  }

  @ReactMethod
  override fun previewUserRules(rulesJson: String, sampleJson: String, promise: Promise) {
    try { promise.resolve(NotificationRepository(appContext).previewUserRules(rulesJson, sampleJson)) }
    catch (_: Exception) { promise.reject("RULE_PREVIEW_FAILED", "The sample could not be evaluated.") }
  }

  @ReactMethod
  override fun reevaluateUserRules(promise: Promise) {
    try { promise.resolve(NotificationRepository(appContext).reevaluateUserRules()) }
    catch (_: Exception) { promise.reject("RULE_REEVALUATION_FAILED", "Notification history could not be re-evaluated.") }
  }

  @ReactMethod
  override fun getSavedSearches(promise: Promise) {
    try { promise.resolve(NotificationRepository(appContext).getSavedSearches()) }
    catch (_: Exception) { promise.reject("SAVED_SEARCHES_UNAVAILABLE", "Saved searches could not be loaded.") }
  }

  @ReactMethod
  override fun addSavedSearch(name: String, filtersJson: String, promise: Promise) {
    try { promise.resolve(NotificationRepository(appContext).addSavedSearch(name, filtersJson)) }
    catch (_: Exception) { promise.reject("SAVED_SEARCH_INVALID", "The saved search is invalid or the saved-search limit was reached.") }
  }

  @ReactMethod
  override fun deleteSavedSearch(id: String, promise: Promise) {
    try { promise.resolve(NotificationRepository(appContext).deleteSavedSearch(id)) }
    catch (_: Exception) { promise.reject("SAVED_SEARCH_DELETE_FAILED", "The saved search could not be deleted.") }
  }

  @ReactMethod
  override fun getRuleGroups(promise: Promise) {
    try { promise.resolve(Arguments.fromList(NotificationRepository(appContext).getRuleGroups())) }
    catch (_: Exception) { promise.reject("RULE_GROUPS_UNAVAILABLE", "Rule groups could not be loaded.") }
  }

  private fun updateEvent(promise: Promise, update: (NotificationRepository) -> Unit) {
    try { update(NotificationRepository(appContext)); promise.resolve(null) }
    catch (_: Exception) { promise.reject("NOTIFICATION_UPDATE_FAILED", "The notification could not be updated.") }
  }

  private fun toWritableArray(items: List<NotificationRecord>) = Arguments.createArray().apply {
    items.forEach { item -> pushMap(toWritableMap(item)) }
  }

  private fun toWritableMap(item: NotificationRecord) = Arguments.createMap().apply {
      putDouble("id", item.id.toDouble()); putString("packageName", item.packageName)
      putNullableString("title", item.title); putNullableString("body", item.body); putNullableString("subtext", item.subtext)
      putDouble("postedAt", item.postedAt.toDouble()); putDouble("receivedAt", item.receivedAt.toDouble())
      putNullableNumber("removedAt", item.removedAt); putBoolean("saved", item.saved); putNullableNumber("archivedAt", item.archivedAt)
      putString("category", item.category); putString("priority", item.priority); putDouble("confidence", item.confidence)
      putString("analysisExplanation", item.analysisExplanation); putString("analysisMethod", item.analysisMethod)
      putString("analysisVersion", item.analysisVersion); putNullableString("categoryOverride", item.categoryOverride)
      putNullableNumber("duplicateGroupId", item.duplicateGroupId); putInt("duplicateCount", item.duplicateCount)
      if (item.includeInDigest == null) putNull("includeInDigest") else putBoolean("includeInDigest", item.includeInDigest)
      if (item.important == null) putNull("important") else putBoolean("important", item.important)
      putArray("ruleGroups", Arguments.fromList(item.ruleGroups))
      putArray("matchedRuleIds", Arguments.fromList(item.matchedRuleIds))
      putNullableNumber("reminderDueAt", item.reminderDueAt)
      putNullableString("reminderStatus", item.reminderStatus)
  }

  private fun toOverviewCounts(items: List<OverviewCount>) = Arguments.createArray().apply {
    items.forEach { item -> pushMap(Arguments.createMap().apply { putString("label", item.label); putInt("count", item.count) }) }
  }

  private fun com.facebook.react.bridge.WritableMap.putNullableString(key: String, value: String?) {
    if (value == null) putNull(key) else putString(key, value)
  }

  private fun com.facebook.react.bridge.WritableMap.putNullableNumber(key: String, value: Long?) {
    if (value == null) putNull(key) else putDouble(key, value.toDouble())
  }

  @ReactMethod
  override fun setAppExcluded(packageName: String, excluded: Boolean, promise: Promise) {
    try {
      NotificationRepository(appContext).setExcluded(packageName, excluded)
      NotificationListenerRuntimeState.excludedPackages = NotificationRepository(appContext).getExcludedPackages()
      NotificationListenerRuntimeState.exclusionsReady = true
      promise.resolve(null)
    } catch (_: Exception) { promise.reject("EXCLUSION_UPDATE_FAILED", "The app exclusion could not be saved.") }
  }

  @ReactMethod
  override fun getExcludedPackages(promise: Promise) {
    try {
      promise.resolve(Arguments.fromList(NotificationRepository(appContext).getExcludedPackages().sorted()))
    } catch (_: Exception) {
      promise.reject("EXCLUSIONS_UNAVAILABLE", "Excluded apps could not be loaded.")
    }
  }

  @ReactMethod
  override fun clearNotificationHistory(promise: Promise) {
    NotifyIQNotificationListener.runAfterPendingCaptures(
      operation = { NotificationRepository(appContext).clear(); promise.resolve(null) },
      onFailure = { promise.reject("HISTORY_CLEAR_FAILED", "Notification history could not be cleared.") },
    )
  }

  @ReactMethod
  override fun openNotificationAccessSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      appContext.startActivity(intent)
      promise.resolve(null)
    } catch (_: Exception) {
      promise.reject("NOTIFICATION_SETTINGS_UNAVAILABLE", "Android notification access settings could not be opened.")
    }
  }

  companion object {
    const val NAME = "NotifyIQ"
    private const val REQUEST_EXPORT = 4101
    private const val REQUEST_IMPORT = 4102
  }
}
