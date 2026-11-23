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
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import java.time.Instant
import java.time.ZoneId
import java.time.temporal.ChronoUnit

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

  private const val ALARM_CHANNEL = "due_alarms"
  private const val HEADS_UP_CHANNEL = "due_reminders"

  /**
   * Bills, renewals/AutoPay, expiries and appointments. High importance (pops up on screen). In alarm style
   * it uses the alarm sound on the alarm volume and repeats until the person looks at it (FLAG_INSISTENT).
   * No full-screen takeover and no exact-alarm permission: Android reserves those for alarm-clock apps.
   */
  fun showDue(context: Context, details: ReminderDetails, alarm: Boolean): Boolean {
    if (!canPostNotifications(context)) return false
    val manager = context.getSystemService(NotificationManager::class.java) ?: return false
    ensureDueChannels(manager)
    val channel = if (alarm) ALARM_CHANNEL else HEADS_UP_CHANNEL
    val id = details.eventId
    val open = PendingIntent.getActivity(context, id.toInt(), Intent(context, MainActivity::class.java).setData(Uri.parse("notifyiq://coming-up/$id")),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    fun action(kind: String) = PendingIntent.getBroadcast(context, id.toInt(),
      Intent(context, ReminderActionReceiver::class.java).setAction(kind).setData(Uri.parse("notifyiq://reminder-action/$kind/$id")).putExtra(NotificationReminderReceiver.EXTRA_EVENT_ID, id),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val headline = headline(details)
    val detail = listOfNotNull(details.merchant ?: details.title, details.body?.take(140)).distinct().joinToString(" — ")
    val public = Notification.Builder(context, channel).setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle("NotifyIQ reminder").setContentText("Something is due ${whenText(details.dueAt)}.").build()
    return runCatching {
      val notification = Notification.Builder(context, channel)
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle(headline)
        .setContentText(detail)
        .setStyle(Notification.BigTextStyle().bigText(detail))
        .setCategory(Notification.CATEGORY_REMINDER)
        .setVisibility(Notification.VISIBILITY_PRIVATE)
        .setPublicVersion(public)
        .setContentIntent(open)
        .setAutoCancel(true)
        .addAction(Notification.Action.Builder(null, if (details.kind == "bill_due" || details.kind == "subscription_renewal") "Paid / Done" else "Done", action(ReminderActionReceiver.DONE)).build())
        .addAction(Notification.Action.Builder(null, "Remind me in 1 hour", action(ReminderActionReceiver.SNOOZE)).build())
        .build()
      if (alarm) notification.flags = notification.flags or Notification.FLAG_INSISTENT
      manager.notify(-id.toInt(), notification)
      true
    }.getOrDefault(false)
  }

  /** A sample so people can hear and see what the reminder will be like. */
  fun showTest(context: Context, alarm: Boolean): Boolean = showDue(
    context,
    ReminderDetails(Int.MAX_VALUE.toLong() - 7, "bill_due", System.currentTimeMillis() + 24 * 60 * 60 * 1000L, System.currentTimeMillis() + 24 * 60 * 60 * 1000L, false, 124_000L, "INR",
      "Electricity bill (example)", null, false, 1, null, "This is how NotifyIQ will remind you about bills, renewals and AutoPay.", context.packageName),
    alarm,
  )

  fun cancelShown(context: Context, eventId: Long) {
    context.getSystemService(NotificationManager::class.java)?.cancel(-eventId.toInt())
  }

  private fun ensureDueChannels(manager: NotificationManager) {
    if (manager.getNotificationChannel(ALARM_CHANNEL) == null) {
      manager.createNotificationChannel(NotificationChannel(ALARM_CHANNEL, "Bills & renewals (alarm)", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Rings like an alarm until you look: bills, renewals, AutoPay, plan expiries and appointments."
        setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM) ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
          AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 600, 400, 600, 400, 600)
        lockscreenVisibility = Notification.VISIBILITY_PRIVATE
      })
    }
    if (manager.getNotificationChannel(HEADS_UP_CHANNEL) == null) {
      manager.createNotificationChannel(NotificationChannel(HEADS_UP_CHANNEL, "Bills & renewals", NotificationManager.IMPORTANCE_HIGH).apply {
        description = "Pops up on screen with the normal notification sound."
        enableVibration(true)
        lockscreenVisibility = Notification.VISIBILITY_PRIVATE
      })
    }
  }

  private fun whenText(dueAt: Long): String {
    val zone = ZoneId.systemDefault()
    val days = ChronoUnit.DAYS.between(Instant.now().atZone(zone).toLocalDate(), Instant.ofEpochMilli(dueAt).atZone(zone).toLocalDate())
    return when {
      days <= 0L -> "today"
      days == 1L -> "tomorrow"
      else -> "in $days days"
    }
  }

  private fun headline(d: ReminderDetails): String {
    val whenDue = if (d.approximate && d.recurrence == null) "this month" else whenText(d.dueAt)
    val amount = d.amountMinor?.let { formatMoney(it, d.currency ?: "INR") }
    val what = when (d.kind) {
      "bill_due" -> "Bill due $whenDue"
      "subscription_renewal" -> if (d.recurrence != null) "AutoPay $whenDue" else "Renews $whenDue"
      "expiry" -> "Expires $whenDue"
      "appointment" -> "Appointment $whenDue"
      else -> "Due $whenDue"
    }
    return if (amount != null) "$what · $amount" else what
  }

  /** "₹1,240", "₹1,24,500.50": Indian grouping for rupees, built by hand so every Android version reads the same. */
  internal fun formatMoney(minor: Long, currency: String): String {
    val whole = minor / 100
    val paise = minor % 100
    val digits = whole.toString()
    val grouped = if (currency == "INR" && digits.length > 3) {
      val head = digits.dropLast(3)
      head.reversed().chunked(2).joinToString(",").reversed() + "," + digits.takeLast(3)
    } else digits.reversed().chunked(3).joinToString(",").reversed()
    val symbol = when (currency) { "INR" -> "₹"; "USD" -> "$"; "EUR" -> "€"; "GBP" -> "£"; else -> "$currency " }
    return symbol + grouped + (if (paise != 0L) ".%02d".format(paise) else "")
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
    if (insight) {
      val details = repository.reminderDetails(eventId) ?: return
      if (details.kind in ReminderTiming.HIGH_PRIORITY) {
        val alarm = repository.reminderSettings().second
        if (!UserReminderScheduler.showDue(context, details, alarm)) { repository.markReminderUnavailable(eventId, true); return }
        repository.scheduleFollowUp(eventId)
        return
      }
    }
    if (!UserReminderScheduler.show(context, eventId, insight)) repository.markReminderUnavailable(eventId, insight)
  }

  companion object {
    const val EXTRA_EVENT_ID = "notifyiq.reminder.event_id"
    const val EXTRA_INSIGHT = "notifyiq.reminder.insight"
  }
}

/** "Paid / Done" and "Remind me in 1 hour" on a due reminder. */
class ReminderActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val eventId = intent.getLongExtra(NotificationReminderReceiver.EXTRA_EVENT_ID, -1L)
    if (eventId <= 0L) return
    UserReminderScheduler.cancelShown(context, eventId)
    val repository = NotificationRepository(context)
    when (intent.action) {
      DONE -> repository.completeReminder(eventId)
      SNOOZE -> repository.snoozeReminder(eventId, 60)
    }
  }

  companion object {
    const val DONE = "com.notifyiq.reminder.DONE"
    const val SNOOZE = "com.notifyiq.reminder.SNOOZE"
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
