import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import { haptics } from '../../utils/haptics';


// Simplified 5-zone directional selector — better UX than full grid
const DIRECTIONS = [
  { id: 'hard_left', label: 'Hard Left', sub: 'Big miss left' },
  { id: 'left', label: 'Left', sub: 'Slight miss left' },
  { id: 'straight', label: 'Straight', sub: 'On target' },
  { id: 'right', label: 'Right', sub: 'Slight miss right' },
  { id: 'hard_right', label: 'Hard Right', sub: 'Big miss right' },
  { id: 'fat_short', label: 'Fat / Short', sub: 'Heavy or chunk' },
  { id: 'thin_long', label: 'Thin / Long', sub: 'Topped or over' },
  { id: 'no_pattern', label: 'No Pattern', sub: 'Varies a lot' },
];

interface Props {
  selected: string[];
  multiSelect?: boolean;
  onSelect: (values: string[]) => void;
}

export default function BallFlightGrid({ selected, multiSelect = false, onSelect }: Props) {
  function toggle(id: string) {
    haptics.light();
    if (multiSelect) {
      const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
      onSelect(next);
    } else {
      onSelect(selected[0] === id ? [] : [id]);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Where does your ball typically end up?</Text>
      {/* Direction row */}
      <View style={styles.row}>
        {DIRECTIONS.slice(0, 5).map((d) => {
          const active = selected.includes(d.id);
          return (
            <TouchableOpacity
              key={d.id}
              style={[styles.zone, active && styles.zoneActive]}
              onPress={() => toggle(d.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.zoneLabel, active && styles.zoneLabelActive]}>{d.label}</Text>
              <Text style={styles.zoneSub}>{d.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Contact quality row */}
      <View style={styles.row}>
        {DIRECTIONS.slice(5).map((d) => {
          const active = selected.includes(d.id);
          return (
            <TouchableOpacity
              key={d.id}
              style={[styles.zone, styles.zoneWide, active && styles.zoneActive]}
              onPress={() => toggle(d.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.zoneLabel, active && styles.zoneLabelActive]}>{d.label}</Text>
              <Text style={styles.zoneSub}>{d.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  header: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600', textAlign: 'center' },
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  zone: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  zoneWide: { flex: 1 },
  zoneActive: { backgroundColor: Colors.primaryPale, borderColor: Colors.primary },
  zoneLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center' },
  zoneLabelActive: { color: Colors.primary },
  zoneSub: { fontSize: 9, color: Colors.textLight, textAlign: 'center', marginTop: 2 },
});
