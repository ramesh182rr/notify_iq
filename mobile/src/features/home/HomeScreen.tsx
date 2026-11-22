import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, useAppDirectory } from '../../app/AppDirectory';

import { readableTextOn } from '../../theme/contrast';
import { Card, CategoryStack, FadeIn, HourChart, Icon, Pill, SectionHeader, StatBar } from '../../components/ui';
import type { ScreenKey } from '../../navigation/screens';
import type { DailyOverview, ListenerStatus, MoneySummary, NotificationItem, UpcomingAction } from '../../native/NativeNotifyIQ';
import { getDailyOverview, getMoneySummary, getRecentNotifications, getUpcomingActions } from '../../native/notifyIQ';
import type { InsightsSection } from '../insights/InsightsHub';
import { LegalScreen } from '../legal/LegalScreen';
import { actionKinds, dueLabel, formatMoney } from '../money/format';
import { categoryVisual, priorityColor, relativeTime, type AppTheme } from '../../theme/tokens';

type HomeScreenProps = {
  theme: AppTheme;
  refreshKey?: number;
  listenerStatus: ListenerStatus | null;
  statusError: string | null;
  statusLoading: boolean;
  settingsOpening: boolean;
  settingsError: string | null;
  onOpenSettings: () => void;
  onRetryStatus: () => void;
  onNavigate: (screen: ScreenKey) => void;
  onOpenInsights?: (section: InsightsSection) => void;
};

const tips = [
  'Create a rule to save delivery updates automatically, so they never get buried.',
  'Search finds words inside any notification you kept, even after you dismissed it.',
  'Exclude chatty apps in Privacy. Their notifications are never read or stored.',
  'Save a search you run often and reopen it with one tap.',
  'Rules can remind you about a notification later, without touching Android’s shade.',
  'Change a category in the Inbox if NotifyIQ guessed wrong. Your choice sticks.',
];

