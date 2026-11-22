import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CategoryAvatar, CategoryStack, HourChart, StatBar } from '../../components/ui';
import { appDisplayName, categoryVisual } from '../../theme/tokens';

import { getDailyOverview } from '../../native/notifyIQ';
import type { DailyOverview, ListenerStatus, NotificationItem } from '../../native/NativeNotifyIQ';
import type { AppTheme } from '../../theme/tokens';

type Props = { theme: AppTheme; refreshKey: number; status: ListenerStatus | null; statusLoading: boolean; statusError: string | null };
const categoryNames: Record<string, string> = {
  personal: 'Personal', finance: 'Finance', delivery_shopping: 'Delivery & shopping', travel: 'Travel',
  social: 'Social', promotion: 'Promotions', reminder_calendar: 'Reminders', system: 'System', other: 'Other',
};
const ignorePromise = (promise: Promise<unknown>) => promise.catch(() => undefined);

export function InsightsScreen({ theme, refreshKey, status, statusLoading, statusError }: Props) {
  const [overview, setOverview] = useState<DailyOverview | null>(null);
  const [selectedSource, setSelectedSource] = useState<NotificationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await getDailyOverview());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { ignorePromise(load()); }, [load, refreshKey]);

  const coverage = statusError
    ? 'Capture coverage cannot be checked right now. This overview only reflects notifications saved locally.'
    : statusLoading && status === null
      ? 'Checking notification access. This overview only includes locally saved records.'
      : status === null
        ? 'Capture coverage is unknown. This overview only includes locally saved records.'
    : status?.lastErrorCode
      ? 'A local capture error occurred. This overview may omit notifications.'
      : !status?.accessGranted
        ? 'Notification access is off. This overview may be incomplete for today.'
        : !status.connected
          ? 'The listener is disconnected. This overview may be incomplete until Android reconnects it.'
          : 'Based on notifications saved locally today. Android may omit or delay some events.';

  const cardStyle = [styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }];
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Daily overview</Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>A deterministic summary of today’s notification history on this device.</Text>
      <View accessibilityLiveRegion="polite" style={cardStyle}>
        <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Capture coverage</Text>
        <Text style={[styles.copy, { color: theme.colors.textSecondary }]}>{coverage}</Text>
      </View>

      {error ? (
        <Pressable accessibilityRole="button" onPress={() => ignorePromise(load())} style={cardStyle}>
          <Text style={{ color: theme.colors.danger }}>The local overview could not be loaded. Tap to retry.</Text>
        </Pressable>
      ) : loading && overview === null ? (
        <Text style={{ color: theme.colors.textSecondary }}>Preparing today’s overview…</Text>
      ) : overview ? (
        <>
          <View style={[styles.hero, { backgroundColor: theme.colors.hero }]}>
            <View style={[styles.heroOrb, { backgroundColor: theme.colors.heroAccent }]} />
            <Text style={[styles.heroEyebrow, { color: theme.colors.onHeroMuted }]}>{new Date(overview.dayStart).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</Text>
            <Text style={[styles.heroNumber, { color: theme.colors.onHero }]}>{overview.totalCount}</Text>
            <CategoryStack theme={theme} categories={overview.categories} onHero />
            <Text style={[styles.summary, { color: theme.colors.onHero }]}>
              {overview.totalCount === 0
                ? 'No notification history was saved today. That can mean none arrived, or capture was unavailable.'
                : `NotifyIQ saved ${overview.totalCount} ${overview.totalCount === 1 ? 'notification' : 'notifications'} from ${overview.appCount} ${overview.appCount === 1 ? 'app' : 'apps'} today.`}
            </Text>
            <Text style={[styles.copy, { color: theme.colors.onHeroMuted }]}>Generated from local retained records. This summary does not represent a complete Android notification log.</Text>
          </View>
          {overview.categories.length ? (
            <View style={cardStyle}>
              <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Categories</Text>
              {overview.categories.map(row => (
                <StatBar key={row.label} theme={theme} label={categoryNames[row.label] ?? 'Other'} value={row.count}
                  max={overview.categories[0]?.count ?? 1} color={categoryVisual(theme, row.label).fg}
                  leading={<CategoryAvatar theme={theme} category={row.label} size={36} />} />
              ))}
            </View>
          ) : null}
          {overview.apps.length ? (
            <View style={cardStyle}>
              <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Most active apps</Text>
              {overview.apps.map(row => (
                <StatBar key={row.label} theme={theme} label={appDisplayName(row.label)} value={row.count}
                  max={overview.apps[0]?.count ?? 1} color={theme.colors.heroAccent} />
              ))}
            </View>
          ) : null}
          {overview.hours.length ? (
            <View style={cardStyle}>
              <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Busiest arrival hours</Text>
              <Text style={[styles.copy, { color: theme.colors.textSecondary }]}>Counts are grouped by local clock hour.</Text>
              <HourChart theme={theme} hours={overview.hours} color={theme.colors.brand} />
              {overview.hours.slice(0, 3).map(row => (
                <View key={row.label} style={styles.statRow}>
                  <Text style={[styles.copy, { color: theme.colors.textPrimary }]}>{row.label}</Text>
                  <Text style={[styles.copy, { color: theme.colors.textSecondary }]}>{row.count}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={cardStyle}>
            <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Recent sources</Text>
            {overview.sources.length ? overview.sources.map(source => (
              <Pressable key={source.id} accessibilityRole="button" accessibilityLabel={`Open source notification from ${source.packageName}`} onPress={() => setSelectedSource(source)} style={styles.sourceRow}>
                <CategoryAvatar theme={theme} category={source.category} size={38} />
                <View style={styles.flex}>
                  <Text style={[styles.sourceTitle, { color: theme.colors.textPrimary }]}>{source.title || source.packageName}</Text>
                  <Text numberOfLines={2} style={[styles.copy, { color: theme.colors.textSecondary }]}>{source.body || source.packageName}</Text>
                </View>
                <Text style={{ color: theme.colors.brand }}>View</Text>
              </Pressable>
            )) : <Text style={[styles.copy, { color: theme.colors.textSecondary }]}>No source notifications to link today.</Text>}
          </View>
        </>
      ) : null}

      <Modal visible={selectedSource !== null} transparent animationType="fade" onRequestClose={() => setSelectedSource(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.heading, { color: theme.colors.textPrimary }]}>Source notification</Text>
            {selectedSource ? <>
              <Text style={[styles.copy, { color: theme.colors.brand }]}>{selectedSource.packageName}</Text>
              {selectedSource.title ? <Text style={[styles.sourceTitle, { color: theme.colors.textPrimary }]}>{selectedSource.title}</Text> : null}
              {selectedSource.body ? <Text style={[styles.copy, { color: theme.colors.textPrimary }]}>{selectedSource.body}</Text> : null}
              <Text style={[styles.copy, { color: theme.colors.textSecondary }]}>{new Date(selectedSource.receivedAt).toLocaleString()}</Text>
            </> : null}
            <Pressable accessibilityRole="button" onPress={() => setSelectedSource(null)} style={styles.closeButton}>
              <Text style={{ color: theme.colors.brand }}>Close source</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 14, paddingBottom: 24 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  description: { fontSize: 16, lineHeight: 24 },
  card: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 10 },
  hero: { borderRadius: 26, padding: 22, gap: 10, overflow: 'hidden' },
  heroOrb: { position: 'absolute', width: 200, height: 200, borderRadius: 100, right: -70, top: -90, opacity: 0.5 },
  heroEyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  heroNumber: { fontSize: 56, lineHeight: 62, fontWeight: '900', letterSpacing: -2 },
  heading: { fontSize: 17, fontWeight: '700' },
  summary: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  copy: { fontSize: 14, lineHeight: 21 },
  statRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sourceRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingVertical: 6 },
  sourceTitle: { fontSize: 15, fontWeight: '700' },
  flex: { flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  detailCard: { borderWidth: 1, borderRadius: 18, padding: 20, gap: 12 },
  closeButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
