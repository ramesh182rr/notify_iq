package com.notifyiq

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import android.app.NotificationManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = NotifyIQModule.NAME)
class NotifyIQModule(
  private val appContext: ReactApplicationContext,
) : NativeNotifyIQSpec(appContext) {
  override fun getName(): String = NAME

  override fun getListenerStatus(promise: Promise) {
    try {
      val listener = ComponentName(appContext, NotifyIQNotificationListener::class.java)
      val notificationManager = appContext.getSystemService(NotificationManager::class.java)
      val status = Arguments.createMap().apply {
        putBoolean("accessGranted", notificationManager.isNotificationListenerAccessGranted(listener))
        putBoolean("connected", NotificationListenerRuntimeState.connected)
        if (NotificationListenerRuntimeState.lastErrorCode == null) putNull("lastErrorCode") else putString("lastErrorCode", NotificationListenerRuntimeState.lastErrorCode)
      }
      promise.resolve(status)
    } catch (_: Exception) {
      promise.reject("LISTENER_STATUS_UNAVAILABLE", "Unable to read notification access status.")
    }
  }

  override fun getRecentNotifications(limit: Double, promise: Promise) {
    try {
      val items = Arguments.createArray()
      NotificationRepository(appContext).recent(limit.toInt()).forEach { item ->
        items.pushMap(Arguments.createMap().apply {
          putString("id", item.id); putString("packageName", item.packageName)
          if (item.title == null) putNull("title") else putString("title", item.title)
          if (item.body == null) putNull("body") else putString("body", item.body)
          putDouble("receivedAt", item.receivedAt.toDouble())
          if (item.removedAt == null) putNull("removedAt") else putDouble("removedAt", item.removedAt.toDouble())
        })
      }
      promise.resolve(items)
    } catch (_: Exception) { promise.reject("HISTORY_UNAVAILABLE", "Notification history is unavailable.") }
  }

  override fun setAppExcluded(packageName: String, excluded: Boolean, promise: Promise) {
    try {
      NotificationRepository(appContext).setExcluded(packageName, excluded)
      NotificationListenerRuntimeState.excludedPackages = NotificationRepository(appContext).getExcludedPackages()
      NotificationListenerRuntimeState.exclusionsReady = true
      promise.resolve(null)
    } catch (_: Exception) { promise.reject("EXCLUSION_UPDATE_FAILED", "The app exclusion could not be saved.") }
  }

  override fun clearNotificationHistory(promise: Promise) {
    NotifyIQNotificationListener.runAfterPendingCaptures(
      operation = { NotificationRepository(appContext).clear(); promise.resolve(null) },
      onFailure = { promise.reject("HISTORY_CLEAR_FAILED", "Notification history could not be cleared.") },
    )
  }

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
  }
}
