import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ListenerStatus } from '../../native/NativeNotifyIQ';
import type { AppTheme } from '../../theme/tokens';
import { MoneyPanel } from '../money/MoneyPanel';
import { UpcomingPanel } from '../money/UpcomingPanel';
import { InsightsScreen } from './InsightsScreen';

export type InsightsSection = 'today' | 'money' | 'upcoming';

type Props = {
  theme: AppTheme;
  refreshKey: number;
  section: InsightsSection;
  onSectionChange: (section: InsightsSection) => void;
  status: ListenerStatus | null;
  statusLoading: boolean;
  statusError: string | null;
};

const sections: { key: InsightsSection; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'money', label: 'Money' },
  { key: 'upcoming', label: 'Coming up' },
];

export function InsightsHub({ theme, refreshKey, section, onSectionChange, status, statusLoading, statusError }: Props) {
  const colors = theme.colors;
  return (
    <View style={styles.content}>
      <View accessibilityRole="tablist" style={[styles.segment, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {sections.map(option => {
          const selected = option.key === section;
          return (
            <Pressable key={option.key} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => onSectionChange(option.key)}
              style={[styles.option, selected && { backgroundColor: colors.brand }]}>
              <Text style={[styles.optionText, { color: selected ? colors.onBrand : colors.textSecondary }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {section === 'money' ? <MoneyPanel theme={theme} refreshKey={refreshKey} />
        : section === 'upcoming' ? <UpcomingPanel theme={theme} refreshKey={refreshKey} />
        : <InsightsScreen theme={theme} refreshKey={refreshKey} status={status} statusLoading={statusLoading} statusError={statusError} />}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  segment: { flexDirection: 'row', borderRadius: 16, padding: 4, borderWidth: 1 },
  option: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionText: { fontSize: 14, fontWeight: '800' },
});
