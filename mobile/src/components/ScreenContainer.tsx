import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import type { AppTheme } from '../theme/tokens';

type ScreenContainerProps = PropsWithChildren<{
  theme: AppTheme;
}>;

export function ScreenContainer({
  children,
  theme,
}: ScreenContainerProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
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
