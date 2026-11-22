package com.notifyiq

import android.app.NotificationManager
import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.service.notification.NotificationListenerService
import android.util.Log

/**
 * Keeps the notification listener bound on every Android 10+ phone, without brand-specific steps.
 *
 * Why this is needed: when a phone force-stops NotifyIQ (many phones do this when the app is cleared from
 * Recents), Android's binding to the listener dies. Stock Android re-binds at once, but Android itself only
 * retries once (ManagedServices.onBindingDied, 10 s later), and if the phone blocks that retry, the listener
 * stays unbound until something asks Android to re-bind all listeners. `requestRebind` alone cannot do it:
 * it only un-snoozes a listener that called `requestUnbind`, so it is a no-op in this state (AOSP
 * ManagedServices.setComponentState).
 *
 * Repair ladder, run only while access is granted and the listener is not connected:
 *  1. `requestRebind` (cheap; enough if the listener was snoozed).
 *  2. Android 14+: `requestUnbind(component)` then `requestRebind(component)`: Android drops its stale
 *     binding record and binds afresh.
 *  3. All versions: flip the enabled state of [ListenerRebindTrigger], a private do-nothing receiver. Android
 *     treats that as a package change and re-binds every approved listener (ManagedServices.onPackagesChanged
 *     → rebindServices). The listener component itself is never disabled; Android 14+ would drop its
 *     approval if it were (trimApprovedListsForInvalidServices), which is why that older trick failed.
 */
internal object ListenerHealth {
  private const val TAG = "NotifyIQHealth"
  private const val JOB_ID = 7301
  private const val PERIOD_MS = 15 * 60 * 1000L
  private const val ESCALATE_MIN_INTERVAL_MS = 20_000L
  private const val GENTLE_MIN_INTERVAL_MS = 5_000L
  private const val WAIT_AFTER_ESCALATION_MS = 15_000L

  @Volatile private var lastGentleAt = 0L
  @Volatile private var lastEscalationAt = 0L
  private val main by lazy { Handler(Looper.getMainLooper()) }

  fun component(context: Context) = ComponentName(context, NotifyIQNotificationListener::class.java)

  fun isGranted(context: Context) =
    context.getSystemService(NotificationManager::class.java)?.isNotificationListenerAccessGranted(component(context)) == true

  fun needsRepair(context: Context) = isGranted(context) && !NotificationListenerRuntimeState.probeConnected()

  /** Step 1, rate-limited. Safe to call often: a no-op while bound. */
  fun requestRebind(context: Context) {
    val now = SystemClock.elapsedRealtime()
    if (now - lastGentleAt < GENTLE_MIN_INTERVAL_MS) return
    lastGentleAt = now
    runCatching { NotificationListenerService.requestRebind(component(context)) }
      .onFailure { Log.w(TAG, "REBIND_FAILED ${it.javaClass.simpleName}") }
  }

  /** Steps 2 and 3. Returns false if it ran too recently. */
  fun escalate(context: Context): Boolean {
    val now = SystemClock.elapsedRealtime()
    if (now - lastEscalationAt < ESCALATE_MIN_INTERVAL_MS) return false
    lastEscalationAt = now
    val app = context.applicationContext
    val listener = component(app)
    if (Build.VERSION.SDK_INT >= 34) {
      runCatching {
        NotificationListenerService.requestUnbind(listener)
        NotificationListenerService.requestRebind(listener)
      }.onFailure { Log.w(TAG, "CYCLE_FAILED ${it.javaClass.simpleName}") }
    }
    runCatching {
      val trigger = ComponentName(app, ListenerRebindTrigger::class.java)
      val pm = app.packageManager
      val next = if (pm.getComponentEnabledSetting(trigger) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED)
        PackageManager.COMPONENT_ENABLED_STATE_DISABLED else PackageManager.COMPONENT_ENABLED_STATE_ENABLED
      pm.setComponentEnabledSetting(trigger, next, PackageManager.DONT_KILL_APP)
    }.onFailure { Log.w(TAG, "PACKAGE_CHANGE_FAILED ${it.javaClass.simpleName}") }
    Log.i(TAG, "ESCALATED")
    return true
  }

  /**
   * If access is granted but the listener is not connected: ask gently, give Android [graceMs] to bind on
   * its own, then escalate and wait up to 15 s for the connection. [onDone] always runs once.
   */
  fun repairIfNeeded(context: Context, graceMs: Long = 4_000L, onDone: (() -> Unit)? = null) {
    val app = context.applicationContext
    if (!needsRepair(app)) { onDone?.invoke(); return }
    requestRebind(app)
    main.postDelayed({
      if (!needsRepair(app)) { onDone?.invoke(); return@postDelayed }
      escalate(app)
      waitForConnection(app, SystemClock.elapsedRealtime() + WAIT_AFTER_ESCALATION_MS, onDone)
    }, graceMs)
  }

  private fun waitForConnection(app: Context, deadline: Long, onDone: (() -> Unit)?) {
    if (!needsRepair(app) || SystemClock.elapsedRealtime() >= deadline) { onDone?.invoke(); return }
    main.postDelayed({ waitForConnection(app, deadline, onDone) }, 1_000L)
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

/**
 * Private, never-exported, do-nothing receiver with no intent filters. Its enabled state is flipped only to
 * tell Android "this package changed", which makes Android re-bind approved notification listeners.
 */
class ListenerRebindTrigger : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) = Unit
}

/** Periodic self-check (JobScheduler, no extra permission or library). */
class ListenerHealthJob : JobService() {
  override fun onStartJob(params: JobParameters): Boolean {
    ListenerHealth.repairIfNeeded(this) { jobFinished(params, false) }
    return true
  }

  override fun onStopJob(params: JobParameters): Boolean = true
}
