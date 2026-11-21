import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getUserRules, previewUserRules, saveUserRules } from '../../native/notifyIQ';
import type { AppTheme } from '../../theme/tokens';

type RuleAction =
  | { type: 'setCategory'; value: string }
  | { type: 'save' }
  | { type: 'includeInDigest'; value: boolean }
  | { type: 'markImportant'; value: boolean }
  | { type: 'addGroup'; value: string };
type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  conditions: { match: 'all'; containsText?: string };
  actions: RuleAction[];
};
type RuleSet = { schemaVersion: 1; rules: Rule[] };
const categories = ['other', 'finance', 'travel', 'delivery_shopping', 'reminder_calendar', 'social', 'promotion', 'system', 'personal'];
const emptyRules: RuleSet = { schemaVersion: 1, rules: [] };

export function RulesScreen({ theme }: { theme: AppTheme }) {
  const [ruleSet, setRuleSet] = useState<RuleSet>(emptyRules);
  const [phrase, setPhrase] = useState('');
  const [categoryIndex, setCategoryIndex] = useState(1);
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
    const rule: Rule = {
      id: `${Date.now()}`,
      name: `Contains “${trimmed.slice(0, 48)}”`,
      enabled: true,
      conditions: { match: 'all', containsText: trimmed },
      actions: [{ type: 'setCategory', value: categories[categoryIndex] }],
    };
    void persist({ schemaVersion: 1, rules: [...ruleSet.rules, rule] });
    setPhrase('');
  };
  const preview = async () => {
    try {
      const sample = { packageName: 'com.notifyiq.preview', title: previewText, body: null, subtext: null, category: 'other', priority: 'normal' };
      const result = JSON.parse(await previewUserRules(JSON.stringify(ruleSet), JSON.stringify(sample))) as { matchedRuleIds: string[]; category: string };
      setPreviewResult(result.matchedRuleIds.length ? `Matched ${result.matchedRuleIds.length} rule(s); category becomes ${result.category}.` : 'No rules match this sample.');
      setError(null);
    } catch {
      setError('Preview is unavailable. Check the Android native bridge and rule data.');
    }
  };
  const colors = theme.colors;
  const card = { backgroundColor: colors.surface, borderColor: colors.border };
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Rules</Text>
      <Text style={[styles.copy, { color: colors.textSecondary }]}>Organise NotifyIQ history on this device. Rules never change Android notification delivery.</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}
      <View style={[styles.card, card]}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>Add a rule</Text>
        <Text style={[styles.copy, { color: colors.textSecondary }]}>Match a literal phrase in notification text, then assign a category.</Text>
        <TextInput accessibilityLabel="Text to match" autoCapitalize="none" placeholder="For example: payment received" placeholderTextColor={colors.textSecondary} value={phrase} onChangeText={setPhrase} style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Category ${categories[categoryIndex]}; tap to change`} onPress={() => setCategoryIndex(index => (index + 1) % categories.length)} style={[styles.action, { backgroundColor: colors.surfaceMuted }]}>
          <Text style={{ color: colors.textPrimary }}>Category: {categories[categoryIndex]} · change</Text>
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
        {ruleSet.rules.length === 0 ? <Text style={[styles.copy, { color: colors.textSecondary }]}>{busy ? 'Loading rules…' : 'No rules yet.'}</Text> : null}
        {ruleSet.rules.map(rule => (
          <View key={rule.id} style={[styles.rule, { borderTopColor: colors.border }]}>
            <View style={styles.ruleText}>
              <Text style={[styles.ruleName, { color: colors.textPrimary }]}>{rule.name}</Text>
              <Text style={[styles.copy, { color: colors.textSecondary }]}>Category: {rule.actions.find((action): action is Extract<RuleAction, { type: 'setCategory' }> => action.type === 'setCategory')?.value ?? 'unchanged'}</Text>
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
  primary: { borderRadius: 10, padding: 12, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  ruleText: { flexGrow: 1, flexBasis: '100%', gap: 4 },
  ruleName: { fontSize: 15, fontWeight: '600' },
});
