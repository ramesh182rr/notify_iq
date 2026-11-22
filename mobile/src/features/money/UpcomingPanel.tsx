import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppDirectory } from '../../app/AppDirectory';

import { SourceNotificationSheet } from '../../components/SourceNotificationSheet';
import { Card, FadeIn, Pill, SectionHeader } from '../../components/ui';
import type { UpcomingAction } from '../../native/NativeNotifyIQ';
import { clearInsightReminder, dismissInsight, getUpcomingActions, setInsightReminder } from '../../native/notifyIQ';
import { type AppTheme } from '../../theme/tokens';
import { actionKinds, dueLabel, formatMoney } from './format';

type Props = { theme: AppTheme; refreshKey: number };

function reminderOptions(item: UpcomingAction, now: number) {
  const due = new Date(item.dueAt);
  const morningOf = new Date(due); morningOf.setHours(9, 0, 0, 0);
  const dayBefore = new Date(morningOf); dayBefore.setDate(dayBefore.getDate() - 1);
  const options = [
    { label: 'Day before, 9 AM', at: dayBefore.getTime() },
    { label: 'Morning of, 9 AM', at: morningOf.getTime() },
  ];
  if (item.hasTime) options.push({ label: '1 hour before', at: item.dueAt - 3_600_000 });
  return options.filter(option => option.at > now + 60_000);
}

