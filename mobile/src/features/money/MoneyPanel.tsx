import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useAppDirectory } from '../../app/AppDirectory';

import { CalendarHeatmap, ChangeBadge, ColumnChart, FlowChart, Treemap } from '../../components/charts';
import { SourceNotificationSheet } from '../../components/SourceNotificationSheet';
import { Card, FadeIn, SectionHeader } from '../../components/ui';
import { useUiMode } from '../../app/UiMode';
import type { MoneyAnalytics, MoneyTransaction, RecurringPayment } from '../../native/NativeNotifyIQ';
import { dismissInsight, getMoneyAnalytics, getRecurringPayments, setMoneyCategory } from '../../native/notifyIQ';
import { relativeTime, type AppTheme } from '../../theme/tokens';
import { categoryMeta, formatMoney, incomeCategoryKeys, spendCategoryKeys } from './format';

type Props = { theme: AppTheme; refreshKey: number };
type Range = 'week' | 'month' | 'lastMonth' | 'quarter';
type Mode = 'spending' | 'income';

const ranges: { key: Range; label: string }[] = [
  { key: 'week', label: '7 days' },
  { key: 'month', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'quarter', label: '3 months' },
];

function rangeBounds(range: Range, now = new Date()) {
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = startOfToday.getTime() + 86_400_000;
  switch (range) {
    case 'week': return { from: startOfToday.getTime() - 6 * 86_400_000, to: endOfToday };
    case 'month': return { from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), to: endOfToday };
    case 'lastMonth': return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(), to: new Date(now.getFullYear(), now.getMonth(), 1).getTime() };
    case 'quarter': return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime(), to: endOfToday };
  }
}

