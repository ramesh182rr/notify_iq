# Release readiness (Phase 7)

**Status:** In progress, 2026-11-22. Emulator-only evidence; nothing here is physical-device, OEM, legal or Play-compliance sign-off.

## 1. Security and privacy checklist

| Item | Result | Evidence |
|---|---|---|
| Network access in release | **None.** `INTERNET` is declared only in `src/debug/AndroidManifest.xml` (Metro). The release APK requests `POST_NOTIFICATIONS` and `RECEIVE_BOOT_COMPLETED` only. | `aapt2 dump permissions app-release.apk` |
| Cleartext traffic | Off in release (`usesCleartextTraffic=false`) | merged release manifest |
| Android backup / device transfer | `allowBackup=false`, `fullBackupContent=false`, and `data_extraction_rules.xml` excludes every domain for cloud backup and device-to-device transfer (Android 12+) | merged release manifest |
| Exported components | Only the launcher `MainActivity`. The listener is guarded by `BIND_NOTIFICATION_LISTENER_SERVICE`; reminder/boot receivers are not exported. | `src/main/AndroidManifest.xml` |
| PendingIntents | All `FLAG_IMMUTABLE` | `UserReminderReceivers.kt` |
| Logging | One native log line, error code and exception class only, with no content. The JS `console.warn` with the error object was removed. No notification content, package, key or tokens are logged (D-011). | `grep Log./println/console.` |
| Sensitive content | Exclusion runs before extraction. NotifyIQ's gate discards credential-like events whole. Android 15 platform-redacted events and contentless events are discarded (R-012). Verified live with synthetic fixtures. | `DEVELOPMENT_STATUS.md` |
| Debuggable release | No (`run-as` refused on the release build) | emulator |
| Crash reporting / analytics | None (D-011) | dependencies |
| R8 / resource shrinking | Enabled for release. A release smoke test passed: launch, all six tabs, live capture plus classification, OTP/password discard. | emulator, 2026-11-22 |

### Repository scale (opt-in `RepositoryScaleTest`, Pixel_8 API 35 AVD, 2026-11-22)

| Rows | Insert (avg/row) | FTS search p50 | First / next page p50 | Category filter p50 | Daily overview p50 | DB size |
|---:|---:|---:|---:|---:|---:|---:|
| 1,000 | 5.6 ms | <1 ms | <1 / <1 ms | <1 ms | 3 ms | 0.5 MB |
| 10,000 | 9.5 ms | 2 ms | <1 / <1 ms | 4 ms | 15 ms | 4.2 MB |
| 50,000 | 32.6 ms (rows 10k→50k) | 10 ms | <1 / <1 ms | 29 ms | 83 ms | 21.2 MB |

Retention cleanup removed 12,500 expired rows in 236 ms, and clear removed 37,500 rows in 348 ms. FTS stayed consistent: expired and cleared terms are no longer searchable.

**Insert cost note:** each insert rebuilds its exact-duplicate group. That hashes every row received in the same 30-minute window, across all apps, because the window query uses the `received_at` index. The test places ~1,900 rows in each window, far denser than real use (dozens per window for heavy users), so the per-row figure reflects test density, not total history size. If bursts become an issue: store each event's content fingerprint and add a `(package_name, received_at)` or `(content_fingerprint, window)` index in a numbered migration, so the rebuild becomes an indexed lookup.

### Accessibility pass (emulator, 2026-11-22)

- **Contrast:** `__tests__/Contrast.test.ts` checks WCAG ratios for every text/background token pair in both themes (33 checks; ≥ 4.5:1 for body text). It found white text on the dark-theme brand colour at about 2.6:1. Fix: a new `onBrand` token used by filled buttons, selected segments and busy calendar days. Treemap tiles and priority pills now pick dark or light text automatically (`readableTextOn`).
- **Touch targets:** uiautomator audit of every tab. The theme switch (32 dp), "See all" and "Delete all history" (19 dp), filter, action, range and segment chips (36–42 dp), and Rules/Privacy controls and inputs were raised to ≥ 48 dp. Remaining sub-48 readings were elements partly hidden under the header or tab bar (clipped bounds). Exception: the header theme options are 44 dp tall with a 6 dp vertical hit slop (56 dp touch area) to keep the header compact. An earlier stretch of this control covered the brand and was fixed. The selected theme is now a solid brand pill with `onBrand` text. The running bundle was confirmed to carry the 48 dp styles.
- **Screen-reader labels:** no tappable element without text or an accessibility label was found.
- **Large text:** checked at 1.3× and 2.0× font scale. Content reflows. At large scales the header stacks the theme switch under the brand and hides the tagline; tab labels cap at 1.2× (icons and TalkBack labels carry meaning). Font scale was restored to 1.0.
- Not yet done: a manual TalkBack walkthrough and a Play pre-launch report run.

### Android 10 (API 29) minimum-version run, 2026-11-22

AVD `NotifyIQ_API29`: Google APIs arm64, 4 GB RAM (the D-008 low-memory target), Pixel 4 profile.

