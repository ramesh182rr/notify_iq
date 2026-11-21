import { Pressable, StyleSheet, Text, View } from 'react-native';

import { screens, type ScreenKey } from '../navigation/screens';
import type { AppTheme } from '../theme/tokens';

type BottomTabBarProps = {
  activeScreen: ScreenKey;
  onSelect: (screen: ScreenKey) => void;
  theme: AppTheme;
};

export function BottomTabBar({
  activeScreen,
  onSelect,
  theme,
}: BottomTabBarProps) {
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}>
      {screens.map(screen => {
        const selected = activeScreen === screen.key;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={screen.key}
            onPress={() => onSelect(screen.key)}
            style={styles.tab}>
            <View
              style={[
                styles.indicator,
                selected && { backgroundColor: theme.colors.brandSoft },
              ]}>
              <Text
                style={[
                  styles.label,
                  {
                    color: selected
                      ? theme.colors.brand
                      : theme.colors.textSecondary,
                  },
                ]}>
                {screen.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 64,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    minWidth: 48,
    minHeight: 40,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
