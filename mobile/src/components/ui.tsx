import { useEffect, useRef, type PropsWithChildren, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { categoryVisual, type AppTheme } from '../theme/tokens';

/** Fades and lifts children in once; skipped when the user prefers reduced motion. */
export function FadeIn({ children, delay = 0, style }: PropsWithChildren<{ delay?: number; style?: StyleProp<ViewStyle> }>) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(reduce => {
        if (cancelled) return;
        if (reduce) progress.setValue(1);
        else Animated.timing(progress, { toValue: 1, duration: 320, delay, useNativeDriver: true }).start();
      });
    return () => { cancelled = true; };
  }, [delay, progress]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  return <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

export function Card({ theme, children, style, onPress, accessibilityLabel }: PropsWithChildren<{
  theme: AppTheme; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string;
}>) {
  const base = [styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}
      style={({ pressed }) => [base, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

export function SectionHeader({ theme, title, action, onAction }: { theme: AppTheme; title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={12} style={styles.sectionActionTarget}>
          <Text style={[styles.sectionAction, { color: theme.colors.brand }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Pill({ label, color, background }: { label: string; color: string; background: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

/** Round category avatar with emoji on the category's soft colour. */
export function CategoryAvatar({ theme, category, size = 40 }: { theme: AppTheme; category: string; size?: number }) {
  const visual = categoryVisual(theme, category);
  return (
    <View importantForAccessibility="no-hide-descendants" style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: visual.bg }]}>
      <Text style={{ fontSize: size * 0.45 }}>{visual.emoji}</Text>
    </View>
  );
}

/** Horizontal labelled bar; `value / max` sets the fill. */
export function StatBar({ theme, label, value, max, color, leading }: {
  theme: AppTheme; label: string; value: number; max: number; color: string; leading?: ReactNode;
}) {
  const fraction = max > 0 ? Math.max(0.04, value / max) : 0;
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.statBar}>
      {leading}
      <View style={styles.flex}>
        <View style={styles.statBarTop}>
          <Text numberOfLines={1} style={[styles.statLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
          <Text style={[styles.statValue, { color: theme.colors.textSecondary }]}>{value}</Text>
        </View>
        <View style={[styles.track, { backgroundColor: theme.colors.surfaceMuted }]}>
          <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

/** 24 vertical bars for local clock hours; labels every 6 hours. */
export function HourChart({ theme, hours, color, height = 72 }: {
  theme: AppTheme; hours: ReadonlyArray<{ label: string; count: number }>; color: string; height?: number;
}) {
  const counts = Array.from({ length: 24 }, (_, hour) => hours.find(row => Number.parseInt(row.label, 10) === hour)?.count ?? 0);
  const max = Math.max(1, ...counts);
  const peak = counts.indexOf(Math.max(...counts));
  return (
    <View accessible accessibilityLabel={`Arrivals by hour. Busiest hour ${String(peak).padStart(2, '0')}:00.`}>
      <View style={[styles.hourRow, { height }]}>
        {counts.map((count, hour) => (
          <View key={hour} style={styles.hourSlot}>
            <View style={[styles.hourBar, {
              height: count ? Math.max(4, (count / max) * height) : 2,
              backgroundColor: count ? color : theme.colors.surfaceMuted,
              opacity: count && hour !== peak ? 0.55 : 1,
            }]} />
          </View>
        ))}
      </View>
      <View style={styles.hourLabels}>
        {['00', '06', '12', '18', '24'].map(label => (
          <Text key={label} style={[styles.hourLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
        ))}
      </View>
    </View>
  );
}

/** Stacked horizontal bar showing category share. */
export function CategoryStack({ theme, categories, onHero }: {
  theme: AppTheme; categories: ReadonlyArray<{ label: string; count: number }>; onHero?: boolean;
}) {
  const total = categories.reduce((sum, row) => sum + row.count, 0);
  if (!total) return null;
  return (
    <View style={[styles.stack, { backgroundColor: onHero ? 'rgba(255,255,255,0.18)' : theme.colors.surfaceMuted }]}>
      {categories.map(row => (
        <View key={row.label} style={{ flex: row.count, backgroundColor: categoryVisual(theme, row.label).fg }} />
      ))}
    </View>
  );
}

/** Small icon set drawn with Views so it tints with the theme and needs no icon font. */
export function Icon({ name, color, size = 22 }: { name: 'home' | 'inbox' | 'search' | 'insights' | 'rules' | 'privacy' | 'theme'; color: string; size?: number }) {
  const s = size;
  const stroke = Math.max(2, Math.round(s / 11));
  switch (name) {
    case 'home':
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'flex-end' }}>
          <View style={{ position: 'absolute', top: s * 0.08, width: s * 0.62, height: s * 0.62, borderLeftWidth: stroke, borderTopWidth: stroke, borderColor: color, transform: [{ rotate: '45deg' }], borderTopLeftRadius: 2 }} />
          <View style={{ width: s * 0.64, height: s * 0.5, borderWidth: stroke, borderTopWidth: 0, borderColor: color, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }} />
        </View>
      );
    case 'inbox':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: s * 0.84, height: s * 0.66, borderWidth: stroke, borderColor: color, borderRadius: 4, justifyContent: 'flex-end' }}>
            <View style={{ height: s * 0.24, borderTopWidth: stroke, borderColor: color, marginHorizontal: -stroke, alignItems: 'center' }}>
              <View style={{ width: s * 0.3, height: s * 0.14, borderBottomWidth: stroke, borderLeftWidth: stroke, borderRightWidth: stroke, borderColor: color, marginTop: -stroke, backgroundColor: 'transparent' }} />
            </View>
          </View>
        </View>
      );
    case 'search':
      return (
        <View style={{ width: s, height: s }}>
          <View style={{ position: 'absolute', left: s * 0.1, top: s * 0.1, width: s * 0.58, height: s * 0.58, borderRadius: s, borderWidth: stroke, borderColor: color }} />
          <View style={{ position: 'absolute', left: s * 0.6, top: s * 0.66, width: s * 0.34, height: stroke + 1, borderRadius: 2, backgroundColor: color, transform: [{ rotate: '45deg' }] }} />
        </View>
      );
    case 'insights':
      return (
        <View style={{ width: s, height: s, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: s * 0.1, paddingBottom: s * 0.1 }}>
          {[0.4, 0.75, 0.55].map((h, index) => <View key={index} style={{ width: s * 0.18, height: s * h, borderRadius: 2, backgroundColor: color }} />)}
        </View>
      );
    case 'rules':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center', gap: s * 0.16 }}>
          {[0.3, 0.65].map((knob, index) => (
            <View key={index} style={{ height: stroke, backgroundColor: color, borderRadius: 2, marginHorizontal: s * 0.08, justifyContent: 'center' }}>
              <View style={{ position: 'absolute', left: s * 0.84 * knob - s * 0.12, width: s * 0.26, height: s * 0.26, borderRadius: s, borderWidth: stroke, borderColor: color, backgroundColor: 'transparent' }} />
            </View>
          ))}
        </View>
      );
    case 'privacy':
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: s * 0.7, height: s * 0.8, borderWidth: stroke, borderColor: color, borderTopLeftRadius: s * 0.1, borderTopRightRadius: s * 0.1, borderBottomLeftRadius: s * 0.4, borderBottomRightRadius: s * 0.4, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: s * 0.16, height: s * 0.16, borderRadius: s, backgroundColor: color }} />
          </View>
        </View>
      );
    case 'theme':
      return (
        <View style={{ width: s, height: s, borderRadius: s, borderWidth: stroke, borderColor: color, overflow: 'hidden', flexDirection: 'row' }}>
          <View style={{ flex: 1, backgroundColor: color }} />
          <View style={{ flex: 1 }} />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 10, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sectionAction: { fontSize: 14, fontWeight: '700' },
  sectionActionTarget: { minHeight: 48, minWidth: 48, alignItems: 'flex-end', justifyContent: 'center' },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '700' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  statBar: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  statBarTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, gap: 8 },
  statLabel: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  statValue: { fontSize: 14, fontWeight: '700' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  flex: { flex: 1 },
  hourRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  hourSlot: { flex: 1, justifyContent: 'flex-end' },
  hourBar: { borderRadius: 3 },
  hourLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  hourLabel: { fontSize: 11, fontWeight: '600' },
  stack: { height: 12, borderRadius: 6, overflow: 'hidden', flexDirection: 'row', gap: 2 },
});
