import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { clearNotificationHistory, getExcludedPackages, getRetentionDays, setAppExcluded, setRetentionDays } from '../../native/notifyIQ';
import type { ListenerStatus } from '../../native/NativeNotifyIQ';
import type { AppTheme } from '../../theme/tokens';
import { AppIcon, useAppDirectory } from '../../app/AppDirectory';
import { AppPicker } from '../../components/AppPicker';

const RETENTION_OPTIONS = [7, 30, 90, -1];
type Props = { theme: AppTheme; status: ListenerStatus | null; onOpenSettings: () => void };
const ignorePromise = (promise: Promise<unknown>) => promise.catch(() => undefined);

export function PrivacyCentreScreen({ theme, status, onOpenSettings }: Props) {
  const [retention, setRetention] = useState(30);
  const [excluded, setExcluded] = useState<ReadonlyArray<string>>([]);
  const [picking, setPicking] = useState(false);
  const { name: appName } = useAppDirectory();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const [days, packages] = await Promise.all([getRetentionDays(), getExcludedPackages()]);
      setRetention(days);
      setExcluded(packages);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => { ignorePromise(load()); }, [load]);

  const updateExclusion = async (name: string, exclude: boolean) => {
    setBusy(true);
    try {
      await setAppExcluded(name, exclude);
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const confirmClear = () => Alert.alert(
    'Delete all notification history?',
    'This permanently removes every notification saved by NotifyIQ on this device. This cannot be undone.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete history', style: 'destructive', onPress: async () => {
      setBusy(true);
      try { await clearNotificationHistory(); setError(false); }
      catch { setError(true); }
      finally { setBusy(false); }
    } }],
  );

  const card = { backgroundColor: theme.colors.surface, borderColor: theme.colors.border };
  return (
    <ScrollView contentContainerStyle={styles.content}>

      <View style={[styles.card, card]}>
        <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Notification access</Text>
        <Text style={[styles.copy, { color: theme.colors.textSecondary }]} accessibilityLiveRegion="polite">
          {status?.accessGranted ? 'Allowed by Android. Captured history is stored locally on this device.' : 'Off. NotifyIQ cannot capture notifications until you enable access in Android settings.'}
        </Text>
        <Pressable accessibilityRole="button" onPress={onOpenSettings} style={styles.action}>
          <Text style={{ color: theme.colors.brand }}>Open Android notification access settings</Text>
        </Pressable>
      </View>

      <View style={[styles.card, card]}>
        <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Automatic deletion</Text>
        <Text style={[styles.copy, { color: theme.colors.textSecondary }]}>History older than this is deleted from NotifyIQ. Saved notifications stay until you unsave or delete them.</Text>
        <View style={styles.row}>
          {RETENTION_OPTIONS.map(days => (
            <Pressable key={days} accessibilityRole="button" accessibilityState={{ selected: retention === days, disabled: busy }} disabled={busy} onPress={async () => {
              setBusy(true);
              try { await setRetentionDays(days); setRetention(days); setError(false); }
              catch { setError(true); }
              finally { setBusy(false); }
            }} style={[styles.chip, { backgroundColor: retention === days ? theme.colors.brandSoft : theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={{ color: theme.colors.textPrimary }}>{days === -1 ? 'Never' : `${days} days`}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.card, card]}>
        <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Excluded apps</Text>
        <Text style={[styles.copy, { color: theme.colors.textSecondary }]}>Excluded apps are checked before notification text is read. Adding an app also deletes its existing NotifyIQ history.</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => setPicking(true)} style={[styles.pickButton, { backgroundColor: theme.colors.brandSoft }]}>
          <Text style={{ color: theme.colors.brand, fontWeight: '800' }}>＋ Choose an app to exclude</Text>
        </Pressable>
        <AppPicker theme={theme} visible={picking} title="Exclude an app" onClose={() => setPicking(false)}
          onPick={value => { setPicking(false); if (value) ignorePromise(updateExclusion(value, true)); }} />
        {excluded.length ? excluded.map(name => (
          <View key={name} style={styles.excludedRow}>
            <AppIcon theme={theme} packageName={name} size={32} />
            <View style={styles.flexCol}>
              <Text style={[styles.copy, { color: theme.colors.textPrimary, fontWeight: '700' }]}>{appName(name)}</Text>
              <Text style={[styles.copy, styles.package, { color: theme.colors.textSecondary }]}>{name}</Text>
            </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Allow ${name}`} onPress={() => ignorePromise(updateExclusion(name, false))} disabled={busy}>
              <Text style={{ color: theme.colors.brand }}>Allow</Text>
            </Pressable>
          </View>
        )) : <Text style={[styles.copy, { color: theme.colors.textSecondary }]}>No excluded apps.</Text>}
      </View>

      <View style={[styles.card, card]}>
        <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Delete local history</Text>
        <Text style={[styles.copy, { color: theme.colors.textSecondary }]}>This removes NotifyIQ’s saved copies. It does not dismiss Android notifications or guarantee forensic erasure from flash storage.</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={confirmClear} style={styles.action}>
          <Text style={{ color: theme.colors.danger }}>Delete all notification history</Text>
        </Pressable>
      </View>
      {error ? <Pressable accessibilityRole="button" onPress={() => ignorePromise(load())}><Text style={{ color: theme.colors.danger }}>Some privacy settings could not be loaded or saved. Tap to retry.</Text></Pressable> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingBottom: 24 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  description: { fontSize: 16, lineHeight: 24 },
  card: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 10 },
  heading: { fontSize: 17, fontWeight: '700' },
  copy: { fontSize: 14, lineHeight: 21 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, minHeight: 48, justifyContent: 'center' },
  action: { minHeight: 48, justifyContent: 'center' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  pickButton: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  flexCol: { flex: 1 },
  excludedRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  package: { flex: 1 },
});
