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

export function getExcludedPackages(): Promise<ReadonlyArray<string>> {
  return requireNativeModule().getExcludedPackages();
}

export function setAppExcluded(packageName: string, excluded: boolean): Promise<void> {
  return requireNativeModule().setAppExcluded(packageName, excluded);
}

export function searchNotifications(filters: {
  query?: string;
  packageName?: string;
  category?: string;
  from?: number;
  to?: number;
  beforeReceivedAt?: number;
  beforeId?: number;
  includeArchived?: boolean;
  limit?: number;
}): Promise<ReadonlyArray<NotificationItem>> {
  return requireNativeModule().searchNotifications(
    filters.query ?? '', filters.packageName ?? '', filters.category ?? '', filters.from ?? 0,
    filters.to ?? 0, filters.beforeReceivedAt ?? 0, filters.beforeId ?? 0,
    filters.includeArchived ?? false, filters.limit ?? 50,
  );
}

export function setNotificationSaved(id: number, saved: boolean): Promise<void> {
  return requireNativeModule().setNotificationSaved(id, saved);
}

export function setNotificationArchived(id: number, archived: boolean): Promise<void> {
  return requireNativeModule().setNotificationArchived(id, archived);
}

export function setNotificationCategoryOverride(id: number, category: string | null): Promise<void> {
  return requireNativeModule().setNotificationCategoryOverride(id, category);
}

export function deleteNotification(id: number): Promise<void> {
  return requireNativeModule().deleteNotification(id);
}

export function getRetentionDays(): Promise<number> {
  return requireNativeModule().getRetentionDays();
}

export function setRetentionDays(days: number): Promise<void> {
  return requireNativeModule().setRetentionDays(days);
}
