package com.notifyiq

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.hardware.biometrics.BiometricManager
import android.hardware.biometrics.BiometricPrompt
import android.os.Build
import android.os.CancellationSignal
import android.util.Log

/**
 * Optional App lock. The switch is stored in a small private SharedPreferences file (excluded from
 * backup and device transfer by data_extraction_rules); notification data stays in the SQLite database.
 */
internal object AppSecurity {
  private const val TAG = "NotifyIQSecurity"
  private const val PREFS = "notifyiq_security"
  private const val KEY_LOCK = "app_lock"

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** Off by default; requires a device screen lock (PIN, pattern, password or biometrics). */
  fun appLock(context: Context) = prefs(context).getBoolean(KEY_LOCK, false) && isDeviceSecure(context)
  fun setAppLock(context: Context, enabled: Boolean) = prefs(context).edit().putBoolean(KEY_LOCK, enabled).apply()

  fun isDeviceSecure(context: Context) = context.getSystemService(KeyguardManager::class.java)?.isDeviceSecure == true

  /** Shows the system unlock prompt (biometrics or device credential). Must be called on the UI thread. */
  fun authenticate(activity: Activity, onResult: (Boolean) -> Unit) {
    val builder = BiometricPrompt.Builder(activity)
      .setTitle("Unlock NotifyIQ")
      .setSubtitle("Your notification history is protected")
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      builder.setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK or BiometricManager.Authenticators.DEVICE_CREDENTIAL)
    } else {
      @Suppress("DEPRECATION") builder.setDeviceCredentialAllowed(true)
    }
    var delivered = false
    fun deliver(value: Boolean) { if (!delivered) { delivered = true; onResult(value) } }
    runCatching {
      builder.build().authenticate(CancellationSignal(), activity.mainExecutor, object : BiometricPrompt.AuthenticationCallback() {
        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) = deliver(true)
        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
          Log.w(TAG, "AUTH_ERROR code=$errorCode")
          deliver(false)
        }
      })
    }.onFailure { Log.w(TAG, "AUTH_UNAVAILABLE ${it.javaClass.simpleName}"); deliver(false) }
  }
}
