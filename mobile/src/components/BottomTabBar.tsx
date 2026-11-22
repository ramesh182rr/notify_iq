import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { screens, type ScreenKey } from '../navigation/screens';
import type { AppTheme } from '../theme/tokens';
import { Icon } from './ui';

type BottomTabBarProps = {
  activeScreen: ScreenKey;
  onSelect: (screen: ScreenKey) => void;
  theme: AppTheme;
};

/** Height of the floating bar plus its gap, so scroll content can pad itself clear of it. */
export const FLOATING_TAB_BAR_SPACE = 96;

export function BottomTabBar({ activeScreen, onSelect, theme }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = theme.colors;
  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: Math.max(insets.bottom, 8) + 6 }]}>
      <View
        accessibilityRole="tablist"
        style={[styles.bar, {
          backgroundColor: theme.name === 'dark' ? 'rgba(30, 27, 46, 0.97)' : 'rgba(255, 255, 255, 0.97)',
          borderColor: colors.border,
          shadowColor: theme.name === 'dark' ? '#000000' : colors.shadow,
        }]}>
        {screens.map(screen => {
          const selected = activeScreen === screen.key;
          const color = selected ? colors.onBrand : colors.textSecondary;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={screen.label}
              key={screen.key}
              onPress={() => onSelect(screen.key)}
              style={({ pressed }) => [styles.tab, pressed && !selected && styles.pressed]}>
              <View style={[styles.pill, selected && { backgroundColor: colors.brand }]}>
                <Icon name={screen.key} color={color} size={19} />
                <Text numberOfLines={1} maxFontSizeMultiplier={1.15}
                  style={[styles.label, { color: selected ? colors.onBrand : colors.textSecondary, fontWeight: selected ? '800' : '600' }]}>
                  {screen.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 12, right: 12 },
  bar: {
    flexDirection: 'row',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
    gap: 2,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  tab: { flex: 1, minHeight: 56, justifyContent: 'center' },
  pill: { alignSelf: 'center', minWidth: 68, borderRadius: 999, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 14 },
  label: { fontSize: 10.5 },
  pressed: { opacity: 0.6 },
});
