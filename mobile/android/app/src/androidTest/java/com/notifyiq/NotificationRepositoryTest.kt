package com.notifyiq

import androidx.sqlite.driver.bundled.BundledSQLiteDriver
import androidx.sqlite.execSQL
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import androidx.test.ext.junit.runners.AndroidJUnit4

@RunWith(AndroidJUnit4::class)
class NotificationRepositoryTest {
  @get:Rule val temporaryFolder = TemporaryFolder()

  @Test
  fun ftsTracksInsertUpdateDeleteAndClear() {
    val repository = NotificationRepository(temporaryFolder.newFile("events.db"))
    val original = captured("Invoice due tomorrow")
    repository.upsert(original)

    assertEquals(1, repository.notifications(NotificationFilters(query = "invoice")).size)
    val id = repository.notifications(NotificationFilters()).single().id
    repository.upsert(original.copy(title = "Receipt", body = "Paid today"))
    assertTrue(repository.notifications(NotificationFilters(query = "invoice")).isEmpty())
    assertEquals(1, repository.notifications(NotificationFilters(query = "receipt")).size)

    repository.delete(id)
    assertTrue(repository.notifications(NotificationFilters(query = "receipt")).isEmpty())
    repository.upsert(original)
    repository.clear()
    assertTrue(repository.notifications(NotificationFilters(query = "invoice")).isEmpty())
  }

  @Test
  fun retentionKeepsSavedRowsAndDeletesExpiredUnSavedRows() {
    val repository = NotificationRepository(temporaryFolder.newFile("retention.db"))
    repository.setRetentionDays(-1)
    val oldTime = System.currentTimeMillis() - 31L * 86_400_000L
    repository.upsert(captured("Saved history", notificationKey = "saved", receivedAt = oldTime))
    repository.upsert(captured("Expired history", notificationKey = "expired", receivedAt = oldTime))
    val savedId = repository.notifications(NotificationFilters()).first { it.title == "Saved history" }.id
    repository.setSaved(savedId, true)

    repository.setRetentionDays(7)

    val remaining = repository.notifications(NotificationFilters())
    assertEquals(listOf("Saved history"), remaining.map { it.title })
    assertTrue(remaining.single().saved)
  }

  @Test
  fun archiveAndAppExclusionKeepSearchIndexConsistent() {
    val repository = NotificationRepository(temporaryFolder.newFile("actions.db"))
    repository.upsert(captured("Package update", packageName = "example.app"))
    val id = repository.notifications(NotificationFilters()).single().id
    repository.setArchived(id, true)
    assertTrue(repository.notifications(NotificationFilters(query = "package")).isEmpty())
    assertEquals(1, repository.notifications(NotificationFilters(query = "package", includeArchived = true)).size)

    repository.setExcluded("example.app", true)
    assertTrue(repository.getExcludedPackages().contains("example.app"))
    assertTrue(repository.notifications(NotificationFilters(query = "package", includeArchived = true)).isEmpty())
  }

  @Test
  fun migratesSchemaVersionOneToAnalysisAndGroupingVersionFour() {
    val file = temporaryFolder.newFile("migration.db")
    val connection = BundledSQLiteDriver().open(file.absolutePath)
    connection.execSQL("CREATE TABLE app_preferences (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)")
    connection.execSQL("CREATE TABLE notification_events (id INTEGER PRIMARY KEY AUTOINCREMENT, package_name TEXT NOT NULL, notification_key TEXT NOT NULL, title TEXT, body TEXT, subtext TEXT, posted_at INTEGER NOT NULL, received_at INTEGER NOT NULL, removed_at INTEGER)")
    connection.execSQL("CREATE UNIQUE INDEX idx_active_event ON notification_events(package_name, notification_key) WHERE removed_at IS NULL")
    connection.execSQL("CREATE INDEX idx_events_received ON notification_events(received_at DESC, id DESC)")
    val now = Math.floorDiv(System.currentTimeMillis(), 30L * 60_000L) * (30L * 60_000L) + 1_000L
    connection.execSQL("INSERT INTO notification_events(package_name, notification_key, title, body, posted_at, received_at) VALUES ('example.app', 'legacy', 'Package', 'Your package was delivered', $now, $now)")
    connection.execSQL("PRAGMA user_version = 1")
    connection.close()

    val repository = NotificationRepository(file)
    repository.upsert(captured("Migrated invoice"))

    assertEquals(1, repository.notifications(NotificationFilters(query = "migrated")).size)
    assertEquals("delivery_shopping", repository.notifications(NotificationFilters(query = "package")).single().category)
    assertEquals(30, repository.getRetentionDays())
  }

