import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ScreenKey } from '../../navigation/screens';
import type { ListenerStatus } from '../../native/NativeNotifyIQ';
import type { AppTheme } from '../../theme/tokens';
import { NotificationAccessCard } from '../foundation/NotificationAccessCard';

type HomeScreenProps = {
  theme: AppTheme;
  listenerStatus: ListenerStatus | null;
  statusError: string | null;
  statusLoading: boolean;
  settingsOpening: boolean;
  settingsError: string | null;
  onOpenSettings: () => void;
  onRetryStatus: () => void;
  onNavigate: (screen: ScreenKey) => void;
};

const shortcuts: { key: ScreenKey; title: string; body: string }[] = [
  { key: 'inbox', title: 'Inbox', body: 'Review, save, archive or delete notifications kept on this device.' },
  { key: 'insights', title: "Today's overview", body: 'Volume, apps, categories and busiest hours from retained history.' },
  { key: 'rules', title: 'Rules', body: 'Organise history by app or text. Android delivery is never changed.' },
  { key: 'privacy', title: 'Privacy', body: 'Retention, excluded apps, notification access and local deletion.' },
];

export function HomeScreen({
  theme,
  listenerStatus,
  statusError,
  statusLoading,
  settingsOpening,
  settingsError,
  onOpenSettings,
  onRetryStatus,
  onNavigate,
}: HomeScreenProps) {
  return (
    <View style={styles.content}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Your notifications, understood.</Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        A private place to review and understand the notifications you receive. Capture skips excluded apps and
        content that looks like credentials or payment card data, and everything stays on this device.
      </Text>

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

      {shortcuts.map(item => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.title}`}
          onPress={() => onNavigate(item.key)}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>{item.title}</Text>
          <Text style={[styles.cardBody, { color: theme.colors.textSecondary }]}>{item.body}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: 16 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  description: { fontSize: 16, lineHeight: 24 },
  card: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 6, minHeight: 48 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardBody: { fontSize: 14, lineHeight: 21 },
});