const quickActions: { key: ScreenKey; title: string; body: string }[] = [
  { key: 'search', title: 'Search', body: 'Find anything you kept' },
  { key: 'inbox', title: 'Inbox', body: 'Review & save' },
  { key: 'rules', title: 'Rules', body: 'Organise automatically' },
  { key: 'privacy', title: 'Privacy', body: 'Exclusions & retention' },
];

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen({
  theme, refreshKey = 0, listenerStatus, statusError, statusLoading, settingsOpening, settingsError,
  onOpenSettings, onRetryStatus, onNavigate, onOpenInsights,
}: HomeScreenProps) {
  const { name: appName } = useAppDirectory();
  const [overview, setOverview] = useState<DailyOverview | null>(null);
  const [recent, setRecent] = useState<ReadonlyArray<NotificationItem>>([]);
  const [loadError, setLoadError] = useState(false);
  const [upcoming, setUpcoming] = useState<ReadonlyArray<UpcomingAction>>([]);
  const [money, setMoney] = useState<MoneySummary | null>(null);
  const [legalOpen, setLegalOpen] = useState(false);
  const now = new Date();
  const accessOn = listenerStatus?.accessGranted === true;

  const load = useCallback(async () => {
    try {
      const [day, latest] = await Promise.all([getDailyOverview(), getRecentNotifications(50)]);
      setOverview(day);
      setRecent(latest);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
    try {
      const today = new Date();
      const [next, month] = await Promise.all([
        getUpcomingActions(),
        getMoneySummary(new Date(today.getFullYear(), today.getMonth(), 1).getTime(), Date.now() + 60_000),
      ]);
      setUpcoming(next.filter(item => item.dueAt >= Date.now() - 86_400_000));
      setMoney(month);
    } catch {
      setUpcoming([]);
      setMoney(null);
    }
  }, []);

  useEffect(() => { load().catch(() => undefined); }, [load, refreshKey, accessOn]);

  const dayStart = overview?.dayStart ?? new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const today = recent.filter(item => item.receivedAt >= dayStart && item.archivedAt === null);
  const attention = today.filter(item => item.priority === 'urgent' || item.priority === 'high');
  const total = overview?.totalCount ?? 0;
  const topApps = (overview?.apps ?? []).slice(0, 3);
  const peakHour = [...(overview?.hours ?? [])].sort((a, b) => b.count - a.count)[0];
  const tip = tips[Math.floor(now.getTime() / 86_400_000) % tips.length];
  const colors = theme.colors;
  const openInsights = (section: InsightsSection) => (onOpenInsights ? onOpenInsights(section) : onNavigate('insights'));

  return (
    <View style={styles.content}>
      <FadeIn>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
        <Text accessibilityRole="header" style={[styles.greeting, { color: colors.textPrimary }]}>{greeting(now)} 👋</Text>
        <Text style={[styles.title, { color: colors.textSecondary }]}>Your notifications, understood.</Text>
      </FadeIn>

      {!accessOn ? (
        <FadeIn delay={60}>
          <View style={[styles.hero, { backgroundColor: colors.hero }]}>
            <View style={[styles.heroOrb, { backgroundColor: colors.heroAccent }]} />
            <View style={[styles.heroOrbSmall, { backgroundColor: colors.heroAccent }]} />
            <Text style={[styles.heroEyebrow, { color: colors.onHeroMuted }]}>PRIVACY AND ACCESS</Text>
            <Text style={[styles.heroTitle, { color: colors.onHero }]}>
              {statusLoading ? 'Checking notification access…' : 'Notification access is off'}
            </Text>
            <Text style={[styles.heroBody, { color: colors.onHeroMuted }]}>
              Turn it on to build a private, searchable history of your notifications. Nothing leaves this phone.
            </Text>
            {['Open Android settings', 'Allow NotifyIQ notification access', 'Come back. Your history starts now.'].map((step, index) => (
              <View key={step} style={styles.step}>
                <View style={styles.stepBadge}><Text style={[styles.stepNumber, { color: colors.hero }]}>{index + 1}</Text></View>
                <Text style={[styles.stepText, { color: colors.onHero }]}>{step}</Text>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              disabled={settingsOpening}
              onPress={statusError ? onRetryStatus : onOpenSettings}
              style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}>
              {settingsOpening ? <ActivityIndicator color={colors.hero} /> : (
                <Text style={[styles.heroButtonText, { color: colors.hero }]}>
                  {statusError ? 'Try again' : 'Open notification access settings'}
                </Text>
              )}
            </Pressable>
            {statusError || settingsError ? (
              <Text style={[styles.heroBody, { color: '#FFD3D9' }]}>{settingsError ?? statusError}</Text>
            ) : null}
          </View>
        </FadeIn>
      ) : (
        <FadeIn delay={60}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Today: ${total} notifications from ${overview?.appCount ?? 0} apps. Open insights.`}
            onPress={() => onNavigate('insights')} style={({ pressed }) => [styles.hero, { backgroundColor: colors.hero }, pressed && styles.pressed]}>
            <View style={[styles.heroOrb, { backgroundColor: colors.heroAccent }]} />
            <View style={[styles.heroOrbSmall, { backgroundColor: colors.heroAccent }]} />
            <View style={styles.heroTop}>
              <Text style={[styles.heroEyebrow, { color: colors.onHeroMuted }]}>TODAY</Text>
              <View style={[styles.liveDot, { backgroundColor: listenerStatus?.connected ? '#5BE0A0' : '#FFB547' }]} />
              <Text style={[styles.heroEyebrow, { color: colors.onHeroMuted }]}>{listenerStatus?.connected ? 'Capturing' : 'Reconnecting'}</Text>
            </View>
            <View style={styles.heroNumberRow}>
              <Text style={[styles.heroNumber, { color: colors.onHero }]}>{total}</Text>
              <Text style={[styles.heroUnit, { color: colors.onHeroMuted }]}>
                {total === 1 ? 'notification' : 'notifications'}{'\n'}from {overview?.appCount ?? 0} {overview?.appCount === 1 ? 'app' : 'apps'}
              </Text>
            </View>
            <CategoryStack theme={theme} categories={overview?.categories ?? []} onHero />
            <View style={styles.legend}>
              {(overview?.categories ?? []).slice(0, 4).map(row => {
                const visual = categoryVisual(theme, row.label);
                return (
                  <View key={row.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: visual.fg }]} />
                    <Text style={[styles.legendText, { color: colors.onHero }]}>{visual.label} {row.count}</Text>
                  </View>
                );
              })}
              {total === 0 ? <Text style={[styles.legendText, { color: colors.onHeroMuted }]}>Quiet so far. New notifications will appear here.</Text> : null}
            </View>
          </Pressable>
        </FadeIn>
      )}

      {loadError ? (
        <Card theme={theme} onPress={() => { load().catch(() => undefined); }} accessibilityLabel="Retry loading today">
          <Text style={{ color: colors.danger }}>Today’s summary could not be loaded. Tap to retry.</Text>
        </Card>
      ) : null}

      {accessOn ? (
        <FadeIn delay={120}>
          <Card theme={theme} onPress={() => onNavigate('inbox')} accessibilityLabel={`${attention.length} notifications may need a look. Open Inbox.`}>
            <View style={styles.row}>
              <View style={[styles.attentionIcon, { backgroundColor: attention.length ? '#FFE9EC' : colors.brandSoft }]}>
                <Text style={styles.attentionEmoji}>{attention.length ? '⚡' : '🌿'}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  {attention.length ? `${attention.length} may need a look` : 'All calm today'}
                </Text>
                <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
                  {attention.length ? 'Marked urgent or high by explicit wording in the text.' : 'Nothing flagged as urgent or high priority.'}
                </Text>
              </View>
              <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
            </View>
            {attention.slice(0, 2).map(item => (
              <View key={item.id} style={styles.miniRow}>
                <Pill label={item.priority === 'urgent' ? 'Urgent' : 'High'} color={readableTextOn(priorityColor(theme, item.priority))} background={priorityColor(theme, item.priority)} />
                <Text numberOfLines={1} style={[styles.cardBody, styles.flex, { color: colors.textPrimary }]}>{item.title || item.body || appName(item.packageName)}</Text>
              </View>
            ))}
          </Card>
        </FadeIn>
      ) : null}

      {accessOn && upcoming.length ? (
        <FadeIn delay={150}>
          <SectionHeader theme={theme} title="Coming up" action="See all" onAction={() => openInsights('upcoming')} />
          <Card theme={theme} style={styles.listCard}>
            {upcoming.slice(0, 3).map((item, index) => {
              const kind = actionKinds[item.kind] ?? actionKinds.task;
              const due = dueLabel(item.dueAt, item.hasTime);
              return (
                <Pressable key={item.eventId} accessibilityRole="button" accessibilityLabel={`${kind.label} ${due.text}: ${item.title ?? ''}`}
                  onPress={() => openInsights('upcoming')}
                  style={({ pressed }) => [styles.latestRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, pressed && styles.pressed]}>
                  <View style={[styles.upcomingIcon, { backgroundColor: colors.brandSoft }]}><Text style={styles.attentionEmoji}>{kind.emoji}</Text></View>
                  <View style={styles.flex}>
                    <Text style={[styles.appName, { color: due.tone === 'overdue' ? colors.danger : due.tone === 'soon' ? colors.warning : colors.brand }]}>{kind.label} · {due.text}</Text>
                    <Text numberOfLines={1} style={[styles.latestTitle, { color: colors.textPrimary }]}>{item.title || item.body || appName(item.packageName)}</Text>
                  </View>
                  {item.amountMinor != null && item.currency ? <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{formatMoney(item.amountMinor, item.currency)}</Text> : null}
                </Pressable>
              );
            })}
          </Card>
        </FadeIn>
      ) : null}

      {accessOn && money && (money.debitCount > 0 || money.creditCount > 0) ? (
        <FadeIn delay={170}>
          <Card theme={theme} onPress={() => openInsights('money')} accessibilityLabel={`This month spent ${formatMoney(money.spentMinor, money.currency)}. Open money insights.`}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={[styles.appName, { color: colors.textSecondary }]}>THIS MONTH · FROM PAYMENT ALERTS</Text>
                <Text style={[styles.moneyBig, { color: colors.textPrimary }]}>{formatMoney(money.spentMinor, money.currency)} <Text style={[styles.cardBody, { color: colors.textSecondary }]}>spent</Text></Text>
              </View>
              <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
            </View>
            <View style={styles.moneyChips}>
              {money.merchants.slice(0, 3).map(row => (
                <Pill key={row.label} label={`${row.label} ${formatMoney(row.amountMinor, money.currency, { compact: true })}`} color={colors.brand} background={colors.brandSoft} />
              ))}
              {money.receivedMinor > 0 ? <Pill label={`In ${formatMoney(money.receivedMinor, money.currency, { compact: true })}`} color={colors.success} background={colors.surfaceMuted} /> : null}
            </View>
          </Card>
        </FadeIn>
      ) : null}

      {accessOn && total > 0 ? (
        <FadeIn delay={180}>
          <Card theme={theme} onPress={() => onNavigate('insights')} accessibilityLabel="Open insights">
            <View style={styles.rowBetween}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Your day’s rhythm</Text>
              {peakHour ? <Pill label={`Peak ${peakHour.label}`} color={colors.brand} background={colors.brandSoft} /> : null}
            </View>
            <HourChart theme={theme} hours={overview?.hours ?? []} color={colors.brand} height={64} />
            {topApps.length ? <View style={styles.topApps}>
              {topApps.map(row => (
                <StatBar key={row.label} theme={theme} label={appName(row.label)} value={row.count} max={topApps[0].count} color={colors.heroAccent} />
              ))}
            </View> : null}
          </Card>
        </FadeIn>
      ) : null}

      {accessOn && today.length ? (
        <FadeIn delay={220}>
          <SectionHeader theme={theme} title="Latest" action="See all" onAction={() => onNavigate('inbox')} />
          <Card theme={theme} style={styles.listCard}>
            {today.slice(0, 4).map((item, index) => (
              <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${appName(item.packageName)}: ${item.title ?? ''}. Open Inbox.`}
                onPress={() => onNavigate('inbox')}
                style={({ pressed }) => [styles.latestRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, pressed && styles.pressed]}>
                <AppIcon theme={theme} packageName={item.packageName} category={item.category} size={40} />
                <View style={styles.flex}>
                  <View style={styles.rowBetween}>
                    <Text numberOfLines={1} style={[styles.appName, { color: colors.textSecondary }]}>{appName(item.packageName)}</Text>
                    <Text style={[styles.time, { color: colors.textSecondary }]}>{relativeTime(item.receivedAt)}</Text>
                  </View>
                  <Text numberOfLines={1} style={[styles.latestTitle, { color: colors.textPrimary }]}>{item.title || appName(item.packageName)}</Text>
                  {item.body ? <Text numberOfLines={1} style={[styles.cardBody, { color: colors.textSecondary }]}>{item.body}</Text> : null}
                </View>
              </Pressable>
            ))}
          </Card>
        </FadeIn>
      ) : null}

      <FadeIn delay={260}>
        <SectionHeader theme={theme} title="Jump back in" />
        <View style={styles.grid}>
          {quickActions.map(action => (
            <Card key={action.key} theme={theme} style={styles.tile} onPress={() => onNavigate(action.key)} accessibilityLabel={`Open ${action.title}`}>
              <View style={[styles.tileIcon, { backgroundColor: colors.brandSoft }]}>
                <Icon name={action.key} color={colors.brand} size={22} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{action.title}</Text>
              <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{action.body}</Text>
            </Card>
          ))}
        </View>
      </FadeIn>

      <FadeIn delay={300}>
        <View style={[styles.tip, { backgroundColor: colors.brandSoft }]}>
          <Text style={styles.tipEmoji}>💡</Text>
          <View style={styles.flex}>
            <Text style={[styles.tipTitle, { color: colors.brand }]}>Tip of the day</Text>
            <Text style={[styles.cardBody, { color: colors.textPrimary }]}>{tip}</Text>
          </View>
        </View>
        <View style={styles.promise}>
          {['🔒 Stays on this phone', '🚫 No account', '📴 No internet access'].map(item => (
            <Text key={item} style={[styles.promiseText, { color: colors.textSecondary }]}>{item}</Text>
          ))}
        </View>
        <Pressable accessibilityRole="button" onPress={() => setLegalOpen(true)} style={styles.legalLink}>
          <Text style={[styles.legalText, { color: colors.brand }]}>Privacy policy · Terms · Security</Text>
        </Pressable>
        <LegalScreen theme={theme} visible={legalOpen} onClose={() => setLegalOpen(false)} />
      </FadeIn>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: 14 },
  date: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  greeting: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.8, marginTop: 2 },
  title: { fontSize: 15, lineHeight: 22, marginTop: 2 },
  hero: { borderRadius: 26, padding: 22, gap: 12, overflow: 'hidden' },
  heroOrb: { position: 'absolute', width: 200, height: 200, borderRadius: 100, right: -70, top: -80, opacity: 0.55 },
  heroOrbSmall: { position: 'absolute', width: 90, height: 90, borderRadius: 45, right: 40, bottom: -50, opacity: 0.35 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroEyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 4 },
  heroTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.4 },
  heroBody: { fontSize: 14, lineHeight: 21 },
  heroNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroNumber: { fontSize: 64, lineHeight: 70, fontWeight: '900', letterSpacing: -2 },
  heroUnit: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)' },
  legendText: { fontSize: 13, fontWeight: '700' },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  stepNumber: { fontSize: 13, fontWeight: '900' },
  stepText: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  heroButton: { minHeight: 52, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 4 },
  heroButtonText: { fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  attentionIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  attentionEmoji: { fontSize: 22 },
  flex: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardBody: { fontSize: 13, lineHeight: 19 },
  chevron: { fontSize: 28, fontWeight: '300' },
  topApps: { gap: 2, marginTop: 4 },
  listCard: { paddingVertical: 6, gap: 0 },
  latestRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  appName: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  time: { fontSize: 12 },
  latestTitle: { fontSize: 15, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '47%', flexGrow: 1, gap: 6, padding: 16 },
  tileIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  tip: { flexDirection: 'row', gap: 12, borderRadius: 20, padding: 16, alignItems: 'flex-start' },
  tipEmoji: { fontSize: 24 },
  tipTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  promise: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 14 },
  promiseText: { fontSize: 12, fontWeight: '600' },
  legalLink: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  legalText: { fontSize: 13, fontWeight: '700' },
  upcomingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  moneyBig: { fontSize: 26, fontWeight: '900', letterSpacing: -0.6, marginTop: 2 },
  moneyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
