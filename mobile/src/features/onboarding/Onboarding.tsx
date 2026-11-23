import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { InstallInfo, ListenerStatus } from '../../native/NativeNotifyIQ';
import { getInstallInfo, openAppDetailsSettings } from '../../native/notifyIQ';
import type { AppTheme } from '../../theme/tokens';
import { useUiMode } from '../../app/UiMode';

type Step = { key: string; emoji: string; title: string; body: string; bullets?: string[] };

export function Onboarding({ theme, visible, listenerStatus, onOpenAccessSettings, onDone }: {
  theme: AppTheme; visible: boolean; listenerStatus: ListenerStatus | null; onOpenAccessSettings: () => void; onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [install, setInstall] = useState<InstallInfo | null>(null);
  const colors = theme.colors;
  const uiMode = useUiMode();
  useEffect(() => { getInstallInfo().then(setInstall).catch(() => undefined); }, []);
  const needsRestrictedSettings = install?.source === 'sideload' && install.sdk >= 33;
  const granted = listenerStatus?.accessGranted === true;

  const steps = useMemo<Step[]>(() => [
    { key: 'welcome', emoji: '👋', title: 'Welcome to NotifyIQ', body: 'A private home for your notifications.',
      bullets: ['Keep and search notifications, even after you swipe them away', 'See where your money goes from payment alerts', 'Never miss bills, renewals and appointments'] },
    { key: 'privacy', emoji: '🔒', title: 'Everything stays on this phone', body: 'NotifyIQ has no internet access, so it cannot send your data anywhere.',
      bullets: ['No account, ads, analytics or AI services', 'One-time codes, passwords and card numbers are thrown away', 'Exclude apps or delete history any time'] },
    { key: 'view', emoji: '👀', title: 'How should NotifyIQ look?', body: 'You can change this any time in Settings → Appearance.' },
    needsRestrictedSettings
      ? { key: 'restricted', emoji: '🔔', title: 'Turn on notification access', body: 'Android adds an extra check for apps installed outside the Play Store. Follow these steps in order:',
        bullets: [
          'Tap “Open notification access” and try to switch NotifyIQ on. If Android says “Restricted setting”, tap OK.',
          'Come back here and tap “Open app info”. Tap ⋮ at the top right, choose “Allow restricted settings” and confirm.',
          'Tap “Open notification access” again and switch NotifyIQ on.',
        ] }
      : { key: 'access', emoji: '🔔', title: 'Turn on notification access', body: 'Android asks you to allow NotifyIQ to read notifications. You can turn it off any time in Settings.' },
    { key: 'done', emoji: '✨', title: 'You’re all set', body: 'A few tips to get the most out of NotifyIQ:',
      bullets: ['Turn on App lock in Settings for extra protection', 'Exclude apps you never want kept, such as authenticator apps', 'Check Insights → Money and Coming up after a few days'] },
  ], [needsRestrictedSettings]);

  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;
  const next = () => (last ? onDone() : setIndex(i => i + 1));

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onDone}>
      <SafeAreaView edges={['top', 'bottom']} style={[styles.flex, { backgroundColor: colors.hero }]}>
        <View style={[styles.orb, { backgroundColor: colors.heroAccent }]} />
        <View style={styles.top}>
          <View style={styles.dots}>
            {steps.map((s, i) => <View key={s.key} style={[styles.dot, { backgroundColor: i === index ? '#FFFFFF' : 'rgba(255,255,255,0.35)', width: i === index ? 22 : 8 }]} />)}
          </View>
          {!last ? <Pressable accessibilityRole="button" onPress={onDone} style={styles.skip}><Text style={styles.skipText}>Skip</Text></Pressable> : null}
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.emoji}>{step.emoji}</Text>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.onHero }]}>{step.title}</Text>
          <Text style={[styles.body, { color: colors.onHeroMuted }]}>{step.body}</Text>
          {step.bullets?.map((b, i) => (
            <View key={b} style={styles.bulletRow}>
              <View style={styles.bulletBadge}><Text style={[styles.bulletNum, { color: colors.hero }]}>{step.key === 'restricted' ? i + 1 : '✓'}</Text></View>
              <Text style={[styles.bullet, { color: colors.onHero }]}>{b}</Text>
            </View>
          ))}
          {step.key === 'view' ? (
            <View style={styles.choices}>
              {([[true, 'Simple', 'The essentials with larger text: today, money, coming up and your latest notifications.'], [false, 'Full', 'Everything: charts, filters, saved searches and detailed insights.']] as const).map(([value, name, help]) => {
                const selected = uiMode.simple === value;
                return (
                  <Pressable key={name} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => uiMode.setSimple(value)}
                    style={[styles.choice, { backgroundColor: selected ? '#FFFFFF' : 'rgba(255,255,255,0.14)' }]}>
                    <Text style={[styles.choiceTitle, { color: selected ? colors.hero : colors.onHero }]}>{selected ? '● ' : '○ '}{name}</Text>
                    <Text style={[styles.choiceBody, { color: selected ? colors.hero : colors.onHeroMuted }]}>{help}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {step.key === 'access' || step.key === 'restricted' ? (
            <View style={[styles.status, { backgroundColor: 'rgba(255,255,255,0.14)' }]}>
              <Text style={[styles.bullet, { color: colors.onHero }]}>{granted ? '✅ Notification access is on' : 'Notification access is off'}</Text>
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          {(step.key === 'access' || step.key === 'restricted') && !granted ? (
            <Pressable accessibilityRole="button" onPress={onOpenAccessSettings} style={[styles.secondary, { borderColor: 'rgba(255,255,255,0.6)' }]}>
              <Text style={[styles.secondaryText, { color: colors.onHero }]}>Open notification access</Text>
            </Pressable>
          ) : null}
          {step.key === 'restricted' && !granted ? (
            <Pressable accessibilityRole="button" onPress={() => { openAppDetailsSettings().catch(() => undefined); }} style={[styles.secondary, { borderColor: 'rgba(255,255,255,0.6)' }]}>
              <Text style={[styles.secondaryText, { color: colors.onHero }]}>Open app info</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" onPress={next} style={styles.primary}>
            <Text style={[styles.primaryText, { color: colors.hero }]}>
              {last ? 'Start using NotifyIQ' : (step.key === 'access' || step.key === 'restricted') && !granted ? 'I’ll do this later' : 'Continue'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, overflow: 'hidden' },
  orb: { position: 'absolute', width: 360, height: 360, borderRadius: 180, top: -120, right: -140, opacity: 0.45 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, minHeight: 56 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  skip: { minHeight: 48, minWidth: 56, alignItems: 'flex-end', justifyContent: 'center' },
  skipText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  content: { padding: 28, gap: 14, paddingTop: 40 },
  emoji: { fontSize: 56 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },
  body: { fontSize: 16, lineHeight: 24 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bulletBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  bulletNum: { fontSize: 13, fontWeight: '900' },
  bullet: { flex: 1, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  status: { borderRadius: 14, padding: 14, marginTop: 6 },
  footer: { padding: 24, gap: 10 },
  choices: { gap: 12, marginTop: 8 },
  choice: { borderRadius: 16, padding: 16, gap: 6 },
  choiceTitle: { fontSize: 18, fontWeight: '800' },
  choiceBody: { fontSize: 14, lineHeight: 20 },
  primary: { minHeight: 54, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 17, fontWeight: '800' },
  secondary: { minHeight: 50, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 15, fontWeight: '800' },
});