- **Instrumentation:** all 23 tests pass (0 failures, 1 opt-in scale test skipped). Covers migrations v1→v8, FTS, retention, rules, saved searches, insights and analytics.
- **Sensitive gate:** NotifyIQ's own gate discards the OTP, password and card-number fixtures. Android 10 has no platform redaction, so this gate is the only control here, and it works.
- **Money:** bank alerts containing "A/c XX1234" are delivered and extracted correctly (₹499 Netflix debit as subscriptions, ₹1,500 credit from a person, a bill due date). Money coverage is therefore better on Android 10–14 than on 15+ (R-014).
- **Lifecycle:** dismissal sets `removed_at`. A real `kill -9` (adb root) is followed by an immediate system restart, and capture resumes. Capture also continues after force-stop. Nothing is captured while access is revoked; capture resumes after re-grant. After a device reboot, the insight reminder alarm is rescheduled and capture resumes without opening the app.
- **UI:** Home, Money and Coming up render correctly, including emoji and the 3-button navigation bar. Reminder scheduling works without the Android 13 notification permission.
- **Cleanup:** history deleted through the UI (0 events/insights), no alarms left, access revoked, poster removed.

Tooling note: Android SDK command-line tools 23.0 (`cmdline-tools;latest`, sha1 verified) and `system-images;android-29;google_apis;arm64-v8a` were installed for this run.

### Build reproducibility

Two clean `assembleRelease` builds produced APKs whose 404 zip entries are byte-identical. Only the outer container (signing block and zip metadata) differs. Play re-signs uploads with the app-signing key.

Still open for this task: physical-device and OEM (Samsung and others) checks, battery/thermal measurement, and a manual TalkBack walkthrough. API 29 and API 35 emulator runs are done.

## Play compatibility (checked 2026-11-22)

| Requirement | Status |
|---|---|
| Target API level: new apps and updates must target Android 16 (API 36) | `targetSdkVersion 36`, `compileSdk 37` |
| Minimum supported Android | Android 10 (API 29), per D-008 |
| 64-bit native code | `arm64-v8a` and `x86_64` included, plus 32-bit ABIs |
| 16 KB memory page size (required for apps targeting Android 15+ with native code) | All 24 `.so` LOAD segments are 16 KB-aligned (`llvm-readelf`), and the APK passes `zipalign -c -P 16` |
| Store artifact | `./gradlew :app:bundleRelease` produces an AAB (42.4 MB, per-ABI delivery) |
| Launcher icon | Adaptive vector icon with a monochrome layer for themed icons. A 512×512 PNG is still needed for the store listing. |

Sources: [Play target API level requirements](https://support.google.com/googleplay/android-developer/answer/11926878), [Support 16 KB page sizes](https://developer.android.com/guide/practices/page-sizes).

## 2. Signing and build configuration

- The release signing config reads `NOTIFYIQ_UPLOAD_STORE_FILE`, `NOTIFYIQ_UPLOAD_STORE_PASSWORD`, `NOTIFYIQ_UPLOAD_KEY_ALIAS` and `NOTIFYIQ_UPLOAD_KEY_PASSWORD` from untracked Gradle properties (`~/.gradle/gradle.properties`) or environment variables. `*.keystore`/`*.jks` are git-ignored.
- Without those values the release build falls back to the debug key, for local smoke tests only. Play rejects debug-signed uploads.
- **Owner action:** create the upload key (`keytool -genkeypair -v -keystore notifyiq-upload.keystore -alias notifyiq-upload -keyalg RSA -keysize 2048 -validity 10000`), store it outside the repo, enrol in Play App Signing, and build the store artifact with `./gradlew :app:bundleRelease` (AAB). The universal APK is ~58 MB because it carries all four ABIs; an AAB delivers per-ABI splits.
- Version: `versionCode 1` / `versionName "1.0"`. Bump these per upload.

## 3. Privacy policy and data safety (draft for owner/legal review)

These are factual statements about the current build that the owner and counsel can use. They are not legal text. Recheck current Play Console data-safety definitions and the notification-access policy before submission.

**What the app does with data**
- With the user's permission, it reads notifications that Android delivers to its notification listener. It stores title, text and subtext, the posting app's package name and timestamps in a local SQLite database on the device.
- Before storage, it skips apps the user excluded. It discards whole events that look like OTPs, passwords or payment cards, and events Android itself redacts as sensitive. It never claims detection is complete.
- It derives categories, priorities, duplicate groups, rule results and daily counts locally. No model or cloud inference is used.
- Retention defaults to 30 days (7/30/90/never selectable). Saved items are kept until unsaved or deleted. Users can delete individual items or all history. Uninstalling removes app data. Flash storage cannot guarantee forensic erasure.
- Reminders scheduled by user rules use generic lock-screen text.

**What the app does not do**
- It has no network permission in release builds, so it cannot transmit data off the device.
- No account, sync, analytics, advertising, crash reporting or third-party SDKs that collect data.
- It does not dismiss, mute or modify Android notifications.
- It is excluded from Android cloud backup and device transfer.

**Likely data-safety answers (verify against current Play definitions):** no data collected, and no data shared, because data processed only on device is not "collected" in Play's sense. Data deletion is available in-app.

**Open owner decisions:** target markets and policy jurisdiction, a contact address for the policy, and where the policy will be hosted (Play requires a URL).

## 4. Closed beta

Not started. It needs the upload key, a hosted privacy policy, and at least one physical device run of the Phase 1 lifecycle checks.
