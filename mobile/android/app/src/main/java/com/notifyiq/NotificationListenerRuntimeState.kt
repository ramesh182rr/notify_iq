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
   * True only if a listener is bound here *and* Android accepts calls from it right now. Asks for active
   * notifications by an empty key list: Android checks the listener's token (throws if it is no longer
   * registered; the call returns null while unbound) but transfers no notification data. Note that the
   * interruption-filter query is *not* usable here: Android answers it without checking the caller.
   */
  fun probeConnected(): Boolean {
    val listener = instance ?: return false.also { connected = false }
    val ok = runCatching { listener.getActiveNotifications(emptyArray()) != null }.getOrDefault(false)
    connected = ok
    return ok
  }
}
