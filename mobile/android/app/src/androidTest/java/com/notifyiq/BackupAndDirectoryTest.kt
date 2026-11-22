package com.notifyiq

import androidx.test.ext.junit.runners.AndroidJUnit4
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class BackupAndDirectoryTest {
  @get:Rule val temporaryFolder = TemporaryFolder()

  private fun captured(key: String, body: String, at: Long = System.currentTimeMillis(), pkg: String = "example.bank") =
    CapturedNotification(NotificationIdentity(pkg, key), "Bank", body, null, at, at)

  @Test
  fun encryptionRoundTripsAndFailsClosed() {
    val payload = ByteArray(50_000) { (it % 251).toByte() }
    val encrypted = ByteArrayOutputStream().also { BackupCrypto.encrypt("correct horse".toCharArray(), ByteArrayInputStream(payload), it) }.toByteArray()
    val decrypted = ByteArrayOutputStream().also { BackupCrypto.decrypt("correct horse".toCharArray(), ByteArrayInputStream(encrypted), it) }.toByteArray()
    assertArrayEquals(payload, decrypted)
    assertTrue("payload must not be stored in clear", !String(encrypted, Charsets.ISO_8859_1).contains(String(payload.copyOfRange(100, 140), Charsets.ISO_8859_1)))

    var wrong = false
    runCatching { BackupCrypto.decrypt("wrong password".toCharArray(), ByteArrayInputStream(encrypted), ByteArrayOutputStream()) }
      .onFailure { wrong = it is BackupCrypto.WrongPasswordOrDamaged }
    assertTrue("wrong password rejected", wrong)

    val tampered = encrypted.copyOf().also { it[it.size - 40] = (it[it.size - 40].toInt() xor 1).toByte() }
    var damaged = false
    runCatching { BackupCrypto.decrypt("correct horse".toCharArray(), ByteArrayInputStream(tampered), ByteArrayOutputStream()) }
      .onFailure { damaged = it is BackupCrypto.WrongPasswordOrDamaged }
    assertTrue("tampered file rejected", damaged)

    var notBackup = false
    runCatching { BackupCrypto.decrypt("x".toCharArray(), ByteArrayInputStream("hello world".toByteArray()), ByteArrayOutputStream()) }
      .onFailure { notBackup = it is BackupCrypto.NotABackup }
    assertTrue("non-backup rejected", notBackup)
  }

  @Test
  fun exportAndRestoreMovesHistoryInsightsAndSettings() {
    val source = NotificationRepository(temporaryFolder.newFile("source.db"))
    source.upsert(captured("a", "Rs 250.00 debited from A/c XX12 at SWIGGY"))
    source.upsert(captured("b", "Your parcel is out for delivery", pkg = "example.courier"))
    source.setExcluded("example.secret", true)
    source.recordApp("example.bank", "Example Bank", "/old/device/icon.png")

    val snapshot = temporaryFolder.newFile("snapshot.db")
    source.snapshotTo(snapshot)
    val encrypted = ByteArrayOutputStream().also { out -> snapshot.inputStream().use { BackupCrypto.encrypt("moving phones".toCharArray(), it, out) } }.toByteArray()
    val restored = temporaryFolder.newFile("restored.db")
    restored.outputStream().use { BackupCrypto.decrypt("moving phones".toCharArray(), ByteArrayInputStream(encrypted), it) }
    NotificationRepository(restored)
    NotificationRepository.release(restored)

    val target = NotificationRepository(temporaryFolder.newFile("target.db"))
    target.upsert(captured("old", "This old row is replaced"))
    assertEquals(2L, target.replaceWith(restored))
    assertEquals(1, target.notifications(NotificationFilters(query = "parcel")).size)
    assertTrue(target.notifications(NotificationFilters(query = "replaced")).isEmpty())
    assertEquals(25_000L, target.moneySummary(0, Long.MAX_VALUE).spentMinor)
    assertTrue("example.secret" in target.getExcludedPackages())
    val bank = target.appDirectory().single { it.packageName == "example.bank" }
    assertEquals("Example Bank", bank.label)
    assertEquals(null, bank.iconFile)
  }

  @Test
  fun directoryIsRecordedAndClearedWithHistory() {
    val repository = NotificationRepository(temporaryFolder.newFile("directory.db"))
    repository.upsert(captured("a", "Hello"))
    repository.recordApp("example.bank", "Example Bank", null)
    repository.recordApp("example.bank", "Example Bank 2", null)
    assertEquals(listOf("Example Bank 2"), repository.appDirectory().map { it.label })
    repository.clear()
    assertTrue(repository.appDirectory().isEmpty())
  }

  @Test
  fun duplicateGroupingUsesStoredFingerprints() {
    val repository = NotificationRepository(temporaryFolder.newFile("dupes.db"))
    val now = Math.floorDiv(System.currentTimeMillis(), 30L * 60_000L) * (30L * 60_000L) + 1_000L
    repeat(3) { repository.upsert(captured("k$it", "Same exact repeat text", at = now + it)) }
    repository.upsert(captured("other", "Different text", at = now + 5))
    val repeats = repository.notifications(NotificationFilters(query = "repeat"))
    assertEquals(3, repeats.size)
    assertTrue(repeats.all { it.duplicateCount == 3 })
    assertEquals(1, repository.notifications(NotificationFilters(query = "different")).single().duplicateCount)
  }
}
