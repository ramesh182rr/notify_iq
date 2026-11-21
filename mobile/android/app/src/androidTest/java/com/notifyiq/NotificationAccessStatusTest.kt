package com.notifyiq

import android.app.NotificationManager
import android.content.ComponentName
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NotificationAccessStatusTest {
  @Test
  fun androidCanReportNotificationListenerAccessForNotifyIq() {
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val manager = context.getSystemService(NotificationManager::class.java)
    val listener = ComponentName(context, NotifyIQNotificationListener::class.java)

    assertNotNull(manager)
    manager.isNotificationListenerAccessGranted(listener)
  }
}
