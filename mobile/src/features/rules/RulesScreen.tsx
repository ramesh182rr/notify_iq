import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, PermissionsAndroid, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { AppIcon, useAppDirectory } from '../../app/AppDirectory';
import { AppPicker } from '../../components/AppPicker';
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
  conditions: { match: 'all'; appPackage?: string; containsText?: string };
  actions: RuleAction[];
};
type RuleSet = { schemaVersion: 2; rules: Rule[] };
const emptyRules: RuleSet = { schemaVersion: 2, rules: [] };

/** Same wording as the Inbox categories. */
export const RULE_CATEGORIES = [
  ['finance', 'Finance'], ['personal', 'Personal'], ['delivery_shopping', 'Delivery & shopping'], ['travel', 'Travel'],
  ['social', 'Social'], ['reminder_calendar', 'Reminders'], ['promotion', 'Promotions'], ['system', 'System'], ['other', 'Other'],
] as const;
const REMINDERS: ReadonlyArray<[number | null, string]> = [[null, 'No reminder'], [15, 'In 15 min'], [60, 'In 1 hour'], [1440, 'Tomorrow']];

const categoryName = (value: string) => RULE_CATEGORIES.find(([key]) => key === value)?.[1] ?? 'Other';
const reminderName = (minutes: number) => (minutes === 15 ? '15 minutes' : minutes === 60 ? '1 hour' : minutes === 1440 ? '1 day' : `${minutes} minutes`);

