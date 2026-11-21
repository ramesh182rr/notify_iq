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

export function AppHeader({
  preference,
  theme,
  onPreferenceChange,
}: AppHeaderProps) {
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}>
      <View style={styles.brandRow}>
        <View style={[styles.mark, { backgroundColor: theme.colors.brand }]}>
          <Text style={styles.markText} accessibilityLabel="NotifyIQ">
            N
          </Text>
        </View>
        <Text style={[styles.brand, { color: theme.colors.textPrimary }]}>
          NotifyIQ
        </Text>
        <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
          Your notifications, understood.
        </Text>
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
              onPress={() => onPreferenceChange(option.key)}
              style={[
                styles.option,
                selected && { backgroundColor: theme.colors.surface },
              ]}>
              <Text
                style={[
                  styles.optionText,
                  {
                    color: selected
                      ? theme.colors.brand
                      : theme.colors.textSecondary,
                  },
                ]}>
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
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brandRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  brand: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  tagline: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
  },
  segment: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginTop: 4,
  },
  option: {
    minHeight: 32,
    minWidth: 58,
    paddingHorizontal: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