  @Test
  fun classificationIsStoredSeparatelyFilterableAndUserCorrectable() {
    val repository = NotificationRepository(temporaryFolder.newFile("analysis.db"))
    repository.upsert(captured("Payment failed: emergency alert"))

    val original = repository.notifications(NotificationFilters(category = "finance")).single()
    assertEquals("urgent", original.priority)
    assertEquals("finance", original.category)
    assertEquals("deterministic_rules", original.analysisMethod)
    assertEquals(0.82, original.confidence, 0.0)

    repository.setCategoryOverride(original.id, "travel")
    assertTrue(repository.notifications(NotificationFilters(category = "finance")).isEmpty())
    assertEquals("travel", repository.notifications(NotificationFilters(category = "travel")).single().category)

    repository.setCategoryOverride(original.id, null)
    assertEquals("finance", repository.notifications(NotificationFilters(category = "finance")).single().category)
  }

  @Test
  fun groupsExactDuplicatesWithinAppAndWindowWithoutDeletingSources() {
    val repository = NotificationRepository(temporaryFolder.newFile("duplicates.db"))
    repository.setRetentionDays(-1)
    val now = Math.floorDiv(System.currentTimeMillis(), 30L * 60_000L) * (30L * 60_000L) + 1_000L
    repository.upsert(captured("Your parcel was delivered", notificationKey = "first", receivedAt = now))
    repository.upsert(captured(" Your parcel was delivered ", notificationKey = "second", receivedAt = now + 60_000))
    repository.upsert(captured("Your parcel was delivered", packageName = "another.app", notificationKey = "other-app", receivedAt = now))
    repository.upsert(captured("Your parcel was delivered", notificationKey = "later", receivedAt = now + 31L * 60_000))

    val allItems = repository.notifications(NotificationFilters(limit = 100))
    val grouped = allItems.filter { it.packageName == "example.app" && it.receivedAt <= now + 60_000 }
    assertEquals(4, allItems.size)
    assertEquals(2, grouped.size)
    assertEquals(setOf(2), grouped.map { it.duplicateCount }.toSet())
    assertEquals(1, grouped.mapNotNull { it.duplicateGroupId }.distinct().size)
    assertTrue(allItems.any { it.packageName == "another.app" && it.duplicateCount == 1 })

    repository.delete(grouped.first().id)
    val remainingPair = repository.notifications(NotificationFilters(limit = 100)).filter { it.packageName == "example.app" }
    assertTrue(remainingPair.all { it.duplicateCount == 1 && it.duplicateGroupId == null })
    assertEquals(3, repository.notifications(NotificationFilters(limit = 100)).size)
  }

  @Test
  fun dailyOverviewAggregatesLocalRowsAndReturnsSourceNotifications() {
    val repository = NotificationRepository(temporaryFolder.newFile("overview.db"))
    repository.setRetentionDays(-1)
    val now = System.currentTimeMillis()
    repository.upsert(captured("Payment received", packageName = "finance.app", notificationKey = "payment", receivedAt = now))
    repository.upsert(captured("Your parcel was delivered", packageName = "delivery.app", notificationKey = "parcel", receivedAt = now + 1_000))

    val overview = repository.dailyOverview(now)
    assertEquals(2, overview.totalCount)
    assertEquals(2, overview.appCount)
    assertEquals(setOf("finance", "delivery_shopping"), overview.categories.map { it.label }.toSet())
    assertEquals(2, overview.sources.size)
    assertEquals(2, overview.hours.sumOf { it.count })
    assertTrue(overview.sources.any { it.title == "Payment received" })
  }

  private fun captured(
    body: String,
    packageName: String = "example.app",
    notificationKey: String = "notification-key",
    receivedAt: Long = System.currentTimeMillis(),
  ) = CapturedNotification(
    NotificationIdentity(packageName, notificationKey),
    title = body,
    body = body,
    subtext = null,
    postedAt = receivedAt,
    receivedAt = receivedAt,
  )
}
