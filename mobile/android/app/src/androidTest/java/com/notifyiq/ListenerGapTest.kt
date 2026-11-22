package com.notifyiq

import android.service.notification.NotificationListenerService
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith

/** Pause tracking and tray recovery after the listener was not connected. Synthetic fixtures only. */
@RunWith(AndroidJUnit4::class)
class ListenerGapTest {
  private val instrumentation = InstrumentationRegistry.getInstrumentation()
  private val context = instrumentation.targetContext
  private val component = "com.notifyiq/com.notifyiq.NotifyIQNotificationListener"
  private val poster = "com.notifyiq.fixtureposter"
  private val fixtureId = 9301

  private fun shell(command: String): String =
    android.os.ParcelFileDescriptor.AutoCloseInputStream(instrumentation.uiAutomation.executeShellCommand(command)).bufferedReader().readText()

  private fun waitUntil(timeoutMs: Long, condition: () -> Boolean): Boolean {
    val end = System.currentTimeMillis() + timeoutMs
    while (System.currentTimeMillis() < end) { if (condition()) return true; Thread.sleep(500) }
    return condition()
  }

  private fun NotificationRepository.fixture() = notifications(NotificationFilters(packageName = poster)).firstOrNull { it.title == "GapFixture" }

  @After fun cleanUp() {
    shell("am start -n $poster/.PostActivity --ei id $fixtureId --ez cancel true")
    shell("cmd notification disallow_listener $component")
    NotificationRepository(context).clear()
  }

  @Test
  fun gapsAreStoredListedMarkedSeenAndCleared() {
    val db = File(context.cacheDir, "gap-test.db").also { it.delete() }
    val repository = NotificationRepository(db)
    val now = System.currentTimeMillis()
    repository.recordListenerGap(now - 3_600_000, now - 600_000, recovered = 2, exact = true)
    repository.recordListenerGap(now - 40L * 86_400_000, now - 39L * 86_400_000, recovered = 0, exact = false)
    val gaps = repository.listenerGaps(now - 7L * 86_400_000)
    assertEquals(1, gaps.size)
    assertEquals(2, gaps[0].recovered)
    assertFalse(gaps[0].seen)
    repository.markListenerGapsSeen()
    assertTrue(repository.listenerGaps(0).all { it.seen })
    assertEquals("gaps older than 30 days are pruned", 1, repository.listenerGaps(0).size)
    repository.setListenerAliveAt(123L); assertEquals(123L, repository.listenerAliveAt())
    repository.setListenerAliveAt(null); assertNull(repository.listenerAliveAt())
    repository.clear()
    assertTrue(repository.listenerGaps(0).isEmpty())
    NotificationRepository.release(db); db.delete()
  }

  @Test
  fun shortInterruptionsAndPhoneOffTimeAreNotPauses() {
    val now = System.currentTimeMillis()
    assertNull("a normal restart is not a pause", ListenerGapEstimator.estimate(context, now - 30_000, now))
    val bootAt = now - android.os.SystemClock.elapsedRealtime()
    val estimate = ListenerGapEstimator.estimate(context, bootAt - 86_400_000, now)
    if (estimate != null) assertTrue("time before boot (phone off) is not counted", estimate.startedAt >= bootAt)
  }

  @Test
  fun notificationsPostedWhileDisconnectedAreRecoveredAndThePauseIsRecorded() {
    assumeTrue("needs static requestUnbind (API 34+)", android.os.Build.VERSION.SDK_INT >= 34)
    assumeTrue("fixture poster installed", shell("pm list packages $poster").contains(poster))
    shell("pm grant $poster android.permission.POST_NOTIFICATIONS")
    val repository = NotificationRepository(context)
    repository.clear()
    shell("cmd notification allow_listener $component")
    assertTrue("connected", waitUntil(10_000) { NotificationListenerRuntimeState.probeConnected() })
    // Let the app's own start-up repair check finish first, so it does not re-bind mid-test.
    val sinceStart = android.os.SystemClock.elapsedRealtime() - android.os.Process.getStartElapsedRealtime()
    if (sinceStart < 10_000) Thread.sleep(10_000 - sinceStart)

    // Simulate a pause: the notification arrives while NotifyIQ cannot read it (capture gate closed).
    NotificationListenerRuntimeState.exclusionsReady = false
    repository.setListenerAliveAt(System.currentTimeMillis() - 10 * 60_000)   // last seen alive 10 min ago
    shell("am start -n $poster/.PostActivity --ei id $fixtureId --es title GapFixture --es text PostedWhilePaused")
    Thread.sleep(2_500)
    assertNull("missed while paused", repository.fixture())
    NotificationListenerRuntimeState.exclusionsReady = true

    // Reconnect (the listener re-requests binding itself when Android unbinds it).
    NotificationListenerService.requestUnbind(ListenerHealth.component(context))
    assertTrue("recovered from the tray after reconnecting", waitUntil(15_000) { repository.fixture() != null })
    assertTrue("pause recorded", waitUntil(5_000) { repository.listenerGaps(0).isNotEmpty() })
    val gap = repository.listenerGaps(0).first()
    assertEquals(1, gap.recovered)
    assertTrue("pause lasted about 10 minutes", gap.endedAt - gap.startedAt in 9 * 60_000L..11 * 60_000L)
    assertNotNull("alive marker refreshed", repository.listenerAliveAt())
    assertTrue(repository.listenerAliveAt()!! >= gap.endedAt)
  }
}
