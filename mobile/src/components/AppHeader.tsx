import { StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '../theme/tokens';

export function AppHeader({ theme }: { theme: AppTheme }) {
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.mark, { backgroundColor: theme.colors.hero }]}>
        <View style={[styles.markGlow, { backgroundColor: theme.colors.heroAccent }]} />
        <Text style={styles.markText} accessibilityLabel="NotifyIQ">N</Text>
        <View style={[styles.markDot, { backgroundColor: '#FFB547', borderColor: theme.colors.background }]} />
      </View>
      <View style={styles.flex}>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.6} style={[styles.brand, { color: theme.colors.textPrimary }]}>NotifyIQ</Text>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.4} style={[styles.tagline, { color: theme.colors.textSecondary }]}>Private · on this device</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, gap: 10 },
  flex: { flex: 1 },
  mark: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  markGlow: { position: 'absolute', width: 22, height: 22, borderRadius: 11, top: -2, right: -2, opacity: 0.7 },
  markText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  markDot: { position: 'absolute', top: -3, right: -3, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  brand: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  tagline: { fontSize: 11, fontWeight: '600' },
});
