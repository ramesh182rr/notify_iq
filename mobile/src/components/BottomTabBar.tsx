import { Pressable, StyleSheet, Text, View } from 'react-native';

import { screens, type ScreenKey } from '../navigation/screens';
import type { AppTheme } from '../theme/tokens';
import { Icon } from './ui';

type BottomTabBarProps = {
  activeScreen: ScreenKey;
  onSelect: (screen: ScreenKey) => void;
  theme: AppTheme;
};

export function BottomTabBar({ activeScreen, onSelect, theme }: BottomTabBarProps) {
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.shadow }]}>
      {screens.map(screen => {
        const selected = activeScreen === screen.key;
        const color = selected ? theme.colors.brand : theme.colors.textSecondary;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={screen.label}
            key={screen.key}
            onPress={() => onSelect(screen.key)}
            style={styles.tab}>
            <View style={[styles.iconPill, selected && { backgroundColor: theme.colors.brandSoft }]}>
              <Icon name={screen.key} color={color} size={20} />
            </View>
            <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.label, { color, fontWeight: selected ? '800' : '600' }]}>{screen.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, paddingBottom: 6, paddingHorizontal: 4, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -2 }, elevation: 8 },
  tab: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 3 },
  iconPill: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11 },
});
