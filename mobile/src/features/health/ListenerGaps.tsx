import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, FadeIn } from '../../components/ui';
import type { ListenerGap } from '../../native/NativeNotifyIQ';
import { getListenerGaps, markListenerGapsSeen, openAppDetailsSettings } from '../../native/notifyIQ';
import type { AppTheme } from '../../theme/tokens';

/** Pauses in the last week at which NotifyIQ suggests checking the phone's background settings. */
export const REPEATED_PAUSES = 3;

export function formatDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 48) return rest ? `${hours} h ${rest} min` : `${hours} h`;
  return `${Math.round(hours / 24)} days`;
}

function time(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function day(ms: number): string {
  const date = new Date(ms);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'today';
  if (date.toDateString() === yesterday.toDateString()) return 'yesterday';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function formatGapRange(gap: Pick<ListenerGap, 'startedAt' | 'endedAt' | 'exact'>): string {
  const from = `${gap.exact ? '' : 'about '}${time(gap.startedAt)}`;
  const sameDay = new Date(gap.startedAt).toDateString() === new Date(gap.endedAt).toDateString();
  return sameDay ? `${from} to ${time(gap.endedAt)} ${day(gap.endedAt)}` : `${from} ${day(gap.startedAt)} to ${time(gap.endedAt)} ${day(gap.endedAt)}`;
}

function recoveredLine(count: number): string {
  if (count === 0) return 'Notifications that arrived and were cleared in that time could not be saved.';
  const items = count === 1 ? '1 notification' : `${count} notifications`;
  return `${items} still in your notification tray ${count === 1 ? 'was' : 'were'} recovered. Any that were cleared in that time could not be saved.`;
}

function useGaps(days: number, refreshKey: number) {
  const [gaps, setGaps] = useState<ReadonlyArray<ListenerGap>>([]);
  const load = useCallback(() => { Promise.resolve().then(() => getListenerGaps(days)).then(setGaps).catch(() => setGaps([])); }, [days]);
  useEffect(() => { load(); }, [load, refreshKey]);
  return { gaps, reload: load };
}

function BackgroundAdvice({ theme, count }: { theme: AppTheme; count: number }) {
  const colors = theme.colors;
  return (
    <View style={styles.advice}>
      <Text style={[styles.body, { color: colors.textPrimary }]}>
        This happened {count} times in the last 7 days, so your phone may be stopping NotifyIQ in the background. In NotifyIQ’s app settings, allow it to run in the background or start automatically, if your phone has those options.
      </Text>
      <Pressable accessibilityRole="button" onPress={() => { openAppDetailsSettings().catch(() => undefined); }} style={[styles.button, { backgroundColor: colors.surfaceMuted }]}>
        <Text style={[styles.buttonText, { color: colors.textPrimary }]}>App settings</Text>
      </Pressable>
    </View>
  );
}

/** Home: tells the person about pauses they have not seen yet. */
export function PauseNotice({ theme, refreshKey = 0, connected }: { theme: AppTheme; refreshKey?: number; connected: boolean }) {
  const { gaps, reload } = useGaps(7, refreshKey + (connected ? 1 : 0));
  const unseen = gaps.filter(gap => !gap.seen);
  if (!connected || unseen.length === 0) return null;
  const latest = unseen[0];
  const colors = theme.colors;
  const dismiss = () => { markListenerGapsSeen().catch(() => undefined).finally(reload); };
  return (
    <FadeIn>
      <Card theme={theme}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>⏸️ NotifyIQ was paused</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Your phone did not let NotifyIQ read notifications from {formatGapRange(latest)} ({formatDuration(latest.endedAt - latest.startedAt)}).
          {unseen.length > 1 ? ` That is ${unseen.length} pauses since you last checked.` : ''}
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{recoveredLine(latest.recovered)}</Text>
        {gaps.length >= REPEATED_PAUSES ? <BackgroundAdvice theme={theme} count={gaps.length} /> : null}
        <Pressable accessibilityRole="button" onPress={dismiss} style={[styles.button, styles.primary, { backgroundColor: colors.brand }]}>
          <Text style={[styles.buttonText, { color: colors.onBrand }]}>Got it</Text>
        </Pressable>
      </Card>
    </FadeIn>
  );
}

/** Settings → Notification access & apps: the last 7 days of pauses. */
export function PauseHistory({ theme, refreshKey = 0 }: { theme: AppTheme; refreshKey?: number }) {
  const { gaps } = useGaps(7, refreshKey);
  const colors = theme.colors;
  return (
    <View>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>Pauses in the last 7 days</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Times your phone stopped NotifyIQ from reading notifications. Only the times are kept, never notification content.
      </Text>
      {gaps.length === 0 ? (
        <Text style={[styles.body, { color: colors.textPrimary }]}>No pauses. NotifyIQ has been reading notifications normally.</Text>
      ) : gaps.map(gap => (
        <View key={gap.id} style={[styles.row, { borderColor: colors.border }]}>
          <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{formatGapRange(gap)}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {formatDuration(gap.endedAt - gap.startedAt)}{gap.recovered ? ` · ${gap.recovered} recovered from the tray` : ''}
          </Text>
        </View>
      ))}
      {gaps.length >= REPEATED_PAUSES ? <BackgroundAdvice theme={theme} count={gaps.length} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  advice: { marginTop: 10 },
  button: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 10 },
  primary: { alignSelf: 'stretch' },
  buttonText: { fontSize: 15, fontWeight: '800' },
  row: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTitle: { fontSize: 14, fontWeight: '700' },
});
