import NativeNotifyIQ, {type ListenerStatus, type NotificationItem} from './NativeNotifyIQ';

function requireNativeModule() {
  if (NativeNotifyIQ == null) {
    throw new Error('NOTIFYIQ_NATIVE_MODULE_UNAVAILABLE');
  }

  return NativeNotifyIQ;
}

export function getListenerStatus(): Promise<ListenerStatus> {
  return requireNativeModule().getListenerStatus();
}

export function openNotificationAccessSettings(): Promise<void> {
  return requireNativeModule().openNotificationAccessSettings();
}

export function getRecentNotifications(limit: number): Promise<ReadonlyArray<NotificationItem>> {
  return requireNativeModule().getRecentNotifications(limit);
}

export function clearNotificationHistory(): Promise<void> {
  return requireNativeModule().clearNotificationHistory();
}
