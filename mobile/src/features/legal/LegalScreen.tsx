import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppTheme } from '../../theme/tokens';
import { LEGAL_UPDATED, LEGAL_VERSION, legalDocuments, type LegalDocument } from './legalContent';

type Props = { theme: AppTheme; visible: boolean; initial?: LegalDocument['key']; onClose: () => void };

export function LegalScreen({ theme, visible, initial = 'privacy', onClose }: Props) {
  const [active, setActive] = useState<LegalDocument['key']>(initial);
  const colors = theme.colors;
  const doc = legalDocuments.find(item => item.key === active) ?? legalDocuments[0];
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => setActive(initial)}>
      <SafeAreaView edges={['top', 'bottom']} style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>Privacy & terms</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
            <Text style={[styles.closeText, { color: colors.brand }]}>Done</Text>
          </Pressable>
        </View>
        <View accessibilityRole="tablist" style={[styles.tabs, { backgroundColor: colors.surfaceMuted }]}>
          {legalDocuments.map(item => {
            const selected = item.key === active;
            return (
              <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setActive(item.key)}
                style={[styles.tab, selected && { backgroundColor: colors.brand }]}>
                <Text style={[styles.tabText, { color: selected ? colors.onBrand : colors.textSecondary }]}>{item.title}</Text>
              </Pressable>
            );
          })}
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>Version {LEGAL_VERSION} · Last updated {LEGAL_UPDATED}</Text>
          <View style={[styles.summary, { backgroundColor: colors.brandSoft }]}>
            <Text style={[styles.summaryText, { color: colors.textPrimary }]}>{doc.summary}</Text>
          </View>
          {doc.sections.map(section => (
            <View key={section.heading} style={styles.section}>
              <Text accessibilityRole="header" style={[styles.heading, { color: colors.textPrimary }]}>{section.heading}</Text>
              {section.bullets?.map(bullet => (
                <View key={bullet} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { color: colors.brand }]}>•</Text>
                  <Text style={[styles.body, styles.flex, { color: colors.textPrimary }]}>{bullet}</Text>
                </View>
              ))}
              {section.body ? <Text style={[styles.body, { color: colors.textSecondary }]}>{section.body}</Text> : null}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  title: { fontSize: 24, fontWeight: '800' },
  close: { minHeight: 48, minWidth: 64, alignItems: 'flex-end', justifyContent: 'center' },
  closeText: { fontSize: 16, fontWeight: '800' },
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginTop: 8, borderRadius: 14, padding: 4 },
  tab: { flex: 1, minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabText: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  meta: { fontSize: 12 },
  summary: { borderRadius: 16, padding: 16 },
  summaryText: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  section: { gap: 8 },
  heading: { fontSize: 17, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 21 },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bulletDot: { fontSize: 16, lineHeight: 21, fontWeight: '900' },
});
