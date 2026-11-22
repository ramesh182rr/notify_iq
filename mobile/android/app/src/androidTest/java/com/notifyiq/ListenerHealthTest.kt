package com.notifyiq

import android.app.job.JobScheduler
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/** Listener health: truthful status and safe self-repair. */
@RunWith(AndroidJUnit4::class)
class ListenerHealthTest {
  private val instrumentation = InstrumentationRegistry.getInstrumentation()
  private val context = instrumentation.targetContext
  private val component = "com.notifyiq/com.notifyiq.NotifyIQNotificationListener"

  private fun shellOut(command: String): String =
    android.os.ParcelFileDescriptor.AutoCloseInputStream(instrumentation.uiAutomation.executeShellCommand(command)).bufferedReader().readText()
  private fun liveBound() = shellOut("dumpsys notification").substringAfter("Live notification listeners", "").take(6000).contains(component)

  @After fun revokeAccess() { shellOut("cmd notification disallow_listener $component") }

  @Test
  fun statusProbesTheLiveListenerInsteadOfTrustingAStaleFlag() {
    shellOut("cmd notification allow_listener $component")
    Thread.sleep(3_000)
    NotificationListenerRuntimeState.connected = false   // the stale state behind "Reconnecting"
    assertTrue("live listener detected despite stale flag", NotificationListenerRuntimeState.probeConnected())
  }

  @Test
  fun selfRepairIsHarmlessWhileBound() {
    shellOut("cmd notification allow_listener $component")
    Thread.sleep(3_000)
    instrumentation.runOnMainSync { ListenerHealth.repairIfNeeded(context, retryAfterMs = 500L) }
    ListenerHealth.requestRebind(context)
    Thread.sleep(4_000)
    assertTrue("still bound after repair attempts", liveBound())
    assertTrue("still connected", NotificationListenerRuntimeState.probeConnected())
  }

  @Test
  fun periodicSelfCheckIsScheduledAndPersisted() {
    ListenerHealth.schedulePeriodicCheck(context)
    val job = context.getSystemService(JobScheduler::class.java).getPendingJob(7301)
    assertNotNull("periodic listener check scheduled", job)
    assertTrue("survives reboot", job!!.isPersisted)
    assertTrue("runs every 15 minutes", job.intervalMillis == 15 * 60 * 1000L)
  }
}
