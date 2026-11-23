package com.notifyiq

import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId

internal data class ReminderDetails(
  val eventId: Long, val kind: String, val dueAt: Long, val originalDueAt: Long, val hasTime: Boolean, val amountMinor: Long?, val currency: String?,
  val merchant: String?, val recurrence: String?, val approximate: Boolean, val stage: Int,
  val title: String?, val body: String?, val packageName: String,
)

/**
 * When automatic reminders go off. Daytime only, so people see them:
 *  - stage 1: the day before the due date at 9 AM;
 *  - stage 2: on the due date at 9 AM, unless the person tapped Done;
 *  - a fresh message that arrives after the day-before time is reminded about straight away;
 *  - AutoPay items then move on to the next cycle.
 */
internal object ReminderTiming {
  /** Coming-up kinds that get automatic, alarm-style reminders. */
  val HIGH_PRIORITY = setOf("bill_due", "subscription_renewal", "expiry", "appointment")
  val REMINDER_TIME: LocalTime = LocalTime.of(9, 0)
  private const val FRESH_MS = 2 * 60 * 60 * 1000L

  private fun zone() = ZoneId.systemDefault()
  private fun date(ms: Long, zone: ZoneId) = Instant.ofEpochMilli(ms).atZone(zone).toLocalDate()

  fun dayBefore(dueAt: Long, zone: ZoneId = zone()): Long =
    date(dueAt, zone).minusDays(1).atTime(REMINDER_TIME).atZone(zone).toInstant().toEpochMilli()

  fun dueMorning(dueAt: Long, zone: ZoneId = zone()): Long =
    date(dueAt, zone).atTime(REMINDER_TIME).atZone(zone).toInstant().toEpochMilli()

  /** The first reminder and its stage, or null if it is too late to be useful. */
  fun first(dueAt: Long, receivedAt: Long, now: Long, zone: ZoneId = zone()): Pair<Long, Int>? {
    if (date(dueAt, zone).isBefore(date(now, zone))) return null
    val before = dayBefore(dueAt, zone)
    if (before > now) return before to 1
    if (now - receivedAt < FRESH_MS) return (now + 60_000L) to 1     // just arrived and due very soon: tell them now
    val morning = dueMorning(dueAt, zone)
    return if (morning > now) morning to 2 else null
  }

  /** After stage 1 is shown: the due-day reminder, if it is still ahead (at least an hour later). */
  fun followUp(dueAt: Long, stage: Int, now: Long, zone: ZoneId = zone()): Long? {
    if (stage >= 2) return null
    val morning = dueMorning(dueAt, zone)
    return if (morning > now + 60 * 60 * 1000L) morning else null
  }

  /** The k-th occurrence, always counted from the original date (31 Jan → 28 Feb → 31 Mar, no drift). */
  private fun occurrence(original: Long, recurrence: String, k: Long, zone: ZoneId): Long {
    val at = Instant.ofEpochMilli(original).atZone(zone)
    val d = at.toLocalDate()
    val date = when (recurrence) {
      "weekly" -> d.plusWeeks(k)
      "quarterly" -> d.plusMonths(3 * k)
      "yearly" -> d.plusYears(k)
      else -> d.plusMonths(k)
    }
    return date.atTime(at.toLocalTime()).atZone(zone).toInstant().toEpochMilli()
  }

  /** First occurrence on or after [notBefore]'s date. */
  fun occurrenceFrom(original: Long, recurrence: String, notBefore: Long, zone: ZoneId = zone()): Long {
    val target = date(notBefore, zone)
    var k = 0L
    while (date(occurrence(original, recurrence, k, zone), zone).isBefore(target) && k < 2000) k++
    return occurrence(original, recurrence, k, zone)
  }

  /** For repeating items, the next date that is today or later. */
  fun currentDue(dueAt: Long, recurrence: String?, now: Long = System.currentTimeMillis(), zone: ZoneId = zone()): Long =
    if (recurrence == null) dueAt else occurrenceFrom(dueAt, recurrence, now, zone)

  /** The occurrence after [current]. */
  fun nextDue(original: Long, current: Long, recurrence: String, zone: ZoneId = zone()): Long =
    occurrenceFrom(original, recurrence, date(current, zone).plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli(), zone)
}
