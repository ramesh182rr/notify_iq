package com.notifyiq

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** One payment reported by several apps counts once; different payments are never merged. Synthetic data. */
@RunWith(AndroidJUnit4::class)
class SamePaymentTest {
  private val context = InstrumentationRegistry.getInstrumentation().targetContext
  private lateinit var db: File
  private lateinit var repository: NotificationRepository
  private val base = System.currentTimeMillis() - 3_600_000L

  @Before fun open() { db = File(context.cacheDir, "same-payment.db").also { it.delete() }; repository = NotificationRepository(db) }
  @After fun close() { NotificationRepository.release(db); db.delete() }

  private fun post(pkg: String, key: String, body: String, minutes: Int, sender: String = "Alert") {
    val at = base + minutes * 60_000L
    repository.upsert(CapturedNotification(NotificationIdentity(pkg, key), sender, body, null, at, at))
  }

  private fun summary() = repository.moneySummary(base - 60_000, System.currentTimeMillis() + 60_000)

  @Test
  fun bankSmsPaymentAppAndWhatsAppForOnePaymentCountOnce() {
    post("example.sms", "1", "Rs 450.00 debited from A/c XX12 to SRI BALAJI FILLING STATION via UPI", 0)
    post("example.upiapp", "2", "₹450 paid to Sri Balaji Filling Station", 1)
    post("example.chat", "3", "Your account XX12 is debited with INR 450.00", 2)
    val s = summary()
    assertEquals(45_000L, s.spentMinor)
    assertEquals(1, s.debitCount)
    assertEquals("the kept row names the merchant", "fuel", s.recent.single().category)
    assertEquals(2, s.recent.single().alsoFrom.size)
  }

  @Test
  fun differentPaymentsStaySeparate() {
    post("example.sms", "1", "Rs 450 debited from A/c XX12 to CHAI POINT", 0)
    post("example.upiapp", "2", "₹450 paid to Spice Kitchen", 1)              // same amount, different merchant
    post("example.upiapp", "3", "₹120 paid to Brew Cafe", 2)                  // same app, two real payments
    post("example.upiapp", "4", "₹120 paid to Brew Cafe today", 5)
    post("example.sms", "5", "Rs 450 debited from A/c XX12 at CHAI POINT", 40)   // outside the 15-minute window
    post("example.sms", "6", "Rs 450 credited to A/c XX12 refund", 1)          // money in, not out
    val s = summary()
    assertEquals(5, s.debitCount)
    assertEquals(1, s.creditCount)
  }

  /** Most Indian payment alerts are SMS: the bank's and the UPI app's messages arrive in one SMS app. */
  @Test
  fun bankAndUpiSmsInOneSmsAppCountOnceButOneSendersTwoAlertsDoNot() {
    post("example.sms", "1", "Rs 2,000.00 debited from A/c XX12 via UPI", 0, sender = "AX-EXBANK")
    post("example.sms", "2", "You paid Rs 2,000 to Sri Balaji Filling Station", 1, sender = "JD-EXUPI")
    post("example.sms", "3", "Rs 60 debited from A/c XX12 at CHAI POINT", 3, sender = "AX-EXBANK")
    post("example.sms", "4", "Rs 60 debited from A/c XX12 at CHAI POINT ref 2", 6, sender = "AX-EXBANK")
    val s = summary()
    assertEquals("₹2,000 once, two separate ₹60 teas", 3, s.debitCount)
    assertEquals(200_000L + 6_000L + 6_000L, s.spentMinor)
    val fuel = s.recent.first { it.amountMinor == 200_000L }
    assertEquals("fuel", fuel.category)
    assertEquals(1, fuel.mergedCount)
  }

  @Test
  fun identicalRepostFromTheSameAppCountsOnce() {
    post("example.bank", "a", "Rs 999 debited from A/c XX12 at NETFLIX", 0)
    post("example.bank", "b", "Rs 999 debited from A/c XX12 at NETFLIX", 1)
    assertEquals(1, summary().debitCount)
  }
}
