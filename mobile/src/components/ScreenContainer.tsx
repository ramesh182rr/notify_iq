import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppTheme } from '../theme/tokens';

type ScreenContainerProps = PropsWithChildren<{
  theme: AppTheme;
  /** Extra bottom padding so content scrolls clear of the floating tab bar. */
  bottomSpace?: number;
}>;

export function ScreenContainer({
  children,
  theme,
  bottomSpace = 0,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: 28 + (bottomSpace ? bottomSpace + insets.bottom : 0) }]}
      style={{ backgroundColor: theme.colors.background }}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
  },
});
