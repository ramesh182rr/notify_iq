import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import type { SecuritySettings } from '../../native/NativeNotifyIQ';
import { authenticate, getSecuritySettings, setAppLock } from '../../native/notifyIQ';
import type { AppTheme } from '../../theme/tokens';

export function SecuritySection({ theme }: { theme: AppTheme }) {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const colors = theme.colors;

  const load = useCallback(async () => {
    try { setSettings(await getSecuritySettings()); } catch { setMessage('Security settings could not be loaded.'); }
  }, []);
  useEffect(() => { load().catch(() => undefined); }, [load]);

  const toggleLock = async (value: boolean) => {
    try {
      if (value) {
        // Confirm the person can unlock before turning the lock on, so nobody locks themselves out.
        const ok = await authenticate();
        if (!ok) { setMessage('App lock was not turned on.'); return; }
      }
      await setAppLock(value);
      setMessage(value ? 'App lock is on. NotifyIQ asks for your fingerprint, face or PIN when you open it.' : 'App lock is off.');
    } catch {
      setMessage('Set a screen lock (PIN, pattern, password or biometrics) in Android settings first.');
    }
    await load();
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>🔒 Security</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        NotifyIQ has no internet access and keeps everything on this phone. App lock adds protection against people who can use your phone.
      </Text>

      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>App lock</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {settings && !settings.deviceSecure
              ? 'Needs a phone screen lock. Set one in Android settings to use App lock.'
              : 'Ask for your fingerprint, face or phone PIN whenever NotifyIQ is opened.'}
          </Text>
        </View>
        <Switch accessibilityLabel="App lock" value={settings?.appLock ?? false} disabled={!settings || !settings.deviceSecure}
          onValueChange={value => { toggleLock(value).catch(() => undefined); }} />
      </View>

      {message ? <Text accessibilityLiveRegion="polite" style={[styles.body, { color: colors.brand }]}>{message}</Text> : null}

    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 12 },
  title: { fontSize: 18, fontWeight: '800' },
  body: { fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  flex: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '700' },
});
