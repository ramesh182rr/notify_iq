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
) : ReactContextBaseJavaModule(appContext) {
  override fun getName(): String = NAME

  @ReactMethod
  fun getListenerStatus(promise: Promise) {
    try {
      val listener = ComponentName(appContext, NotifyIQNotificationListener::class.java)
      val notificationManager = appContext.getSystemService(NotificationManager::class.java)
      val status = Arguments.createMap().apply {
        putBoolean("accessGranted", notificationManager.isNotificationListenerAccessGranted(listener))
        putBoolean("connected", NotificationListenerRuntimeState.connected)
        if (NotificationListenerRuntimeState.lastErrorCode == null) putNull("lastErrorCode") else putString("lastErrorCode", NotificationListenerRuntimeState.lastErrorCode)
      }
      promise.resolve(status)
    } catch (error: Exception) {
      Log.e(NAME, "LISTENER_STATUS_UNAVAILABLE ${error.javaClass.simpleName}")
      promise.reject("LISTENER_STATUS_UNAVAILABLE", "Unable to read notification access status.")
    }
  }

  @ReactMethod
  fun getRecentNotifications(limit: Double, promise: Promise) {
    try {
      val items = NotificationRepository(appContext).notifications(NotificationFilters(limit = limit.toInt()))
      promise.resolve(toWritableArray(items))
    } catch (_: Exception) { promise.reject("HISTORY_UNAVAILABLE", "Notification history is unavailable.") }
  }

  @ReactMethod
  fun getDailyOverview(promise: Promise) {
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
  fun getMoneySummary(from: Double, to: Double, promise: Promise) {
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

  @ReactMethod
  fun getUpcomingActions(promise: Promise) {
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
  fun getRecurringPayments(promise: Promise) {
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
  fun dismissInsight(eventId: Double, promise: Promise) {
    try { NotificationRepository(appContext).dismissInsight(eventId.toLong()); promise.resolve(null) }
    catch (_: Exception) { promise.reject("INSIGHT_UPDATE_FAILED", "The item could not be dismissed.") }
  }

  @ReactMethod
  fun setInsightReminder(eventId: Double, at: Double, promise: Promise) {
    try { promise.resolve(NotificationRepository(appContext).setInsightReminder(eventId.toLong(), at.toLong())) }
    catch (_: Exception) { promise.reject("INSIGHT_UPDATE_FAILED", "The reminder could not be set.") }
  }

  @ReactMethod
  fun clearInsightReminder(eventId: Double, promise: Promise) {
    try { NotificationRepository(appContext).clearInsightReminder(eventId.toLong()); promise.resolve(null) }
    catch (_: Exception) { promise.reject("INSIGHT_UPDATE_FAILED", "The reminder could not be cleared.") }
  }

  @ReactMethod
  fun searchNotifications(query: String, packageName: String, category: String, groupName: String, from: Double, to: Double, beforeReceivedAt: Double, beforeId: Double, includeArchived: Boolean, limit: Double, promise: Promise) {
    try {
      val filters = NotificationFilters(query = query, packageName = packageName, category = category, groupName = groupName, from = from.toLong(), to = to.toLong(), beforeReceivedAt = beforeReceivedAt.toLong(), beforeId = beforeId.toLong(), includeArchived = includeArchived, limit = limit.toInt())
      promise.resolve(toWritableArray(NotificationRepository(appContext).notifications(filters)))
    } catch (_: Exception) { promise.reject("SEARCH_UNAVAILABLE", "Notification search is unavailable.") }
  }

  @ReactMethod
  fun setNotificationSaved(id: Double, saved: Boolean, promise: Promise) = updateEvent(promise) { it.setSaved(id.toLong(), saved) }
  @ReactMethod
  fun setNotificationArchived(id: Double, archived: Boolean, promise: Promise) = updateEvent(promise) { it.setArchived(id.toLong(), archived) }
  @ReactMethod
  fun setNotificationCategoryOverride(id: Double, category: String?, promise: Promise) = updateEvent(promise) { it.setCategoryOverride(id.toLong(), category) }
  @ReactMethod
  fun deleteNotification(id: Double, promise: Promise) = updateEvent(promise) { it.delete(id.toLong()) }

  @ReactMethod
  fun getRetentionDays(promise: Promise) {
    try { promise.resolve(NotificationRepository(appContext).getRetentionDays()) }
    catch (_: Exception) { promise.reject("RETENTION_UNAVAILABLE", "Retention settings are unavailable.") }
  }

  @ReactMethod
  fun setRetentionDays(days: Double, promise: Promise) {
    try { NotificationRepository(appContext).setRetentionDays(days.toInt()); promise.resolve(null) }
    catch (_: Exception) { promise.reject("RETENTION_UPDATE_FAILED", "Retention settings could not be saved.") }
  }

  @ReactMethod
  fun getUserRules(promise: Promise) {
    try { promise.resolve(NotificationRepository(appContext).getUserRules()) }
    catch (_: Exception) { promise.reject("RULES_UNAVAILABLE", "User rules could not be loaded.") }
  }

  @ReactMethod
  fun saveUserRules(rulesJson: String, promise: Promise) {
    try { NotificationRepository(appContext).setUserRules(rulesJson); promise.resolve(null) }
    catch (_: Exception) { promise.reject("RULES_INVALID", "The rule set is invalid and was not saved.") }
  }

  @ReactMethod
  fun previewUserRules(rulesJson: String, sampleJson: String, promise: Promise) {
    try { promise.resolve(NotificationRepository(appContext).previewUserRules(rulesJson, sampleJson)) }
    catch (_: Exception) { promise.reject("RULE_PREVIEW_FAILED", "The sample could not be evaluated.") }
  }

  @ReactMethod
  fun reevaluateUserRules(promise: Promise) {
    try { promise.resolve(NotificationRepository(appContext).reevaluateUserRules()) }
    catch (_: Exception) { promise.reject("RULE_REEVALUATION_FAILED", "Notification history could not be re-evaluated.") }
  }

  @ReactMethod
  fun getSavedSearches(promise: Promise) {
    try { promise.resolve(NotificationRepository(appContext).getSavedSearches()) }
    catch (_: Exception) { promise.reject("SAVED_SEARCHES_UNAVAILABLE", "Saved searches could not be loaded.") }
  }

  @ReactMethod
  fun addSavedSearch(name: String, filtersJson: String, promise: Promise) {
    try { promise.resolve(NotificationRepository(appContext).addSavedSearch(name, filtersJson)) }
    catch (_: Exception) { promise.reject("SAVED_SEARCH_INVALID", "The saved search is invalid or the saved-search limit was reached.") }
  }

  @ReactMethod
  fun deleteSavedSearch(id: String, promise: Promise) {
    try { promise.resolve(NotificationRepository(appContext).deleteSavedSearch(id)) }
    catch (_: Exception) { promise.reject("SAVED_SEARCH_DELETE_FAILED", "The saved search could not be deleted.") }
  }

  @ReactMethod
  fun getRuleGroups(promise: Promise) {
    try { promise.resolve(Arguments.fromList(NotificationRepository(appContext).getRuleGroups())) }
    catch (_: Exception) { promise.reject("RULE_GROUPS_UNAVAILABLE", "Rule groups could not be loaded.") }
  }

  private fun updateEvent(promise: Promise, update: (NotificationRepository) -> Unit) {
    try { update(NotificationRepository(appContext)); promise.resolve(null) }
    catch (_: Exception) { promise.reject("NOTIFICATION_UPDATE_FAILED", "The notification could not be updated.") }
  }

  private fun toWritableArray(items: List<NotificationRecord>) = Arguments.createArray().apply {
    items.forEach { item -> pushMap(Arguments.createMap().apply {
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
    }) }
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
  fun setAppExcluded(packageName: String, excluded: Boolean, promise: Promise) {
    try {
      NotificationRepository(appContext).setExcluded(packageName, excluded)
      NotificationListenerRuntimeState.excludedPackages = NotificationRepository(appContext).getExcludedPackages()
      NotificationListenerRuntimeState.exclusionsReady = true
      promise.resolve(null)
    } catch (_: Exception) { promise.reject("EXCLUSION_UPDATE_FAILED", "The app exclusion could not be saved.") }
  }

  @ReactMethod
  fun getExcludedPackages(promise: Promise) {
    try {
      promise.resolve(Arguments.fromList(NotificationRepository(appContext).getExcludedPackages().sorted()))
    } catch (_: Exception) {
      promise.reject("EXCLUSIONS_UNAVAILABLE", "Excluded apps could not be loaded.")
    }
  }

  @ReactMethod
  fun clearNotificationHistory(promise: Promise) {
    NotifyIQNotificationListener.runAfterPendingCaptures(
      operation = { NotificationRepository(appContext).clear(); promise.resolve(null) },
      onFailure = { promise.reject("HISTORY_CLEAR_FAILED", "Notification history could not be cleared.") },
    )
  }

  @ReactMethod
  fun openNotificationAccessSettings(promise: Promise) {
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
  }
}
