import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useUiMode } from '../../app/UiMode';

import type { ListenerStatus } from '../../native/NativeNotifyIQ';
import type { AppTheme, ThemePreference } from '../../theme/tokens';
import { LegalScreen } from '../legal/LegalScreen';
import type { LegalDocument } from '../legal/legalContent';
import { BackupSection } from '../privacy/BackupSection';
import { PrivacyCentreScreen } from '../privacy/PrivacyCentreScreen';
import { SecuritySection } from '../privacy/SecuritySection';
import { RulesScreen } from '../rules/RulesScreen';
import { RemindersSection } from '../reminders/RemindersSection';

export type SettingsPage = 'rules' | 'reminders' | 'privacy' | 'backup' | 'security';

type Props = {
  theme: AppTheme;
  page: SettingsPage | null;
  onPageChange: (page: SettingsPage | null) => void;
  themePreference: ThemePreference;
  onThemeChange: (value: ThemePreference) => void;
  listenerStatus: ListenerStatus | null;
  onOpenAccessSettings: () => void;
  onDataChanged: () => void;
  appVersion: string;
};

const pageTitles: Record<SettingsPage, string> = {
  rules: 'Rules',
  reminders: 'Reminders',
  privacy: 'Notification access & apps',
  backup: 'Backup & new phone',
  security: 'App lock',
};

