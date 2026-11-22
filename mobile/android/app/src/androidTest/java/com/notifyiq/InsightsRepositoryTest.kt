package com.notifyiq

import androidx.sqlite.driver.bundled.BundledSQLiteDriver
import androidx.sqlite.execSQL
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith

/** Money, upcoming and recurring insights stored alongside synthetic source events. */
@RunWith(AndroidJUnit4::class)
class InsightsRepositoryTest {
  @get:Rule val temporaryFolder = TemporaryFolder()
  private val day = 86_400_000L

  private fun captured(key: String, body: String, at: Long, title: String? = "Bank", pkg: String = "example.bank") =
    CapturedNotification(NotificationIdentity(pkg, key), title, body, null, at, at)

  @Test
  fun moneySummaryTotalsDebitsAndCreditsAndHonoursDismiss() {
    val repository = NotificationRepository(temporaryFolder.newFile("money.db"))
    val now = System.currentTimeMillis()
    repository.upsert(captured("a", "Rs 250.00 debited from A/c XX12 at SWIGGY", now - 1_000))
    repository.upsert(captured("b", "₹1,500 credited to your A/c XX12 from priya@ybl", now - 2_000))
    repository.upsert(captured("c", "Your A/c XX12 balance is Rs 9,999", now - 3_000))
    repository.upsert(captured("d", "Get flat ₹150 cashback on recharge", now - 4_000, pkg = "example.shop"))
    repository.upsert(captured("e", "Rs.499.00 debited from A/c XX12 at NETFLIX", now - 5_000))

    val summary = repository.moneySummary(now - day, now + 1_000)
    assertEquals("INR", summary.currency)
    assertEquals(74_900L, summary.spentMinor)
    assertEquals(150_000L, summary.receivedMinor)
    assertEquals(2, summary.debitCount)
    assertEquals("Netflix", summary.merchants.first().label)

    val netflix = summary.recent.first { it.merchant == "Netflix" }
    repository.dismissInsight(netflix.eventId)
    assertEquals(25_000L, repository.moneySummary(now - day, now + 1_000).spentMinor)
  }

  @Test
  fun upcomingActionsAreOrderedDedupedAndRemovedWithTheirSource() {
    val repository = NotificationRepository(temporaryFolder.newFile("upcoming.db"))
    val now = System.currentTimeMillis()
    val due = java.time.LocalDate.now().plusDays(5)
    val dueText = "%02d/%02d/%d".format(due.dayOfMonth, due.monthValue, due.year)
    repository.upsert(captured("bill", "Your electricity bill of Rs 1,240 is due on $dueText", now, title = "Electricity bill"))
    repository.upsert(captured("bill-repeat", "Your electricity bill of Rs 1,240 is due on $dueText", now + 1, title = "Electricity bill"))
    repository.upsert(captured("appt", "Appointment confirmed with Dr. Mehta tomorrow at 10:30 AM", now, title = "Clinic", pkg = "example.health"))

    val upcoming = repository.upcomingActions(now)
    assertEquals(listOf("appointment", "bill_due"), upcoming.map { it.kind })
    assertEquals(124_000L, upcoming.last().amountMinor)

    repository.delete(upcoming.first().eventId)
    assertEquals(listOf("bill_due"), repository.upcomingActions(now).map { it.kind })
    repository.clear()
    assertTrue(repository.upcomingActions(now).isEmpty())
    assertEquals(0L, repository.moneySummary(0, Long.MAX_VALUE).spentMinor)
  }

  @Test
  fun recurringPaymentsDetectMonthlyCadenceAndPredictNext() {
    val repository = NotificationRepository(temporaryFolder.newFile("recurring.db"))
    val now = System.currentTimeMillis()
    listOf(90L, 60L, 30L).forEachIndexed { index, ago ->
      repository.upsert(captured("gym-$index", "Rs 1,200 debited from A/c XX12 at FITPASS STUDIO", now - ago * day))
    }
    repository.upsert(captured("one-off", "Rs 3,000 debited from A/c XX12 at CROMA", now - 10 * day))

    val recurring = repository.recurringPayments(now)
    val gym = recurring.single { it.merchant == "Fitpass Studio" }
    assertEquals("monthly", gym.cadence)
    assertEquals(120_000L, gym.amountMinor)
    assertTrue(gym.nextExpectedAt!! > now - day)
    assertTrue(recurring.none { it.merchant == "Croma" })
  }

  @Test
  fun migrationBackfillsInsightsForExistingHistory() {
    val file = temporaryFolder.newFile("legacy.db")
    val connection = BundledSQLiteDriver().open(file.absolutePath)
    connection.execSQL("CREATE TABLE app_preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)")
    connection.execSQL("CREATE TABLE notification_events (id INTEGER PRIMARY KEY AUTOINCREMENT, package_name TEXT NOT NULL, notification_key TEXT NOT NULL, title TEXT, body TEXT, subtext TEXT, posted_at INTEGER NOT NULL, received_at INTEGER NOT NULL, removed_at INTEGER)")
    connection.execSQL("CREATE UNIQUE INDEX idx_active_event ON notification_events(package_name, notification_key) WHERE removed_at IS NULL")
    connection.execSQL("CREATE INDEX idx_events_received ON notification_events(received_at DESC, id DESC)")
    val now = System.currentTimeMillis()
    connection.execSQL("INSERT INTO notification_events(package_name, notification_key, title, body, posted_at, received_at) VALUES ('example.bank', 'legacy', 'Bank', 'Rs 640.00 debited from A/c XX12 at BLINKIT', $now, $now)")
    connection.execSQL("PRAGMA user_version = 1")
    connection.close()

    val summary = NotificationRepository(file).moneySummary(now - day, now + day)
    assertEquals(64_000L, summary.spentMinor)
    assertEquals("Blinkit", summary.merchants.single().label)
    assertNull(summary.otherCurrencies.firstOrNull())
  }
}
