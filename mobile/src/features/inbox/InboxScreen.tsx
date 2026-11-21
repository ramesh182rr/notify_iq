import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { clearNotificationHistory, getRecentNotifications } from '../../native/notifyIQ';
import type { NotificationItem } from '../../native/NativeNotifyIQ';
import type { AppTheme } from '../../theme/tokens';

type Props = { theme: AppTheme; refreshKey: number };

export function InboxScreen({ theme, refreshKey }: Props) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const refresh = useCallback(async () => {
    try { setItems([...await getRecentNotifications(100)]); setError(false); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh, refreshKey]);
  const confirmClear = () => Alert.alert(
    'Delete notification history?',
    'This removes all notifications saved on this device. This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setClearing(true);
        try { await clearNotificationHistory(); setItems([]); setError(false); }
        catch { setError(true); }
        finally { setClearing(false); }
      } },
    ],
  );

  return (
    <View style={styles.content}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Inbox</Text>
      {!loading && items.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: clearing }} disabled={clearing} onPress={confirmClear}>
          <Text style={{ color: theme.colors.danger }}>{clearing ? 'Deleting…' : 'Delete all history'}</Text>
        </Pressable>
      ) : null}
      {error ? (
        <Pressable onPress={refresh} accessibilityRole="button">
          <Text style={{ color: theme.colors.textSecondary }}>Could not load notification history. Tap to retry.</Text>
        </Pressable>
      ) : loading ? (
        <Text style={{ color: theme.colors.textSecondary }}>Loading saved notifications…</Text>
      ) : items.length === 0 ? (
        <Text style={{ color: theme.colors.textSecondary }}>No saved notifications yet. Grant notification access in Home to begin local capture.</Text>
      ) : items.map(item => (
        <View key={item.id} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.app, { color: theme.colors.brand }]}>{item.packageName}</Text>
          {item.title ? <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>{item.title}</Text> : null}
          {item.body ? <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{item.body}</Text> : null}
          <Text style={[styles.time, { color: theme.colors.textSecondary }]}>{new Date(item.receivedAt).toLocaleString()}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: 14 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 },
  app: { fontSize: 12, fontWeight: '700' },
  itemTitle: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 11, marginTop: 4 },
});
