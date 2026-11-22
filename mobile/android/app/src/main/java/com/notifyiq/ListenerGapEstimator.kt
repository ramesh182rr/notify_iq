package com.notifyiq

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.os.SystemClock

/**
 * Works out when NotifyIQ stopped being able to read notifications, given the last time the listener was
 * known to be connected and the time it connected again.
 *
 * - Android 11+: the time Android recorded for the app process ending (ApplicationExitInfo) is exact.
 * - Android 10, or no exit record: only the last-known-alive time is available, so the start is
 *   approximate; such a pause is reported only if notifications from that time were found in the tray.
 * - Time while the phone was switched off is not counted as a pause.
 */
internal object ListenerGapEstimator {
  data class Estimate(val startedAt: Long, val exact: Boolean)

  /** Pauses shorter than this are normal restarts (stock Android re-binds within a second). */
  const val MIN_GAP_MS = 2 * 60 * 1000L

  fun estimate(context: Context, lastAliveAt: Long, connectedAt: Long): Estimate? {
    val bootAt = System.currentTimeMillis() - SystemClock.elapsedRealtime()
    val exit = firstExitBetween(context, lastAliveAt, connectedAt)
    val start = maxOf(exit ?: lastAliveAt, bootAt)
    if (connectedAt - start < MIN_GAP_MS) return null
    return Estimate(start, exact = exit != null)
  }

  private fun firstExitBetween(context: Context, from: Long, to: Long): Long? {
    if (Build.VERSION.SDK_INT < 30) return null
    return runCatching {
      context.getSystemService(ActivityManager::class.java)
        .getHistoricalProcessExitReasons(context.packageName, 0, 10)
        .map { it.timestamp }
        .filter { it in from..to }
        .minOrNull()
    }.getOrNull()
  }
}
