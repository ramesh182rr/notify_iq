import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { exportBackup, importBackup } from '../../native/notifyIQ';
import type { AppTheme } from '../../theme/tokens';

const MIN = 8;
const errorText: Record<string, string> = {
  WRONG_PASSWORD: 'Wrong password, or the file is damaged.',
  NOT_A_BACKUP: 'That file is not a NotifyIQ backup.',
  INCOMPATIBLE_BACKUP: 'This backup is from a newer version of NotifyIQ. Update the app and try again.',
  WEAK_PASSWORD: `Use a password of at least ${MIN} characters.`,
};

export function BackupSection({ theme, onRestored }: { theme: AppTheme; onRestored?: () => void }) {
  const [mode, setMode] = useState<'idle' | 'export' | 'import'>('idle');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const colors = theme.colors;
  const reset = () => { setMode('idle'); setPassword(''); setConfirm(''); };

  const runExport = async () => {
    setBusy(true);
    try {
      const result = await exportBackup(password);
      setMessage(result.status === 'done' ? `Backup saved: ${result.count} notifications, encrypted with your password.` : 'Backup cancelled.');
      if (result.status === 'done') reset();
    } catch (error) {
      setMessage(errorText[(error as { code?: string }).code ?? ''] ?? 'The backup could not be saved.');
    } finally { setBusy(false); }
  };

  const runImport = () => {
    Alert.alert('Replace all NotifyIQ data?', 'Restoring a backup replaces the history, rules and settings on this phone. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Choose backup file', style: 'destructive', onPress: () => {
        setBusy(true);
        importBackup(password)
          .then(result => {
            setMessage(result.status === 'done' ? `Restored ${result.count} notifications.` : 'Restore cancelled.');
            if (result.status === 'done') { reset(); onRestored?.(); }
          })
          .catch(error => setMessage(errorText[(error as { code?: string }).code ?? ''] ?? 'The backup could not be restored.'))
          .finally(() => setBusy(false));
      } },
    ]);
  };

  const exportReady = password.length >= MIN && password === confirm && !busy;
  const importReady = password.length >= MIN && !busy;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>💾 Backup & new phone</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        NotifyIQ never backs up to the cloud. To move to a new phone, save an encrypted backup file and restore it there. Only someone with the password can open it.
      </Text>
      {mode === 'idle' ? (
        <View style={styles.row}>
          <Pressable accessibilityRole="button" onPress={() => { setMode('export'); setMessage(null); }} style={[styles.button, { backgroundColor: colors.brandSoft }]}>
            <Text style={[styles.buttonText, { color: colors.brand }]}>Export backup</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => { setMode('import'); setMessage(null); }} style={[styles.button, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Restore backup</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>{mode === 'export' ? 'Choose a backup password' : 'Enter the backup password'}</Text>
          <TextInput accessibilityLabel="Backup password" secureTextEntry autoCapitalize="none" autoCorrect={false} value={password} onChangeText={setPassword}
            placeholder={`At least ${MIN} characters`} placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]} />
          {mode === 'export' ? (
            <>
              <TextInput accessibilityLabel="Confirm backup password" secureTextEntry autoCapitalize="none" autoCorrect={false} value={confirm} onChangeText={setConfirm}
                placeholder="Repeat password" placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.textPrimary, borderColor: confirm && confirm !== password ? colors.danger : colors.border }]} />
              <Text style={[styles.warn, { color: colors.warning }]}>Write this password down. If it is forgotten, the backup cannot be opened by anyone, including us.</Text>
            </>
          ) : null}
          <View style={styles.row}>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: mode === 'export' ? !exportReady : !importReady }}
              disabled={mode === 'export' ? !exportReady : !importReady}
              onPress={() => (mode === 'export' ? runExport().catch(() => undefined) : runImport())}
              style={[styles.button, { backgroundColor: (mode === 'export' ? exportReady : importReady) ? colors.brand : colors.surfaceMuted }]}>
              <Text style={[styles.buttonText, { color: (mode === 'export' ? exportReady : importReady) ? colors.onBrand : colors.textSecondary }]}>
                {busy ? 'Working…' : mode === 'export' ? 'Save encrypted file' : 'Choose backup file'}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={reset} style={[styles.button, { backgroundColor: colors.surfaceMuted }]}>
              <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
      {message ? <Text accessibilityLiveRegion="polite" style={[styles.body, { color: colors.brand }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 18, gap: 12 },
  title: { fontSize: 18, fontWeight: '800' },
  body: { fontSize: 13, lineHeight: 19 },
  row: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  buttonText: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  form: { gap: 10 },
  label: { fontSize: 14, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
  warn: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
});
