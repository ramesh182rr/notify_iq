import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  clearNotificationHistory,
  deleteNotification,
  searchNotifications,
  setNotificationArchived,
  setNotificationCategoryOverride,
  setNotificationSaved,
} from '../../native/notifyIQ';
import type { NotificationItem } from '../../native/NativeNotifyIQ';
import type { ListenerStatus } from '../../native/NativeNotifyIQ';
import type { AppTheme } from '../../theme/tokens';

type Props = { theme: AppTheme; refreshKey: number; searchMode?: boolean; listenerStatus?: ListenerStatus | null; statusLoading?: boolean; statusError?: string | null };
type DateRange = 'all' | '7days' | 'today';
type PendingUndo = { label: string; action: () => Promise<void> };

const PAGE_SIZE = 50;
const CATEGORY_OPTIONS = [
  ['personal', 'Personal'], ['finance', 'Finance'], ['delivery_shopping', 'Delivery & shopping'],
  ['travel', 'Travel'], ['social', 'Social'], ['promotion', 'Promotions'],
  ['reminder_calendar', 'Reminders'], ['system', 'System'], ['other', 'Other'],
] as const;
const ignorePromise = (promise: Promise<unknown>) => {
  promise.catch(() => undefined);
};

export function InboxScreen({ theme, refreshKey, searchMode = false, listenerStatus, statusLoading = false, statusError = null }: Props) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<NotificationItem | null>(null);
  const [error, setError] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [query, setQuery] = useState('');
  const [packageName, setPackageName] = useState('');
  const [range, setRange] = useState<DateRange>('all');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [category, setCategory] = useState('');
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);
  const [categoryEditor, setCategoryEditor] = useState<NotificationItem | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const requestId = useRef(0);

  const rangeStart = useMemo(() => {
    if (range === 'all') return 0;
    const today = new Date();
    if (range === 'today') return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return Date.now() - 7 * 86_400_000;
  }, [range]);

  const loadFirstPage = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = await searchNotifications({
        query, packageName, category, from: rangeStart, includeArchived, limit: PAGE_SIZE,
      });
      if (requestId.current === id) {
        setItems([...result]);
        setHasMore(result.length === PAGE_SIZE);
        setError(false);
      }
    } catch {
      if (requestId.current === id) setError(true);
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }, [category, includeArchived, packageName, query, rangeStart]);

  useEffect(() => {
    const timer = setTimeout(() => { ignorePromise(loadFirstPage()); }, query || packageName ? 250 : 0);
    return () => clearTimeout(timer);
  }, [loadFirstPage, packageName, query, refreshKey]);

  useEffect(() => {
    if (!pendingUndo) return;
    const timer = setTimeout(() => setPendingUndo(null), 5000);
    return () => clearTimeout(timer);
  }, [pendingUndo]);

  const loadMore = async () => {
    const last = items[items.length - 1];
    if (!last) return;
    setLoading(true);
    try {
      const result = await searchNotifications({
        query, packageName, category, from: rangeStart, beforeReceivedAt: last.receivedAt,
        beforeId: last.id, includeArchived, limit: PAGE_SIZE,
      });
      setItems(current => [...current, ...result]);
      setHasMore(result.length === PAGE_SIZE);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const reloadAfterAction = async (action: () => Promise<void>, undo?: PendingUndo) => {
    try {
      await action();
      setActionError(false);
      await loadFirstPage();
      setPendingUndo(undo ?? null);
    } catch {
      setActionError(true);
    }
  };

  const confirmDelete = (item: NotificationItem) => Alert.alert(
    'Delete this notification?',
    'This removes the saved copy from this device.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        ignorePromise(reloadAfterAction(() => deleteNotification(item.id)));
      } },
    ],
  );

  const confirmClear = () => Alert.alert(
    'Delete notification history?',
    'This removes all notifications saved on this device. This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setClearing(true);
        try {
          await clearNotificationHistory();
          setItems([]);
          setHasMore(false);
          setError(false);
        } catch {
          setError(true);
        } finally {
          setClearing(false);
        }
      } },
    ],
  );

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{searchMode ? 'Search' : 'Inbox'}</Text>
      {listenerStatus !== undefined ? (
        <View accessibilityLiveRegion="polite" style={[styles.coverage, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.coverageTitle, { color: theme.colors.textPrimary }]}>Capture coverage</Text>
          <Text style={[styles.hint, { color: statusError || listenerStatus?.lastErrorCode ? theme.colors.danger : theme.colors.textSecondary }]}>
            {statusLoading && listenerStatus === null ? 'Checking notification access…' : statusError ? 'Coverage status is unavailable. Some notifications may not have been saved.' : listenerStatus?.lastErrorCode ? 'A local capture error occurred. Some notifications may be missing.' : !listenerStatus?.accessGranted ? 'Notification access is off. New notifications are not being captured, so history may be incomplete.' : !listenerStatus.connected ? 'The listener is disconnected. History may be incomplete until Android reconnects it.' : 'The listener is connected. Android may still omit or delay notifications.'}
          </Text>
        </View>
      ) : null}
      <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Saved history is stored on this device and works offline. There is no account or network sync.</Text>
      <TextInput
        accessibilityLabel="Search notification text"
        placeholder="Search saved notification text"
        placeholderTextColor={theme.colors.textSecondary}
        value={query}
        onChangeText={setQuery}
        style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
      />
      <TextInput
        accessibilityLabel="Filter by app package"
        placeholder="Filter by app package"
        placeholderTextColor={theme.colors.textSecondary}
        value={packageName}
        onChangeText={setPackageName}
        autoCapitalize="none"
        style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
      />
      <View style={styles.row}>
        {(['all', '7days', 'today'] as const).map(value => (
          <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: range === value }} onPress={() => setRange(value)} style={[styles.chip, { backgroundColor: range === value ? theme.colors.brandSoft : theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.textPrimary }}>{value === 'all' ? 'All dates' : value === '7days' ? '7 days' : 'Today'}</Text>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" accessibilityState={{ selected: includeArchived }} onPress={() => setIncludeArchived(value => !value)} style={[styles.chip, { backgroundColor: includeArchived ? theme.colors.brandSoft : theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={{ color: theme.colors.textPrimary }}>{includeArchived ? 'Archived included' : 'Include archived'}</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRail} accessibilityLabel="Filter by category">
        <Pressable accessibilityRole="button" accessibilityState={{ selected: category === '' }} onPress={() => setCategory('')} style={[styles.chip, { backgroundColor: category === '' ? theme.colors.brandSoft : theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={{ color: theme.colors.textPrimary }}>All categories</Text>
        </Pressable>
        {CATEGORY_OPTIONS.map(([value, label]) => (
          <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: category === value }} onPress={() => setCategory(value)} style={[styles.chip, { backgroundColor: category === value ? theme.colors.brandSoft : theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.textPrimary }}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {!searchMode ? <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Manage retention and app exclusions in Privacy.</Text> : null}
      {actionError ? <Text style={{ color: theme.colors.danger }}>That change could not be saved. Try again.</Text> : null}
      {!loading && items.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: clearing }} disabled={clearing} onPress={confirmClear}>
          <Text style={{ color: theme.colors.danger }}>{clearing ? 'Deleting…' : 'Delete all history'}</Text>
        </Pressable>
      ) : null}
      {pendingUndo ? (
        <View accessibilityLiveRegion="polite" style={[styles.undoNotice, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={{ color: theme.colors.textPrimary }}>{pendingUndo.label}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Undo last notification change" onPress={() => {
            const undo = pendingUndo.action;
            setPendingUndo(null);
            ignorePromise(reloadAfterAction(undo));
          }}>
            <Text style={[styles.undoAction, { color: theme.colors.brand }]}>Undo</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? (
        <Pressable onPress={() => ignorePromise(loadFirstPage())} accessibilityRole="button">
          <Text style={{ color: theme.colors.textSecondary }}>Could not load notification history. Tap to retry.</Text>
        </Pressable>
      ) : loading && items.length === 0 ? (
        <Text style={{ color: theme.colors.textSecondary }}>Loading saved notifications…</Text>
      ) : items.length === 0 ? (
        <Text style={{ color: theme.colors.textSecondary }}>No matching notifications. Saved history stays on this device.</Text>
      ) : items.map(item => (
        <View key={item.id} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.app, { color: theme.colors.brand }]}>{item.packageName}</Text>
          {item.title ? <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>{item.title}</Text> : null}
          {item.body ? <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{item.body}</Text> : null}
          {item.subtext ? <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{item.subtext}</Text> : null}
          <Text style={[styles.time, { color: theme.colors.textSecondary }]}>{new Date(item.receivedAt).toLocaleString()}</Text>
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{item.removedAt ? 'Dismissed in Android' : 'Active in Android'} · Captured from notification text</Text>
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{categoryLabel(item.category)}{item.categoryOverride ? ' · changed by you' : ''} · {item.priority} priority{item.confidence > 0 ? ' · matched rule' : ''}</Text>
          {item.important ? <Text style={[styles.hint, { color: theme.colors.brand }]}>Marked important by a rule</Text> : null}
          {item.includeInDigest !== null ? <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{item.includeInDigest ? 'Included in digest by a rule' : 'Excluded from digest by a rule'}</Text> : null}
          {item.ruleGroups.length ? <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Groups: {item.ruleGroups.join(', ')}</Text> : null}
          {item.duplicateCount > 1 ? <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Repeated {item.duplicateCount} times in this app within 30 minutes. All source notifications are kept.</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="View notification details" onPress={() => setSelectedItem(item)}>
            <Text style={{ color: theme.colors.brand }}>Details</Text>
          </Pressable>
          <View style={styles.row}>
            <Pressable accessibilityRole="button" accessibilityLabel={item.saved ? 'Unsave notification' : 'Save notification'} onPress={() => ignorePromise(reloadAfterAction(
              () => setNotificationSaved(item.id, !item.saved),
              { label: item.saved ? 'Notification unsaved.' : 'Notification saved.', action: () => setNotificationSaved(item.id, item.saved) },
            ))}>
              <Text style={{ color: theme.colors.brand }}>{item.saved ? 'Unsave' : 'Save'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={item.archivedAt == null ? 'Archive notification' : 'Restore notification'} onPress={() => ignorePromise(reloadAfterAction(
              () => setNotificationArchived(item.id, item.archivedAt == null),
              { label: item.archivedAt == null ? 'Notification archived.' : 'Notification restored.', action: () => setNotificationArchived(item.id, item.archivedAt != null) },
            ))}>
              <Text style={{ color: theme.colors.brand }}>{item.archivedAt == null ? 'Archive' : 'Restore'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Delete notification" onPress={() => confirmDelete(item)}>
              <Text style={{ color: theme.colors.danger }}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {!error && hasMore ? (
        <Pressable accessibilityRole="button" onPress={() => ignorePromise(loadMore())}>
          <Text style={{ color: theme.colors.brand }}>{loading ? 'Loading…' : 'Load more'}</Text>
        </Pressable>
      ) : null}
      <Modal visible={selectedItem !== null} transparent animationType="fade" onRequestClose={() => setSelectedItem(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.detailTitle, { color: theme.colors.textPrimary }]}>Notification details</Text>
            <ScrollView contentContainerStyle={styles.detailContent}>
              {selectedItem ? (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.colors.brand }]}>Source app</Text>
                  <Text style={[styles.body, { color: theme.colors.textPrimary }]}>{selectedItem.packageName}</Text>
                  <Text style={[styles.sectionLabel, { color: theme.colors.brand }]}>Received</Text>
                  <Text style={[styles.body, { color: theme.colors.textPrimary }]}>{new Date(selectedItem.receivedAt).toLocaleString()}</Text>
                  <Text style={[styles.sectionLabel, { color: theme.colors.brand }]}>Posted by Android</Text>
                  <Text style={[styles.body, { color: theme.colors.textPrimary }]}>{new Date(selectedItem.postedAt).toLocaleString()}</Text>
                  <Text style={[styles.sectionLabel, { color: theme.colors.brand }]}>Notification content</Text>
                  <Text style={[styles.body, { color: theme.colors.textPrimary }]}>{categoryLabel(selectedItem.category)} · {selectedItem.priority} priority</Text>
                  <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{selectedItem.analysisExplanation} ({selectedItem.analysisMethod}, {selectedItem.analysisVersion})</Text>
                  {selectedItem.matchedRuleIds.length ? <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Matched rules: {selectedItem.matchedRuleIds.join(', ')}</Text> : null}
                  {selectedItem.important ? <Text style={[styles.hint, { color: theme.colors.brand }]}>Marked important by a rule.</Text> : null}
                  {selectedItem.includeInDigest !== null ? <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{selectedItem.includeInDigest ? 'Included' : 'Excluded'} in digest by a rule.</Text> : null}
                  {selectedItem.ruleGroups.length ? <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Rule groups: {selectedItem.ruleGroups.join(', ')}</Text> : null}
                  {selectedItem.confidence > 0 ? <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Rule score is a heuristic, not a measured probability.</Text> : null}
                  <Pressable accessibilityRole="button" accessibilityLabel="Open category correction" onPress={() => setCategoryEditor(selectedItem)} style={styles.closeButton}>
                    <Text style={[styles.closeText, { color: theme.colors.brand }]}>Correct category</Text>
                  </Pressable>
                  {selectedItem.title ? <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>{selectedItem.title}</Text> : null}
                  {selectedItem.body ? <Text style={[styles.body, { color: theme.colors.textPrimary }]}>{selectedItem.body}</Text> : null}
                  {selectedItem.subtext ? <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{selectedItem.subtext}</Text> : null}
                  <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Captured from Android notification text and stored locally on this device after screening.</Text>
                </>
              ) : null}
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={() => setSelectedItem(null)} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: theme.colors.brand }]}>Close details</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={categoryEditor !== null} transparent animationType="fade" onRequestClose={() => setCategoryEditor(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.detailCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.detailTitle, { color: theme.colors.textPrimary }]}>Choose category</Text>
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>This changes NotifyIQ’s organization for this item only.</Text>
            <ScrollView contentContainerStyle={styles.detailContent}>
              {CATEGORY_OPTIONS.map(([value, label]) => (
                <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Set category to ${label}`} accessibilityState={{ selected: categoryEditor?.category === value }} onPress={() => {
                  if (categoryEditor) {
                    const item = categoryEditor;
                    ignorePromise(reloadAfterAction(() => setNotificationCategoryOverride(item.id, value), {
                      label: `Category changed to ${label}.`, action: () => setNotificationCategoryOverride(item.id, item.categoryOverride),
                    }));
                    setSelectedItem(null);
                  }
                  setCategoryEditor(null);
                }} style={styles.closeButton}>
                  <Text style={[styles.body, { color: theme.colors.textPrimary }]}>{label}</Text>
                </Pressable>
              ))}
              <Pressable accessibilityRole="button" onPress={() => {
                if (categoryEditor) {
                  const item = categoryEditor;
                  ignorePromise(reloadAfterAction(() => setNotificationCategoryOverride(item.id, null), {
                    label: 'Category reset to the rule result.', action: () => setNotificationCategoryOverride(item.id, item.categoryOverride),
                  }));
                  setSelectedItem(null);
                }
                setCategoryEditor(null);
              }} style={styles.closeButton}>
                <Text style={[styles.body, { color: theme.colors.brand }]}>Reset to rule result</Text>
              </Pressable>
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={() => setCategoryEditor(null)} style={styles.closeButton}>
              <Text style={[styles.closeText, { color: theme.colors.brand }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function categoryLabel(value: string) {
  return CATEGORY_OPTIONS.find(([category]) => category === value)?.[1] ?? 'Other';
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 14, paddingBottom: 24 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 },
  app: { fontSize: 12, fontWeight: '700' },
  itemTitle: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 11, marginTop: 4 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  chipRail: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  retention: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  undoNotice: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  undoAction: { fontWeight: '700' },
  coverage: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  coverageTitle: { fontSize: 14, fontWeight: '700' },
  sectionLabel: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 17 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', justifyContent: 'center', padding: 20 },
  detailCard: { maxHeight: '85%', borderWidth: 1, borderRadius: 20, padding: 20, gap: 14 },
  detailTitle: { fontSize: 22, fontWeight: '700' },
  detailContent: { gap: 8 },
  closeButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  closeText: { fontWeight: '700' },
});
