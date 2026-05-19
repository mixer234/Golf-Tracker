import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../constants/theme';
import { useCourseStore } from '../store/useCourseStore';
import { CourseHole, TeeColor } from '../types';

const TEE_COLORS: { key: TeeColor; label: string; color: string }[] = [
  { key: 'black', label: 'Black', color: '#1a1a1a' },
  { key: 'blue',  label: 'Blue',  color: '#3b82f6' },
  { key: 'white', label: 'White', color: '#d0d0d0' },
  { key: 'red',   label: 'Red',   color: '#ef4444' },
  { key: 'gold',  label: 'Gold',  color: '#d4af37' },
];

const PAR_COLORS: Record<number, string> = {
  3: Colors.info,
  4: Colors.primary,
  5: Colors.accent,
};

export default function CourseEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCourse, updateHole, updateCourse } = useCourseStore();

  const courseOrUndef = getCourse(id);
  const [selectedTee, setSelectedTee] = useState<TeeColor>(courseOrUndef?.defaultTee ?? 'white');

  if (!courseOrUndef) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Course not found.</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const course = courseOrUndef;
  const totalPar = course.holes.reduce((s, h) => s + h.par, 0);
  const front9Par = course.holes.slice(0, 9).reduce((s, h) => s + h.par, 0);
  const back9Par = course.holes.slice(9).reduce((s, h) => s + h.par, 0);
  const totalYards = course.holes.reduce((s, h) => s + (h.yardages[selectedTee] ?? 0), 0);
  const filledHoles = course.holes.filter((h) => h.yardages[selectedTee] !== undefined).length;

  function handleYardageChange(holeNumber: number, text: string) {
    const val = parseInt(text, 10);
    const yardages = { ...(course.holes.find((h) => h.holeNumber === holeNumber)?.yardages ?? {}) };
    if (text === '' || isNaN(val)) {
      delete yardages[selectedTee];
    } else {
      yardages[selectedTee] = val;
    }
    updateHole(course.id, holeNumber, { yardages });
  }

  function handleParChange(holeNumber: number, par: 3 | 4 | 5) {
    updateHole(course.id, holeNumber, { par });
  }

  function handleStrokeIndexChange(holeNumber: number, text: string) {
    const val = parseInt(text, 10);
    if (!isNaN(val) && val >= 1 && val <= 18) {
      updateHole(course.id, holeNumber, { strokeIndex: val });
    }
  }

  function handleSetDefaultTee(tee: TeeColor) {
    setSelectedTee(tee);
    updateCourse(course.id, { defaultTee: tee });
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.back}>← Courses</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title} numberOfLines={1}>{course.name}</Text>
          {course.city && <Text style={styles.subtitle}>{course.city}</Text>}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.parLabel}>Par {totalPar}</Text>
        </View>
      </View>

      {/* Tee selector */}
      <View style={styles.teeBar}>
        <Text style={styles.teeBarLabel}>Tee:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teeScroll}>
          {TEE_COLORS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.teeChip,
                selectedTee === t.key && { borderColor: t.color, backgroundColor: t.color + '25' },
              ]}
              onPress={() => handleSetDefaultTee(t.key)}
              activeOpacity={0.75}
            >
              <View style={[styles.teeDot, { backgroundColor: t.color }]} />
              <Text style={[styles.teeChipText, selectedTee === t.key && { color: Colors.text }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <StatBox label="Front 9" value={`Par ${front9Par}`} />
        <StatBox label="Back 9" value={`Par ${back9Par}`} />
        <StatBox label="Total Yards" value={totalYards > 0 ? totalYards.toLocaleString() : '—'} />
        <StatBox label="Holes Set" value={`${filledHoles}/18`} accent={filledHoles === 18 ? Colors.success : undefined} />
      </View>

      {/* Column headers */}
      <View style={styles.tableHeader}>
        <Text style={[styles.colHead, styles.colHole]}>HOLE</Text>
        <Text style={[styles.colHead, styles.colPar]}>PAR</Text>
        <Text style={[styles.colHead, styles.colYards]}>YARDS</Text>
        <Text style={[styles.colHead, styles.colSI]}>S.I.</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.tableScroll}>
        {/* Front 9 */}
        <View style={styles.nineHeader}>
          <Text style={styles.nineLabel}>FRONT 9</Text>
        </View>
        {course.holes.slice(0, 9).map((hole) => (
          <HoleRow
            key={hole.holeNumber}
            hole={hole}
            selectedTee={selectedTee}
            onParChange={handleParChange}
            onYardageChange={handleYardageChange}
            onStrokeIndexChange={handleStrokeIndexChange}
          />
        ))}
        <View style={styles.nineTotal}>
          <Text style={styles.nineTotalLabel}>OUT</Text>
          <Text style={styles.nineTotalVal}>Par {front9Par}</Text>
          {totalYards > 0 && (
            <Text style={styles.nineTotalYards}>
              {course.holes.slice(0, 9).reduce((s, h) => s + (h.yardages[selectedTee] ?? 0), 0).toLocaleString()} yds
            </Text>
          )}
        </View>

        {/* Back 9 */}
        <View style={[styles.nineHeader, { marginTop: Spacing.md }]}>
          <Text style={styles.nineLabel}>BACK 9</Text>
        </View>
        {course.holes.slice(9).map((hole) => (
          <HoleRow
            key={hole.holeNumber}
            hole={hole}
            selectedTee={selectedTee}
            onParChange={handleParChange}
            onYardageChange={handleYardageChange}
            onStrokeIndexChange={handleStrokeIndexChange}
          />
        ))}
        <View style={styles.nineTotal}>
          <Text style={styles.nineTotalLabel}>IN</Text>
          <Text style={styles.nineTotalVal}>Par {back9Par}</Text>
          {totalYards > 0 && (
            <Text style={styles.nineTotalYards}>
              {course.holes.slice(9).reduce((s, h) => s + (h.yardages[selectedTee] ?? 0), 0).toLocaleString()} yds
            </Text>
          )}
        </View>

        <View style={styles.hint}>
          <Text style={styles.hintText}>
            S.I. = Stroke Index (1–18). Determines handicap stroke allocation — hole 1 is hardest.
          </Text>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function HoleRow({
  hole,
  selectedTee,
  onParChange,
  onYardageChange,
  onStrokeIndexChange,
}: {
  hole: CourseHole;
  selectedTee: TeeColor;
  onParChange: (n: number, par: 3 | 4 | 5) => void;
  onYardageChange: (n: number, text: string) => void;
  onStrokeIndexChange: (n: number, text: string) => void;
}) {
  const yardage = hole.yardages[selectedTee];
  const parColor = PAR_COLORS[hole.par] ?? Colors.primary;

  return (
    <View style={rowStyles.row}>
      {/* Hole number */}
      <View style={rowStyles.colHole}>
        <View style={[rowStyles.holeCircle, { borderColor: parColor + '60' }]}>
          <Text style={[rowStyles.holeNum, { color: parColor }]}>{hole.holeNumber}</Text>
        </View>
      </View>

      {/* Par selector */}
      <View style={rowStyles.colPar}>
        <View style={rowStyles.parRow}>
          {([3, 4, 5] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[rowStyles.parBtn, hole.par === p && { backgroundColor: parColor, borderColor: parColor }]}
              onPress={() => onParChange(hole.holeNumber, p)}
              activeOpacity={0.75}
            >
              <Text style={[rowStyles.parBtnText, hole.par === p && { color: '#ffffff' }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Yardage input */}
      <View style={rowStyles.colYards}>
        <TextInput
          style={[rowStyles.input, yardage !== undefined && rowStyles.inputFilled]}
          value={yardage !== undefined ? String(yardage) : ''}
          onChangeText={(t) => onYardageChange(hole.holeNumber, t)}
          placeholder="—"
          placeholderTextColor={Colors.textLight}
          keyboardType="number-pad"
          maxLength={4}
          selectTextOnFocus
        />
      </View>

      {/* Stroke Index */}
      <View style={rowStyles.colSI}>
        <TextInput
          style={rowStyles.inputSI}
          value={String(hole.strokeIndex)}
          onChangeText={(t) => onStrokeIndexChange(hole.holeNumber, t)}
          keyboardType="number-pad"
          maxLength={2}
          selectTextOnFocus
        />
      </View>
    </View>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, accent && { color: accent }]}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center' },
  label: { fontSize: 9, color: Colors.textLight, fontWeight: '600', letterSpacing: 0.4 },
  value: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.text, marginTop: 2 },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  colHole: { width: 44 },
  colPar: { flex: 1 },
  colYards: { width: 72, alignItems: 'flex-end' },
  colSI: { width: 44, alignItems: 'flex-end' },
  holeCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holeNum: { fontSize: FontSize.sm, fontWeight: '800' },
  parRow: { flexDirection: 'row', gap: 4 },
  parBtn: {
    width: 30,
    height: 28,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  parBtnText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary },
  input: {
    width: 64,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  inputFilled: { borderColor: Colors.primary + '80', backgroundColor: Colors.primaryPale },
  inputSI: {
    width: 36,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 6,
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  notFoundText: { color: Colors.textSecondary, fontSize: FontSize.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  back: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600', minWidth: 70 },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: FontSize.base, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: FontSize.xs, color: Colors.textSecondary },
  headerRight: { minWidth: 70, alignItems: 'flex-end' },
  parLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  teeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  teeBarLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary },
  teeScroll: { gap: 6, paddingRight: Spacing.lg },
  teeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  teeDot: { width: 8, height: 8, borderRadius: 4 },
  teeChipText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  colHead: { fontSize: 9, fontWeight: '700', color: Colors.textLight, letterSpacing: 0.6 },
  colHole: { width: 44 },
  colPar: { flex: 1 },
  colYards: { width: 72, textAlign: 'right' },
  colSI: { width: 44, textAlign: 'right' },
  tableScroll: { flex: 1 },
  nineHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    backgroundColor: Colors.primaryPale,
  },
  nineLabel: { fontSize: 9, fontWeight: '700', color: Colors.primary, letterSpacing: 1 },
  nineTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nineTotalLabel: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.primary, width: 30 },
  nineTotalVal: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  nineTotalYards: { fontSize: FontSize.xs, color: Colors.textSecondary, marginLeft: 'auto' },
  hint: {
    margin: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  hintText: { fontSize: FontSize.xs, color: Colors.textLight, lineHeight: 18 },
});
