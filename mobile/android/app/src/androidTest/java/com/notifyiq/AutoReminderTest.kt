package com.notifyiq

import android.app.Notification
import android.app.NotificationManager
import android.content.Intent
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Automatic, alarm-style reminders for bills and AutoPay. Synthetic data; cleans up after itself. */
@RunWith(AndroidJUnit4::class)
class AutoReminderTest {
  private val instrumentation = InstrumentationRegistry.getInstrumentation()
  private val context = instrumentation.targetContext
  private val repository = NotificationRepository(context)
  private val zone = ZoneId.systemDefault()
  private val manager = context.getSystemService(NotificationManager::class.java)

  @Before fun setUp() {
    instrumentation.uiAutomation.executeShellCommand("pm grant ${context.packageName} android.permission.POST_NOTIFICATIONS").close()
    Thread.sleep(500)
    repository.clear()
    repository.setReminderSettings(auto = true, alarm = true)
  }

  @After fun tearDown() {
    manager.cancelAll()
    repository.clear()
    repository.setReminderSettings(auto = true, alarm = true)
  }

  private fun post(key: String, title: String, body: String): Long {
    val now = System.currentTimeMillis()
    repository.upsert(CapturedNotification(NotificationIdentity("example.bank", key), title, body, null, now, now))
    return repository.notifications(NotificationFilters()).first { it.title == title }.id
  }

  private fun upcoming(id: Long) = repository.upcomingActions().first { it.eventId == id }
  private fun inDays(days: Long) = LocalDate.now(zone).plusDays(days)
  private fun nineAm(date: LocalDate) = date.atTime(9, 0).atZone(zone).toInstant().toEpochMilli()

  @Test
  fun billGetsADayBeforeReminderThatRingsAndFollowsUpOnTheDay() {
    val due = inDays(5)
    val id = post("bill", "Electricity", "Your electricity bill of Rs 1,240 is due on ${due.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))}")
    val item = upcoming(id)
    assertEquals("pending", item.reminderStatus)
    assertEquals(nineAm(due.minusDays(1)), item.reminderAt)

    // The alarm fires: an alarm-style notification that says what is due.
    NotificationReminderReceiver().onReceive(context, Intent().putExtra(NotificationReminderReceiver.EXTRA_EVENT_ID, id).putExtra(NotificationReminderReceiver.EXTRA_INSIGHT, true))
    val shown = manager.activeNotifications.firstOrNull { it.id == -id.toInt() }
    assertNotNull("reminder shown", shown)
    val n = shown!!.notification
    assertEquals("due_alarms", n.channelId)
    assertTrue("rings until seen", n.flags and Notification.FLAG_INSISTENT != 0)
    assertTrue(n.extras.getCharSequence(Notification.EXTRA_TITLE).toString().startsWith("Bill due in 5 days · ₹1,240"))
    assertEquals(2, n.actions.size)
    assertEquals(Notification.VISIBILITY_PRIVATE, n.visibility)
    assertEquals("due-day follow-up", nineAm(due), upcoming(id).reminderAt)

    // "Paid / Done" stops further reminders.
    ReminderActionReceiver().onReceive(context, Intent(ReminderActionReceiver.DONE).putExtra(NotificationReminderReceiver.EXTRA_EVENT_ID, id))
    assertEquals("done", upcoming(id).reminderStatus)
    assertNull(manager.activeNotifications.firstOrNull { it.id == -id.toInt() })
  }

  @Test
  fun autoPayMandateRemindsEachCycle() {
    val id = post("mandate", "AutoPay", "Your UPI AutoPay mandate for StreamPlus of Rs 649 has been successfully created. Frequency: Monthly")
    val item = upcoming(id)
    assertEquals("monthly", item.recurrence)
    val nextDue = LocalDate.now(zone).plusMonths(1)
    assertEquals(nextDue, java.time.Instant.ofEpochMilli(item.dueAt).atZone(zone).toLocalDate())
    assertEquals(nineAm(nextDue.minusDays(1)), item.reminderAt)
    ReminderActionReceiver().onReceive(context, Intent(ReminderActionReceiver.DONE).putExtra(NotificationReminderReceiver.EXTRA_EVENT_ID, id))
    assertEquals("Done moves on to the next AutoPay", nineAm(LocalDate.now(zone).plusMonths(2).minusDays(1)), upcoming(id).reminderAt)
    assertEquals("pending", upcoming(id).reminderStatus)
  }

  @Test
  fun snoozeOffSwitchAndCancelledRemindersAreRespected() {
    val due = inDays(3).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
    val a = post("a", "Water", "Water bill of Rs 350 is due on $due")
    val before = System.currentTimeMillis()
    ReminderActionReceiver().onReceive(context, Intent(ReminderActionReceiver.SNOOZE).putExtra(NotificationReminderReceiver.EXTRA_EVENT_ID, a))
    assertTrue("snoozed about an hour", upcoming(a).reminderAt!! in before + 59 * 60_000..before + 61 * 60_000)

    repository.clearInsightReminder(a)
    post("a", "Water", "Water bill of Rs 350 is due on $due (updated)")
    assertEquals("a cancelled reminder is not added back", "off", upcoming(a).reminderStatus)

    repository.setReminderSettings(auto = false, alarm = true)
    val b = post("b", "Gas", "Gas bill of Rs 860 is due on $due")
    assertNull("no automatic reminder when switched off", upcoming(b).reminderStatus)
  }
}
