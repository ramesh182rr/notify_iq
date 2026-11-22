import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '../../theme/tokens';

export function LockScreen({ theme, onUnlock, failed }: { theme: AppTheme; onUnlock: () => void; failed: boolean }) {
  const colors = theme.colors;
  return (
    <View style={[styles.container, { backgroundColor: colors.hero }]}>
      <View style={[styles.orb, { backgroundColor: colors.heroAccent }]} />
      <Text style={styles.icon}>🔒</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.onHero }]}>NotifyIQ is locked</Text>
      <Text style={[styles.body, { color: colors.onHeroMuted }]}>
        {failed ? 'Unlock was cancelled. Your history stays hidden until you unlock.' : 'Use your fingerprint, face or phone PIN to see your notification history.'}
      </Text>
      <Pressable accessibilityRole="button" onPress={onUnlock} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={[styles.buttonText, { color: colors.hero }]}>Unlock</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14, overflow: 'hidden' },
  orb: { position: 'absolute', width: 320, height: 320, borderRadius: 160, top: -80, right: -120, opacity: 0.45 },
  icon: { fontSize: 56 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  button: { marginTop: 10, minHeight: 52, minWidth: 200, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 17, fontWeight: '800' },
  pressed: { opacity: 0.85 },
});
