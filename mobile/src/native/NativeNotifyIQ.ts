import type {TurboModule} from 'react-native';
import {NativeModules, TurboModuleRegistry} from 'react-native';

export type ListenerStatus = {
  accessGranted: boolean;
  connected: boolean;
  lastErrorCode: string | null;
};

export type NotificationItem = {
  id: number;
  packageName: string;
  title: string | null;
  body: string | null;
  subtext: string | null;
  postedAt: number;
  receivedAt: number;
  removedAt: number | null;
  saved: boolean;
  archivedAt: number | null;
  category: string;
  priority: string;
  confidence: number;
  analysisExplanation: string;
  analysisMethod: string;
  analysisVersion: string;
  categoryOverride: string | null;
  duplicateGroupId: number | null;
  duplicateCount: number;
  includeInDigest: boolean | null;
  important: boolean | null;
  ruleGroups: ReadonlyArray<string>;
  matchedRuleIds: ReadonlyArray<string>;
  reminderDueAt: number | null;
  reminderStatus: string | null;
};

export type OverviewCount = { label: string; count: number };
export type MoneyBucket = { label: string; amountMinor: number; count: number };
export type MoneyTransaction = {
  eventId: number;
  amountMinor: number;
  currency: string;
  direction: string;
  merchant: string | null;
  category: string;
  receivedAt: number;
  packageName: string;
  subscription: boolean;
  categoryEdited?: boolean;
};
export type MoneySummary = {
  from: number;
  to: number;
  currency: string;
  spentMinor: number;
  receivedMinor: number;
  debitCount: number;
  creditCount: number;
  merchants: ReadonlyArray<MoneyBucket>;
  categories: ReadonlyArray<MoneyBucket>;
  recent: ReadonlyArray<MoneyTransaction>;
  otherCurrencies: ReadonlyArray<string>;
};
export type MoneyCategoryBreakdown = { category: string; amountMinor: number; count: number; topMerchants: ReadonlyArray<MoneyBucket> };
export type MoneyDay = { dayStart: number; outMinor: number; inMinor: number };
export type MoneyAnalytics = {
  from: number;
  to: number;
  currency: string;
  spentMinor: number;
  receivedMinor: number;
  debitCount: number;
  creditCount: number;
  previousSpentMinor: number;
  previousReceivedMinor: number;
  spendCategories: ReadonlyArray<MoneyCategoryBreakdown>;
  incomeCategories: ReadonlyArray<MoneyCategoryBreakdown>;
  daily: ReadonlyArray<MoneyDay>;
  weekdays: ReadonlyArray<MoneyBucket>;
  dayparts: ReadonlyArray<MoneyBucket>;
  topMerchants: ReadonlyArray<MoneyBucket>;
  topSources: ReadonlyArray<MoneyBucket>;
  biggest: MoneyTransaction | null;
  busiestDay: MoneyDay | null;
  mostFrequent: MoneyBucket | null;
  smallSpends: MoneyBucket;
  weekendShare: number;
  projectedMonthSpentMinor: number | null;
  recent: ReadonlyArray<MoneyTransaction>;
  otherCurrencies: ReadonlyArray<string>;
};
export type BackupResult = { status: string; count: number };
export type AppDirectoryEntry = { packageName: string; label: string; iconUri: string | null };
export type InstallInfo = { source: string; sdk: number; versionName: string };
export type SecuritySettings = { appLock: boolean; deviceSecure: boolean };
export type UpcomingAction = {
  eventId: number;
  kind: string;
  dueAt: number;
  hasTime: boolean;
  amountMinor: number | null;
  currency: string | null;
  reminderAt: number | null;
  reminderStatus: string | null;
  packageName: string;
  title: string | null;
  body: string | null;
  receivedAt: number;
};
export type RecurringPayment = {
  merchant: string;
  amountMinor: number;
  currency: string;
  cadence: string;
  lastPaidAt: number;
  nextExpectedAt: number | null;
  occurrences: number;
};
export type DailyOverview = {
  dayStart: number;
  dayEnd: number;
  totalCount: number;
  appCount: number;
  categories: ReadonlyArray<OverviewCount>;
  apps: ReadonlyArray<OverviewCount>;
  hours: ReadonlyArray<OverviewCount>;
  sources: ReadonlyArray<NotificationItem>;
};

