import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { useUserStore } from '../../store/useUserStore';
import { WEAKNESS_OPTIONS } from '../../constants/data';
import { WeaknessArea, MissTendency } from '../../types';

const MISS_OPTIONS: { key: MissTendency; label: string; emoji: string }[] = [
  { key: 'slice', label: 'Slice (curves right)', emoji: '↗️' },
  { key: 'hook', label: 'Hook (curves left)', emoji: '↖️' },
  { key: 'fat_chunk', label: 'Fat / Chunked shots', emoji: '🌍' },
  { key: 'thin_top', label: 'Thin / Topped shots', emoji: '✂️' },
  { key: 'three_putts', label: 'Three-putts', emoji: '😩' },
  { key: 'pull_left', label: 'Pull left (straight)', emoji: '⬅️' },
  { key: 'push_right', label: 'Push right (straight)', emoji: '➡️' },
  { key: 'distance_control', label: 'Inconsistent distances', emoji: '📏' },
  { key: 'sand_struggles', label: 'Struggling from sand', emoji: '🏖️' },
  { key: 'inconsistent_contact', label: 'Inconsistent contact', emoji: '🎰' },
  { key: 'pressure_nerves', label: 'Mental / Nerves under pressure', emoji: '🧠' },
];

export default function GameScreen() {
  const router = useRouter();
  const updateProfile = useUserStore((s) => s.updateProfile);
  const profile = useUserStore((s) => s.profile);

  const [weaknesses, setWeaknesses] = useState<WeaknessArea[]>(profile?.weaknesses ?? []);
  const [strengths, setStrengths] = useState<WeaknessArea[]>(profile?.strengths ?? []);
  const [misses, setMisses] = useState<MissTendency[]>(profile?.missTendencies ?? []);

  function toggleWeakness(key: WeaknessArea) {
    setWeaknesses((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function toggleStrength(key: WeaknessArea) {
    setStrengths((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function toggleMiss(key: MissTendency) {
    setMisses((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function handleNext() {
    if (weaknesses.length === 0) {
      Alert.alert('Select your weaknesses', 'Choose at least one area you want to improve.');
      return;
    }
    updateProfile({ weaknesses, strengths, missTendencies: misses });
    router.push('/onboarding/goals');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ProgressDots current={3} total={4} />

        <Text style={styles.title}>Assess Your Game</Text>
        <Text style={styles.subtitle}>
          Be honest — accurate answers lead to a much better practice plan.
        </Text>

        {/* Weaknesses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Areas to Improve</Text>
          <Text style={styles.sectionHint}>What parts of your game are holding you back?</Text>
          <View style={styles.grid}>
            {WEAKNESS_OPTIONS.map((opt) => {
              const active = weaknesses.includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.areaChip, active && styles.areaChipWeakness]}
                  onPress={() => toggleWeakness(opt.key)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.areaEmoji}>{opt.icon}</Text>
                  <Text style={[styles.areaLabel, active && styles.areaLabelWeakness]}>{opt.label}</Text>
                  {active && <Text style={styles.areaCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Strengths */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Your Strengths</Text>
          <Text style={styles.sectionHint}>What are you actually good at? (optional)</Text>
          <View style={styles.grid}>
            {WEAKNESS_OPTIONS.map((opt) => {
              const active = strengths.includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.areaChip, active && styles.areaChipStrength]}
                  onPress={() => toggleStrength(opt.key)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.areaEmoji}>{opt.icon}</Text>
                  <Text style={[styles.areaLabel, active && styles.areaLabelStrength]}>{opt.label}</Text>
                  {active && <Text style={styles.areaCheckGreen}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Miss tendencies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Miss Tendencies</Text>
          <Text style={styles.sectionHint}>What shot problems come up most often? (optional)</Text>
          <View style={styles.grid}>
            {MISS_OPTIONS.map((opt) => {
              const active = misses.includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.areaChip, active && styles.areaChipMiss]}
                  onPress={() => toggleMiss(opt.key)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.areaEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.areaLabel, active && styles.areaLabelMiss]}>{opt.label}</Text>
                  {active && <Text style={styles.areaCheckOrange}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.nextText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[dotStyles.dot, i < current && dotStyles.dotActive, i === current - 1 && dotStyles.dotCurrent]} />
      ))}
      <Text style={dotStyles.label}>Step {current} of {total}</Text>
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primaryLight },
  dotCurrent: { width: 24, backgroundColor: Colors.primary },
  label: { fontSize: FontSize.xs, color: Colors.textSecondary, marginLeft: 4, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.lg },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, lineHeight: 34, marginBottom: 8 },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xl },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  sectionHint: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  grid: { gap: Spacing.sm },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  areaChipWeakness: { borderColor: Colors.error, backgroundColor: '#fef2f2' },
  areaChipStrength: { borderColor: Colors.success, backgroundColor: '#f0fdf4' },
  areaChipMiss: { borderColor: Colors.warning, backgroundColor: '#fffbeb' },
  areaEmoji: { fontSize: 20 },
  areaLabel: { flex: 1, fontSize: FontSize.base, fontWeight: '500', color: Colors.text },
  areaLabelWeakness: { color: Colors.error, fontWeight: '600' },
  areaLabelStrength: { color: Colors.success, fontWeight: '600' },
  areaLabelMiss: { color: Colors.warning, fontWeight: '600' },
  areaCheck: { fontSize: FontSize.base, color: Colors.error, fontWeight: '700' },
  areaCheckGreen: { fontSize: FontSize.base, color: Colors.success, fontWeight: '700' },
  areaCheckOrange: { fontSize: FontSize.base, color: Colors.warning, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  backBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border },
  backText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textSecondary },
  nextBtn: { flex: 2, backgroundColor: Colors.primary, paddingVertical: 16, alignItems: 'center', borderRadius: Radius.full },
  nextText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.surface },
});
