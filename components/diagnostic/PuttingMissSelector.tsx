import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import { haptics } from '../../utils/haptics';

// Clock positions around the hole
const POSITIONS = [
  { id: '12_long', label: 'Long\n12 o\'clock', style: { top: 0, left: '33%' as const } },
  { id: '3_right', label: 'Right\n3 o\'clock', style: { top: '40%' as const, right: 0 } },
  { id: '6_short', label: 'Short\n6 o\'clock', style: { bottom: 0, left: '33%' as const } },
  { id: '9_left', label: 'Left\n9 o\'clock', style: { top: '40%' as const, left: 0 } },
  { id: 'various', label: 'Varies\na lot', style: { top: '38%' as const, left: '35%' as const } },
];

// Simpler chip-based approach for iPhone SE compatibility
const MISS_OPTIONS = [
  { id: 'long', label: 'Long', sub: 'Past the hole' },
  { id: 'short', label: 'Short', sub: 'Never gets there' },
  { id: 'left', label: 'Left', sub: 'Pull / hook' },
  { id: 'right', label: 'Right', sub: 'Push / fade' },
  { id: 'various', label: 'Varies', sub: 'No pattern' },
];

interface Props {
  selected: string[];
  onSelect: (values: string[]) => void;
}

export default function PuttingMissSelector({ selected, onSelect }: Props) {
  function toggle(id: string) {
    haptics.light();
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    onSelect(next);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Where do putts typically miss?</Text>

      {/* Clock visual suggestion */}
      <View style={styles.clockWrap}>
        <View style={styles.clockRing}>
          {/* Top */}
          <TouchableOpacity
            style={[styles.clockZone, styles.clockTop, selected.includes('long') && styles.clockZoneActive]}
            onPress={() => toggle('long')}
            activeOpacity={0.75}
          >
            <Text style={[styles.clockLabel, selected.includes('long') && styles.clockLabelActive]}>Long</Text>
          </TouchableOpacity>
          {/* Right */}
          <TouchableOpacity
            style={[styles.clockZone, styles.clockRight, selected.includes('right') && styles.clockZoneActive]}
            onPress={() => toggle('right')}
            activeOpacity={0.75}
          >
            <Text style={[styles.clockLabel, selected.includes('right') && styles.clockLabelActive]}>Right</Text>
          </TouchableOpacity>
          {/* Bottom */}
          <TouchableOpacity
            style={[styles.clockZone, styles.clockBottom, selected.includes('short') && styles.clockZoneActive]}
            onPress={() => toggle('short')}
            activeOpacity={0.75}
          >
            <Text style={[styles.clockLabel, selected.includes('short') && styles.clockLabelActive]}>Short</Text>
          </TouchableOpacity>
          {/* Left */}
          <TouchableOpacity
            style={[styles.clockZone, styles.clockLeft, selected.includes('left') && styles.clockZoneActive]}
            onPress={() => toggle('left')}
            activeOpacity={0.75}
          >
            <Text style={[styles.clockLabel, selected.includes('left') && styles.clockLabelActive]}>Left</Text>
          </TouchableOpacity>
          {/* Centre hole */}
          <View style={styles.hole}>
            <Text style={styles.holeText}>⛳</Text>
          </View>
        </View>
      </View>

      {/* Varies chip */}
      <TouchableOpacity
        style={[styles.variesChip, selected.includes('various') && styles.variesChipActive]}
        onPress={() => toggle('various')}
        activeOpacity={0.75}
      >
        <Text style={[styles.variesText, selected.includes('various') && styles.variesTextActive]}>
          Varies a lot — no pattern
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const CLOCK_SIZE = 140;
const ZONE_SIZE = 44;

const styles = StyleSheet.create({
  container: { gap: Spacing.md, alignItems: 'center' },
  header: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600' },
  clockWrap: { alignItems: 'center', justifyContent: 'center', width: CLOCK_SIZE + ZONE_SIZE * 2, height: CLOCK_SIZE + ZONE_SIZE * 2 },
  clockRing: { width: CLOCK_SIZE, height: CLOCK_SIZE, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  clockZone: {
    position: 'absolute',
    width: ZONE_SIZE,
    height: ZONE_SIZE,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockTop: { top: -ZONE_SIZE - 6, alignSelf: 'center', left: (CLOCK_SIZE - ZONE_SIZE) / 2 },
  clockRight: { right: -ZONE_SIZE - 6, top: (CLOCK_SIZE - ZONE_SIZE) / 2 },
  clockBottom: { bottom: -ZONE_SIZE - 6, alignSelf: 'center', left: (CLOCK_SIZE - ZONE_SIZE) / 2 },
  clockLeft: { left: -ZONE_SIZE - 6, top: (CLOCK_SIZE - ZONE_SIZE) / 2 },
  clockZoneActive: { backgroundColor: Colors.error + '25', borderColor: Colors.error },
  clockLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center' },
  clockLabelActive: { color: Colors.error },
  hole: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  holeText: { fontSize: 28 },
  variesChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  variesChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  variesText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  variesTextActive: { color: '#ffffff' },
});
