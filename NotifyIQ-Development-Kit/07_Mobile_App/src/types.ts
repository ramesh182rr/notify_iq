export type NotificationCategory =
  | 'personal' | 'finance' | 'delivery_shopping' | 'travel'
  | 'social' | 'promotion' | 'reminder_calendar' | 'system' | 'other';

export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface NotificationRecord {
  id: string;
  packageName: string;
  appLabel?: string;
  title?: string;
  body?: string;
  receivedAt: number;
  removedAt?: number | null;
  category: NotificationCategory;
  priority: NotificationPriority;
  confidence: number;
  analysisMethod: 'rules' | 'local_model' | 'cloud_model' | 'user_corrected';
  isSaved: boolean;
  isArchived: boolean;
  redacted: boolean;
}

export interface ListenerStatus {
  accessGranted: boolean;
  connected: boolean;
  lastCaptureAt?: string | null;
  lastErrorCode?: string | null;
}
