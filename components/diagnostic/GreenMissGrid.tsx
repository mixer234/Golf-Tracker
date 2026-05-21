import { ReactElement } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import { haptics } from '../../utils/haptics';

const ZONES = [
  { id: 'long_left', label: 'Long\nLeft', row: 0, col: 0 },
  { id: 'long', label: 'Long', row: 0, col: 1 },
  { id: 'long_right', label: 'Long\nRight', row: 0, col: 2 },
  { id: 'left', label: 'Left', row: 1, col: 0 },
  { id: 'gir', label: '🟢\nGIR', row: 1, col: 1, isCenter: true },
  { id: 'right', label: 'Right', row: 1, col: 2 },
  { id: 'short_left', label: 'Short\nLeft', row: 2, col: 0 },
  { id: 'short', label: 'Short', row: 2, col: 1 },
  { id: 'short_right', label: 'Short\nRight', row: 2, col: 2 },
];

interface Props {
  selected: string[];
  onSelect: (values: string[]) => void;
}

export default function GreenMissGrid({ selected, onSelect }: Props) {
  function toggle(id: string) {
    haptics.light();
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    onSelect(next);
  }

  const grid: ReactElement[][] = [[], [], []];

  ZONES.forEach((zone) => {
    const active = selected.includes(zone.id);
    grid[zone.row].push(
      <TouchableOpacity
        key={zone.id}
        style={[
          styles.cell,
          zone.isCenter && styles.cellCenter,
          active && styles.cellActive,
          zone.isCenter && active && styles.cellCenterActive,
        ]}
        onPress={() => toggle(zone.id)}
        activeOpacity={0.75}
      >
        <Text style={[styles.label, active && styles.labelActive, zone.isCenter && styles.labelCenter]}>
          {zone.label}
        </Text>
      </TouchableOpacity>
    );
  });

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Tap all zones where your shots miss</Text>
      {grid.map((row, i) => (
        <View key={i} style={styles.row}>{row}</View>
      ))}
      <Text style={styles.hint}>Multi-select — tap all that apply</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  header: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600', textAlign: 'center', marginBottom: Spacing.xs },
  row: { flexDirection: 'row', gap: 6 },
  cell: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  cellCenter: {
    backgroundColor: Colors.paleGreen,
    borderColor: Colors.darkGreen + '40',
  },
  cellActive: { backgroundColor: Colors.error + '25', borderColor: Colors.error },
  cellCenterActive: { backgroundColor: Colors.paleGreen, borderColor: Colors.darkGreen },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center' },
  labelActive: { color: Colors.error },
  labelCenter: { color: Colors.darkGreen },
  hint: { fontSize: FontSize.xs, color: Colors.textLight, textAlign: 'center', marginTop: Spacing.xs },
});
