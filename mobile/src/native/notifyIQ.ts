import {getNativeNotifyIQ, type DailyOverview, type ListenerStatus, type MoneyAnalytics, type MoneySummary, type NotificationItem, type RecurringPayment, type SecuritySettings, type AppDirectoryEntry, type BackupResult, type InstallInfo, type UpcomingAction} from './NativeNotifyIQ';

function requireNativeModule() {
  const NativeNotifyIQ = getNativeNotifyIQ();
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

export function getDailyOverview(): Promise<DailyOverview> {
  return requireNativeModule().getDailyOverview();
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
  groupName?: string;
  from?: number;
  to?: number;
  beforeReceivedAt?: number;
  beforeId?: number;
  includeArchived?: boolean;
  limit?: number;
}): Promise<ReadonlyArray<NotificationItem>> {
  return requireNativeModule().searchNotifications(
    filters.query ?? '', filters.packageName ?? '', filters.category ?? '', filters.groupName ?? '', filters.from ?? 0,
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

export function getUserRules(): Promise<string> {
  return requireNativeModule().getUserRules();
}

export function saveUserRules(rulesJson: string): Promise<void> {
  return requireNativeModule().saveUserRules(rulesJson);
}

export function previewUserRules(rulesJson: string, sampleJson: string): Promise<string> {
  return requireNativeModule().previewUserRules(rulesJson, sampleJson);
}

export function reevaluateUserRules(): Promise<number> {
  return requireNativeModule().reevaluateUserRules();
}

export function getSavedSearches(): Promise<string> {
  return requireNativeModule().getSavedSearches();
}

export function addSavedSearch(name: string, filters: {
  query: string; packageName: string; category: string; groupName: string; dateRange: string; includeArchived: boolean;
}): Promise<string> {
  return requireNativeModule().addSavedSearch(name, JSON.stringify(filters));
}

export function deleteSavedSearch(id: string): Promise<string> {
  return requireNativeModule().deleteSavedSearch(id);
}

export function getRuleGroups(): Promise<ReadonlyArray<string>> {
  return requireNativeModule().getRuleGroups();
}

export function getMoneySummary(from: number, to: number): Promise<MoneySummary> {
  return requireNativeModule().getMoneySummary(from, to);
}

export function getUpcomingActions(): Promise<ReadonlyArray<UpcomingAction>> {
  return requireNativeModule().getUpcomingActions();
}

export function getRecurringPayments(): Promise<ReadonlyArray<RecurringPayment>> {
  return requireNativeModule().getRecurringPayments();
}

export function dismissInsight(eventId: number): Promise<void> {
  return requireNativeModule().dismissInsight(eventId);
}

export function setInsightReminder(eventId: number, at: number): Promise<string> {
  return requireNativeModule().setInsightReminder(eventId, at);
}

export function clearInsightReminder(eventId: number): Promise<void> {
  return requireNativeModule().clearInsightReminder(eventId);
}

export function getMoneyAnalytics(from: number, to: number): Promise<MoneyAnalytics> {
  return requireNativeModule().getMoneyAnalytics(from, to);
}

export function setMoneyCategory(eventId: number, category: string, applyToMerchant: boolean): Promise<void> {
  return requireNativeModule().setMoneyCategory(eventId, category, applyToMerchant);
}

export function getSecuritySettings(): Promise<SecuritySettings> {
  return requireNativeModule().getSecuritySettings();
}


export function setAppLock(enabled: boolean): Promise<void> {
  return requireNativeModule().setAppLock(enabled);
}

export function authenticate(): Promise<boolean> {
  return requireNativeModule().authenticate();
}

export function getAppDirectory(): Promise<ReadonlyArray<AppDirectoryEntry>> {
  return requireNativeModule().getAppDirectory();
}

export function getUiPreference(key: 'theme' | 'onboarding_done'): Promise<string | null> {
  return requireNativeModule().getUiPreference(key);
}

export function setUiPreference(key: 'theme' | 'onboarding_done', value: string): Promise<void> {
  return requireNativeModule().setUiPreference(key, value);
}

export function getInstallInfo(): Promise<InstallInfo> {
  return requireNativeModule().getInstallInfo();
}

export function openAppDetailsSettings(): Promise<void> {
  return requireNativeModule().openAppDetailsSettings();
}

export function getNotification(id: number): Promise<NotificationItem | null> {
  return requireNativeModule().getNotification(id);
}

export function exportBackup(password: string): Promise<BackupResult> {
  return requireNativeModule().exportBackup(password);
}

export function importBackup(password: string): Promise<BackupResult> {
  return requireNativeModule().importBackup(password);
}

export function reconnectListener(): Promise<void> {
  return requireNativeModule().reconnectListener();
}

export function openBatterySettings(): Promise<void> {
  return requireNativeModule().openBatterySettings();
}

export function getInstalledApps(): Promise<ReadonlyArray<AppDirectoryEntry>> {
  return requireNativeModule().getInstalledApps();
}
