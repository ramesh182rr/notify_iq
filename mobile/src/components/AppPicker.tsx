import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, SectionList, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon, useAppDirectory } from '../app/AppDirectory';
import type { AppDirectoryEntry } from '../native/NativeNotifyIQ';
import { getInstalledApps } from '../native/notifyIQ';
import type { AppTheme } from '../theme/tokens';

type Common = { theme: AppTheme; visible: boolean; title: string; onClose: () => void };
type SingleProps = Common & { mode?: 'single'; allowAll?: boolean; onPick: (packageName: string | null) => void };
type ToggleProps = Common & { mode: 'toggle'; excluded: ReadonlyArray<string>; onToggle: (packageName: string, exclude: boolean) => void };

/**
 * Choose apps by name and icon. Lists apps with a launcher icon (manifest <queries>, no QUERY_ALL_PACKAGES)
 * plus any app that has posted a captured notification. Package names are never shown.
 */
export function AppPicker(props: SingleProps | ToggleProps) {
  const { theme, visible, title, onClose } = props;
  const { entries: seen } = useAppDirectory();
  const [installed, setInstalled] = useState<ReadonlyArray<AppDirectoryEntry> | null>(null);
  const [query, setQuery] = useState('');
  const colors = theme.colors;

  useEffect(() => {
    if (!visible || installed) return;
    getInstalledApps().then(setInstalled).catch(() => setInstalled([]));
  }, [visible, installed]);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (e: AppDirectoryEntry) => !q || e.label.toLowerCase().includes(q);
    const seenSet = new Set(seen.map(e => e.packageName));
    const withNotifications = seen.filter(match);
    const others = (installed ?? []).filter(e => !seenSet.has(e.packageName) && match(e));
    return [
      ...(withNotifications.length ? [{ title: 'Apps with notifications', data: withNotifications }] : []),
      ...(others.length ? [{ title: withNotifications.length ? 'Other apps' : 'Your apps', data: others }] : []),
    ];
  }, [seen, installed, query]);

  const close = () => { setQuery(''); onClose(); };
  const excludedSet = props.mode === 'toggle' ? new Set(props.excluded) : null;
  const seenSet = new Set(seen.map(e => e.packageName));

  const toggle = (entry: AppDirectoryEntry, keep: boolean) => {
    if (props.mode !== 'toggle') return;
    if (!keep && seenSet.has(entry.packageName)) {
      Alert.alert(`Stop keeping ${entry.label}?`, `NotifyIQ will stop saving ${entry.label} notifications and delete the ones it already kept.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop keeping', style: 'destructive', onPress: () => props.onToggle(entry.packageName, true) },
      ]);
      return;
    }
    props.onToggle(entry.packageName, !keep);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <SafeAreaView edges={['top', 'bottom']} style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Pressable accessibilityRole="button" onPress={close} style={styles.close}>
            <Text style={[styles.closeText, { color: colors.brand }]}>{props.mode === 'toggle' ? 'Done' : 'Cancel'}</Text>
          </Pressable>
        </View>
        {props.mode === 'toggle' ? (
          <Text style={[styles.intro, { color: colors.textSecondary }]}>Switch an app off and NotifyIQ will not read or keep its notifications.</Text>
        ) : null}
        <TextInput accessibilityLabel="Search apps" placeholder="Search apps" placeholderTextColor={colors.textSecondary} value={query} onChangeText={setQuery}
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]} />
        {installed === null && !seen.length ? <ActivityIndicator style={styles.loading} color={colors.brand} /> : (
          <SectionList
            sections={sections}
            keyExtractor={item => item.packageName}
            contentContainerStyle={styles.list}
            stickySectionHeadersEnabled={false}
            ListHeaderComponent={props.mode !== 'toggle' && props.allowAll ? (
              <Pressable accessibilityRole="button" onPress={() => { setQuery(''); props.onPick(null); }} style={[styles.row, { borderColor: colors.border }]}>
                <View style={[styles.allIcon, { backgroundColor: colors.brandSoft }]}><Text style={[styles.allText, { color: colors.brand }]}>All</Text></View>
                <Text style={[styles.label, { color: colors.textPrimary }]}>All apps</Text>
              </Pressable>
            ) : undefined}
            renderSectionHeader={({ section }) => <Text style={[styles.section, { color: colors.textSecondary }]}>{section.title.toUpperCase()}</Text>}
            ListEmptyComponent={installed === null ? <ActivityIndicator style={styles.loading} color={colors.brand} /> : <Text style={[styles.intro, { color: colors.textSecondary }]}>No apps match your search.</Text>}
            renderItem={({ item }) => {
              if (props.mode === 'toggle') {
                const keep = !excludedSet?.has(item.packageName);
                return (
                  <View style={[styles.row, { borderColor: colors.border }]}>
                    <AppIcon theme={theme} packageName={item.packageName} size={40} uri={item.iconUri} label={item.label} />
                    <View style={styles.flex}>
                      <Text style={[styles.label, { color: colors.textPrimary }]}>{item.label}</Text>
                      <Text style={[styles.state, { color: keep ? colors.textSecondary : colors.danger }]}>{keep ? 'Kept' : 'Not kept'}</Text>
                    </View>
                    <Switch accessibilityLabel={`Keep notifications from ${item.label}`} value={keep} onValueChange={value => toggle(item, value)} />
                  </View>
                );
              }
              return (
                <Pressable accessibilityRole="button" accessibilityLabel={item.label} onPress={() => { setQuery(''); props.onPick(item.packageName); }} style={[styles.row, { borderColor: colors.border }]}>
                  <AppIcon theme={theme} packageName={item.packageName} size={40} uri={item.iconUri} label={item.label} />
                  <Text style={[styles.label, styles.flex, { color: colors.textPrimary }]}>{item.label}</Text>
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: 22, fontWeight: '800', flexShrink: 1 },
  close: { minHeight: 48, minWidth: 64, alignItems: 'flex-end', justifyContent: 'center' },
  closeText: { fontSize: 16, fontWeight: '800' },
  intro: { fontSize: 13, lineHeight: 19, paddingHorizontal: 20 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, marginHorizontal: 20, marginVertical: 10 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginTop: 16, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, borderBottomWidth: StyleSheet.hairlineWidth },
  allIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  allText: { fontWeight: '900' },
  label: { fontSize: 15, fontWeight: '700' },
  state: { fontSize: 12, marginTop: 1 },
  loading: { marginTop: 40 },
});
