import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, FadeIn, Pill, SectionHeader } from '../../components/ui';
import type { MoneySummary, RecurringPayment } from '../../native/NativeNotifyIQ';
import { dismissInsight, getMoneySummary, getRecurringPayments } from '../../native/notifyIQ';
import { appDisplayName, relativeTime, type AppTheme } from '../../theme/tokens';
import { formatMoney, spendCategoryNames } from './format';

type Props = { theme: AppTheme; refreshKey: number };
type Range = 'week' | 'month' | '30d';

function rangeBounds(range: Range, now = new Date()) {
  const end = now.getTime() + 60_000;
  if (range === 'month') return { from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), to: end };
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (range === 'week' ? 6 : 29));
  return { from: start.getTime(), to: end };
}

const ranges: { key: Range; label: string }[] = [
  { key: 'week', label: '7 days' },
  { key: 'month', label: 'This month' },
  { key: '30d', label: '30 days' },
];

export function MoneyPanel({ theme, refreshKey }: Props) {
  const [range, setRange] = useState<Range>('month');
  const [summary, setSummary] = useState<MoneySummary | null>(null);
  const [recurring, setRecurring] = useState<ReadonlyArray<RecurringPayment>>([]);
  const [error, setError] = useState(false);
  const colors = theme.colors;

  const load = useCallback(async () => {
    try {
      const { from, to } = rangeBounds(range);
      const [money, repeat] = await Promise.all([getMoneySummary(from, to), getRecurringPayments()]);
      setSummary(money); setRecurring(repeat); setError(false);
    } catch { setError(true); }
  }, [range]);
  useEffect(() => { load().catch(() => undefined); }, [load, refreshKey]);

  if (error) return <Card theme={theme} onPress={() => { load().catch(() => undefined); }}><Text style={{ color: colors.danger }}>The money summary could not be loaded. Tap to retry.</Text></Card>;
  if (!summary) return <Text style={{ color: colors.textSecondary }}>Adding up payment alerts…</Text>;

  const currency = summary.currency;
  const net = summary.receivedMinor - summary.spentMinor;
  const maxMerchant = summary.merchants[0]?.amountMinor ?? 1;
  const maxCategory = summary.categories[0]?.amountMinor ?? 1;

  return (
    <View style={styles.content}>
      <View accessibilityRole="radiogroup" style={[styles.segment, { backgroundColor: colors.surfaceMuted }]}>
        {ranges.map(option => {
          const selected = option.key === range;
          return (
            <Pressable key={option.key} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setRange(option.key)}
              style={[styles.segmentOption, selected && { backgroundColor: colors.surface }]}>
              <Text style={[styles.segmentText, { color: selected ? colors.brand : colors.textSecondary }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <FadeIn>
        <View style={[styles.hero, { backgroundColor: colors.hero }]}>
          <View style={[styles.orb, { backgroundColor: colors.heroAccent }]} />
          <Text style={[styles.eyebrow, { color: colors.onHeroMuted }]}>SPENT</Text>
          <Text accessibilityLabel={`Spent ${formatMoney(summary.spentMinor, currency)}`} style={[styles.big, { color: colors.onHero }]}>{formatMoney(summary.spentMinor, currency)}</Text>
          <View style={styles.heroRow}>
            <View>
              <Text style={[styles.eyebrow, { color: colors.onHeroMuted }]}>RECEIVED</Text>
              <Text style={[styles.mid, { color: colors.onHero }]}>{formatMoney(summary.receivedMinor, currency)}</Text>
            </View>
            <View>
              <Text style={[styles.eyebrow, { color: colors.onHeroMuted }]}>NET</Text>
              <Text style={[styles.mid, { color: net >= 0 ? '#7CF0B4' : '#FFB3BF' }]}>{net >= 0 ? '+' : '−'}{formatMoney(Math.abs(net), currency)}</Text>
            </View>
            <View>
              <Text style={[styles.eyebrow, { color: colors.onHeroMuted }]}>PAYMENTS</Text>
              <Text style={[styles.mid, { color: colors.onHero }]}>{summary.debitCount}</Text>
            </View>
          </View>
          <Text style={[styles.disclaimer, { color: colors.onHeroMuted }]}>
            Counted from payment alerts saved on this phone. It is not a bank statement. Alerts that never arrived or were excluded are missing, and Android 15+ hides some bank alerts (for example ones showing account digits like XX1234) from apps like NotifyIQ.
          </Text>
        </View>
      </FadeIn>

      {summary.otherCurrencies.length ? (
        <Text style={[styles.note, { color: colors.textSecondary }]}>Also seen in other currencies: {summary.otherCurrencies.join(', ')}. Totals above are {currency} only.</Text>
      ) : null}

      {summary.debitCount === 0 && summary.creditCount === 0 ? (
        <Card theme={theme}>
          <Text style={styles.emoji}>💸</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>No payment alerts yet</Text>
          <Text style={[styles.note, { color: colors.textSecondary }]}>When your bank or UPI app notifies you about money going out or coming in, NotifyIQ adds it up here, on this device only.</Text>
        </Card>
      ) : null}

      {summary.categories.length ? (
        <FadeIn delay={60}>
          <Card theme={theme}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Where it went</Text>
            {summary.categories.map(row => {
              const name = spendCategoryNames[row.label] ?? spendCategoryNames.other;
              return (
                <View key={row.label} style={styles.merchantRow} accessible accessibilityLabel={`${name.label}: ${formatMoney(row.amountMinor, currency)}`}>
                  <View style={[styles.icon, { backgroundColor: colors.brandSoft }]}><Text style={styles.iconText}>{name.emoji}</Text></View>
                  <View style={styles.flex}>
                    <Text numberOfLines={1} style={[styles.merchant, { color: colors.textPrimary }]}>{name.label}</Text>
                    <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
                      <View style={[styles.fill, { width: `${Math.max(4, (row.amountMinor / maxCategory) * 100)}%`, backgroundColor: colors.brand }]} />
                    </View>
                  </View>
                  <View style={styles.amountCol}>
                    <Text style={[styles.merchantAmount, { color: colors.textPrimary }]}>{formatMoney(row.amountMinor, currency)}</Text>
                    <Text style={[styles.barAmount, { color: colors.textSecondary }]}>{row.count} {row.count === 1 ? 'payment' : 'payments'}</Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </FadeIn>
      ) : null}

      {summary.merchants.length ? (
        <FadeIn delay={100}>
          <Card theme={theme}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Top places</Text>
            {summary.merchants.map(row => (
              <View key={row.label} style={styles.merchantRow}>
                <View style={styles.flex}>
                  <Text numberOfLines={1} style={[styles.merchant, { color: colors.textPrimary }]}>{row.label}</Text>
                  <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
                    <View style={[styles.fill, { width: `${Math.max(4, (row.amountMinor / maxMerchant) * 100)}%`, backgroundColor: colors.heroAccent }]} />
                  </View>
                </View>
                <Text style={[styles.merchantAmount, { color: colors.textPrimary }]}>{formatMoney(row.amountMinor, currency)}</Text>
              </View>
            ))}
          </Card>
        </FadeIn>
      ) : null}

      {recurring.length ? (
        <FadeIn delay={140}>
          <SectionHeader theme={theme} title="Subscriptions & repeat payments" />
          <Card theme={theme} style={styles.listCard}>
            {recurring.map((item, index) => (
              <View key={`${item.merchant}-${index}`} style={[styles.recurringRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
                <View style={[styles.icon, { backgroundColor: colors.brandSoft }]}><Text style={styles.iconText}>🔁</Text></View>
                <View style={styles.flex}>
                  <Text style={[styles.merchant, { color: colors.textPrimary }]}>{item.merchant}</Text>
                  <Text style={[styles.note, { color: colors.textSecondary }]}>
                    {item.cadence === 'subscription' ? 'Subscription' : `${item.cadence[0].toUpperCase()}${item.cadence.slice(1)}`} · last paid {relativeTime(item.lastPaidAt)}
                    {item.nextExpectedAt ? ` · next ~${new Date(item.nextExpectedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}
                  </Text>
                </View>
                <Text style={[styles.merchantAmount, { color: colors.textPrimary }]}>{formatMoney(item.amountMinor, item.currency)}</Text>
              </View>
            ))}
          </Card>
          <Text style={[styles.note, { color: colors.textSecondary }]}>“Next” dates are estimates from past payment spacing, not confirmed by the merchant.</Text>
        </FadeIn>
      ) : null}

      {summary.recent.length ? (
        <FadeIn delay={180}>
          <SectionHeader theme={theme} title="Recent payments" />
          <Card theme={theme} style={styles.listCard}>
            {summary.recent.map((row, index) => {
              const cat = spendCategoryNames[row.category] ?? spendCategoryNames.other;
              const debit = row.direction === 'debit';
              return (
                <View key={row.eventId} style={[styles.recurringRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
                  <View style={[styles.icon, { backgroundColor: colors.surfaceMuted }]}><Text style={styles.iconText}>{debit ? cat.emoji : '💰'}</Text></View>
                  <View style={styles.flex}>
                    <Text numberOfLines={1} style={[styles.merchant, { color: colors.textPrimary }]}>{row.merchant ?? (debit ? 'Payment' : 'Money received')}</Text>
                    <Text style={[styles.note, { color: colors.textSecondary }]}>{relativeTime(row.receivedAt)} · {appDisplayName(row.packageName)}</Text>
                  </View>
                  <View style={styles.amountCol}>
                    <Text style={[styles.merchantAmount, { color: debit ? colors.textPrimary : colors.success }]}>{debit ? '−' : '+'}{formatMoney(row.amountMinor, row.currency)}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel="Remove from money totals" hitSlop={8}
                      onPress={() => { dismissInsight(row.eventId).then(load).catch(() => setError(true)); }}>
                      <Text style={[styles.remove, { color: colors.textSecondary }]}>Not a payment</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </Card>
          <View style={styles.legendRow}>
            <Pill label="Tip" color={colors.brand} background={colors.brandSoft} />
            <Text style={[styles.note, styles.flex, { color: colors.textSecondary }]}>Tap “Not a payment” if something was misread. It leaves the totals and stays in your Inbox.</Text>
          </View>
        </FadeIn>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  segment: { flexDirection: 'row', borderRadius: 999, padding: 3 },
  segmentOption: { flex: 1, minHeight: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 13, fontWeight: '800' },
  hero: { borderRadius: 26, padding: 22, gap: 10, overflow: 'hidden' },
  orb: { position: 'absolute', width: 200, height: 200, borderRadius: 100, right: -70, top: -90, opacity: 0.5 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  big: { fontSize: 44, lineHeight: 50, fontWeight: '900', letterSpacing: -1.5 },
  mid: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  disclaimer: { fontSize: 12, lineHeight: 17 },
  note: { fontSize: 12, lineHeight: 18 },
  title: { fontSize: 17, fontWeight: '800' },
  emoji: { fontSize: 28 },
  barAmount: { fontSize: 11 },
  merchantRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 44 },
  merchant: { fontSize: 15, fontWeight: '700' },
  merchantAmount: { fontSize: 15, fontWeight: '800' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  fill: { height: 6, borderRadius: 3 },
  flex: { flex: 1 },
  listCard: { paddingVertical: 4, gap: 0 },
  recurringRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 19 },
  amountCol: { alignItems: 'flex-end', gap: 4 },
  remove: { fontSize: 11, fontWeight: '700', textDecorationLine: 'underline' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
