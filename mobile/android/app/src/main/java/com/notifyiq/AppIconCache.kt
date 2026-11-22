package com.notifyiq

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Build
import android.os.Bundle
import java.io.File

/**
 * Resolves the display name and icon of an app that posted a captured notification. Android includes
 * the poster's ApplicationInfo in notification extras, so no package-visibility permission is needed.
 * Icons are cached as small PNGs in private app storage and contain no notification content.
 */
internal object AppIconCache {
  private const val DIR = "app_icons"
  private const val SIZE = 96
  private const val EXTRA_APP_INFO = "android.appInfo"
  private val recorded = mutableSetOf<String>()

  fun clear(context: Context) {
    File(context.filesDir, DIR).deleteRecursively()
    synchronized(recorded) { recorded.clear() }
  }

  /** Records label and icon once per process for each package; cheap no-op afterwards. */
  fun remember(context: Context, repository: NotificationRepository, packageName: String, extras: Bundle?) {
    if (synchronized(recorded) { packageName in recorded }) return
    val pm = context.packageManager
    val info = appInfo(pm, packageName, extras) ?: return
    val label = runCatching { pm.getApplicationLabel(info).toString() }.getOrNull()?.takeIf { it.isNotBlank() } ?: return
    val iconFile = runCatching { writeIcon(context, pm, info, packageName) }.getOrNull()
    repository.recordApp(packageName, label, iconFile)
    synchronized(recorded) { recorded += packageName }
  }

  private fun appInfo(pm: PackageManager, packageName: String, extras: Bundle?): ApplicationInfo? {
    val fromExtras = runCatching {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) extras?.getParcelable(EXTRA_APP_INFO, ApplicationInfo::class.java)
      else @Suppress("DEPRECATION") extras?.getParcelable<ApplicationInfo>(EXTRA_APP_INFO)
    }.getOrNull()
    if (fromExtras != null && fromExtras.packageName == packageName) return fromExtras
    return runCatching { pm.getApplicationInfo(packageName, 0) }.getOrNull()
  }

  private fun writeIcon(context: Context, pm: PackageManager, info: ApplicationInfo, packageName: String): String? {
    val drawable = pm.getApplicationIcon(info)
    val bitmap = Bitmap.createBitmap(SIZE, SIZE, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, SIZE, SIZE)
    drawable.draw(canvas)
    val dir = File(context.filesDir, DIR).apply { mkdirs() }
    val file = File(dir, packageName.replace(Regex("[^A-Za-z0-9._-]"), "_") + ".png")
    file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    bitmap.recycle()
    return file.absolutePath
  }
}
