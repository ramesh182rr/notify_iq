import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export type ListenerStatus = {
  accessGranted: boolean;
  connected: boolean;
  lastErrorCode: string | null;
};

export type NotificationItem = {
  id: string;
  packageName: string;
  title: string | null;
  body: string | null;
  receivedAt: number;
  removedAt: number | null;
};

export interface Spec extends TurboModule {
  getListenerStatus(): Promise<ListenerStatus>;
  openNotificationAccessSettings(): Promise<void>;
  getRecentNotifications(limit: number): Promise<ReadonlyArray<NotificationItem>>;
  setAppExcluded(packageName: string, excluded: boolean): Promise<void>;
  clearNotificationHistory(): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('NotifyIQ');
