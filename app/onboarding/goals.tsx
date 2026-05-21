import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { useUserStore } from '../../store/useUserStore';
import { usePracticeStore } from '../../store/usePracticeStore';
import { useRoundStore } from '../../store/useRoundStore';
import { GOAL_OPTIONS } from '../../constants/data';
import { GoalType, TargetTimeline } from '../../types';
import { generatePracticePlan } from '../../services/ai';
import { checkConnection } from '../../utils/network';

const TIMELINE_OPTIONS: { key: TargetTimeline; label: string; sub: string }[] = [
  { key: '3_months', label: '3 months', sub: 'Aggressive' },
  { key: '6_months', label: '6 months', sub: 'Realistic' },
  { key: '1_year', label: '1 year', sub: 'Steady' },
  { key: 'no_rush', label: 'No rush', sub: 'Long game' },
];

export default function GoalsScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const updateProfile = useUserStore((s) => s.updateProfile);
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);
  const rounds = useRoundStore((s) => s.rounds);
  const setPlan = usePracticeStore((s) => s.setPlan);
  const setGenerating = usePracticeStore((s) => s.setGenerating);
  const setGenerationError = usePracticeStore((s) => s.setGenerationError);

  const [selectedGoals, setSelectedGoals] = useState<GoalType[]>(profile?.goals ?? []);
  const [timeline, setTimeline] = useState<TargetTimeline>(profile?.targetTimeline ?? '6_months');

  function toggleGoal(key: GoalType) {
    setSelectedGoals((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleFinish() {
    if (selectedGoals.length === 0) {
      Alert.alert('Pick a goal', 'Choose at least one goal to guide your plan.');
      return;
    }
    if (!profile) return;

    updateProfile({ goals: selectedGoals, targetTimeline: timeline });
    completeOnboarding();

    const finalProfile = { ...profile, goals: selectedGoals, targetTimeline: timeline, hasCompletedOnboarding: true };

    if (profile.apiKey) {
      checkConnection().then(async (connected) => {
        if (!connected) {
          setGenerationError("We'll generate your plan when you're connected");
          return;
        }
        setGenerating(true);
        try {
          const plan = await generatePracticePlan(finalProfile, rounds, profile.apiKey);
          setPlan(plan);
        } catch (err: any) {
          const isNetwork = err instanceof TypeError;
          setGenerationError(
            isNetwork
              ? "We'll generate your plan when you're connected"
              : (err.message ?? 'Could not generate plan'),
          );
        } finally {
          setGenerating(false);
        }
      });
    }

    router.replace('/diagnostic');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ProgressDots current={4} total={4} />

        <Text style={styles.title}>Set Your Goals</Text>
        <Text style={styles.subtitle}>What are you working toward? Pick everything that resonates.</Text>

        {/* Goals */}
        <View style={styles.section}>
          <View style={styles.goalList}>
            {GOAL_OPTIONS.map((opt) => {
              const active = selectedGoals.includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.goalCard, active && styles.goalCardActive]}
                  onPress={() => toggleGoal(opt.key)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.goalText}>
                    <Text style={[styles.goalTitle, active && styles.goalTitleActive]}>{opt.label}</Text>
                    <Text style={styles.goalDesc}>{opt.description}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Target timeline to reach your handicap goal</Text>
          <View style={styles.timelineRow}>
            {TIMELINE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.timelineCard, timeline === opt.key && styles.timelineCardActive]}
                onPress={() => setTimeline(opt.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.timelineLabel, timeline === opt.key && styles.timelineLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.timelineSub}>{opt.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* API key note */}
        <View style={styles.aiNote}>
          <Text style={styles.aiNoteTitle}>🤖 AI-Powered Practice Plans</Text>
          <Text style={styles.aiNoteText}>
            After setup, add your Claude API key in Profile → Settings. The AI will use everything you just told us to build drills specifically for your game.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneBtn} onPress={handleFinish} activeOpacity={0.85}>
          <Text style={styles.doneText}>Let's Go 🏌️</Text>
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
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.1)' },
  dotActive: { backgroundColor: Colors.darkGreen },
  dotCurrent: { width: 24, backgroundColor: Colors.darkGreen },
  label: { fontSize: FontSize.xs, color: Colors.textSecondary, marginLeft: 4, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { padding: Spacing.xl, paddingBottom: 100 },
  title: { fontSize: FontSize.xxl, fontWeight: '600', color: Colors.textPrimary, lineHeight: 34, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.xl },
  section: { marginBottom: Spacing.xl },
  sectionLabel: { fontSize: FontSize.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  goalList: { gap: Spacing.sm },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  goalCardActive: { borderColor: Colors.darkGreen, backgroundColor: Colors.paleGreen },
  radio: {
    width: 22, height: 22, borderRadius: Radius.circle,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  radioActive: { borderColor: Colors.darkGreen },
  radioInner: { width: 10, height: 10, borderRadius: Radius.circle, backgroundColor: Colors.darkGreen },
  goalText: { flex: 1 },
  goalTitle: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  goalTitleActive: { color: Colors.darkGreen },
  goalDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  timelineRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  timelineCard: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  timelineCardActive: { borderColor: Colors.darkGreen, backgroundColor: Colors.paleGreen },
  timelineLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  timelineLabelActive: { color: Colors.darkGreen },
  timelineSub: { fontSize: FontSize.xs, color: Colors.textLight },
  aiNote: {
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    marginBottom: Spacing.lg,
  },
  aiNoteTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  aiNoteText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  backBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: Radius.circle, borderWidth: 1.5, borderColor: Colors.border },
  backText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textSecondary },
  doneBtn: { flex: 2, backgroundColor: Colors.darkGreen, paddingVertical: 16, alignItems: 'center', borderRadius: Radius.circle },
  doneBtnDisabled: { backgroundColor: Colors.textLight },
  doneText: { fontSize: FontSize.base, fontWeight: '700', color: '#ffffff' },
});
