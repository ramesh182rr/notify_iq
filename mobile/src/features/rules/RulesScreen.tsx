import { useCallback, useEffect, useState } from 'react';
import { Alert, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getUserRules, previewUserRules, reevaluateUserRules, saveUserRules } from '../../native/notifyIQ';
import type { AppTheme } from '../../theme/tokens';

type RuleAction =
  | { type: 'setCategory'; value: string }
  | { type: 'save' }
  | { type: 'includeInDigest'; value: boolean }
  | { type: 'markImportant'; value: boolean }
  | { type: 'addGroup'; value: string }
  | { type: 'createReminder'; delayMinutes: number };
type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  conditions: { match: 'all'; containsText?: string };
  actions: RuleAction[];
};
type RuleSet = { schemaVersion: 2; rules: Rule[] };
const categories = ['other', 'finance', 'travel', 'delivery_shopping', 'reminder_calendar', 'social', 'promotion', 'system', 'personal'];
const emptyRules: RuleSet = { schemaVersion: 2, rules: [] };

export function RulesScreen({ theme }: { theme: AppTheme }) {
  const [ruleSet, setRuleSet] = useState<RuleSet>(emptyRules);
  const [phrase, setPhrase] = useState('');
  const [categoryIndex, setCategoryIndex] = useState(1);
  const [saveMatch, setSaveMatch] = useState(false);
  const [digestMatch, setDigestMatch] = useState(false);
  const [importantMatch, setImportantMatch] = useState(false);
  const [groupMatch, setGroupMatch] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [groupName, setGroupName] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const load = useCallback(async () => {
    setBusy(true);
    try {
      setRuleSet(JSON.parse(await getUserRules()) as RuleSet);
      setError(null);
    } catch {
      setError('Rules are unavailable. Check the Android native bridge and retry.');
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const persist = async (next: RuleSet) => {
    setBusy(true);
    try {
      await saveUserRules(JSON.stringify(next));
      setRuleSet(next);
      setError(null);
      setPreviewResult(null);
    } catch {
      setError('Rules could not be saved. The last valid rule set remains active.');
    } finally {
      setBusy(false);
    }
  };
  const addRule = () => {
    const trimmed = phrase.trim();
    if (!trimmed) { setError('Enter text the notification must contain.'); return; }
    const actions: RuleAction[] = [{ type: 'setCategory', value: categories[categoryIndex] }];
    if (saveMatch) actions.push({ type: 'save' });
    if (digestMatch) actions.push({ type: 'includeInDigest', value: true });
    if (importantMatch) actions.push({ type: 'markImportant', value: true });
    if (groupMatch && groupName.trim()) actions.push({ type: 'addGroup', value: groupName.trim() });
    if (groupMatch && !groupName.trim()) { setError('Enter a group label or turn off Add to group.'); return; }
    if (reminderMinutes !== null) actions.push({ type: 'createReminder', delayMinutes: reminderMinutes });
    const rule: Rule = {
      id: `${Date.now()}`,
      name: `Contains “${trimmed.slice(0, 48)}”`,
      enabled: true,
      conditions: { match: 'all', containsText: trimmed },
      actions,
    };
    const add = async () => {
      if (reminderMinutes !== null && Platform.OS === 'android' && Number(Platform.Version) >= 33) {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          setError('Allow notifications to add a reminder rule. No rule was saved.');
          return;
        }
      }
      await persist({ schemaVersion: 2, rules: [...ruleSet.rules, rule] });
      setPhrase('');
    };
    void add().catch(() => setError('Reminder permission could not be requested. No rule was saved.'));
  };
  const preview = async () => {
    try {
      const sample = { packageName: 'com.notifyiq.preview', title: previewText, body: null, subtext: null, category: 'other', priority: 'normal' };
      const result = JSON.parse(await previewUserRules(JSON.stringify(ruleSet), JSON.stringify(sample))) as {
        matchedRuleIds: string[]; category: string; save: boolean; includeInDigest: boolean | null;
        important: boolean | null; groups: string[]; reminderAfterMinutes: number | null;
      };
      setPreviewResult(result.matchedRuleIds.length
        ? `Matched ${result.matchedRuleIds.length} rule(s): category ${result.category}; ${result.save ? 'save' : 'leave save state'}; digest ${result.includeInDigest === null ? 'unchanged' : result.includeInDigest ? 'included' : 'excluded'}; importance ${result.important === null ? 'unchanged' : result.important ? 'important' : 'normal'}; groups ${result.groups.length ? result.groups.join(', ') : 'none'}; reminder ${result.reminderAfterMinutes === null ? 'none' : `in ${result.reminderAfterMinutes} minutes`}.`
        : 'No rules match this sample.');
      setError(null);
    } catch {
      setError('Preview is unavailable. Check the Android native bridge and rule data.');
    }
  };
  const confirmReevaluation = () => Alert.alert(
    'Re-evaluate existing notifications?',
    'This updates rule-derived categories, groups, digest settings and saved state for stored notifications. Past reminder times will be skipped.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Re-evaluate', onPress: () => { setBusy(true); void reevaluateUserRules().then(count => setError(`Updated rules for ${count} stored notifications.`)).catch(() => setError('Existing notifications could not be re-evaluated.')).finally(() => setBusy(false)); } },
    ],
  );
  const colors = theme.colors;
  const card = { backgroundColor: colors.surface, borderColor: colors.border };
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Rules</Text>
      <Text style={[styles.copy, { color: colors.textSecondary }]}>Organise notifications on this device. Rules never change Android delivery. Older history changes only when you explicitly re-evaluate it.</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
      <View style={[styles.card, card]}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>Add a rule</Text>
        <Text style={[styles.copy, { color: colors.textSecondary }]}>Match a literal phrase in notification text, then assign a category.</Text>
        <TextInput accessibilityLabel="Text to match" autoCapitalize="none" placeholder="For example: payment received" placeholderTextColor={colors.textSecondary} value={phrase} onChangeText={setPhrase} style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Category ${categories[categoryIndex]}; tap to change`} onPress={() => setCategoryIndex(index => (index + 1) % categories.length)} style={[styles.action, { backgroundColor: colors.surfaceMuted }]}>
          <Text style={{ color: colors.textPrimary }}>Category: {categories[categoryIndex]} · change</Text>
        </Pressable>
        <View style={styles.options}>
          {([
            ['Save matches', saveMatch, setSaveMatch],
            ['Include in digest', digestMatch, setDigestMatch],
            ['Mark important', importantMatch, setImportantMatch],
            ['Add to group', groupMatch, setGroupMatch],
          ] as const).map(([label, checked, setChecked]) => (
            <Pressable key={label} accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => setChecked(value => !value)} style={[styles.option, { borderColor: colors.border, backgroundColor: checked ? colors.brandSoft : colors.surface }]}>
              <Text style={{ color: colors.textPrimary }}>{checked ? '✓ ' : '□ '}{label}</Text>
            </Pressable>
          ))}
        </View>
        {groupMatch ? <TextInput accessibilityLabel="Rule group label" maxLength={40} placeholder="Group label" placeholderTextColor={colors.textSecondary} value={groupName} onChangeText={setGroupName} style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]} /> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={`Reminder ${reminderMinutes === null ? 'off' : `${reminderMinutes} minutes`}; tap to change`} onPress={() => setReminderMinutes(value => value === null ? 15 : value === 15 ? 60 : value === 60 ? 1440 : null)} style={[styles.action, { backgroundColor: colors.surfaceMuted }]}>
          <Text style={{ color: colors.textPrimary }}>Reminder: {reminderMinutes === null ? 'off' : `${reminderMinutes} minutes after notification`}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={addRule} style={[styles.primary, { backgroundColor: colors.brand }]}>
          <Text style={styles.primaryText}>{busy ? 'Saving…' : 'Add rule'}</Text>
        </Pressable>
      </View>
      <View style={[styles.card, card]}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>Preview</Text>
        <TextInput accessibilityLabel="Preview notification text" placeholder="Enter sample notification text" placeholderTextColor={colors.textSecondary} value={previewText} onChangeText={setPreviewText} style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]} />
        <Pressable accessibilityRole="button" onPress={() => void preview()} style={styles.action}><Text style={{ color: colors.brand }}>Preview enabled rules</Text></Pressable>
        {previewResult ? <Text accessibilityLiveRegion="polite" style={{ color: colors.textSecondary }}>{previewResult}</Text> : null}
      </View>
      <View style={[styles.card, card]}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>Your rules</Text>
        <Pressable accessibilityRole="button" disabled={busy} onPress={confirmReevaluation} style={styles.action}><Text style={{ color: colors.brand }}>Re-evaluate existing notifications</Text></Pressable>
        {ruleSet.rules.length === 0 ? <Text style={[styles.copy, { color: colors.textSecondary }]}>{busy ? 'Loading rules…' : 'No rules yet.'}</Text> : null}
        {ruleSet.rules.map(rule => (
          <View key={rule.id} style={[styles.rule, { borderTopColor: colors.border }]}>
            <View style={styles.ruleText}>
              <Text style={[styles.ruleName, { color: colors.textPrimary }]}>{rule.name}</Text>
              <Text style={[styles.copy, { color: colors.textSecondary }]}>{rule.actions.map(action => action.type === 'setCategory' ? `Category: ${action.value}` : action.type === 'save' ? 'Save' : action.type === 'includeInDigest' ? 'Digest' : action.type === 'markImportant' ? 'Important' : action.type === 'addGroup' ? `Group: ${action.value}` : `Reminder: ${action.delayMinutes} min`).join(' · ')}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`${rule.enabled ? 'Pause' : 'Enable'} ${rule.name}`} disabled={busy} onPress={() => void persist({ ...ruleSet, rules: ruleSet.rules.map(item => item.id === rule.id ? { ...item, enabled: !item.enabled } : item) })} style={styles.action}>
              <Text style={{ color: colors.brand }}>{rule.enabled ? 'Pause' : 'Enable'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${rule.name}`} disabled={busy} onPress={() => void persist({ ...ruleSet, rules: ruleSet.rules.filter(item => item.id !== rule.id) })} style={styles.action}>
              <Text style={{ color: colors.danger }}>Delete</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '700' },
  copy: { fontSize: 14, lineHeight: 21 },
  card: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  action: { padding: 10, alignSelf: 'flex-start' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, borderRadius: 10 },
  primary: { borderRadius: 10, padding: 12, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  ruleText: { flexGrow: 1, flexBasis: '100%', gap: 4 },
  ruleName: { fontSize: 15, fontWeight: '600' },
});
