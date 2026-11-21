import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

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
};

export type OverviewCount = { label: string; count: number };
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
}

export default TurboModuleRegistry.get<Spec>('NotifyIQ');
