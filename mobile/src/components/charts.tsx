import { StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '../features/money/format';
import { readableTextOn } from '../theme/contrast';
import type { AppTheme } from '../theme/tokens';

/** Mirrored daily bars: money in above the line, money out below. */
export function FlowChart({ theme, days, currency, height = 140 }: {
  theme: AppTheme; days: ReadonlyArray<{ dayStart: number; outMinor: number; inMinor: number }>; currency: string; height?: number;
}) {
  // In and out use separate scales (labelled) so a single salary credit does not flatten everyday spending.
  const maxIn = Math.max(1, ...days.map(d => d.inMinor));
  const maxOut = Math.max(1, ...days.map(d => d.outMinor));
  const half = height / 2;
  const labelEvery = Math.max(1, Math.ceil(days.length / 6));
  const totalOut = days.reduce((sum, d) => sum + d.outMinor, 0);
  const totalIn = days.reduce((sum, d) => sum + d.inMinor, 0);
  return (
    <View accessible accessibilityLabel={`Money flow over ${days.length} days: ${formatMoney(totalIn, currency)} in, ${formatMoney(totalOut, currency)} out.`}>
      <View style={[styles.flowRow, { height }]}>
        {days.map(day => (
          <View key={day.dayStart} style={styles.flowSlot}>
            <View style={[styles.flowHalf, { justifyContent: 'flex-end' }]}>
              {day.inMinor > 0 ? <View style={[styles.bar, { height: Math.max(3, (day.inMinor / maxIn) * (half - 4)), backgroundColor: theme.colors.success }]} /> : null}
            </View>
            <View style={[styles.flowHalf, { justifyContent: 'flex-start' }]}>
              {day.outMinor > 0 ? <View style={[styles.bar, { height: Math.max(3, (day.outMinor / maxOut) * (half - 4)), backgroundColor: theme.colors.brand }]} /> : null}
            </View>
          </View>
        ))}
        <View pointerEvents="none" style={[styles.midline, { top: half, backgroundColor: theme.colors.border }]} />
        {totalIn ? <Text style={[styles.scaleLabel, { top: 0, color: theme.colors.success }]}>max in {formatMoney(maxIn, currency, { compact: true })}</Text> : null}
        {totalOut ? <Text style={[styles.scaleLabel, { bottom: 0, color: theme.colors.brand }]}>max out {formatMoney(maxOut, currency, { compact: true })}</Text> : null}
      </View>
      <View style={styles.flowLabels}>
        {days.map((day, index) => (
          <Text key={day.dayStart} style={[styles.axis, { color: theme.colors.textSecondary }]}>
            {index % labelEvery === 0 ? new Date(day.dayStart).getDate() : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

type TreeItem = { key: string; label: string; emoji: string; color: string; value: number; caption: string };

/** Slice-and-dice treemap: each tile's area is proportional to its share. */
export function Treemap({ items, height = 220 }: { items: ReadonlyArray<TreeItem>; height?: number }) {
  const shown = items.slice(0, 7);
  const rest = items.slice(7);
  const tiles = rest.length ? [...shown, { key: 'more', label: `${rest.length} more`, emoji: '➕', color: '#9AA0A6', value: rest.reduce((s, i) => s + i.value, 0), caption: '' }] : shown;
  const total = tiles.reduce((sum, item) => sum + item.value, 0);
  if (!total) return null;
  return (
    <View style={[styles.treemap, { height }]} accessible accessibilityLabel={tiles.map(t => `${t.label} ${Math.round((t.value / total) * 100)} percent`).join(', ')}>
      <TreeLevel tiles={tiles} horizontal total={total} depth={0} />
    </View>
  );
}

function TreeLevel({ tiles, horizontal, total, depth }: { tiles: ReadonlyArray<TreeItem>; horizontal: boolean; total: number; depth: number }) {
  if (tiles.length === 0) return null;
  const [first, ...others] = tiles;
  const restValue = others.reduce((sum, t) => sum + t.value, 0);
  const share = Math.round((first.value / total) * 100);
  return (
    <View style={[styles.flex, { flexDirection: horizontal ? 'row' : 'column', gap: 3 }]}>
      <View style={[styles.tile, { flex: Math.max(first.value, restValue * 0.12), backgroundColor: first.color }]}>
        <Text style={styles.tileEmoji}>{first.emoji}</Text>
        {depth < 4 && share >= 8 ? <Text numberOfLines={1} style={[styles.tileLabel, { color: readableTextOn(first.color) }]}>{first.label}</Text> : null}
        <Text numberOfLines={1} style={[styles.tileValue, { color: readableTextOn(first.color) }]}>{share}%{depth < 3 && first.caption ? ` · ${first.caption}` : ''}</Text>
      </View>
      {others.length ? (
        <View style={[styles.flex, { flex: restValue }]}>
          <TreeLevel tiles={others} horizontal={!horizontal} total={total} depth={depth + 1} />
        </View>
      ) : null}
    </View>
  );
}

/** Month calendar where each day's colour intensity is its spend. */
export function CalendarHeatmap({ theme, days, currency }: {
  theme: AppTheme; days: ReadonlyArray<{ dayStart: number; outMinor: number }>; currency: string;
}) {
  if (!days.length) return null;
  const max = Math.max(1, ...days.map(d => d.outMinor));
  const firstWeekday = (new Date(days[0].dayStart).getDay() + 6) % 7;
  const cells: Array<{ dayStart: number; outMinor: number } | null> = [...Array(firstWeekday).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return (
    <View accessible accessibilityLabel={`Spending calendar for ${days.length} days`}>
      <View style={styles.calRow}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <Text key={i} style={[styles.calHead, { color: theme.colors.textSecondary }]}>{d}</Text>)}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, week) => (
        <View key={week} style={styles.calRow}>
          {cells.slice(week * 7, week * 7 + 7).map((cell, i) => {
            if (!cell) return <View key={i} style={styles.calCell} />;
            const intensity = cell.outMinor / max;
            const isToday = cell.dayStart === today.getTime();
            return (
              <View key={i} accessibilityLabel={`${new Date(cell.dayStart).getDate()}: ${formatMoney(cell.outMinor, currency)}`}
                style={[styles.calCell, {
                  backgroundColor: cell.outMinor ? theme.colors.brand : theme.colors.surfaceMuted,
                  opacity: cell.outMinor ? 0.25 + intensity * 0.75 : 1,
                  borderWidth: isToday ? 2 : 0, borderColor: theme.colors.textPrimary,
                }]}>
                <Text style={[styles.calDay, { color: cell.outMinor && intensity > 0.45 ? theme.colors.onBrand : theme.colors.textSecondary }]}>{new Date(cell.dayStart).getDate()}</Text>
              </View>
            );
          })}
        </View>
      ))}
      <View style={styles.legend}>
        <Text style={[styles.axis, { color: theme.colors.textSecondary }]}>Less</Text>
        {[0.25, 0.5, 0.75, 1].map(o => <View key={o} style={[styles.legendCell, { backgroundColor: theme.colors.brand, opacity: o }]} />)}
        <Text style={[styles.axis, { color: theme.colors.textSecondary }]}>More</Text>
      </View>
    </View>
  );
}

/** Simple labelled columns (weekday / time-of-day patterns); highlights the largest. */
export function ColumnChart({ theme, items, currency, height = 90 }: {
  theme: AppTheme; items: ReadonlyArray<{ label: string; amountMinor: number }>; currency: string; height?: number;
}) {
  const max = Math.max(1, ...items.map(i => i.amountMinor));
  const peak = items.reduce((best, item, index) => (item.amountMinor > items[best].amountMinor ? index : best), 0);
  return (
    <View style={styles.columns} accessible accessibilityLabel={items.map(i => `${i.label} ${formatMoney(i.amountMinor, currency)}`).join(', ')}>
      {items.map((item, index) => (
        <View key={item.label} style={styles.columnSlot}>
          <Text numberOfLines={1} style={[styles.columnValue, { color: index === peak && item.amountMinor ? theme.colors.brand : theme.colors.textSecondary }]}>
            {item.amountMinor ? formatMoney(item.amountMinor, currency, { compact: true }) : ''}
          </Text>
          <View style={[styles.columnTrack, { height }]}>
            <View style={[styles.column, {
              height: item.amountMinor ? Math.max(4, (item.amountMinor / max) * height) : 3,
              backgroundColor: item.amountMinor ? theme.colors.brand : theme.colors.surfaceMuted,
              opacity: index === peak ? 1 : 0.5,
            }]} />
          </View>
          <Text numberOfLines={1} style={[styles.axis, { color: theme.colors.textSecondary }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** "▲ 12% vs previous period" with a colour that reflects direction for spending (up = warning). */
export function ChangeBadge({ current, previous, invert, onHero }: { current: number; previous: number; invert?: boolean; onHero?: boolean }) {
  if (previous <= 0) return <Text style={[styles.badge, { color: onHero ? 'rgba(255,255,255,0.75)' : '#888' }]}>No earlier data to compare</Text>;
  const change = (current - previous) / previous;
  const up = change >= 0;
  const good = invert ? up : !up;
  const color = good ? '#7CF0B4' : '#FFB3BF';
  return <Text style={[styles.badge, { color: onHero ? color : good ? '#198754' : '#B52E40' }]}>{`${up ? '▲' : '▼'} ${Math.abs(Math.round(change * 100))}% vs previous period`}</Text>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flowRow: { flexDirection: 'row', gap: 2 },
  flowSlot: { flex: 1 },
  flowHalf: { flex: 1, alignItems: 'stretch' },
  bar: { borderRadius: 2 },
  midline: { position: 'absolute', left: 0, right: 0, height: 1 },
  scaleLabel: { position: 'absolute', left: 0, fontSize: 10, fontWeight: '700' },
  flowLabels: { flexDirection: 'row', gap: 2, marginTop: 4 },
  axis: { flex: 1, fontSize: 10, textAlign: 'center' },
  treemap: { borderRadius: 18, overflow: 'hidden' },
  tile: { borderRadius: 10, padding: 8, justifyContent: 'flex-end', overflow: 'hidden', minWidth: 0, minHeight: 0 },
  tileEmoji: { fontSize: 18 },
  tileLabel: { fontSize: 12, fontWeight: '800' },
  tileValue: { fontSize: 11, fontWeight: '700' },
  calRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  calHead: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700' },
  calCell: { flex: 1, aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  calDay: { fontSize: 11, fontWeight: '700' },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  legendCell: { width: 12, height: 12, borderRadius: 3 },
  columns: { flexDirection: 'row', gap: 6, alignItems: 'flex-end' },
  columnSlot: { flex: 1, alignItems: 'center', gap: 4 },
  columnValue: { fontSize: 10, fontWeight: '700' },
  columnTrack: { width: '100%', justifyContent: 'flex-end' },
  column: { width: '100%', borderRadius: 6 },
  badge: { fontSize: 12, fontWeight: '800' },
});
