# Android Notification Integration (Kotlin boundary)

## Why a native service is required
Android exposes notification observation through `NotificationListenerService`. React Native's native-module interface can expose custom Android functionality to TypeScript, but JavaScript timers/background tasks are not a substitute for this system service.

## Service requirements
- Implement a minimal Kotlin class extending `NotificationListenerService`.
- Declare it in the Android manifest with `android.permission.BIND_NOTIFICATION_LISTENER_SERVICE` and the `android.service.notification.NotificationListenerService` intent action.
- The service should be non-exported and system-bound as required by Android's service declaration guidance.
- Wait for `onListenerConnected()` before using listener APIs or querying active notifications.
- Handle `onListenerDisconnected()` and use `requestRebind(ComponentName)` only in the documented safe lifecycle situations.
- Handle `onNotificationPosted`, `onNotificationRemoved`, and ranking changes only when needed.
- Do not do model inference, network calls, image downloads or expensive parsing inside listener callbacks.

## Permission UX
1. Explain the sensitive access in plain language.
2. User taps “Open notification access settings”.
3. Launch `Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS`.
4. On app resume, re-check `NotificationManager.isNotificationListenerAccessGranted` where supported / use a robust enabled-listener check.
5. Show access state and last capture timestamp.
6. If revoked, stop content processing and show a clear recovery path.

## Persistence rule
The native service must write to the same authoritative local SQLite database used by the app, or to a durable native queue that is safely drained into it. Do not rely on an event emitted to React Native JS as the only record; JS may not be running.

## Extraction policy
- Prefer title, text, big text and subtext only when present and allowed.
- Do not scrape remote views or attempt to bypass notification redaction.
- Store package name and notification key; do not assume notification key is globally stable forever.
- Avoid storing full `PendingIntent`, remote views, bitmap payloads or arbitrary extras.
- Do not persist OTP/authentication codes, passwords, card data or excluded-app content.
- Support private/lock-screen redaction and app-specific exclusions.

## Kotlin module boundary
Expose a typed module API such as:
- `getListenerStatus(): Promise<ListenerStatus>`
- `openNotificationAccessSettings(): Promise<void>`
- `getLastCaptureAt(): Promise<string | null>`
- `getRecentNotifications(cursor, limit): Promise<NotificationPage>`
- `observeDatabaseChanges()` or a lightweight invalidation event
- `setAppExclusion(packageName, excluded)`

Do not expose an API that sends every raw event through JS. UI queries the local repository.

## Android limitations to document
- Listener access is user-granted and revocable.
- Android/OEM background behaviour varies.
- Low-RAM devices on Android Q and below have documented restrictions.
- Work-profile notifications may be unavailable.
- Some apps redact notification content or expose only partial text.
- Notification access does not grant access to full conversations or private app databases.
- Android's notification shade remains in control; NotifyIQ cannot universally suppress, rewrite or replace other apps' alerts.

## Verification checklist
- Fresh install, no permission.
- Grant access.
- Post notification while UI foreground/background/killed.
- Remove notification.
- Reboot device.
- Force-stop app (document expected OS behaviour; do not promise capture if OS prevents it).
- Revoke access.
- Exclude app and verify no content persists.
- Test group summary, ongoing notification, big text, media notification, redacted notification.
- Test at least Pixel and one OEM device (Samsung/OnePlus/Xiaomi where available).
