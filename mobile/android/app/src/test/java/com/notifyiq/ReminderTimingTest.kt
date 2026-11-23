package com.notifyiq

import java.time.LocalDateTime
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ReminderTimingTest {
  private val zone = ZoneId.of("Asia/Kolkata")
  private fun t(s: String) = LocalDateTime.parse(s).atZone(zone).toInstant().toEpochMilli()
  private fun s(ms: Long) = java.time.Instant.ofEpochMilli(ms).atZone(zone).toLocalDateTime().toString()

  @Test fun remindsTheDayBeforeAtNine() {
    val plan = ReminderTiming.first(t("2026-11-30T00:00"), t("2026-11-22T10:00"), t("2026-11-22T10:00"), zone)!!
    assertEquals("2026-11-29T09:00", s(plan.first)); assertEquals(1, plan.second)
  }

  @Test fun freshMessageDueTomorrowEveningIsRemindedNow() {
    val now = t("2026-11-22T18:30")
    val plan = ReminderTiming.first(t("2026-11-23T00:00"), now - 60_000, now, zone)!!
    assertEquals(now + 60_000, plan.first)
  }

  @Test fun oldItemPastTheDayBeforeGetsTheDueDayMorning() {
    val now = t("2026-11-22T18:30")
    val plan = ReminderTiming.first(t("2026-11-23T00:00"), t("2026-11-20T08:00"), now, zone)!!
    assertEquals("2026-11-23T09:00", s(plan.first)); assertEquals(2, plan.second)
  }

  @Test fun nothingForPastDues() {
    assertNull(ReminderTiming.first(t("2026-11-21T00:00"), t("2026-11-20T08:00"), t("2026-11-22T10:00"), zone))
  }

  @Test fun followUpOnTheDueDayOnlyOnce() {
    assertEquals("2026-11-30T09:00", s(ReminderTiming.followUp(t("2026-11-30T00:00"), 1, t("2026-11-29T09:01"), zone)!!))
    assertNull(ReminderTiming.followUp(t("2026-11-30T00:00"), 2, t("2026-11-30T09:01"), zone))
  }

  @Test fun monthlyAutoPayRollsWithoutDrift() {
    val original = t("2026-01-31T00:00")
    assertEquals("2026-02-28T00:00", s(ReminderTiming.currentDue(original, "monthly", t("2026-02-10T10:00"), zone)))
    assertEquals("2026-03-31T00:00", s(ReminderTiming.currentDue(original, "monthly", t("2026-03-01T10:00"), zone)))
    assertEquals("2026-04-30T00:00", s(ReminderTiming.nextDue(original, t("2026-03-31T00:00"), "monthly", zone)))
  }

  @Test fun yearlyAndUntouchedOneOff() {
    assertEquals("2027-11-22T00:00", s(ReminderTiming.currentDue(t("2025-11-22T00:00"), "yearly", t("2026-11-23T10:00"), zone)))
    assertEquals(t("2026-11-30T00:00"), ReminderTiming.currentDue(t("2026-11-30T00:00"), null, t("2026-12-05T00:00"), zone))
  }
}

class ReminderMoneyFormatTest {
  @Test fun indianGroupingAndPaise() {
    assertEquals("₹1,240", UserReminderScheduler.formatMoney(124_000, "INR"))
    assertEquals("₹1,24,500.50", UserReminderScheduler.formatMoney(12_450_050, "INR"))
    assertEquals("₹999", UserReminderScheduler.formatMoney(99_900, "INR"))
    assertEquals("$1,234,567", UserReminderScheduler.formatMoney(123_456_700, "USD"))
  }
}
