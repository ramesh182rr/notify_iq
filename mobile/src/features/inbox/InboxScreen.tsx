import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  clearNotificationHistory,
  addSavedSearch,
  deleteSavedSearch,
  getSavedSearches,
  getRuleGroups,
  deleteNotification,
  searchNotifications,
  setNotificationArchived,
  setNotificationCategoryOverride,
  setNotificationSaved,
} from '../../native/notifyIQ';
import type { NotificationItem } from '../../native/NativeNotifyIQ';
import type { ListenerStatus } from '../../native/NativeNotifyIQ';
import type { AppTheme } from '../../theme/tokens';
import { appDisplayName, categoryVisual, priorityColor, relativeTime } from '../../theme/tokens';
import { readableTextOn } from '../../theme/contrast';
import { CategoryAvatar, Pill } from '../../components/ui';

type Props = { theme: AppTheme; refreshKey: number; searchMode?: boolean; listenerStatus?: ListenerStatus | null; statusLoading?: boolean; statusError?: string | null };
type DateRange = 'all' | '7days' | 'today';
type PendingUndo = { label: string; action: () => Promise<void> };
type SavedSearch = { id: string; name: string; query: string; packageName: string; category: string; groupName: string; dateRange: DateRange; includeArchived: boolean };

const PAGE_SIZE = 50;
const CATEGORY_OPTIONS = [
  ['personal', 'Personal'], ['finance', 'Finance'], ['delivery_shopping', 'Delivery & shopping'],
  ['travel', 'Travel'], ['social', 'Social'], ['promotion', 'Promotions'],
  ['reminder_calendar', 'Reminders'], ['system', 'System'], ['other', 'Other'],
] as const;
const ignorePromise = (promise: Promise<unknown>) => {
  promise.catch(() => undefined);
};
const decodeSavedSearches = (value: string): SavedSearch[] => {
  const parsed = JSON.parse(value) as { schemaVersion?: number; searches?: SavedSearch[] };
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.searches)) throw new Error('INVALID_SAVED_SEARCHES');
  return parsed.searches.map(search => ({ ...search, groupName: search.groupName ?? '' }));
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
  const [groupName, setGroupName] = useState('');
  const [groupOptions, setGroupOptions] = useState<string[]>([]);
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);
  const [categoryEditor, setCategoryEditor] = useState<NotificationItem | null>(null);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [editingSavedSearch, setEditingSavedSearch] = useState(false);
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
        query, packageName, category, groupName, from: rangeStart, includeArchived, limit: PAGE_SIZE,
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
  }, [category, groupName, includeArchived, packageName, query, rangeStart]);

  useEffect(() => {
    const timer = setTimeout(() => { ignorePromise(loadFirstPage()); }, query || packageName ? 250 : 0);
    return () => clearTimeout(timer);
  }, [loadFirstPage, packageName, query, refreshKey]);

  useEffect(() => {
    if (!searchMode) return;
    getSavedSearches().then(value => setSavedSearches(decodeSavedSearches(value))).catch(() => setActionError(true));
  }, [searchMode]);

  useEffect(() => {
    getRuleGroups().then(groups => setGroupOptions([...groups])).catch(() => setActionError(true));
  }, [refreshKey]);

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
        query, packageName, category, groupName, from: rangeStart, beforeReceivedAt: last.receivedAt,
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

  const saveCurrentSearch = async () => {
    try {
      const result = await addSavedSearch(saveSearchName, {
        query, packageName, category, groupName, dateRange: range, includeArchived,
      });
      setSavedSearches(decodeSavedSearches(result));
      setSaveSearchName('');
      setEditingSavedSearch(false);
      setActionError(false);
    } catch {
      setActionError(true);
    }
  };

  const removeSavedSearch = async (id: string) => {
    try {
      setSavedSearches(decodeSavedSearches(await deleteSavedSearch(id)));
      setActionError(false);
    } catch {
      setActionError(true);
    }
  };

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
      {groupOptions.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRail} accessibilityLabel="Filter by rule group">
          <Pressable accessibilityRole="button" accessibilityState={{ selected: groupName === '' }} onPress={() => setGroupName('')} style={[styles.chip, { backgroundColor: groupName === '' ? theme.colors.brandSoft : theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={{ color: theme.colors.textPrimary }}>All groups</Text>
          </Pressable>
          {groupOptions.map(value => (
            <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: groupName === value }} onPress={() => setGroupName(value)} style={[styles.chip, { backgroundColor: groupName === value ? theme.colors.brandSoft : theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={{ color: theme.colors.textPrimary }}>{value}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {searchMode ? (
        <View style={[styles.savedSearches, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>Saved searches</Text>
          {savedSearches.map(saved => (
            <View key={saved.id} style={styles.savedSearchRow}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Apply saved search ${saved.name}`} onPress={() => {
                setQuery(saved.query); setPackageName(saved.packageName); setCategory(saved.category);
                setGroupName(saved.groupName); setRange(saved.dateRange); setIncludeArchived(saved.includeArchived);
              }} style={styles.savedSearchApply}>
                <Text style={[styles.savedSearchTitle, { color: theme.colors.textPrimary }]}>{saved.name}</Text>
                <Text style={[styles.hint, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {[saved.query || null, saved.packageName || null, saved.category ? categoryLabel(saved.category) : null, saved.groupName || null, saved.dateRange === 'all' ? null : saved.dateRange === 'today' ? 'Today' : '7 days', saved.includeArchived ? 'Archived' : null].filter(Boolean).join(' · ') || 'All retained notifications'}
                </Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Delete saved search ${saved.name}`} onPress={() => ignorePromise(removeSavedSearch(saved.id))} style={styles.savedSearchDelete}>
                <Text style={{ color: theme.colors.danger }}>Delete</Text>
              </Pressable>
            </View>
          ))}
          {editingSavedSearch ? (
            <View style={styles.row}>
              <TextInput accessibilityLabel="Saved search name" placeholder="Search name" placeholderTextColor={theme.colors.textSecondary} value={saveSearchName} onChangeText={setSaveSearchName} maxLength={40} style={[styles.input, styles.savedSearchName, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]} />
              <Pressable accessibilityRole="button" accessibilityLabel="Save current search" disabled={!saveSearchName.trim()} onPress={() => ignorePromise(saveCurrentSearch())}>
                <Text style={[styles.savedSearchButton, { color: theme.colors.brand }]}>Save</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel saving search" onPress={() => { setEditingSavedSearch(false); setSaveSearchName(''); }}>
                <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Save current search" onPress={() => setEditingSavedSearch(true)}>
              <Text style={[styles.savedSearchButton, { color: theme.colors.brand }]}>Save current search</Text>
            </Pressable>
          )}
        </View>
      ) : null}
      {!searchMode ? <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Manage retention and app exclusions in Privacy.</Text> : null}
      {actionError ? <Text style={{ color: theme.colors.danger }}>That change could not be saved. Try again.</Text> : null}
      {!loading && items.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: clearing }} disabled={clearing} onPress={confirmClear} style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' }}>
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
      ) : items.map(item => {
        const visual = categoryVisual(theme, item.category);
        const chip = [styles.actionChip, { backgroundColor: theme.colors.surfaceMuted }];
        return (
        <View key={item.id} style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: item.priority === 'urgent' ? theme.colors.danger : theme.colors.border, shadowColor: theme.colors.shadow }]}>
          <View style={styles.itemHeader}>
            <CategoryAvatar theme={theme} category={item.category} size={42} />
            <View style={styles.flex}>
              <Text numberOfLines={1} style={[styles.app, { color: theme.colors.textPrimary }]}>{appDisplayName(item.packageName)}</Text>
              <Text numberOfLines={1} style={[styles.time, { color: theme.colors.textSecondary }]}>{relativeTime(item.receivedAt)} · {new Date(item.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            {item.saved ? <Text accessibilityLabel="Saved" style={styles.savedStar}>★</Text> : null}
          </View>
          {item.title ? <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>{item.title}</Text> : null}
          {item.body ? <Text numberOfLines={4} style={[styles.body, { color: theme.colors.textSecondary }]}>{item.body}</Text> : null}
          {item.subtext ? <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{item.subtext}</Text> : null}
          <View style={styles.chips}>
            <Pill label={`${categoryLabel(item.category)}${item.categoryOverride ? ' · yours' : ''}`} color={visual.fg} background={visual.bg} />
            {item.priority !== 'normal' ? <Pill label={`${item.priority} priority`} color={readableTextOn(priorityColor(theme, item.priority))} background={priorityColor(theme, item.priority)} /> : null}
            {item.important ? <Pill label="Important" color={theme.colors.brand} background={theme.colors.brandSoft} /> : null}
            {item.duplicateCount > 1 ? <Pill label={`×${item.duplicateCount} repeats`} color={theme.colors.textSecondary} background={theme.colors.surfaceMuted} /> : null}
            {item.ruleGroups.map(group => <Pill key={group} label={`# ${group}`} color={theme.colors.info} background={theme.colors.surfaceMuted} />)}
          </View>
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{item.removedAt ? 'Dismissed in Android' : 'Active in Android'} · Captured from notification text · {item.priority} priority{item.confidence > 0 ? ' · matched rule' : ''}</Text>
          {item.includeInDigest !== null ? <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{item.includeInDigest ? 'Included in digest by a rule' : 'Excluded from digest by a rule'}</Text> : null}
          {item.duplicateCount > 1 ? <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Repeated {item.duplicateCount} times in this app within 30 minutes. All source notifications are kept.</Text> : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel={item.saved ? 'Unsave notification' : 'Save notification'} style={chip} onPress={() => ignorePromise(reloadAfterAction(
              () => setNotificationSaved(item.id, !item.saved),
              { label: item.saved ? 'Notification unsaved.' : 'Notification saved.', action: () => setNotificationSaved(item.id, item.saved) },
            ))}>
              <Text style={[styles.actionText, { color: theme.colors.brand }]}>{item.saved ? '★ Saved' : '☆ Save'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={item.archivedAt == null ? 'Archive notification' : 'Restore notification'} style={chip} onPress={() => ignorePromise(reloadAfterAction(
              () => setNotificationArchived(item.id, item.archivedAt == null),
              { label: item.archivedAt == null ? 'Notification archived.' : 'Notification restored.', action: () => setNotificationArchived(item.id, item.archivedAt != null) },
            ))}>
              <Text style={[styles.actionText, { color: theme.colors.textPrimary }]}>{item.archivedAt == null ? 'Archive' : 'Restore'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="View notification details" style={chip} onPress={() => setSelectedItem(item)}>
              <Text style={[styles.actionText, { color: theme.colors.textPrimary }]}>Details</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Delete notification" style={chip} onPress={() => confirmDelete(item)}>
              <Text style={[styles.actionText, { color: theme.colors.danger }]}>Delete</Text>
            </Pressable>
          </View>
        </View>
        );
      })}
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
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 8, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  savedStar: { fontSize: 20, color: '#F5A623' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  actionChip: { minHeight: 48, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 14, fontWeight: '700' },
  app: { fontSize: 15, fontWeight: '800' },
  flex: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 12, marginTop: 1 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  chipRail: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, minHeight: 48, justifyContent: 'center' },
  retention: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  undoNotice: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  undoAction: { fontWeight: '700' },
  coverage: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  coverageTitle: { fontSize: 14, fontWeight: '700' },
  savedSearches: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  savedSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  savedSearchApply: { flex: 1, gap: 2, minHeight: 48, justifyContent: 'center' },
  savedSearchDelete: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 6 },
  savedSearchName: { flex: 1, minWidth: 120 },
  savedSearchTitle: { fontWeight: '600' },
  savedSearchButton: { fontWeight: '700' },
  sectionLabel: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 17 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.55)', justifyContent: 'center', padding: 20 },
  detailCard: { maxHeight: '85%', borderWidth: 1, borderRadius: 20, padding: 20, gap: 14 },
  detailTitle: { fontSize: 22, fontWeight: '700' },
  detailContent: { gap: 8 },
  closeButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  closeText: { fontWeight: '700' },
});
