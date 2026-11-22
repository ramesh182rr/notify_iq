package com.notifyiq

/** Process-local connection state; it resets to disconnected after process death. */
object NotificationListenerRuntimeState {
  @Volatile
  var connected: Boolean = false
  @Volatile var exclusionsReady: Boolean = false
  @Volatile var excludedPackages: Set<String> = emptySet()
  @Volatile var lastErrorCode: String? = null
  /** The listener instance Android has bound into this process, if any. */
  @Volatile var instance: NotifyIQNotificationListener? = null

  /**
   * True only if a listener is bound here *and* Android accepts calls from it right now. An unbound or
   * stale listener throws when asked for active notifications, so this does not trust a cached flag.
   */
  fun probeConnected(): Boolean {
    val listener = instance ?: return false.also { connected = false }
    val ok = runCatching { listener.activeNotifications; true }.getOrDefault(false)
    connected = ok
    return ok
  }
}