export interface Spec extends TurboModule {
  getListenerStatus(): Promise<ListenerStatus>;
  openNotificationAccessSettings(): Promise<void>;
  getRecentNotifications(limit: number): Promise<ReadonlyArray<NotificationItem>>;
  getDailyOverview(): Promise<DailyOverview>;
  setAppExcluded(packageName: string, excluded: boolean): Promise<void>;
  getExcludedPackages(): Promise<ReadonlyArray<string>>;
  clearNotificationHistory(): Promise<void>;
  searchNotifications(
    query: string,
    packageName: string,
    category: string,
    groupName: string,
    from: number,
    to: number,
    beforeReceivedAt: number,
    beforeId: number,
    includeArchived: boolean,
    limit: number,
  ): Promise<ReadonlyArray<NotificationItem>>;
  setNotificationSaved(id: number, saved: boolean): Promise<void>;
  setNotificationArchived(id: number, archived: boolean): Promise<void>;
  setNotificationCategoryOverride(id: number, category: string | null): Promise<void>;
  deleteNotification(id: number): Promise<void>;
  getRetentionDays(): Promise<number>;
  setRetentionDays(days: number): Promise<void>;
  getUserRules(): Promise<string>;
  saveUserRules(rulesJson: string): Promise<void>;
  previewUserRules(rulesJson: string, sampleJson: string): Promise<string>;
  reevaluateUserRules(): Promise<number>;
  getSavedSearches(): Promise<string>;
  addSavedSearch(name: string, filtersJson: string): Promise<string>;
  deleteSavedSearch(id: string): Promise<string>;
  getRuleGroups(): Promise<ReadonlyArray<string>>;
  getMoneySummary(from: number, to: number): Promise<MoneySummary>;
  getMoneyAnalytics(from: number, to: number): Promise<MoneyAnalytics>;
  setMoneyCategory(eventId: number, category: string, applyToMerchant: boolean): Promise<void>;
  getNotification(id: number): Promise<NotificationItem | null>;
  reconnectListener(): Promise<void>;
  openBatterySettings(): Promise<void>;
  exportBackup(password: string): Promise<BackupResult>;
  importBackup(password: string): Promise<BackupResult>;
  getAppDirectory(): Promise<ReadonlyArray<AppDirectoryEntry>>;
  getInstalledApps(): Promise<ReadonlyArray<AppDirectoryEntry>>;
  getUiPreference(key: string): Promise<string | null>;
  setUiPreference(key: string, value: string): Promise<void>;
  getInstallInfo(): Promise<InstallInfo>;
  openAppDetailsSettings(): Promise<void>;
  getSecuritySettings(): Promise<SecuritySettings>;
  setAppLock(enabled: boolean): Promise<void>;
  authenticate(): Promise<boolean>;
  getUpcomingActions(): Promise<ReadonlyArray<UpcomingAction>>;
  getRecurringPayments(): Promise<ReadonlyArray<RecurringPayment>>;
  dismissInsight(eventId: number): Promise<void>;
  setInsightReminder(eventId: number, at: number): Promise<string>;
  clearInsightReminder(eventId: number): Promise<void>;
}

let reportedPath = false;

export function getNativeNotifyIQ(): Spec | null {
  const turbo = TurboModuleRegistry.get<Spec>('NotifyIQ');
  const legacy = turbo ? undefined : (NativeModules.NotifyIQ as Spec | undefined);
  if (__DEV__ && !reportedPath) {
    reportedPath = true;
    console.info(`NotifyIQ native module path: ${turbo ? 'TurboModule' : legacy ? 'legacy interop' : 'missing'}`);
  }
  return turbo ?? legacy ?? null;
}
