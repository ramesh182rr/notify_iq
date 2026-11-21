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
      Log.e(NAME, "Unable to read notification access status", error)
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
  fun searchNotifications(query: String, packageName: String, category: String, from: Double, to: Double, beforeReceivedAt: Double, beforeId: Double, includeArchived: Boolean, limit: Double, promise: Promise) {
    try {
      val filters = NotificationFilters(query = query, packageName = packageName, category = category, from = from.toLong(), to = to.toLong(), beforeReceivedAt = beforeReceivedAt.toLong(), beforeId = beforeId.toLong(), includeArchived = includeArchived, limit = limit.toInt())
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
