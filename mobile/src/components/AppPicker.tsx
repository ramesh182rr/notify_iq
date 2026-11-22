import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon, useAppDirectory } from '../app/AppDirectory';
import type { AppTheme } from '../theme/tokens';

const PACKAGE_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$/;

/**
 * Pick an app that has posted notifications NotifyIQ kept. Android does not let NotifyIQ list every
 * installed app (that needs a restricted permission), so unseen apps can be entered by package name.
 */
export function AppPicker({ theme, visible, title, allowAll, onPick, onClose }: {
  theme: AppTheme; visible: boolean; title: string; allowAll?: boolean;
  onPick: (packageName: string | null) => void; onClose: () => void;
}) {
  const { entries } = useAppDirectory();
  const [query, setQuery] = useState('');
  const [manual, setManual] = useState('');
  const colors = theme.colors;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? entries.filter(e => e.label.toLowerCase().includes(q) || e.packageName.toLowerCase().includes(q)) : entries;
  }, [entries, query]);
  const manualValid = PACKAGE_PATTERN.test(manual.trim());
  const pick = (value: string | null) => { setQuery(''); setManual(''); onPick(value); };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}><Text style={[styles.closeText, { color: colors.brand }]}>Cancel</Text></Pressable>
        </View>
        <TextInput accessibilityLabel="Search apps" placeholder="Search apps" placeholderTextColor={colors.textSecondary} value={query} onChangeText={setQuery}
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]} />
        <FlatList
          data={filtered}
          keyExtractor={item => item.packageName}
          contentContainerStyle={styles.list}
          ListHeaderComponent={allowAll ? (
            <Pressable accessibilityRole="button" onPress={() => pick(null)} style={[styles.row, { borderColor: colors.border }]}>
              <View style={[styles.allIcon, { backgroundColor: colors.brandSoft }]}><Text style={{ color: colors.brand, fontWeight: '900' }}>∗</Text></View>
              <Text style={[styles.label, { color: colors.textPrimary }]}>All apps</Text>
            </Pressable>
          ) : undefined}
          ListEmptyComponent={<Text style={[styles.note, { color: colors.textSecondary }]}>{entries.length ? 'No apps match your search.' : 'Apps appear here after they post a notification NotifyIQ keeps.'}</Text>}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`${item.label}, ${item.packageName}`} onPress={() => pick(item.packageName)} style={[styles.row, { borderColor: colors.border }]}>
              <AppIcon theme={theme} packageName={item.packageName} size={40} />
              <View style={styles.flex}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>{item.label}</Text>
                <Text numberOfLines={1} style={[styles.note, { color: colors.textSecondary }]}>{item.packageName}</Text>
              </View>
            </Pressable>
          )}
          ListFooterComponent={
            <View style={[styles.manual, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>App not listed?</Text>
              <Text style={[styles.note, { color: colors.textSecondary }]}>Enter its package name, shown in Android Settings → Apps → the app → App details.</Text>
              <TextInput accessibilityLabel="Package name" autoCapitalize="none" autoCorrect={false} placeholder="com.example.app" placeholderTextColor={colors.textSecondary}
                value={manual} onChangeText={setManual} style={[styles.input, styles.inputInline, { color: colors.textPrimary, borderColor: colors.border }]} />
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: !manualValid }} disabled={!manualValid} onPress={() => pick(manual.trim())}
                style={[styles.useButton, { backgroundColor: manualValid ? colors.brand : colors.surfaceMuted }]}>
                <Text style={{ color: manualValid ? colors.onBrand : colors.textSecondary, fontWeight: '800' }}>Use this package</Text>
              </Pressable>
            </View>
          }
        />
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
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, marginHorizontal: 20, marginVertical: 8 },
  inputInline: { marginHorizontal: 0 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, borderBottomWidth: StyleSheet.hairlineWidth },
  allIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '700' },
  note: { fontSize: 12, lineHeight: 18 },
  manual: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6, marginTop: 16 },
  useButton: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
