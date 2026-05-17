import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import { haptics } from '../../utils/haptics';

const CLUBS = [
  { id: 'Driver', label: 'Driver', short: 'DRV' },
  { id: '3 Wood', label: '3 Wood', short: '3W' },
  { id: '5 Wood', label: '5 Wood', short: '5W' },
  { id: 'Hybrid', label: 'Hybrid', short: 'HYB' },
  { id: '4 Iron', label: '4 Iron', short: '4i' },
  { id: '5 Iron', label: '5 Iron', short: '5i' },
  { id: '6 Iron', label: '6 Iron', short: '6i' },
  { id: '7 Iron', label: '7 Iron', short: '7i' },
  { id: '8 Iron', label: '8 Iron', short: '8i' },
  { id: '9 Iron', label: '9 Iron', short: '9i' },
  { id: 'PW', label: 'Pitching Wedge', short: 'PW' },
  { id: 'GW', label: 'Gap Wedge', short: 'GW' },
  { id: 'SW', label: 'Sand Wedge', short: 'SW' },
  { id: 'LW', label: 'Lob Wedge', short: 'LW' },
  { id: 'Putter', label: 'Putter', short: 'PUT' },
];

interface Props {
  selected: string[];
  onSelect: (values: string[]) => void;
}

export default function ClubSelector({ selected, onSelect }: Props) {
  function toggle(id: string) {
    haptics.light();
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    onSelect(next);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Tap all clubs that give you trouble</Text>
      <View style={styles.grid}>
        {CLUBS.map((club) => {
          const active = selected.includes(club.id);
          return (
            <TouchableOpacity
              key={club.id}
              style={[styles.clubChip, active && styles.clubChipActive]}
              onPress={() => toggle(club.id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.clubShort, active && styles.clubShortActive]}>{club.short}</Text>
              <Text style={[styles.clubLabel, active && styles.clubLabelActive]} numberOfLines={1}>{club.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.hint}>Multi-select — tap all that apply</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  header: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  clubChip: {
    width: 56,
    height: 56,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  clubChipActive: { backgroundColor: Colors.error + '20', borderColor: Colors.error },
  clubShort: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.textSecondary },
  clubShortActive: { color: Colors.error },
  clubLabel: { fontSize: 9, color: Colors.textLight, textAlign: 'center' },
  clubLabelActive: { color: Colors.error },
  hint: { fontSize: FontSize.xs, color: Colors.textLight, textAlign: 'center' },
});
