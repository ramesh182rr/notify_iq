import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { getReminderSettings, openAppDetailsSettings, setReminderSettings, testReminder } from '../../native/notifyIQ';
import type { AppTheme } from '../../theme/tokens';

async function notificationsAllowed(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/** Settings → Reminders: automatic day-before reminders and the alarm-style alert. */
export function RemindersSection({ theme }: { theme: AppTheme }) {
  const colors = theme.colors;
  const [auto, setAuto] = useState(true);
  const [alarm, setAlarm] = useState(true);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => getReminderSettings()).then(s => { setAuto(s.auto); setAlarm(s.alarm); }).catch(() => undefined);
  }, []);

  const save = async (nextAuto: boolean, nextAlarm: boolean) => {
    if (nextAuto && !(await notificationsAllowed())) {
      setBlocked(true);
      setMessage({ text: 'NotifyIQ needs permission to show notifications before it can remind you.', error: true });
      return;
    }
    setAuto(nextAuto); setAlarm(nextAlarm); setBlocked(false);
    try {
      await setReminderSettings(nextAuto, nextAlarm);
      setMessage({ text: nextAuto ? 'Reminders are on.' : 'Automatic reminders are off. You can still set one on any item in Coming up.', error: false });
    } catch { setMessage({ text: 'The setting could not be saved.', error: true }); }
  };

  const test = async () => {
    if (!(await notificationsAllowed())) { setBlocked(true); setMessage({ text: 'Allow notifications for NotifyIQ to hear a test reminder.', error: true }); return; }
    const shown = await testReminder(alarm).catch(() => false);
    setBlocked(!shown);
    setMessage(shown ? { text: alarm ? 'Test sent. In alarm style it keeps ringing until you open the notification shade.' : 'Test sent.', error: false }
      : { text: 'The test could not be shown. Check NotifyIQ’s notification settings.', error: true });
  };

  const card = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }];
  return (
    <View style={styles.content}>
      <Text style={[styles.copy, { color: colors.textSecondary }]}>
        So you don’t miss what matters, NotifyIQ reminds you about important dates found in your notifications: bills, renewals and AutoPay, plan expiries and appointments.
      </Text>
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: auto }} accessibilityLabel="Remind me automatically" onPress={() => { save(!auto, alarm).catch(() => undefined); }} style={[card, styles.row]}>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Remind me automatically</Text>
          <Text style={[styles.copy, { color: colors.textSecondary }]}>The day before at 9 AM, and again at 9 AM on the day unless you tap Done. AutoPay reminders repeat every cycle.</Text>
        </View>
        <Switch importantForAccessibility="no-hide-descendants" value={auto} onValueChange={value => { save(value, alarm).catch(() => undefined); }} />
      </Pressable>
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: alarm }} accessibilityLabel="Ring like an alarm" onPress={() => { save(auto, !alarm).catch(() => undefined); }} style={[card, styles.row]}>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Ring like an alarm</Text>
          <Text style={[styles.copy, { color: colors.textSecondary }]}>Uses your alarm sound at alarm volume and keeps ringing until you look. Off: a pop-up with the normal sound.</Text>
        </View>
        <Switch importantForAccessibility="no-hide-descendants" value={alarm} onValueChange={value => { save(auto, value).catch(() => undefined); }} />
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => { test().catch(() => undefined); }} style={[styles.button, { backgroundColor: colors.brand }]}>
        <Text style={[styles.buttonText, { color: colors.onBrand }]}>Play a test reminder</Text>
      </Pressable>
      {message ? <Text accessibilityLiveRegion="polite" style={{ color: message.error ? colors.danger : colors.success }}>{message.text}</Text> : null}
      {blocked ? (
        <Pressable accessibilityRole="button" onPress={() => { openAppDetailsSettings().catch(() => undefined); }} style={[styles.button, { backgroundColor: colors.surfaceMuted }]}>
          <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Open NotifyIQ’s app settings</Text>
        </Pressable>
      ) : null}
      <Text style={[styles.note, { color: colors.textSecondary }]}>
        Reminders use Android’s battery-friendly alarms, so one can arrive a few minutes after 9 AM. You can change the sound in Android settings → Notifications → NotifyIQ → “Bills & renewals”.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: '800' },
  copy: { fontSize: 14, lineHeight: 20 },
  note: { fontSize: 13, lineHeight: 19 },
  button: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonText: { fontSize: 15, fontWeight: '800' },
});