export function MoneyPanel({ theme, refreshKey }: Props) {
  const { name: appName } = useAppDirectory();
  const { simple } = useUiMode();
  const [range, setRange] = useState<Range>('month');
  const [mode, setMode] = useState<Mode>('spending');
  const [data, setData] = useState<MoneyAnalytics | null>(null);
  const [recurring, setRecurring] = useState<ReadonlyArray<RecurringPayment>>([]);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<MoneyTransaction | null>(null);
  const [applyToPlace, setApplyToPlace] = useState(true);
  const [sourceId, setSourceId] = useState<number | null>(null);
  const colors = theme.colors;

  const load = useCallback(async () => {
    try {
      const { from, to } = rangeBounds(range);
      const [analytics, repeat] = await Promise.all([getMoneyAnalytics(from, to), getRecurringPayments()]);
      setData(analytics); setRecurring(repeat); setError(false);
    } catch { setError(true); }
  }, [range]);
  useEffect(() => { load().catch(() => undefined); }, [load, refreshKey]);

  if (error) return <Card theme={theme} onPress={() => { load().catch(() => undefined); }}><Text style={{ color: colors.danger }}>Money insights could not be loaded. Tap to retry.</Text></Card>;
  if (!data) return <Text style={{ color: colors.textSecondary }}>Adding up payment alerts…</Text>;

  const currency = data.currency;
  const net = data.receivedMinor - data.spentMinor;
  const categories = mode === 'spending' ? data.spendCategories : data.incomeCategories;
  const modeTotal = mode === 'spending' ? data.spentMinor : data.receivedMinor;
  const empty = data.debitCount === 0 && data.creditCount === 0;
  const monthLike = range === 'month' || range === 'lastMonth';
  const avgPerDay = data.daily.length ? Math.round(data.spentMinor / data.daily.length) : 0;

  const changeCategory = async (category: string) => {
    if (!editing) return;
    try { await setMoneyCategory(editing.eventId, category, applyToPlace && editing.merchant != null); } catch { setError(true); }
    setEditing(null);
    await load();
  };

  return (
    <View style={styles.content}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rangeRow}>
        {ranges.map(option => {
          const selected = option.key === range;
          return (
            <Pressable key={option.key} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setRange(option.key)}
              style={[styles.rangeChip, { backgroundColor: selected ? colors.brand : colors.surface, borderColor: selected ? colors.brand : colors.border }]}>
              <Text style={[styles.rangeText, { color: selected ? colors.onBrand : colors.textSecondary }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FadeIn>
        <View style={[styles.hero, { backgroundColor: colors.hero }]}>
          <View style={[styles.orb, { backgroundColor: colors.heroAccent }]} />
          <View style={[styles.orbSmall, { backgroundColor: colors.heroAccent }]} />
          <View style={styles.heroCols}>
            <View style={styles.flex}>
              <Text style={[styles.eyebrow, { color: colors.onHeroMuted }]}>MONEY OUT</Text>
              <Text style={[styles.big, { color: colors.onHero }]} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(data.spentMinor, currency)}</Text>
              <ChangeBadge current={data.spentMinor} previous={data.previousSpentMinor} onHero />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.eyebrow, { color: colors.onHeroMuted }]}>MONEY IN</Text>
              <Text style={[styles.big, { color: '#9CF5C8' }]} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(data.receivedMinor, currency)}</Text>
              <ChangeBadge current={data.receivedMinor} previous={data.previousReceivedMinor} invert onHero />
            </View>
          </View>
          <View style={[styles.netBar, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
            <Text style={[styles.netText, { color: colors.onHero }]}>Net {net >= 0 ? '+' : '−'}{formatMoney(Math.abs(net), currency)}</Text>
            <Text style={[styles.netText, { color: colors.onHeroMuted }]}>{data.debitCount} out · {data.creditCount} in · ~{formatMoney(avgPerDay, currency, { compact: true })}/day</Text>
          </View>
          {data.projectedMonthSpentMinor != null ? (
            <Text style={[styles.projection, { color: colors.onHero }]}>📈 At this pace you’ll spend about <Text style={styles.bold}>{formatMoney(data.projectedMonthSpentMinor, currency, { whole: true })}</Text> this month.</Text>
          ) : null}
          <Text style={[styles.disclaimer, { color: colors.onHeroMuted }]}>
            From payment alerts saved on this phone, not a bank statement. Android 15+ hides some bank alerts (e.g. ones showing “XX1234”) from apps like NotifyIQ, so totals can be lower than reality.
          </Text>
        </View>
      </FadeIn>

      {data.otherCurrencies.length ? <Text style={[styles.note, { color: colors.textSecondary }]}>Also seen: {data.otherCurrencies.join(', ')}. Totals above are {currency} only.</Text> : null}

      {empty ? (
        <Card theme={theme}>
          <Text style={styles.emoji}>💸</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>No payment alerts in this period</Text>
          <Text style={[styles.note, { color: colors.textSecondary }]}>When your bank or UPI app notifies you about money going out or coming in, it appears here, sorted into food, fuel, tickets, salary and more.</Text>
        </Card>
      ) : null}

      {!empty ? (
        <FadeIn delay={60}>
          <View style={[styles.modeToggle, { backgroundColor: colors.surfaceMuted }]} accessibilityRole="tablist">
            {(['spending', 'income'] as Mode[]).map(option => {
              const selected = option === mode;
              return (
                <Pressable key={option} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => { setMode(option); setExpanded(null); }}
                  style={[styles.modeOption, selected && { backgroundColor: colors.surface }]}>
                  <Text style={[styles.modeText, { color: selected ? (option === 'income' ? colors.success : colors.brand) : colors.textSecondary }]}>
                    {option === 'spending' ? '↗ Where it went' : '↙ Where it came from'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FadeIn>
      ) : null}

      {!empty && categories.length ? (
        <FadeIn delay={90}>
          <Card theme={theme}>
            <Treemap items={categories.map(row => {
              const meta = categoryMeta(row.category);
              return { key: row.category, label: meta.label, emoji: meta.emoji, color: meta.color, value: row.amountMinor, caption: formatMoney(row.amountMinor, currency, { compact: true }) };
            })} />
            {categories.map(row => {
              const meta = categoryMeta(row.category);
              const open = expanded === row.category;
              const share = modeTotal ? Math.round((row.amountMinor / modeTotal) * 100) : 0;
              return (
                <View key={row.category}>
                  <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${meta.label}: ${formatMoney(row.amountMinor, currency)}, ${share} percent. Show places.`}
                    onPress={() => setExpanded(open ? null : row.category)} style={styles.catRow}>
                    <View style={[styles.catIcon, { backgroundColor: `${meta.color}33` }]}><Text style={styles.catEmoji}>{meta.emoji}</Text></View>
                    <View style={styles.flex}>
                      <View style={styles.rowBetween}>
                        <Text style={[styles.catLabel, { color: colors.textPrimary }]}>{meta.label}</Text>
                        <Text style={[styles.catAmount, { color: colors.textPrimary }]}>{formatMoney(row.amountMinor, currency)}</Text>
                      </View>
                      <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
                        <View style={[styles.fill, { width: `${Math.max(3, share)}%`, backgroundColor: meta.color }]} />
                      </View>
                      <Text style={[styles.note, { color: colors.textSecondary }]}>{share}% · {row.count} {row.count === 1 ? 'payment' : 'payments'} {open ? '▴' : '▾'}</Text>
                    </View>
                  </Pressable>
                  {open ? (
                    <View style={[styles.places, { borderColor: meta.color }]}>
                      {row.topMerchants.map(place => (
                        <View key={place.label} style={styles.rowBetween}>
                          <Text numberOfLines={1} style={[styles.place, { color: colors.textPrimary }]}>{place.label} <Text style={{ color: colors.textSecondary }}>×{place.count}</Text></Text>
                          <Text style={[styles.place, { color: colors.textPrimary }]}>{formatMoney(place.amountMinor, currency)}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Card>
        </FadeIn>
      ) : !empty ? (
        <Card theme={theme}><Text style={[styles.note, { color: colors.textSecondary }]}>{mode === 'income' ? 'No money in during this period.' : 'No spending in this period.'}</Text></Card>
      ) : null}

      {!empty && !simple ? (
        <FadeIn delay={120}>
          <Card theme={theme}>
            <View style={styles.rowBetween}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Money flow</Text>
              <View style={styles.keyRow}>
                <View style={[styles.keyDot, { backgroundColor: colors.success }]} /><Text style={[styles.note, { color: colors.textSecondary }]}>In</Text>
                <View style={[styles.keyDot, { backgroundColor: colors.brand }]} /><Text style={[styles.note, { color: colors.textSecondary }]}>Out</Text>
              </View>
            </View>
            <FlowChart theme={theme} days={data.daily} currency={currency} />
          </Card>
        </FadeIn>
      ) : null}

      {!empty && monthLike && !simple ? (
        <FadeIn delay={150}>
          <Card theme={theme}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Spending calendar</Text>
            <CalendarHeatmap theme={theme} days={data.daily} currency={currency} />
          </Card>
        </FadeIn>
      ) : null}

      {!empty && data.debitCount > 0 && !simple ? (
        <FadeIn delay={180}>
          <SectionHeader theme={theme} title="Did you know?" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.factRow}>
            {data.biggest ? <Fact theme={theme} emoji="🏆" title="Biggest payment" value={formatMoney(data.biggest.amountMinor, currency)} detail={`${data.biggest.merchant ?? 'Not named in alert'} · ${relativeTime(data.biggest.receivedAt)}`} /> : null}
            {data.busiestDay ? <Fact theme={theme} emoji="📅" title="Biggest day" value={formatMoney(data.busiestDay.outMinor, currency)} detail={new Date(data.busiestDay.dayStart).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })} /> : null}
            {data.mostFrequent ? <Fact theme={theme} emoji="🔂" title="Your regular" value={data.mostFrequent.label} detail={`${data.mostFrequent.count} times · ${formatMoney(data.mostFrequent.amountMinor, currency)}`} /> : null}
            {data.smallSpends.count >= 2 ? <Fact theme={theme} emoji="🪙" title="Small spends add up" value={formatMoney(data.smallSpends.amountMinor, currency)} detail={`${data.smallSpends.count} payments under ₹200`} /> : null}
            <Fact theme={theme} emoji="🎉" title="Weekend share" value={`${Math.round(data.weekendShare * 100)}%`} detail="of spending on Sat–Sun" />
          </ScrollView>
        </FadeIn>
      ) : null}

      {!empty && data.debitCount > 1 && !simple ? (
        <FadeIn delay={210}>
          <Card theme={theme}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>When you spend</Text>
            <Text style={[styles.note, { color: colors.textSecondary }]}>By day of the week</Text>
            <ColumnChart theme={theme} items={data.weekdays} currency={currency} />
            <Text style={[styles.note, styles.gap, { color: colors.textSecondary }]}>By time of day</Text>
            <ColumnChart theme={theme} items={data.dayparts} currency={currency} height={70} />
          </Card>
        </FadeIn>
      ) : null}

      {data.topSources.length && mode === 'income' ? (
        <FadeIn delay={230}>
          <Card theme={theme}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Top sources</Text>
            {data.topSources.map(row => (
              <View key={row.label} style={styles.rowBetween}>
                <Text numberOfLines={1} style={[styles.place, { color: colors.textPrimary }]}>{row.label}</Text>
                <Text style={[styles.place, { color: colors.success }]}>+{formatMoney(row.amountMinor, currency)}</Text>
              </View>
            ))}
          </Card>
        </FadeIn>
      ) : null}

      {recurring.length ? (
        <FadeIn delay={250}>
          <SectionHeader theme={theme} title="Subscriptions & repeat payments" />
          <Card theme={theme} style={styles.listCard}>
            {recurring.map((item, index) => (
              <View key={`${item.merchant}-${index}`} style={[styles.txRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
                <View style={[styles.catIcon, { backgroundColor: colors.brandSoft }]}><Text style={styles.catEmoji}>🔁</Text></View>
                <View style={styles.flex}>
                  <Text style={[styles.catLabel, { color: colors.textPrimary }]}>{item.merchant}</Text>
                  <Text style={[styles.note, { color: colors.textSecondary }]}>
                    {item.cadence === 'subscription' ? 'Subscription' : `${item.cadence[0].toUpperCase()}${item.cadence.slice(1)}`} · last {relativeTime(item.lastPaidAt)}
                    {item.nextExpectedAt ? ` · next ~${new Date(item.nextExpectedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}
                  </Text>
                </View>
                <Text style={[styles.catAmount, { color: colors.textPrimary }]}>{formatMoney(item.amountMinor, item.currency)}</Text>
              </View>
            ))}
          </Card>
          <Text style={[styles.note, { color: colors.textSecondary }]}>“Next” dates are estimates from past payment spacing.</Text>
        </FadeIn>
      ) : null}

      {data.recent.length ? (
        <FadeIn delay={270}>
          <SectionHeader theme={theme} title="Payments" />
          <Card theme={theme} style={styles.listCard}>
            {data.recent.filter(row => (mode === 'income' ? row.direction === 'credit' : true)).map((row, index) => {
              const meta = categoryMeta(row.category);
              const debit = row.direction === 'debit';
              return (
                <View key={row.eventId} style={[styles.txRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
                  <View style={[styles.catIcon, { backgroundColor: `${meta.color}33` }]}><Text style={styles.catEmoji}>{meta.emoji}</Text></View>
                  <View style={styles.flex}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`View the notification for ${row.merchant ?? 'this payment'}`} hitSlop={6} onPress={() => setSourceId(row.eventId)}>
                      <Text numberOfLines={1} style={[styles.catLabel, { color: colors.textPrimary }]}>{row.merchant ?? (debit ? 'Payment' : 'Money received')} <Text style={[styles.note, { color: colors.brand }]}>View source ›</Text></Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Category ${meta.label}. Change category`} hitSlop={6} onPress={() => { setEditing(row); setApplyToPlace(row.merchant != null); }}>
                      <Text style={[styles.note, { color: colors.brand }]}>{meta.label}{row.categoryEdited ? ' · yours' : ''} ✎</Text>
                    </Pressable>
                    <Text style={[styles.note, { color: colors.textSecondary }]}>{relativeTime(row.receivedAt)} · {appName(row.packageName)}{row.mergedCount ? ` · ${row.mergedCount + 1} alerts, counted once${row.alsoFrom?.length ? ` (also ${row.alsoFrom.map(appName).join(', ')})` : ''}` : ''}</Text>
                  </View>
                  <View style={styles.amountCol}>
                    <Text style={[styles.catAmount, { color: debit ? colors.textPrimary : colors.success }]}>{debit ? '−' : '+'}{formatMoney(row.amountMinor, row.currency)}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel="Remove from money totals" hitSlop={8}
                      onPress={() => { dismissInsight(row.eventId).then(load).catch(() => setError(true)); }}>
                      <Text style={[styles.remove, { color: colors.textSecondary }]}>Not a payment</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </Card>
        </FadeIn>
      ) : null}

      <SourceNotificationSheet theme={theme} eventId={sourceId} onClose={() => setSourceId(null)}
        note="The amount, place and category were read from this notification. If something is wrong, change the category or mark it as not a payment." />
      <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Choose a category</Text>
            {editing ? <Text style={[styles.note, { color: colors.textSecondary }]}>{editing.merchant ?? 'This payment'} · {formatMoney(editing.amountMinor, editing.currency)}</Text> : null}
            <ScrollView style={styles.sheetList} contentContainerStyle={styles.grid}>
              {(editing?.direction === 'credit' ? incomeCategoryKeys : spendCategoryKeys).map(key => {
                const meta = categoryMeta(key);
                const selected = editing?.category === key;
                return (
                  <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { changeCategory(key).catch(() => undefined); }}
                    style={[styles.gridItem, { backgroundColor: selected ? `${meta.color}44` : colors.surfaceMuted, borderColor: selected ? meta.color : 'transparent' }]}>
                    <Text style={styles.catEmoji}>{meta.emoji}</Text>
                    <Text numberOfLines={2} style={[styles.gridLabel, { color: colors.textPrimary }]}>{meta.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {editing?.merchant ? (
              <View style={styles.rowBetween}>
                <Text style={[styles.note, styles.flex, { color: colors.textPrimary }]}>Always use this for {editing.merchant}</Text>
                <Switch value={applyToPlace} onValueChange={setApplyToPlace} accessibilityLabel={`Always use this category for ${editing.merchant}`} />
              </View>
            ) : null}
            <Pressable accessibilityRole="button" onPress={() => setEditing(null)} style={styles.closeButton}>
              <Text style={{ color: colors.brand, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Fact({ theme, emoji, title, value, detail }: { theme: AppTheme; emoji: string; title: string; value: string; detail: string }) {
  return (
    <View accessible accessibilityLabel={`${title}: ${value}. ${detail}`} style={[styles.fact, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={styles.factEmoji}>{emoji}</Text>
      <Text style={[styles.note, { color: theme.colors.textSecondary }]}>{title}</Text>
      <Text numberOfLines={1} style={[styles.factValue, { color: theme.colors.textPrimary }]}>{value}</Text>
      <Text numberOfLines={2} style={[styles.note, { color: theme.colors.textSecondary }]}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  flex: { flex: 1 },
  bold: { fontWeight: '900' },
  gap: { marginTop: 10 },
  rangeRow: { gap: 8, paddingVertical: 2 },
  rangeChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, minHeight: 48, justifyContent: 'center' },
  rangeText: { fontSize: 13, fontWeight: '800' },
  hero: { borderRadius: 26, padding: 20, gap: 12, overflow: 'hidden' },
  orb: { position: 'absolute', width: 220, height: 220, borderRadius: 110, right: -80, top: -100, opacity: 0.5 },
  orbSmall: { position: 'absolute', width: 100, height: 100, borderRadius: 50, left: -30, bottom: -50, opacity: 0.3 },
  heroCols: { flexDirection: 'row', gap: 16 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  big: { fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -1 },
  netBar: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  netText: { fontSize: 13, fontWeight: '700' },
  projection: { fontSize: 13, lineHeight: 19 },
  disclaimer: { fontSize: 11, lineHeight: 16 },
  note: { fontSize: 12, lineHeight: 18 },
  title: { fontSize: 17, fontWeight: '800' },
  emoji: { fontSize: 28 },
  modeToggle: { flexDirection: 'row', borderRadius: 16, padding: 4 },
  modeOption: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modeText: { fontSize: 13, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  catIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: 20 },
  catLabel: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  catAmount: { fontSize: 15, fontWeight: '800' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginVertical: 5 },
  fill: { height: 6, borderRadius: 3 },
  places: { marginLeft: 54, borderLeftWidth: 2, paddingLeft: 12, gap: 6, marginBottom: 8 },
  place: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  keyDot: { width: 9, height: 9, borderRadius: 5, marginLeft: 6 },
  factRow: { gap: 10, paddingVertical: 4 },
  fact: { width: 160, borderRadius: 18, borderWidth: 1, padding: 14, gap: 3 },
  factEmoji: { fontSize: 24 },
  factValue: { fontSize: 18, fontWeight: '900' },
  listCard: { paddingVertical: 4, gap: 0 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  amountCol: { alignItems: 'flex-end', gap: 4 },
  remove: { fontSize: 11, fontWeight: '700', textDecorationLine: 'underline' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, padding: 20, gap: 12, maxHeight: '85%' },
  sheetList: { flexGrow: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: { width: '31%', flexGrow: 1, minHeight: 76, borderRadius: 14, borderWidth: 2, padding: 10, gap: 4, alignItems: 'flex-start' },
  gridLabel: { fontSize: 12, fontWeight: '700' },
  closeButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
