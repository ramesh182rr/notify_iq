package com.notifyiq

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build

internal object UserReminderScheduler {
  private const val CHANNEL_ID = "user_reminders"

  fun schedule(context: Context, eventId: Long, dueAt: Long, insight: Boolean = false): Boolean {
    if (!canPostNotifications(context)) return false
    val alarmManager = context.getSystemService(AlarmManager::class.java) ?: return false
    val pendingIntent = reminderPendingIntent(context, eventId, insight)
    return runCatching {
      alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, dueAt, pendingIntent)
      true
    }.getOrDefault(false)
  }

  fun cancel(context: Context?, eventId: Long, insight: Boolean = false) {
    if (context == null) return
    val manager = context.getSystemService(AlarmManager::class.java) ?: return
    runCatching { manager.cancel(reminderPendingIntent(context, eventId, insight)) }
  }

  fun show(context: Context, eventId: Long, insight: Boolean = false): Boolean {
    if (!canPostNotifications(context)) return false
    val manager = context.getSystemService(NotificationManager::class.java) ?: return false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "NotifyIQ reminders", NotificationManager.IMPORTANCE_DEFAULT).apply {
          description = "Local reminders requested by your NotifyIQ rules."
          lockscreenVisibility = Notification.VISIBILITY_PRIVATE
        },
      )
    }
    val openApp = PendingIntent.getActivity(
      context,
      eventId.toInt(),
      Intent(context, MainActivity::class.java).setData(Uri.parse("notifyiq://reminder/$eventId")),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
    return runCatching {
      val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Notification.Builder(context, CHANNEL_ID)
      } else {
        @Suppress("DEPRECATION") Notification.Builder(context)
      }.setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle(if (insight) "Coming up in NotifyIQ" else "Reminder from NotifyIQ")
        .setContentText(if (insight) "Something you asked to be reminded about is due." else "Review a notification saved on this device.")
        .setContentIntent(openApp)
        .setAutoCancel(true)
        .build()
      manager.notify(if (insight) -eventId.toInt() else eventId.toInt(), notification)
      true
    }.getOrDefault(false)
  }

  fun reminderPendingIntent(context: Context, eventId: Long, insight: Boolean = false): PendingIntent = PendingIntent.getBroadcast(
    context,
    eventId.toInt(),
    Intent(context, NotificationReminderReceiver::class.java)
      .setData(Uri.parse(if (insight) "notifyiq://insight-reminder/$eventId" else "notifyiq://reminder/$eventId"))
      .putExtra(NotificationReminderReceiver.EXTRA_EVENT_ID, eventId)
      .putExtra(NotificationReminderReceiver.EXTRA_INSIGHT, insight),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
  )

  private fun canPostNotifications(context: Context): Boolean =
    Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
}

class NotificationReminderReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val eventId = intent.getLongExtra(EXTRA_EVENT_ID, -1L)
    if (eventId <= 0L) return
    val insight = intent.getBooleanExtra(EXTRA_INSIGHT, false)
    val repository = NotificationRepository(context)
    if (!repository.markReminderDelivered(eventId, insight)) return
    if (!UserReminderScheduler.show(context, eventId, insight)) repository.markReminderUnavailable(eventId, insight)
  }

  companion object {
    const val EXTRA_EVENT_ID = "notifyiq.reminder.event_id"
    const val EXTRA_INSIGHT = "notifyiq.reminder.insight"
  }
}

class ReminderBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    ListenerHealth.schedulePeriodicCheck(context)
    ListenerHealth.repairIfNeeded(context)
    val repository = NotificationRepository(context)
    repository.pendingReminders().forEach { (eventId, dueAt) ->
      if (!UserReminderScheduler.schedule(context, eventId, dueAt)) repository.markReminderUnavailable(eventId)
    }
    repository.pendingInsightReminders().forEach { (eventId, dueAt) ->
      if (!UserReminderScheduler.schedule(context, eventId, dueAt, insight = true)) repository.markReminderUnavailable(eventId, insight = true)
    }
  }
}
