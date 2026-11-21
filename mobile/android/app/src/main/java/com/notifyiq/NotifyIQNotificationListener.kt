package com.notifyiq

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit

class NotifyIQNotificationListener : NotificationListenerService() {
  private lateinit var repository: NotificationRepository

  override fun onCreate() {
    super.onCreate()
    repository = NotificationRepository(this)
    NotificationListenerRuntimeState.exclusionsReady = runCatching {
      NotificationListenerRuntimeState.excludedPackages = repository.getExcludedPackages()
    }.isSuccess
  }

  override fun onListenerConnected() {
    super.onListenerConnected()
    NotificationListenerRuntimeState.connected = true
  }

  override fun onListenerDisconnected() {
    NotificationListenerRuntimeState.connected = false
    requestRebind(android.content.ComponentName(this, NotifyIQNotificationListener::class.java))
    super.onListenerDisconnected()
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    if (!::repository.isInitialized || !NotificationListenerRuntimeState.exclusionsReady ||
      sbn.packageName in NotificationListenerRuntimeState.excludedPackages) return

    val extras = sbn.notification.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
    val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
    val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
    val subtext = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()
    if (SensitiveContentGate.containsSensitiveContent(listOf(title, text, bigText, subtext))) {
      enqueue { repository.deleteActive(sbn.packageName, sbn.key) }
      return
    }

    val now = System.currentTimeMillis()
    val record = CapturedNotification(
      NotificationIdentity(sbn.packageName, sbn.key),
      title?.take(500), (bigText ?: text)?.take(4000), subtext?.take(500),
      sbn.postTime, now,
    )
    enqueue { repository.upsert(record) }
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification) {
    if (::repository.isInitialized) {
      enqueue { repository.markRemoved(sbn.packageName, sbn.key, System.currentTimeMillis()) }
    }
  }

  override fun onDestroy() {
    NotificationListenerRuntimeState.connected = false
    super.onDestroy()
  }

  companion object {
    private val captureQueue = ThreadPoolExecutor(
      1, 1, 0L, TimeUnit.MILLISECONDS, ArrayBlockingQueue(128),
      ThreadPoolExecutor.AbortPolicy(),
    )

    fun runAfterPendingCaptures(operation: () -> Unit, onFailure: () -> Unit) {
      runCatching { captureQueue.execute { runCatching(operation).onFailure { onFailure() } } }
        .onFailure { onFailure() }
    }

    private fun enqueue(operation: () -> Unit) {
      runCatching {
        captureQueue.execute {
          runCatching(operation).onFailure { NotificationListenerRuntimeState.lastErrorCode = "LOCAL_STORAGE_ERROR" }
        }
      }.onFailure { NotificationListenerRuntimeState.lastErrorCode = "CAPTURE_QUEUE_FULL" }
    }
  }
}
