import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme, ThemePreference } from '../theme/tokens';

type AppHeaderProps = {
  preference: ThemePreference;
  theme: AppTheme;
  onPreferenceChange: (preference: ThemePreference) => void;
};

const preferences: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export function AppHeader({ preference, theme, onPreferenceChange }: AppHeaderProps) {
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.brandRow}>
        <View style={[styles.mark, { backgroundColor: theme.colors.hero }]}>
          <View style={[styles.markGlow, { backgroundColor: theme.colors.heroAccent }]} />
          <Text style={styles.markText} accessibilityLabel="NotifyIQ">N</Text>
          <View style={[styles.markDot, { backgroundColor: '#FFB547', borderColor: theme.colors.background }]} />
        </View>
        <View>
          <Text style={[styles.brand, { color: theme.colors.textPrimary }]}>NotifyIQ</Text>
          <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>Private · on this device</Text>
        </View>
      </View>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Appearance"
        style={[styles.segment, { backgroundColor: theme.colors.surfaceMuted }]}>
        {preferences.map(option => {
          const selected = preference === option.key;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={option.key}
              hitSlop={6}
              onPress={() => onPreferenceChange(option.key)}
              style={[styles.option, selected && { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.optionText, { color: selected ? theme.colors.brand : theme.colors.textSecondary }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6, gap: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  mark: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  markGlow: { position: 'absolute', width: 22, height: 22, borderRadius: 11, top: -2, right: -2, opacity: 0.7 },
  markText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  markDot: { position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  brand: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  tagline: { fontSize: 11, fontWeight: '600' },
  segment: { flexDirection: 'row', borderRadius: 999, padding: 3 },
  option: { minHeight: 32, paddingHorizontal: 10, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  optionText: { fontSize: 12, fontWeight: '700' },
});
