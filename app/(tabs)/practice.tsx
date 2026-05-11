import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { useUserStore } from '../../store/useUserStore';
import { useRoundStore } from '../../store/useRoundStore';
import { usePracticeStore } from '../../store/usePracticeStore';
import { generatePracticePlan } from '../../services/ai';
import { DailyPlan, Drill, DayOfWeek } from '../../types';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function todayIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

export default function PracticeScreen() {
  const profile = useUserStore((s) => s.profile);
  const rounds = useRoundStore((s) => s.rounds);
  const { currentPlan, isGenerating, generationError, setPlan, setGenerating, setGenerationError, markDrillComplete } =
    usePracticeStore();

  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex());
  const [expandedDrillId, setExpandedDrillId] = useState<string | null>(null);

  const planDays = currentPlan?.days ?? [];
  const selectedDayName = DAYS[selectedDayIndex];
  const dayPlan = planDays.find((d) => d.day === selectedDayName);

  async function handleGenerate() {
    if (!profile?.apiKey) {
      Alert.alert(
        'API Key Required',
        'Add your Claude API key in Profile → Settings to generate personalized practice plans.',
        [{ text: 'OK' }]
      );
      return;
    }
    setGenerating(true);
    setGenerationError(null);
    try {
      const plan = await generatePracticePlan(profile, rounds, profile.apiKey);
      setPlan(plan);
    } catch (err: any) {
      setGenerationError(err.message ?? 'Failed to generate plan');
      Alert.alert('Generation Failed', err.message ?? 'Please check your API key and try again.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Practice Plan</Text>
        {currentPlan && (
          <Text style={styles.subtitle}>Week of {new Date(currentPlan.weekOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
        )}
      </View>

      {!currentPlan && !isGenerating ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🎯</Text>
          <Text style={styles.emptyTitle}>No practice plan yet</Text>
          <Text style={styles.emptyText}>
            {profile?.apiKey
              ? 'Generate a personalized weekly plan based on your handicap, weaknesses, and goals.'
              : 'Add your Claude API key in Profile to unlock AI-generated practice plans.'}
          </Text>
          {generationError && <Text style={styles.errorText}>⚠️ {generationError}</Text>}
          <TouchableOpacity style={styles.generateButton} onPress={handleGenerate} activeOpacity={0.85}>
            <Text style={styles.generateButtonText}>
              {profile?.apiKey ? 'Generate My Plan' : 'Set Up in Profile'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : isGenerating ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingTitle}>Building your plan…</Text>
          <Text style={styles.loadingText}>
            Our AI coach is analyzing your game and creating personalized drills.
          </Text>
        </View>
      ) : (
        <>
          {/* Day Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayScrollContent}
            style={styles.dayScroll}
          >
            {DAYS.map((day, index) => {
              const dayPlanItem = planDays.find((d) => d.day === day);
              const isActive = index === selectedDayIndex;
              const hasContent = !!dayPlanItem;
              const isToday = index === todayIndex();
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, isActive && styles.dayChipActive, !hasContent && styles.dayChipEmpty]}
                  onPress={() => setSelectedDayIndex(index)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                    {day.slice(0, 3)}
                  </Text>
                  {isToday && <View style={styles.todayDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {dayPlan ? (
              <>
                <View style={styles.dayHeader}>
                  <View>
                    <Text style={styles.dayTitle}>{dayPlan.day}</Text>
                    <Text style={styles.dayTheme}>{dayPlan.theme}</Text>
                  </View>
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{dayPlan.duration} min</Text>
                  </View>
                </View>

                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>
                    {dayPlan.completedDrillIds.length}/{dayPlan.drills.length} drills completed
                  </Text>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: dayPlan.drills.length > 0
                            ? `${(dayPlan.completedDrillIds.length / dayPlan.drills.length) * 100}%`
                            : '0%',
                        },
                      ]}
                    />
                  </View>
                </View>

                {dayPlan.drills.map((drill) => (
                  <DrillCard
                    key={drill.id}
                    drill={drill}
                    isCompleted={dayPlan.completedDrillIds.includes(drill.id)}
                    isExpanded={expandedDrillId === drill.id}
                    onToggleComplete={() => markDrillComplete(dayPlan.day, drill.id)}
                    onToggleExpand={() =>
                      setExpandedDrillId(expandedDrillId === drill.id ? null : drill.id)
                    }
                  />
                ))}
              </>
            ) : (
              <View style={styles.restDay}>
                <Text style={styles.restEmoji}>😴</Text>
                <Text style={styles.restTitle}>Rest Day</Text>
                <Text style={styles.restText}>No practice scheduled. Recovery is part of the plan.</Text>
              </View>
            )}

            <TouchableOpacity style={styles.regenerateButton} onPress={handleGenerate} activeOpacity={0.75}>
              <Text style={styles.regenerateText}>↻  Regenerate Plan</Text>
            </TouchableOpacity>
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

function DrillCard({
  drill,
  isCompleted,
  isExpanded,
  onToggleComplete,
  onToggleExpand,
}: {
  drill: Drill;
  isCompleted: boolean;
  isExpanded: boolean;
  onToggleComplete: () => void;
  onToggleExpand: () => void;
}) {
  const difficultyColor = {
    beginner: Colors.success,
    intermediate: Colors.warning,
    advanced: Colors.error,
  }[drill.difficulty];

  return (
    <View style={[drillStyles.card, isCompleted && drillStyles.cardCompleted]}>
      <TouchableOpacity
        style={drillStyles.cardHeader}
        onPress={onToggleExpand}
        activeOpacity={0.8}
      >
        <TouchableOpacity
          style={[drillStyles.checkbox, isCompleted && drillStyles.checkboxDone]}
          onPress={onToggleComplete}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isCompleted && <Text style={drillStyles.checkmark}>✓</Text>}
        </TouchableOpacity>

        <View style={drillStyles.info}>
          <Text style={[drillStyles.name, isCompleted && drillStyles.nameCompleted]}>
            {drill.name}
          </Text>
          <Text style={drillStyles.description}>{drill.description}</Text>
          <View style={drillStyles.meta}>
            <Text style={drillStyles.duration}>{drill.duration} min</Text>
            <View style={[drillStyles.diffBadge, { backgroundColor: difficultyColor + '20' }]}>
              <Text style={[drillStyles.diffText, { color: difficultyColor }]}>
                {drill.difficulty}
              </Text>
            </View>
          </View>
        </View>

        <Text style={drillStyles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={drillStyles.expandedContent}>
          {drill.equipment.length > 0 && (
            <View style={drillStyles.section}>
              <Text style={drillStyles.sectionTitle}>Equipment</Text>
              <Text style={drillStyles.sectionText}>{drill.equipment.join(' • ')}</Text>
            </View>
          )}

          <View style={drillStyles.section}>
            <Text style={drillStyles.sectionTitle}>Instructions</Text>
            {drill.instructions.map((step, i) => (
              <Text key={i} style={drillStyles.step}>
                {i + 1}. {step}
              </Text>
            ))}
          </View>

          {drill.focusPoints.length > 0 && (
            <View style={drillStyles.section}>
              <Text style={drillStyles.sectionTitle}>Focus Points</Text>
              {drill.focusPoints.map((point, i) => (
                <Text key={i} style={drillStyles.focusPoint}>
                  • {point}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const drillStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardCompleted: { opacity: 0.7 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: { color: Colors.background, fontSize: 14, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  nameCompleted: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  description: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xs },
  meta: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  duration: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600' },
  diffBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  diffText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  chevron: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 4 },
  expandedContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.md,
  },
  section: { gap: 4 },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionText: { fontSize: FontSize.sm, color: Colors.text },
  step: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
  focusPoint: { fontSize: FontSize.sm, color: Colors.primary, lineHeight: 20 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  dayScroll: { maxHeight: 60 },
  dayScrollContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, alignItems: 'center' },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    minWidth: 56,
  },
  dayChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipEmpty: { opacity: 0.5 },
  dayChipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  dayChipTextActive: { color: Colors.background },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
    marginTop: 2,
  },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  dayTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  dayTheme: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: 2 },
  durationBadge: {
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  durationText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  progressRow: { marginBottom: Spacing.md, gap: 6 },
  progressLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  emptyText: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  errorText: { fontSize: FontSize.sm, color: Colors.error, textAlign: 'center' },
  generateButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  generateButtonText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.background },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xxl,
  },
  loadingTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  loadingText: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  restDay: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  restEmoji: { fontSize: 48 },
  restTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  restText: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center' },
  regenerateButton: {
    marginTop: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  regenerateText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.primary },
});
