package com.notifyiq

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith

/**
 * Opt-in scale check (Phase 7): grows one database to 1k, 10k and 50k synthetic rows and times
 * search, paging, filtering, overview, retention cleanup and clear. Run with
 * `-Pandroid.testInstrumentationRunnerArguments.notifyiqScale=true`.
 */
@RunWith(AndroidJUnit4::class)
class RepositoryScaleTest {
  @get:Rule val temporaryFolder = TemporaryFolder()

  @Test
  fun repositoryStaysCorrectAndResponsiveAt50kRows() {
    val enabled = InstrumentationRegistry.getArguments().getString("notifyiqScale") == "true"
    assumeTrue("Scale test is opt-in", enabled)

    val repository = NotificationRepository(temporaryFolder.newFile("scale.db"))
    repository.setRetentionDays(-1)
    val now = System.currentTimeMillis()
    val oldTime = now - 60L * 86_400_000L
    var inserted = 0

    for (target in listOf(1_000, 10_000, 50_000)) {
      val startCount = inserted
      val started = System.nanoTime()
      while (inserted < target) {
        val i = inserted
        // Every 4th row is old (eligible for 7-day retention); old rows carry the token "archaic".
        val old = i % 4 == 0
        val receivedAt = if (old) oldTime + i else now - (i % 600) * 60_000L
        val text = templates[i % templates.size].replace("#", i.toString()) + if (old) " archaic" else " current"
        repository.upsert(
          CapturedNotification(
            NotificationIdentity("example.app${i % 25}", "key-$i"), text, text, null, receivedAt, receivedAt,
          ),
        )
        inserted++
      }
      val insertMs = ms(started)

      val searchMs = median(20) { repository.notifications(NotificationFilters(query = queries[it % queries.size])) }
      val firstPage = repository.notifications(NotificationFilters(limit = 50))
      val firstPageMs = median(10) { repository.notifications(NotificationFilters(limit = 50)) }
      val last = firstPage.last()
      val nextPageMs = median(10) {
        repository.notifications(NotificationFilters(beforeReceivedAt = last.receivedAt, beforeId = last.id, limit = 50))
      }
      val categoryMs = median(10) { repository.notifications(NotificationFilters(category = "delivery_shopping")) }
      val overviewMs = median(5) { repository.dailyOverview(now) }

      val parcel = repository.notifications(NotificationFilters(query = "parcel"))
      assertEquals(50, firstPage.size)
      assertTrue(parcel.isNotEmpty() && parcel.all { it.body.orEmpty().contains("parcel", ignoreCase = true) })
      println(
        "NOTIFYIQ_SCALE rows=$target insert_ms=$insertMs insert_per_row_us=${insertMs * 1000 / (target - startCount)} " +
          "search_p50_ms=$searchMs first_page_p50_ms=$firstPageMs next_page_p50_ms=$nextPageMs " +
          "category_p50_ms=$categoryMs overview_p50_ms=$overviewMs db_kb=${temporaryFolder.root.walk().filter { it.isFile }.sumOf { it.length() } / 1024}"
      )
    }

    assertTrue(repository.notifications(NotificationFilters(query = "archaic")).isNotEmpty())
    val retentionStarted = System.nanoTime()
    repository.setRetentionDays(7)
    val retentionMs = ms(retentionStarted)
    assertTrue("Expired rows and their FTS entries are removed", repository.notifications(NotificationFilters(query = "archaic")).isEmpty())
    assertTrue(repository.notifications(NotificationFilters(query = "current")).isNotEmpty())

    val clearStarted = System.nanoTime()
    repository.clear()
    val clearMs = ms(clearStarted)
    assertTrue(repository.notifications(NotificationFilters()).isEmpty())
    assertTrue(repository.notifications(NotificationFilters(query = "current")).isEmpty())
    println("NOTIFYIQ_SCALE_MAINTENANCE retention_cleanup_12500_rows_ms=$retentionMs clear_37500_rows_ms=$clearMs")
  }

  private fun ms(start: Long) = (System.nanoTime() - start) / 1_000_000L

  private fun median(runs: Int, block: (Int) -> Unit): Long =
    (0 until runs).map { run -> System.nanoTime().also { block(run) }.let { ms(it) } }.sorted()[runs / 2]

  private companion object {
    val templates = listOf(
      "Your parcel # is out for delivery today",
      "Payment of # rupees received in your wallet",
      "Team meeting # starts in 15 minutes",
      "Flash sale # percent off selected items",
      "Your train # departs from platform 4",
      "New comment on your photo from friend #",
      "System update # is ready to install",
      "Message # from a contact is waiting",
    )
    val queries = listOf("parcel", "payment", "meeting", "sale", "train", "comment", "update", "message delivery")
  }
}
