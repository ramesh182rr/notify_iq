package com.notifyiq

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/** Search finds text anywhere in a word, any word order, and by app name. Synthetic data. */
@RunWith(AndroidJUnit4::class)
class SearchTest {
  private val context = InstrumentationRegistry.getInstrumentation().targetContext
  private lateinit var db: File
  private lateinit var repository: NotificationRepository

  @Before fun open() {
    db = File(context.cacheDir, "search.db").also { it.delete() }
    repository = NotificationRepository(db)
    val now = System.currentTimeMillis()
    fun post(pkg: String, key: String, title: String, body: String) = repository.upsert(CapturedNotification(NotificationIdentity(pkg, key), title, body, null, now, now))
    post("example.chat", "1", "Asha", "Are we still meeting for dinner tonight?")
    post("example.bank", "2", "Payment successful", "₹2,000 paid to Sri Balaji Filling Station")
    post("example.courier", "3", "Out for delivery", "Your parcel AWB12345678 arrives today")
    repository.recordApp("example.chat", "ChatApp Messenger", null)
  }

  @After fun close() { NotificationRepository.release(db); db.delete() }

  private fun search(q: String) = repository.notifications(NotificationFilters(query = q)).map { it.packageName }.sorted()

  @Test fun findsTextInsideWords() {
    assertEquals(listOf("example.bank"), search("balaji"))
    assertEquals(listOf("example.bank"), search("filling stat"))   // partial last word
    assertEquals(listOf("example.chat"), search("eeting"))           // middle of a word
    assertEquals(listOf("example.courier"), search("345678"))        // part of a tracking number
    assertEquals(listOf("example.bank"), search("PAYMENT"))          // any case
  }

  @Test fun allWordsMustMatchInAnyOrder() {
    assertEquals(listOf("example.bank"), search("station balaji"))
    assertEquals(emptyList<String>(), search("balaji dinner"))
  }

  @Test fun findsByAppNameAndShortTerms() {
    assertEquals(listOf("example.chat"), search("messenger"))
    assertEquals(listOf("example.bank"), search("₹2"))
    assertEquals(emptyList<String>(), search("100%"))
  }
}