export function UpcomingPanel({ theme, refreshKey }: Props) {
  const { name: appName } = useAppDirectory();
  const [items, setItems] = useState<ReadonlyArray<UpcomingAction> | null>(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sourceId, setSourceId] = useState<number | null>(null);
  const colors = theme.colors;

  const load = useCallback(async () => {
    try { setItems(await getUpcomingActions()); setError(false); } catch { setError(true); }
  }, []);
  useEffect(() => { load().catch(() => undefined); }, [load, refreshKey]);

  const act = async (operation: () => Promise<unknown>, message: string) => {
    try { await operation(); setNotice(message); } catch { setNotice('That change could not be saved.'); }
    setExpanded(null);
    await load();
  };

  if (error) return <Card theme={theme} onPress={() => { load().catch(() => undefined); }}><Text style={{ color: colors.danger }}>Upcoming items could not be loaded. Tap to retry.</Text></Card>;
  if (items === null) return <Text style={{ color: colors.textSecondary }}>Looking for upcoming dates…</Text>;

  const now = Date.now();
  const groups = [
    { title: 'Overdue', items: items.filter(item => dueLabel(item.dueAt, item.hasTime, now).tone === 'overdue') },
    { title: 'This week', items: items.filter(item => ['soon', 'week'].includes(dueLabel(item.dueAt, item.hasTime, now).tone)) },
    { title: 'Later', items: items.filter(item => dueLabel(item.dueAt, item.hasTime, now).tone === 'later') },
  ].filter(group => group.items.length);

  return (
    <View style={styles.content}>
      <Text style={[styles.note, { color: colors.textSecondary }]}>
        Dates found in your saved notifications: bills, renewals, expiries, appointments and tasks. NotifyIQ reads only what the notification said, so check the source before acting.
      </Text>
      {notice ? <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: colors.brand }]}>{notice}</Text> : null}
      {groups.length === 0 ? (
        <Card theme={theme}>
          <Text style={styles.emptyEmoji}>🗓️</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Nothing coming up</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>When a notification mentions a due date, renewal, expiry or appointment, it will appear here.</Text>
        </Card>
      ) : groups.map((group, groupIndex) => (
        <FadeIn key={group.title} delay={groupIndex * 60}>
          <SectionHeader theme={theme} title={group.title} />
          <View style={styles.list}>
            {group.items.map(item => {
              const kind = actionKinds[item.kind] ?? actionKinds.task;
              const due = dueLabel(item.dueAt, item.hasTime, now);
              const toneColor = due.tone === 'overdue' ? colors.danger : due.tone === 'soon' ? colors.warning : colors.brand;
              const options = reminderOptions(item, now);
              return (
                <Card key={item.eventId} theme={theme} style={styles.item}>
                  <View style={styles.row}>
                    <View style={[styles.icon, { backgroundColor: colors.brandSoft }]}><Text style={styles.iconText}>{kind.emoji}</Text></View>
                    <View style={styles.flex}>
                      <Text style={[styles.kind, { color: toneColor }]}>{kind.label} · {due.text}</Text>
                      <Text numberOfLines={2} style={[styles.title, { color: colors.textPrimary }]}>{item.title || item.body || appName(item.packageName)}</Text>
                      {item.title && item.body ? <Text numberOfLines={2} style={[styles.body, { color: colors.textSecondary }]}>{item.body}</Text> : null}
                      <Text style={[styles.source, { color: colors.textSecondary }]}>From {appName(item.packageName)}</Text>
                    </View>
                    {item.amountMinor != null && item.currency ? (
                      <Text style={[styles.amount, { color: colors.textPrimary }]}>{formatMoney(item.amountMinor, item.currency)}</Text>
                    ) : null}
                  </View>
                  {item.reminderStatus === 'pending' && item.reminderAt ? (
                    <View style={styles.row}>
                      <Pill label={`🔔 ${new Date(item.reminderAt).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`} color={colors.brand} background={colors.brandSoft} />
                      <Pressable accessibilityRole="button" onPress={() => act(() => clearInsightReminder(item.eventId), 'Reminder cancelled.')} hitSlop={10}>
                        <Text style={[styles.link, { color: colors.textSecondary }]}>Cancel reminder</Text>
                      </Pressable>
                    </View>
                  ) : item.reminderStatus === 'permission_missing' ? (
                    <Text style={[styles.body, { color: colors.warning }]}>Allow NotifyIQ notifications in Android settings to receive reminders.</Text>
                  ) : null}
                  {expanded === item.eventId ? (
                    <View style={styles.chips}>
                      {options.length ? options.map(option => (
                        <Pressable key={option.label} accessibilityRole="button" style={[styles.chip, { backgroundColor: colors.brandSoft }]}
                          onPress={() => act(async () => {
                            const status = await setInsightReminder(item.eventId, option.at);
                            if (status !== 'pending') throw new Error(status);
                          }, `Reminder set: ${option.label.toLowerCase()}.`)}>
                          <Text style={[styles.chipText, { color: colors.brand }]}>{option.label}</Text>
                        </Pressable>
                      )) : <Text style={[styles.body, { color: colors.textSecondary }]}>It is too close to the due time to schedule a reminder.</Text>}
                    </View>
                  ) : null}
                  <View style={styles.actions}>
                    {item.reminderStatus !== 'pending' ? (
                      <Pressable accessibilityRole="button" accessibilityLabel="Remind me" style={[styles.chip, { backgroundColor: colors.surfaceMuted }]}
                        onPress={() => setExpanded(expanded === item.eventId ? null : item.eventId)}>
                        <Text style={[styles.chipText, { color: colors.textPrimary }]}>🔔 Remind me</Text>
                      </Pressable>
                    ) : null}
                    <Pressable accessibilityRole="button" accessibilityLabel="View the source notification" style={[styles.chip, { backgroundColor: colors.surfaceMuted }]}
                      onPress={() => setSourceId(item.eventId)}>
                      <Text style={[styles.chipText, { color: colors.textPrimary }]}>View source</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss this item" style={[styles.chip, { backgroundColor: colors.surfaceMuted }]}
                      onPress={() => act(() => dismissInsight(item.eventId), 'Dismissed. The source notification is still in your Inbox.')}>
                      <Text style={[styles.chipText, { color: colors.textSecondary }]}>Not relevant</Text>
                    </Pressable>
                  </View>
                </Card>
              );
            })}
          </View>
        </FadeIn>
      ))}
      <SourceNotificationSheet theme={theme} eventId={sourceId} onClose={() => setSourceId(null)}
        note="The date and type were read from this notification. Check the original before acting." />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  note: { fontSize: 13, lineHeight: 19 },
  notice: { fontSize: 13, fontWeight: '700' },
  list: { gap: 10, marginTop: 8 },
  item: { gap: 10, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  iconText: { fontSize: 22 },
  flex: { flex: 1, gap: 2 },
  kind: { fontSize: 12, fontWeight: '800' },
  title: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 19 },
  source: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '800', alignSelf: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 48, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 14, fontWeight: '700' },
  link: { fontSize: 13, fontWeight: '700' },
  emptyEmoji: { fontSize: 30 },
});
