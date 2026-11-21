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
};

export interface Spec extends TurboModule {
  getListenerStatus(): Promise<ListenerStatus>;
  openNotificationAccessSettings(): Promise<void>;
  getRecentNotifications(limit: number): Promise<ReadonlyArray<NotificationItem>>;
  setAppExcluded(packageName: string, excluded: boolean): Promise<void>;
  getExcludedPackages(): Promise<ReadonlyArray<string>>;
  clearNotificationHistory(): Promise<void>;
  searchNotifications(
    query: string,
    packageName: string,
    from: number,
    to: number,
    beforeReceivedAt: number,
    beforeId: number,
    includeArchived: boolean,
    limit: number,
  ): Promise<ReadonlyArray<NotificationItem>>;
  setNotificationSaved(id: number, saved: boolean): Promise<void>;
  setNotificationArchived(id: number, archived: boolean): Promise<void>;
  deleteNotification(id: number): Promise<void>;
  getRetentionDays(): Promise<number>;
  setRetentionDays(days: number): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('NotifyIQ');
