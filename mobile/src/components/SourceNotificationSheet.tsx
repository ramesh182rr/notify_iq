import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { openInApp } from './openSource';
import { AppIcon, useAppDirectory } from '../app/AppDirectory';
import { categoryMeta } from '../features/money/format';
import type { NotificationItem } from '../native/NativeNotifyIQ';
import { getNotification } from '../native/notifyIQ';
import type { AppTheme } from '../theme/tokens';

/** Shows the saved notification an insight was read from, so the user can check what NotifyIQ understood. */
export function SourceNotificationSheet({ theme, eventId, note, onClose }: { theme: AppTheme; eventId: number | null; note?: string; onClose: () => void }) {
  const [item, setItem] = useState<NotificationItem | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const { name } = useAppDirectory();
  const colors = theme.colors;
  useEffect(() => {
    if (eventId == null) return;
    setState('loading');
    getNotification(eventId)
      .then(result => { setItem(result); setState(result ? 'ready' : 'missing'); })
      .catch(error => {
        if (__DEV__) console.warn('getNotification failed', (error as { code?: string }).code);
        setState('missing');
      });
  }, [eventId]);
  return (
    <Modal visible={eventId != null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.handle} />
          <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>Source notification</Text>
          {note ? <Text style={[styles.note, { color: colors.textSecondary }]}>{note}</Text> : null}
          {state === 'loading' ? <ActivityIndicator color={colors.brand} /> : state === 'missing' ? (
            <Text style={[styles.body, { color: colors.textSecondary }]}>This notification is no longer in your history.</Text>
          ) : item ? (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
              <View style={styles.row}>
                <AppIcon theme={theme} packageName={item.packageName} category={item.category} size={44} />
                <View style={styles.flex}>
                  <Text style={[styles.app, { color: colors.textPrimary }]}>{name(item.packageName)}</Text>
                  <Text style={[styles.note, { color: colors.textSecondary }]}>{new Date(item.receivedAt).toLocaleString()}</Text>
                </View>
              </View>
              {item.title ? <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.title}</Text> : null}
              {item.body ? <Text selectable style={[styles.body, { color: colors.textPrimary }]}>{item.body}</Text> : null}
              {item.subtext ? <Text style={[styles.body, { color: colors.textSecondary }]}>{item.subtext}</Text> : null}
              <Text style={[styles.note, { color: colors.textSecondary }]}>
                {categoryMeta(item.category).label} · {item.removedAt ? 'Dismissed in Android' : 'Still in Android’s notification shade'} · Text exactly as the app sent it
              </Text>
            </ScrollView>
          ) : null}
          {item ? (
            <Pressable accessibilityRole="button" onPress={() => openInApp(item.id, name(item.packageName))} style={[styles.close, { backgroundColor: colors.brand }]}>
              <Text style={[styles.closeText, { color: colors.onBrand }]}>Open in {name(item.packageName)} ↗</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" onPress={onClose} style={[styles.close, { backgroundColor: colors.brandSoft }]}>
            <Text style={[styles.closeText, { color: colors.brand }]}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, padding: 20, gap: 12, maxHeight: '80%' },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(128,128,128,0.4)' },
  title: { fontSize: 20, fontWeight: '800' },
  scroll: { flexGrow: 0 },
  content: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  app: { fontSize: 16, fontWeight: '800' },
  itemTitle: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22 },
  note: { fontSize: 12, lineHeight: 18 },
  close: { minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 15, fontWeight: '800' },
});
