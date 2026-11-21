import { StyleSheet, Text, View } from 'react-native';

import type { ScreenKey } from '../../navigation/screens';
import type { ListenerStatus } from '../../native/NativeNotifyIQ';
import type { AppTheme } from '../../theme/tokens';
import { NotificationAccessCard } from './NotificationAccessCard';

type FoundationScreenProps = {
  screen: ScreenKey;
  theme: AppTheme;
  title: string;
  listenerStatus: ListenerStatus | null;
  statusError: string | null;
  statusLoading: boolean;
  settingsOpening: boolean;
  settingsError: string | null;
  onOpenSettings: () => void;
  onRetryStatus: () => void;
};

const descriptions: Record<ScreenKey, string> = {
  home: 'A private place to review and understand the notifications you receive.',
  inbox: 'Notifications captured on this device.',
  search: 'Search will cover retained notification history once local storage is in place.',
  insights: 'Insights will be calculated from notification history stored on this device.',
  rules: 'Rules will organize NotifyIQ history. They will not change Android notification delivery.',
  privacy: 'Manage local retention, excluded apps and notification access.',
};

export function FoundationScreen({
  screen,
  theme,
  title,
  listenerStatus,
  statusError,
  statusLoading,
  settingsOpening,
  settingsError,
  onOpenSettings,
  onRetryStatus,
}: FoundationScreenProps) {
  const isHome = screen === 'home';

  return (
    <View style={styles.content}>
      <Text style={[styles.eyebrow, { color: theme.colors.brand }]}>
        {isHome ? 'FOUNDATION BUILD' : 'NOTIFYIQ'}
      </Text>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        {isHome ? 'Your notifications, understood.' : title}
      </Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        {descriptions[screen]}
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}>
        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
          {isHome ? 'Local-first by design' : `${title} is not connected yet`}
        </Text>
        <Text style={[styles.cardBody, { color: theme.colors.textSecondary }]}>
          {isHome
            ? 'Notification capture is local to this device and skips excluded apps and content that looks like credentials or payment card data.'
            : 'This screen is a navigation shell. It does not display sample notifications or invented activity.'}
        </Text>
      </View>

      {isHome ? (
        <NotificationAccessCard
          error={statusError}
          isLoading={statusLoading}
          isOpeningSettings={settingsOpening}
          settingsError={settingsError}
          onOpenSettings={onOpenSettings}
          onRetry={onRetryStatus}
          status={listenerStatus}
          theme={theme}
        />
      ) : null}

      <View style={[styles.note, { backgroundColor: theme.colors.brandSoft }]}>
        <Text style={[styles.noteTitle, { color: theme.colors.brand }]}>
          What this build includes
        </Text>
        <Text style={[styles.noteBody, { color: theme.colors.textPrimary }]}>
          App navigation, accessible screen states, and system, light, and dark appearance options.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    gap: 8,
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  note: {
    borderRadius: 16,
    padding: 18,
    gap: 6,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  noteBody: {
    fontSize: 14,
    lineHeight: 21,
  },
});
