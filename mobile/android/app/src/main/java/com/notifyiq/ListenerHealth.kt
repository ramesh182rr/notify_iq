package com.notifyiq

import android.app.NotificationManager
import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.ComponentName
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.service.notification.NotificationListenerService
import android.util.Log

/**
 * Keeps the notification listener bound on every Android 10+ phone, without brand-specific steps.
 *
 * Some phones restart the app process and do not promptly re-bind the listener. NotifyIQ asks Android to
 * re-bind (the supported `requestRebind` API) at app start, after reboot or app update, whenever the UI
 * checks status, and from a periodic job every 15 minutes even if the app is never opened. Connection
 * status is probed from the live listener rather than trusted from a cached flag.
 */
internal object ListenerHealth {
  private const val TAG = "NotifyIQHealth"
  private const val JOB_ID = 7301
  private const val PERIOD_MS = 15 * 60 * 1000L

  fun component(context: Context) = ComponentName(context, NotifyIQNotificationListener::class.java)

  fun isGranted(context: Context) =
    context.getSystemService(NotificationManager::class.java)?.isNotificationListenerAccessGranted(component(context)) == true

  fun needsRepair(context: Context) = isGranted(context) && !NotificationListenerRuntimeState.probeConnected()

  fun requestRebind(context: Context) {
    runCatching { NotificationListenerService.requestRebind(component(context)) }
      .onFailure { Log.w(TAG, "REBIND_FAILED ${it.javaClass.simpleName}") }
  }

  /**
   * Ask Android to re-bind, and ask again once after a short wait if it still has not.
   *
   * Deliberately no component enable/disable "force" trick: measured on Android 15, disabling the
   * listener component unbinds it and re-enabling did not re-bind it within 60 s, which would stop
   * capture entirely. requestRebind is the supported API and is a no-op while already bound.
   */
  fun repairIfNeeded(context: Context, retryAfterMs: Long = 6_000L, onDone: (() -> Unit)? = null) {
    val app = context.applicationContext
    if (!needsRepair(app)) { onDone?.invoke(); return }
    requestRebind(app)
    Handler(Looper.getMainLooper()).postDelayed({
      if (needsRepair(app)) requestRebind(app)
      onDone?.invoke()
    }, retryAfterMs)
  }

  fun schedulePeriodicCheck(context: Context) {
    val scheduler = context.getSystemService(JobScheduler::class.java) ?: return
    if (scheduler.getPendingJob(JOB_ID) != null) return
    val job = JobInfo.Builder(JOB_ID, ComponentName(context, ListenerHealthJob::class.java))
      .setPeriodic(PERIOD_MS)
      .setPersisted(true)
      .build()
    runCatching { scheduler.schedule(job) }.onFailure { Log.w(TAG, "JOB_SCHEDULE_FAILED ${it.javaClass.simpleName}") }
  }
}

/** Periodic self-check (JobScheduler, no extra permission or library). */
class ListenerHealthJob : JobService() {
  override fun onStartJob(params: JobParameters): Boolean {
    // Give Android a moment to bind the listener into this (possibly fresh) process first.
    Handler(Looper.getMainLooper()).postDelayed({
      ListenerHealth.repairIfNeeded(this) { jobFinished(params, false) }
    }, 3_000L)
    return true
  }

  override fun onStopJob(params: JobParameters): Boolean = true
}
