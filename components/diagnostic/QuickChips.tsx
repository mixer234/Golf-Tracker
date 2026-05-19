import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import { haptics } from '../../utils/haptics';

interface Props {
  options: string[];
  selected: string[];
  multiSelect?: boolean;
  onSelect: (value: string[]) => void;
  wrap?: boolean;
}

export default function QuickChips({ options, selected, multiSelect = false, onSelect, wrap = true }: Props) {
  function toggle(opt: string) {
    haptics.light();
    if (multiSelect) {
      const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
      onSelect(next);
    } else {
      onSelect(selected[0] === opt ? [] : [opt]);
    }
  }

  const content = options.map((opt) => {
    const active = selected.includes(opt);
    return (
      <TouchableOpacity
        key={opt}
        style={[styles.chip, active && styles.chipActive]}
        onPress={() => toggle(opt)}
        activeOpacity={0.75}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
      </TouchableOpacity>
    );
  });

  if (wrap) {
    return <View style={styles.wrap}>{content}</View>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.darkGreen, borderColor: Colors.darkGreen },
  chipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#ffffff' },
});
