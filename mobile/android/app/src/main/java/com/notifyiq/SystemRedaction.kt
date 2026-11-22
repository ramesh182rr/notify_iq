package com.notifyiq

import android.content.pm.ApplicationInfo
import android.content.res.Resources
import android.os.Build
import android.os.Bundle

/**
 * Android 15+ redacts notifications it classifies as sensitive (for example OTPs) before an
 * untrusted listener receives them: the title becomes the app label and the text a system
 * placeholder. Such an event is sensitive by the platform's own judgement, so R-003 applies and
 * the whole event is discarded instead of storing a placeholder row.
 *
 * Signals (either is sufficient, API 35+ only):
 * - the builder ApplicationInfo extra belongs to the `android` system package rather than the
 *   posting app, which is how the platform rebuilds the redacted copy;
 * - the text equals the platform's localized redaction placeholder.
 */
internal object SystemRedaction {
  private const val EXTRA_BUILDER_APPLICATION_INFO = "android.appInfo"
  private const val SYSTEM_PACKAGE = "android"

  private val placeholder: String? by lazy {
    runCatching {
      val system = Resources.getSystem()
      val id = system.getIdentifier("redacted_notification_message", "string", SYSTEM_PACKAGE)
      if (id == 0) null else system.getString(id)
    }.getOrNull()
  }

  fun isRedacted(postingPackage: String, extras: Bundle): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) return false
    if (postingPackage == SYSTEM_PACKAGE) return false
    val builderPackage = runCatching {
      @Suppress("DEPRECATION")
      (extras.getParcelable<ApplicationInfo>(EXTRA_BUILDER_APPLICATION_INFO))?.packageName
    }.getOrNull()
    if (builderPackage == SYSTEM_PACKAGE) return true
    val text = extras.getCharSequence(android.app.Notification.EXTRA_TEXT)?.toString()
    return placeholder != null && text == placeholder
  }
}
