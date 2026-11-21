package com.notifyiq

/** Process-local connection state; it resets to disconnected after process death. */
object NotificationListenerRuntimeState {
  @Volatile
  var connected: Boolean = false
  @Volatile var exclusionsReady: Boolean = false
  @Volatile var excludedPackages: Set<String> = emptySet()
  @Volatile var lastErrorCode: String? = null
}