export function SettingsScreen({ theme, page, onPageChange, themePreference, onThemeChange, listenerStatus, onOpenAccessSettings, onDataChanged, appVersion }: Props) {
  const uiMode = useUiMode();
  const [legal, setLegal] = useState<LegalDocument['key'] | null>(null);
  const colors = theme.colors;

  useEffect(() => {
    if (!page) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onPageChange(null); return true; });
    return () => sub.remove();
  }, [page, onPageChange]);

  if (page) {
    return (
      <View style={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Settings" onPress={() => onPageChange(null)} style={styles.back}>
          <Text style={[styles.backText, { color: colors.brand }]}>‹ Settings</Text>
        </Pressable>
        <Text accessibilityRole="header" style={[styles.pageTitle, { color: colors.textPrimary }]}>{pageTitles[page]}</Text>
        {page === 'rules' ? <RulesScreen theme={theme} />
          : page === 'reminders' ? <RemindersSection theme={theme} />
          : page === 'privacy' ? <PrivacyCentreScreen theme={theme} status={listenerStatus} onOpenSettings={onOpenAccessSettings} />
          : page === 'backup' ? <BackupSection theme={theme} onRestored={onDataChanged} />
          : <SecuritySection theme={theme} />}
      </View>
    );
  }

  const capturing = listenerStatus?.accessGranted && listenerStatus.connected;
  const row = (key: string, emoji: string, title: string, subtitle: string, onPress: () => void, last = false) => (
    <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`} onPress={onPress}
      style={({ pressed }) => [styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, pressed && styles.pressed]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.brandSoft }]}><Text style={styles.rowEmoji}>{emoji}</Text></View>
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );

  return (
    <View style={styles.content}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>

      <View style={[styles.status, { backgroundColor: colors.hero }]}>
        <View style={[styles.orb, { backgroundColor: colors.heroAccent }]} />
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: capturing ? '#5BE0A0' : '#FFB547' }]} />
          <Text style={[styles.statusTitle, { color: colors.onHero }]}>
            {capturing ? 'Capturing notifications' : listenerStatus?.accessGranted ? 'Connecting to Android…' : 'Notification access is off'}
          </Text>
        </View>
        <Text style={[styles.statusBody, { color: colors.onHeroMuted }]}>Everything stays on this phone. No account, no internet access.</Text>
        {!listenerStatus?.accessGranted ? (
          <Pressable accessibilityRole="button" onPress={onOpenAccessSettings} style={styles.statusButton}>
            <Text style={[styles.statusButtonText, { color: colors.hero }]}>Turn on notification access</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={[styles.group, { color: colors.textSecondary }]}>ORGANISE</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {row('reminders', '⏰', 'Reminders', 'Bills, renewals & AutoPay: the day before at 9 AM', () => onPageChange('reminders'))}
        {row('rules', '⚙️', 'Rules', 'Auto-categorise, save, group and remind', () => onPageChange('rules'), true)}
      </View>

      <Text style={[styles.group, { color: colors.textSecondary }]}>PRIVACY & DATA</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {row('privacy', '🔔', 'Notification access & apps', 'Access, excluded apps, history retention, delete history', () => onPageChange('privacy'))}
        {row('backup', '💾', 'Backup & new phone', 'Encrypted export and restore', () => onPageChange('backup'), true)}
      </View>

      <Text style={[styles.group, { color: colors.textSecondary }]}>SECURITY</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {row('security', '🔒', 'App lock', 'Fingerprint, face or PIN to open NotifyIQ', () => onPageChange('security'), true)}
      </View>

      <Text style={[styles.group, { color: colors.textSecondary }]}>APPEARANCE</Text>
      <Pressable accessibilityRole="switch" accessibilityLabel="Simple view" accessibilityState={{ checked: uiMode.simple }} onPress={() => uiMode.setSimple(!uiMode.simple)}
        style={[styles.card, styles.simpleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.simpleText}>
          <Text style={[styles.simpleTitle, { color: colors.textPrimary }]}>Simple view</Text>
          <Text style={[styles.simpleBody, { color: colors.textSecondary }]}>
            {uiMode.simple ? 'Showing the essentials with larger text. Turn off to see every chart, filter and option.' : 'Show only the essentials, with larger text. Nothing is removed; you can switch back any time.'}
          </Text>
        </View>
        <Switch importantForAccessibility="no-hide-descendants" value={uiMode.simple} onValueChange={uiMode.setSimple} />
      </Pressable>
      <View accessibilityRole="radiogroup" accessibilityLabel="Appearance" style={[styles.segment, { backgroundColor: colors.surfaceMuted }]}>
        {(['system', 'light', 'dark'] as ThemePreference[]).map(option => {
          const selected = themePreference === option;
          return (
            <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => onThemeChange(option)}
              style={[styles.segmentOption, selected && { backgroundColor: colors.brand }]}>
              <Text style={[styles.segmentText, { color: selected ? colors.onBrand : colors.textSecondary }]}>
                {option === 'system' ? 'System' : option === 'light' ? 'Light' : 'Dark'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.group, { color: colors.textSecondary }]}>ABOUT</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {row('policy', '📄', 'Privacy policy', 'What NotifyIQ reads, keeps and never does', () => setLegal('privacy'))}
        {row('terms', '📘', 'Terms of use', 'Using NotifyIQ', () => setLegal('terms'))}
        {row('protect', '🛡️', 'How your data is protected', 'Security overview and limits', () => setLegal('security'), true)}
      </View>
      <Text style={[styles.version, { color: colors.textSecondary }]}>{`NotifyIQ ${appVersion}`}</Text>
      <LegalScreen theme={theme} visible={legal !== null} initial={legal ?? 'privacy'} onClose={() => setLegal(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  simpleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginBottom: 10 },
  simpleText: { flex: 1, gap: 4 },
  simpleTitle: { fontSize: 16, fontWeight: '800' },
  simpleBody: { fontSize: 13, lineHeight: 19 },
  content: { gap: 10 },
  flex: { flex: 1 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6, marginBottom: 4 },
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  backText: { fontSize: 16, fontWeight: '800' },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  status: { borderRadius: 24, padding: 18, gap: 8, overflow: 'hidden' },
  orb: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -60, top: -80, opacity: 0.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusTitle: { fontSize: 17, fontWeight: '800' },
  statusBody: { fontSize: 13, lineHeight: 19 },
  statusButton: { minHeight: 48, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  statusButtonText: { fontSize: 15, fontWeight: '800' },
  group: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 10, marginLeft: 4 },
  card: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10 },
  pressed: { opacity: 0.6 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowEmoji: { fontSize: 19 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowSubtitle: { fontSize: 12, lineHeight: 17, marginTop: 1 },
  chevron: { fontSize: 26, fontWeight: '300' },
  segment: { flexDirection: 'row', borderRadius: 16, padding: 4 },
  segmentOption: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 14, fontWeight: '800' },
  version: { fontSize: 12, textAlign: 'center', marginTop: 8 },
});
