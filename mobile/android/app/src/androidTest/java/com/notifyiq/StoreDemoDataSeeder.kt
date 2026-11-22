package com.notifyiq

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.time.LocalDate
import java.time.ZoneId
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Opt-in: writes a month of fictional, synthetic notification history into the installed debug app's
 * database for store screenshots. Never runs in normal test passes.
 *
 *   ./gradlew :app:connectedDebugAndroidTest \
 *     -Pandroid.testInstrumentationRunnerArguments.class=com.notifyiq.StoreDemoDataSeeder \
 *     -Pandroid.testInstrumentationRunnerArguments.notifyiqSeedDemo=true
 *
 * Delete it afterwards with Privacy → Delete all notification history.
 */
@RunWith(AndroidJUnit4::class)
class StoreDemoDataSeeder {
  private data class Demo(val pkg: String, val title: String, val body: String, val daysAgo: Int, val hour: Int, val minute: Int = 0)

  @Test
  fun seedFictionalMonth() {
    assumeTrue("Demo seeding is opt-in", InstrumentationRegistry.getArguments().getString("notifyiqSeedDemo") == "true")
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val repository = NotificationRepository(context)
    val zone = ZoneId.systemDefault()
    val today = LocalDate.now(zone)
    fun dueText(days: Long) = today.plusDays(days).let { "%02d/%02d/%d".format(it.dayOfMonth, it.monthValue, it.year) }

    val items = mutableListOf(
      Demo("com.example.chat", "Asha", "Are we still on for dinner tonight?", 0, 9, 12),
      Demo("com.example.wallet", "Payment successful", "₹180 paid to Spice Route Cafe", 0, 9, 40),
      Demo("com.example.courier", "Out for delivery", "Your parcel will arrive today between 2 and 5 pm", 0, 10, 5),
      Demo("com.example.clinic", "Appointment confirmed", "Appointment with Dr. Mehta tomorrow at 10:30 AM", 0, 11, 15),
      Demo("com.example.power", "Electricity bill", "Your electricity bill of Rs 1,240 is due on ${dueText(5)}", 0, 12, 30),
      Demo("com.example.stream", "Membership", "Your StreamPlus membership will renew on ${dueText(9)} for ₹499", 0, 13, 0),
      Demo("com.example.wallet", "Payment successful", "₹245 paid to CityRide cab via UPI", 0, 18, 20),
      Demo("com.example.telecom", "Plan expiry", "Your mobile plan expires on ${dueText(2)}. Recharge to continue services.", 0, 19, 0),
      Demo("com.example.work", "Reminder", "Submit the quarterly report by ${dueText(3)}", 0, 8, 30),
      Demo("com.example.bank", "Salary credited", "Salary of Rs 72,000 credited to your account", 20, 10),
      Demo("com.example.bank", "Interest", "Interest of Rs 342 credited to your savings account", 6, 9),
      Demo("com.example.wallet", "Money received", "You received ₹1,000 from Neha", 4, 20),
      Demo("com.example.shop", "Refund", "Refund of ₹799 processed to your original payment method", 3, 15),
      Demo("com.example.social", "New follower", "Ravi started following you", 0, 16, 45),
      Demo("com.example.store", "Weekend sale", "Flash sale: 40 percent off selected items", 1, 11),
    )
    val spends = listOf(
      "₹450 paid to Spice Route Restaurant" to 7, "₹210 paid to Brew Cafe" to 3, "₹60 paid to Chai Corner" to 2,
      "₹1,240 paid to FreshCart grocery" to 5, "₹2,000 spent at fuel station" to 6, "₹1,180 paid to RailGo for train ticket" to 9,
      "₹560 paid for movie tickets" to 4, "₹2,345 paid for shopping order" to 8, "₹499 paid to StreamPlus subscription" to 21,
      "₹650 paid to salon" to 12, "₹320 paid to CityRide cab" to 1, "₹890 paid to FreshCart grocery" to 13,
      "₹150 paid to Brew Cafe" to 10, "₹3,500 paid to apartment maintenance" to 15, "₹1,600 paid to city power bill" to 17,
    )
    spends.forEachIndexed { index, (text, days) -> items += Demo("com.example.wallet", "Payment successful", text, days, 9 + (index * 3) % 12, (index * 7) % 60) }

    items.forEachIndexed { index, item ->
      val now = System.currentTimeMillis()
      val planned = today.minusDays(item.daysAgo.toLong()).atTime(item.hour, item.minute).atZone(zone).toInstant().toEpochMilli()
      val at = if (planned > now) now - (index + 1) * 7 * 60_000L else planned
      repository.upsert(CapturedNotification(NotificationIdentity(item.pkg, "demo-$index"), item.title, item.body, null, at, at))
    }
  }
}
