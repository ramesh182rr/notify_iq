package com.notifyiq.notification

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * Reference skeleton only. Implement a repository that applies app exclusions
 * and sensitive-data screening before persistence. Never send raw events to JS
 * as the only persistence path. Do not perform model inference or network I/O
 * inside these callbacks.
 */
class NotifyIQNotificationListener : NotificationListenerService() {
    override fun onListenerConnected() {
        super.onListenerConnected()
        // Mark listener connected in native status store.
        // Safe point to query active notifications if product requires it.
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        // Mark disconnected; request rebind only per Android lifecycle guidance.
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        // 1. Check package exclusion before extracting content.
        // 2. Extract only permitted extras.
        // 3. Screen/redact sensitive data.
        // 4. Persist a minimal event to the authoritative local DB.
        // 5. Enqueue deferred analysis outside this callback.
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        // Update event lifecycle metadata; do not delete retained history.
    }
}
