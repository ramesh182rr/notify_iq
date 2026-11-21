# Android Device Testing Guide

## Minimum test matrix
- Android emulator for UI and navigation.
- Physical Pixel/AOSP-like device.
- Physical Samsung device.
- One additional OEM device if available.
- One lower-memory device if it is in the intended support range.

## Test notifications
Create a small test sender app or use controlled test apps. Use synthetic text only. Include:
- Short title/body.
- BigTextStyle.
- Grouped notifications.
- Ongoing notification.
- Notification with no title/body.
- Redacted/private notification.
- Same notification updated repeatedly.
- App excluded by user.
- OTP-like test fixture (must not persist).

## Lifecycle
- Permission never granted.
- Permission granted.
- Permission revoked while app is running.
- App process killed/recreated.
- Device reboot.
- Battery saver.
- OEM background management.
- Listener disconnected/reconnected.

## Expected behaviour
NotifyIQ must clearly indicate that captured history may be incomplete during access-off periods. Do not infer that missed notifications can be recovered after access is granted; only active notifications may be queryable, and historic access is not generally available.
