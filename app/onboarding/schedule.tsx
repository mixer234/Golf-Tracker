import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { useUserStore } from '../../store/useUserStore';
import { PracticeFacility } from '../../types';

const DAY_OPTIONS = [
  { value: 1, label: '1 day', sub: 'Light' },
  { value: 2, label: '2 days', sub: 'Moderate' },
  { value: 3, label: '3 days', sub: 'Regular' },
  { value: 4, label: '4 days', sub: 'Serious' },
  { value: 5, label: '5+ days', sub: 'Dedicated' },
];

const SESSION_OPTIONS = [
  { value: 30, label: '30 min', sub: 'Quick session' },
  { value: 60, label: '1 hour', sub: 'Standard' },
  { value: 90, label: '1.5 hrs', sub: 'Extended' },
  { value: 120, label: '2+ hrs', sub: 'Full practice' },
];

const FACILITY_OPTIONS: { key: PracticeFacility; label: string; emoji: string }[] = [
  { key: 'driving_range', label: 'Driving Range', emoji: '🏌️' },
  { key: 'putting_green', label: 'Putting Green', emoji: '⛳' },
  { key: 'chipping_area', label: 'Chipping Area', emoji: '🎯' },
  { key: 'full_course', label: 'Full Course Access', emoji: '🌿' },
  { key: 'simulator', label: 'Indoor Simulator', emoji: '📺' },
  { key: 'home_net', label: 'Home Net / Backyard', emoji: '🏠' },
];

export default function ScheduleScreen() {
  const router = useRouter();
  const updateProfile = useUserStore((s) => s.updateProfile);
  const profile = useUserStore((s) => s.profile);

  const [days, setDays] = useState(profile?.practiceDaysPerWeek ?? 3);
  const [sessionLength, setSessionLength] = useState(profile?.sessionLengthMinutes ?? 60);
  const [facilities, setFacilities] = useState<PracticeFacility[]>(profile?.facilities ?? []);

  function toggleFacility(key: PracticeFacility) {
    setFacilities((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  }

  function handleNext() {
    updateProfile({ practiceDaysPerWeek: days, sessionLengthMinutes: sessionLength, facilities });
    router.push('/onboarding/game');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ProgressDots current={2} total={4} />

        <Text style={styles.title}>Your Practice{'\n'}Schedule</Text>
        <Text style={styles.subtitle}>
          We'll build your plan around your actual availability — not an ideal world.
        </Text>

        {/* Days per week */}
        <View style={styles.section}>
          <Text style={styles.label}>How many days per week can you practice?</Text>
          <View style={styles.optionRow}>
            {DAY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionCard, days === opt.value && styles.optionCardActive]}
                onPress={() => setDays(opt.value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.optionValue, days === opt.value && styles.optionValueActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.optionSub}>{opt.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Session length */}
        <View style={styles.section}>
          <Text style={styles.label}>How long is a typical practice session?</Text>
          <View style={styles.optionRow}>
            {SESSION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.optionCard, sessionLength === opt.value && styles.optionCardActive]}
                onPress={() => setSessionLength(opt.value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.optionValue, sessionLength === opt.value && styles.optionValueActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.optionSub}>{opt.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Facilities */}
        <View style={styles.section}>
          <Text style={styles.label}>What facilities do you have access to?</Text>
          <Text style={styles.hint}>Select all that apply — this shapes what drills we recommend.</Text>
          <View style={styles.facilitiesGrid}>
            {FACILITY_OPTIONS.map((opt) => {
              const active = facilities.includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.facilityChip, active && styles.facilityChipActive]}
                  onPress={() => toggleFacility(opt.key)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.facilityEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.facilityLabel, active && styles.facilityLabelActive]}>
                    {opt.label}
                  </Text>
                  {active && <Text style={styles.facilityCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Your plan will be</Text>
          <Text style={styles.summaryText}>
            {days} day{days > 1 ? 's' : ''}/week × {sessionLength} min = approximately{' '}
            <Text style={styles.summaryBold}>{((days * sessionLength) / 60).toFixed(1)} hours</Text> per week
          </Text>
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
  scroll: { padding: Spacing.xl, paddingBottom: 100 },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, lineHeight: 34, marginBottom: 8 },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xl },
  section: { marginBottom: Spacing.xl },
  label: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  hint: { fontSize: FontSize.xs, color: Colors.textLight, marginBottom: Spacing.sm },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  optionCard: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    ...Shadow.sm,
  },
  optionCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryPale },
  optionValue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  optionValueActive: { color: Colors.primary },
  optionSub: { fontSize: FontSize.xs, color: Colors.textLight },
  facilitiesGrid: { gap: Spacing.sm },
  facilityChip: {
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
  facilityChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryPale },
  facilityEmoji: { fontSize: 20 },
  facilityLabel: { flex: 1, fontSize: FontSize.base, fontWeight: '500', color: Colors.text },
  facilityLabelActive: { color: Colors.primary, fontWeight: '600' },
  facilityCheck: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '700' },
  summaryCard: {
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    marginBottom: Spacing.lg,
  },
  summaryTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  summaryText: { fontSize: FontSize.base, color: Colors.text },
  summaryBold: { fontWeight: '800', color: Colors.primary },
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
  nextText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.background },
});
