package com.notifyiq

import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.Locale
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Coming-up understanding beyond full dates: day-only dates ("on 30th"), "this month"/"month end",
 * bare amounts ("bill of 2000"), AutoPay/e-mandate set-ups and executed AutoPay debits (next date and
 * repeat). Written before the implementation; posted Sunday 2026-11-22 10:00 Asia/Kolkata.
 */
class ComingUpExtractionTest {
  private val zone = ZoneId.of("Asia/Kolkata")
  private val posted = LocalDateTime.parse("2026-11-22T10:00").atZone(zone).toInstant().toEpochMilli()

  /** kind, due date, amount (rupees) or null, recurrence or null, approximate */
  private data class Expect(val kind: String?, val due: String? = null, val amount: Long? = null, val recurrence: String? = null, val approximate: Boolean = false)

  private val cases = listOf(
    "This month we have to pay current bill of 2000" to Expect("bill_due", "2026-11-30", 2000, approximate = true),
    "Rs 200 bill due on 30th" to Expect("bill_due", "2026-11-30", 200),
    "Your broadband bill of Rs 799 is due on 5th" to Expect("bill_due", "2026-12-05", 799),
    "Pay your water bill of ₹350 by the 25th" to Expect("bill_due", "2026-11-25", 350),
    "Your mobile bill of Rs 499 is due by month end" to Expect("bill_due", "2026-11-30", 499, approximate = true),
    "Credit card bill of Rs 5,430 due on the 2nd" to Expect("bill_due", "2026-12-02", 5430),
    "School fee of Rs 12,000 to be paid this month" to Expect("bill_due", "2026-11-30", 12000, approximate = true),
    "Reminder: rent of 15000 due on 1st" to Expect("bill_due", "2026-12-01", 15000),
    "Next month's rent 15000 to be paid by 5th" to Expect("bill_due", "2026-12-05", 15000),
    "Your UPI AutoPay mandate for Netflix of Rs 649 has been successfully created. Frequency: Monthly" to Expect("subscription_renewal", "2026-12-22", 649, "monthly", approximate = true),
    "e-Mandate registered for Spotify. Rs 119 will be debited on 5th of every month" to Expect("subscription_renewal", "2026-12-05", 119, "monthly"),
    "AutoPay set up: ₹299 for JioHotstar every month, next debit on 10 Dec" to Expect("subscription_renewal", "2026-12-10", 299, "monthly"),
    "₹149 debited from A/c XX12 via UPI AutoPay for YouTube Premium" to Expect("subscription_renewal", "2026-12-22", 149, "monthly", approximate = true),
    "Standing instruction registered for your LIC premium of Rs 2,500, yearly" to Expect("subscription_renewal", "2027-11-22", 2500, "yearly", approximate = true),
    "AutoPay of Rs 199 for Netflix will be debited tomorrow" to Expect("subscription_renewal", "2026-11-23", 199),
    "Your Amazon Prime membership will auto-renew on 3rd" to Expect("subscription_renewal", "2026-12-03"),
    // Must not become coming-up items
    "Get 30% off this month on all bills paid via the app" to Expect(null),
    "You paid Rs 2,000 for electricity bill on 30th Oct" to Expect(null),
    "Thanks for your payment of Rs 650. Your bill for this month is paid" to Expect(null),
    "Your order of 2 items will arrive by the 25th" to Expect(null),
  )

  /** Written after the implementation and not used to tune it (reported, not gated). */
  private val unseen = listOf(
    "Gas bill Rs 860 payable by 28th" to Expect("bill_due", "2026-11-28", 860),
    "Your EMI of Rs 6,250 will be debited on 7th" to Expect("bill_due", "2026-12-07", 6250),
    "Maintenance charges of 3500 to be paid this month" to Expect("bill_due", "2026-11-30", 3500, approximate = true),
    "Tuition fees 4000 due by month-end" to Expect("bill_due", "2026-11-30", 4000, approximate = true),
    "Mandate created successfully for Disney+ Hotstar, ₹299 every month" to Expect("subscription_renewal", "2026-12-22", 299, "monthly", approximate = true),
    "UPI AutoPay: ₹59 debited for Google One storage" to Expect("subscription_renewal", "2026-12-22", 59, "monthly", approximate = true),
    "SIP of Rs 5,000 registered via mandate, monthly on 10th" to Expect("subscription_renewal", "2026-12-10", 5000, "monthly"),
    "Your insurance premium of Rs 18,200 is due on the 15th of next month" to Expect("bill_due", "2026-12-15", 18200),
    "Your Swiggy One membership renews on 1st for ₹99" to Expect("subscription_renewal", "2026-12-01", 99),
    "Electricity bill paid successfully. Thank you" to Expect(null),
    "Meet me on 30th at the cafe" to Expect(null),
    "AutoPay mandate for Netflix has been revoked" to Expect(null),
  )

  @Test
  fun reportUnseenCases() = evaluate(unseen, "COMING_UP_UNSEEN", gate = 0.0)

  @Test
  fun comingUpCasesMeetAccuracyGate() = evaluate(cases, "COMING_UP_EVAL", gate = 0.9)

  private fun evaluate(cases: List<Pair<String, Expect>>, label: String, gate: Double) {
    var ok = 0
    val misses = mutableListOf<String>()
    cases.forEach { (text, expect) ->
      val action = InsightExtractor.extract("Alert", text, posted, zone).action
      val got = action?.let {
        Expect(
          it.kind.wire, Instant.ofEpochMilli(it.dueAt).atZone(zone).toLocalDate().toString(), it.amountMinor?.div(100),
          it.recurrence, it.approximate,
        )
      } ?: Expect(null)
      val pass = if (expect.kind == null) action == null else got == expect
      if (pass) ok++ else misses += "“$text” got $got expected $expect"
    }
    val accuracy = ok.toDouble() / cases.size
    println(String.format(Locale.ROOT, "%s cases=%d accuracy=%.3f", label, cases.size, accuracy))
    misses.forEach { println("${label}_MISS $it") }
    assertTrue("coming-up accuracy $accuracy", accuracy >= gate)
  }
}