/** "Put it in Finance, save it and remind me in 1 hour" */
export function describeActions(actions: ReadonlyArray<RuleAction>): string {
  const parts = actions.map(action => {
    switch (action.type) {
      case 'setCategory': return `put it in ${categoryName(action.value)}`;
      case 'save': return 'save it';
      case 'markImportant': return action.value ? 'mark it important' : 'mark it not important';
      case 'addGroup': return `label it “${action.value}”`;
      case 'createReminder': return `remind me after ${reminderName(action.delayMinutes)}`;
      case 'includeInDigest': return action.value ? 'include it in the digest' : 'leave it out of the digest';
    }
  });
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** "When a notification from WhatsApp mentions “salary”" */
export function describeCondition(rule: Pick<Rule, 'conditions'>, appName: (pkg: string) => string): string {
  const from = rule.conditions.appPackage ? `from ${appName(rule.conditions.appPackage)}` : 'from any app';
  const text = rule.conditions.containsText ? ` mentions “${rule.conditions.containsText}”` : '';
  return `When a notification ${from}${text ? ` and${text}` : ' arrives'}`;
}

export function RulesScreen({ theme }: { theme: AppTheme }) {
  const { name: appName } = useAppDirectory();
  const [ruleSet, setRuleSet] = useState<RuleSet>(emptyRules);
  const [app, setApp] = useState<string | null>(null);
  const [phrase, setPhrase] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [save, setSave] = useState(false);
  const [important, setImportant] = useState(false);
  const [label, setLabel] = useState('');
  const [labelOn, setLabelOn] = useState(false);
  const [reminder, setReminder] = useState<number | null>(null);
  const [picking, setPicking] = useState<'rule' | 'try' | null>(null);
  const [tryApp, setTryApp] = useState<string | null>(null);
  const [tryText, setTryText] = useState('');
  const [tryResult, setTryResult] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(true);
  const colors = theme.colors;

  const load = useCallback(async () => {
    setBusy(true);
    try { setRuleSet(JSON.parse(await getUserRules()) as RuleSet); setMessage(null); }
    catch { setMessage({ text: 'Your rules could not be loaded. Please try again.', error: true }); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { load().catch(() => undefined); }, [load]);

  const draftActions = useMemo<RuleAction[]>(() => {
    const actions: RuleAction[] = [];
    if (category) actions.push({ type: 'setCategory', value: category });
    if (save) actions.push({ type: 'save' });
    if (important) actions.push({ type: 'markImportant', value: true });
    if (labelOn && label.trim()) actions.push({ type: 'addGroup', value: label.trim().slice(0, 40) });
    if (reminder !== null) actions.push({ type: 'createReminder', delayMinutes: reminder });
    return actions;
  }, [category, save, important, labelOn, label, reminder]);
  const draft = { conditions: { match: 'all' as const, ...(app ? { appPackage: app } : {}), ...(phrase.trim() ? { containsText: phrase.trim() } : {}) } };
  const canSave = (app !== null || phrase.trim().length > 0) && draftActions.length > 0;

  const persist = async (next: RuleSet, done: string) => {
    setBusy(true);
    try { await saveUserRules(JSON.stringify(next)); setRuleSet(next); setMessage({ text: done, error: false }); }
    catch { setMessage({ text: 'The rule could not be saved. Your other rules still work.', error: true }); }
    finally { setBusy(false); }
  };

  const addRule = async () => {
    if (!canSave) return;
    if (reminder !== null && Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      if (result !== PermissionsAndroid.RESULTS.GRANTED) { setMessage({ text: 'Reminders need permission to show notifications. The rule was not saved.', error: true }); return; }
    }
    const name = [app ? appName(app) : 'Any app', phrase.trim() ? `“${phrase.trim().slice(0, 40)}”` : null].filter(Boolean).join(' · ').slice(0, 80);
    const rule: Rule = { id: `${Date.now()}`, name, enabled: true, conditions: draft.conditions, actions: draftActions };
    await persist({ schemaVersion: 2, rules: [...ruleSet.rules, rule] }, 'Rule saved. It applies to new notifications from now on.');
    setApp(null); setPhrase(''); setCategory(null); setSave(false); setImportant(false); setLabel(''); setLabelOn(false); setReminder(null);
  };

  const tryIt = async () => {
    try {
      const sample = { packageName: tryApp ?? 'com.notifyiq.preview', title: tryText, body: null, subtext: null, category: 'other', priority: 'normal' };
      const result = JSON.parse(await previewUserRules(JSON.stringify(ruleSet), JSON.stringify(sample))) as { matchedRuleIds: string[] };
      const matched = ruleSet.rules.filter(rule => result.matchedRuleIds.includes(rule.id));
      setTryResult(matched.length
        ? `${matched.length === 1 ? '1 rule matches' : `${matched.length} rules match`}. NotifyIQ would ${describeActions(matched.flatMap(rule => rule.actions))}.`
        : 'No rule matches this notification. It would be kept as usual.');
    } catch { setTryResult('Testing is not available right now.'); }
  };

  const confirmDelete = (rule: Rule) => Alert.alert('Delete this rule?', `${describeCondition(rule, appName)}, ${describeActions(rule.actions)}.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => { persist({ ...ruleSet, rules: ruleSet.rules.filter(item => item.id !== rule.id) }, 'Rule deleted.').catch(() => undefined); } },
  ]);

  const applyToPast = () => Alert.alert('Apply rules to past notifications?', 'Your rules will also sort notifications you already have. Reminders are only set for times still in the future.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Apply', onPress: () => { setBusy(true); reevaluateUserRules().then(count => setMessage({ text: `Rules applied to ${count} notifications.`, error: false })).catch(() => setMessage({ text: 'Rules could not be applied to past notifications.', error: true })).finally(() => setBusy(false)); } },
  ]);

  const card = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }];
  const chip = (selected: boolean) => [styles.chip, { borderColor: selected ? colors.brand : colors.border, backgroundColor: selected ? colors.brandSoft : colors.surface }];
  const appButton = (pkg: string | null, onPress: () => void, a11y: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} style={[styles.appButton, { borderColor: colors.border }]}>
      {pkg ? <AppIcon theme={theme} packageName={pkg} size={32} /> : <View style={[styles.anyIcon, { backgroundColor: colors.brandSoft }]}><Text style={{ color: colors.brand, fontWeight: '900' }}>All</Text></View>}
      <Text style={[styles.appButtonText, { color: colors.textPrimary }]}>{pkg ? appName(pkg) : 'Any app'}</Text>
      <Text style={{ color: colors.brand, fontWeight: '700' }}>Change</Text>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.copy, { color: colors.textSecondary }]}>
        Rules sort your notifications for you. For example: when your bank’s app mentions “salary”, put it in Finance and save it. Rules only organise NotifyIQ; they never hide or block notifications on your phone.
      </Text>
      {message ? <Text accessibilityRole={message.error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={{ color: message.error ? colors.danger : colors.success }}>{message.text}</Text> : null}

      <View style={card}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>New rule</Text>

        <Text style={[styles.step, { color: colors.textPrimary }]}>1. When a notification comes from</Text>
        {appButton(app, () => setPicking('rule'), `App: ${app ? appName(app) : 'any app'}. Change`)}

        <Text style={[styles.step, { color: colors.textPrimary }]}>2. And it mentions <Text style={{ color: colors.textSecondary, fontWeight: '400' }}>(optional)</Text></Text>
        <TextInput accessibilityLabel="Words to look for" placeholder="For example: salary or order shipped" placeholderTextColor={colors.textSecondary} value={phrase} onChangeText={setPhrase} maxLength={80}
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]} />
        <Text style={[styles.hint, { color: colors.textSecondary }]}>Leave empty to match every notification from the app. Capital letters don’t matter.</Text>

        <Text style={[styles.step, { color: colors.textPrimary }]}>3. Then</Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>Put it in this category</Text>
        <View style={styles.chips}>
          {RULE_CATEGORIES.map(([value, name]) => (
            <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: category === value }} onPress={() => setCategory(current => (current === value ? null : value))} style={chip(category === value)}>
              <Text style={{ color: colors.textPrimary }}>{name}</Text>
            </Pressable>
          ))}
        </View>
        {([
          ['Save it', 'Saved notifications are never deleted automatically.', save, setSave],
          ['Mark it important', 'Shows it with an Important tag.', important, setImportant],
          ['Add a label', 'Find it later with a filter, such as “Bills”.', labelOn, setLabelOn],
        ] as const).map(([name, help, value, set]) => (
          <View key={name} style={styles.toggleRow}>
            <View style={styles.flex}>
              <Text style={[styles.toggleName, { color: colors.textPrimary }]}>{name}</Text>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>{help}</Text>
            </View>
            <Switch accessibilityLabel={name} value={value} onValueChange={set} />
          </View>
        ))}
        {labelOn ? <TextInput accessibilityLabel="Label name" placeholder="Label, such as Bills" placeholderTextColor={colors.textSecondary} value={label} onChangeText={setLabel} maxLength={40}
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]} /> : null}
        <Text style={[styles.hint, { color: colors.textSecondary }]}>Remind me about it</Text>
        <View style={styles.chips}>
          {REMINDERS.map(([value, name]) => (
            <Pressable key={name} accessibilityRole="radio" accessibilityState={{ selected: reminder === value }} onPress={() => setReminder(value)} style={chip(reminder === value)}>
              <Text style={{ color: colors.textPrimary }}>{name}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.summary, { backgroundColor: colors.surfaceMuted }]}>
          <Text style={[styles.copy, { color: colors.textPrimary }]}>
            {canSave ? `${describeCondition(draft, appName)}, ${describeActions(draftActions)}.` : 'Choose an app or some words, and at least one thing to do.'}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canSave || busy }} disabled={!canSave || busy} onPress={() => { addRule().catch(() => undefined); }}
          style={[styles.primary, { backgroundColor: canSave ? colors.brand : colors.surfaceMuted }]}>
          <Text style={[styles.primaryText, { color: canSave ? colors.onBrand : colors.textSecondary }]}>{busy ? 'Saving…' : 'Save rule'}</Text>
        </Pressable>
      </View>

      <View style={card}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>Your rules</Text>
        {ruleSet.rules.length === 0 ? <Text style={[styles.copy, { color: colors.textSecondary }]}>{busy ? 'Loading…' : 'No rules yet. Create one above.'}</Text> : null}
        {ruleSet.rules.map(rule => (
          <View key={rule.id} style={[styles.rule, { borderTopColor: colors.border }]}>
            {rule.conditions.appPackage ? <AppIcon theme={theme} packageName={rule.conditions.appPackage} size={36} /> : <View style={[styles.anyIcon, { backgroundColor: colors.brandSoft }]}><Text style={{ color: colors.brand, fontWeight: '900' }}>All</Text></View>}
            <View style={styles.flex}>
              <Text style={[styles.copy, { color: rule.enabled ? colors.textPrimary : colors.textSecondary }]}>{describeCondition(rule, appName)}, {describeActions(rule.actions)}.</Text>
              <View style={styles.ruleActions}>
                <Text style={[styles.hint, { color: colors.textSecondary }]}>{rule.enabled ? 'On' : 'Off'}</Text>
                <Switch accessibilityLabel={`Rule ${rule.enabled ? 'on' : 'off'}: ${rule.name}`} value={rule.enabled} disabled={busy}
                  onValueChange={value => { persist({ ...ruleSet, rules: ruleSet.rules.map(item => (item.id === rule.id ? { ...item, enabled: value } : item)) }, value ? 'Rule turned on.' : 'Rule turned off.').catch(() => undefined); }} />
                <Pressable accessibilityRole="button" accessibilityLabel={`Delete rule: ${rule.name}`} disabled={busy} onPress={() => confirmDelete(rule)} style={styles.link}>
                  <Text style={{ color: colors.danger, fontWeight: '700' }}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
        {ruleSet.rules.length ? (
          <Pressable accessibilityRole="button" disabled={busy} onPress={applyToPast} style={styles.link}>
            <Text style={{ color: colors.brand, fontWeight: '700' }}>Apply rules to past notifications</Text>
          </Pressable>
        ) : null}
      </View>

      {ruleSet.rules.length ? (
        <View style={card}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Try your rules</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>See what would happen to a notification, without changing anything.</Text>
          {appButton(tryApp, () => setPicking('try'), `Test app: ${tryApp ? appName(tryApp) : 'any app'}. Change`)}
          <TextInput accessibilityLabel="Example notification text" placeholder="Type an example notification" placeholderTextColor={colors.textSecondary} value={tryText} onChangeText={setTryText}
            style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]} />
          <Pressable accessibilityRole="button" onPress={() => { tryIt().catch(() => undefined); }} style={styles.link}><Text style={{ color: colors.brand, fontWeight: '700' }}>Test</Text></Pressable>
          {tryResult ? <Text accessibilityLiveRegion="polite" style={[styles.copy, { color: colors.textPrimary }]}>{tryResult}</Text> : null}
        </View>
      ) : null}

      <AppPicker theme={theme} visible={picking !== null} title={picking === 'try' ? 'Test with which app?' : 'Which app?'} allowAll
        onPick={value => { if (picking === 'try') setTryApp(value); else setApp(value); setPicking(null); }} onClose={() => setPicking(null)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800' },
  heading: { fontSize: 19, fontWeight: '800' },
  step: { fontSize: 16, fontWeight: '800', marginTop: 6 },
  copy: { fontSize: 15, lineHeight: 22 },
  hint: { fontSize: 13, lineHeight: 19 },
  card: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 48, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderWidth: 1, borderRadius: 999 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  toggleName: { fontSize: 15, fontWeight: '700' },
  flex: { flex: 1 },
  appButton: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, minHeight: 56 },
  appButtonText: { flex: 1, fontSize: 15, fontWeight: '700' },
  anyIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  summary: { borderRadius: 12, padding: 12 },
  primary: { borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontSize: 16, fontWeight: '800' },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  ruleActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
});
