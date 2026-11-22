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
      repository.applyRetentionPolicy()
    }.isSuccess
  }

  override fun onListenerConnected() {
    super.onListenerConnected()
    NotificationListenerRuntimeState.instance = this
    NotificationListenerRuntimeState.connected = true
    val connectedAt = System.currentTimeMillis()
    enqueue { recoverTrayAndRecordGap(connectedAt) }
  }

  /**
   * After a (re)connection: save notifications that are still in the tray (they may have arrived while
   * Android was not letting NotifyIQ read them), and record the pause if there was one. Recovered items go
   * through exactly the same exclusion and sensitive-content gates as live capture.
   */
  private fun recoverTrayAndRecordGap(connectedAt: Long) {
    if (!::repository.isInitialized || !NotificationListenerRuntimeState.exclusionsReady) return
    val lastAlive = repository.listenerAliveAt()
    val gap = lastAlive?.let { ListenerGapEstimator.estimate(applicationContext, it, connectedAt) }
    var recovered = 0
    val active = runCatching { activeNotifications }.getOrNull().orEmpty()
    for (sbn in active) {
      val record = toRecord(sbn, connectedAt) ?: continue
      if (repository.storedPostedAt(sbn.packageName, sbn.key) == sbn.postTime) continue
      repository.upsert(record)
      sbn.notification.extras?.let { AppIconCache.remember(applicationContext, repository, sbn.packageName, it) }
      if (gap != null && sbn.postTime >= gap.startedAt) recovered++
    }
    if (gap != null && (gap.exact || recovered > 0)) repository.recordListenerGap(gap.startedAt, connectedAt, recovered, gap.exact)
    repository.setListenerAliveAt(connectedAt)
    lastAliveWrite = connectedAt
  }

  private fun heartbeat() {
    val now = System.currentTimeMillis()
    if (now - lastAliveWrite < 60_000L) return
    lastAliveWrite = now
    repository.setListenerAliveAt(now)
  }

  override fun onListenerDisconnected() {
    NotificationListenerRuntimeState.connected = false
    // Access turned off by the person: not a pause caused by the phone, so don't report one later.
    if (!ListenerHealth.isGranted(this) && ::repository.isInitialized) enqueue { repository.setListenerAliveAt(null) }
    requestRebind(android.content.ComponentName(this, NotifyIQNotificationListener::class.java))
    super.onListenerDisconnected()
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    if (!::repository.isInitialized || !NotificationListenerRuntimeState.exclusionsReady) return
    val now = System.currentTimeMillis()
    enqueue {
      heartbeat()
      val record = toRecord(sbn, now) ?: return@enqueue
      repository.upsert(record)
      sbn.notification.extras?.let { AppIconCache.remember(applicationContext, repository, sbn.packageName, it) }
    }
  }

  /** Exclusions and the sensitive-content gate; returns null if the notification must not be kept. Runs on the capture queue. */
  private fun toRecord(sbn: StatusBarNotification, receivedAt: Long): CapturedNotification? {
    if (sbn.packageName in NotificationListenerRuntimeState.excludedPackages) return null
    val extras = sbn.notification.extras ?: return null
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
    val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
    val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
    val subtext = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()
    if (listOf(title, text, bigText, subtext).all { it.isNullOrBlank() }) return null
    if (SystemRedaction.isRedacted(sbn.packageName, extras) ||
      SensitiveContentGate.containsSensitiveContent(listOf(title, text, bigText, subtext))) {
      repository.deleteActive(sbn.packageName, sbn.key)
      return null
    }
    return CapturedNotification(
      NotificationIdentity(sbn.packageName, sbn.key),
      title?.take(500), (bigText ?: text)?.take(4000), subtext?.take(500),
      sbn.postTime, receivedAt,
    )
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification) {
    if (::repository.isInitialized) {
      enqueue { heartbeat(); repository.markRemoved(sbn.packageName, sbn.key, System.currentTimeMillis()) }
    }
  }

  override fun onDestroy() {
    if (NotificationListenerRuntimeState.instance === this) NotificationListenerRuntimeState.instance = null
    NotificationListenerRuntimeState.connected = false
    super.onDestroy()
  }

  companion object {
    @Volatile private var lastAliveWrite = 0L

    /** Records that the listener is alive (used by status checks and the periodic job). */
    internal fun markAlive(repository: NotificationRepository) {
      val now = System.currentTimeMillis()
      if (now - lastAliveWrite < 60_000L) return
      lastAliveWrite = now
      enqueue { repository.setListenerAliveAt(now) }
    }

    /** Access is off: forget the alive marker so turning access back on is not reported as a pause. */
    internal fun markAccessOff(repository: NotificationRepository) {
      lastAliveWrite = 0L
      enqueue { repository.setListenerAliveAt(null) }
    }

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
