import type { ListenerStatus, NotificationRecord } from './types';

// Implement with a typed Turbo Native Module or supported Native Module bridge.
// The native service persists events independently; JS reads the local repository.
export interface NotifyIQNativeModule {
  getListenerStatus(): Promise<ListenerStatus>;
  openNotificationAccessSettings(): Promise<void>;
  getRecentNotifications(cursor?: string, limit?: number): Promise<{
    items: NotificationRecord[];
    nextCursor?: string | null;
  }>;
  setAppExcluded(packageName: string, excluded: boolean): Promise<void>;
  clearNotificationHistory(): Promise<void>;
}
