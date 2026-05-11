import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { formatHandicap } from '../../components/HandicapDial';
import { useUserStore } from '../../store/useUserStore';
import { useRoundStore } from '../../store/useRoundStore';
import { usePracticeStore } from '../../store/usePracticeStore';
import { generatePracticePlan } from '../../services/ai';
import { Round } from '../../types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTodayDayName(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' }) as any;
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function avgScore(rounds: Round[]): string {
  const completed = rounds.filter((r) => r.isComplete && r.totalScore > 0);
  if (completed.length === 0) return '—';
  const avg = completed.reduce((s, r) => s + r.totalScore, 0) / completed.length;
  return avg.toFixed(1);
}

function roundsThisMonth(rounds: Round[]): number {
  const now = new Date();
  return rounds.filter((r) => {
    const d = new Date(r.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && r.isComplete;
  }).length;
}

function bestScore(rounds: Round[]): string {
  const completed = rounds.filter((r) => r.isComplete && r.totalScore > 0);
  if (completed.length === 0) return '—';
  return Math.min(...completed.map((r) => r.totalScore)).toString();
}

export default function DashboardScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const rounds = useRoundStore((s) => s.rounds);
  const { currentPlan, isGenerating, generationError, setPlan, setGenerating, setGenerationError } =
    usePracticeStore();

  const todayPlan = currentPlan?.days.find((d) => d.day === getTodayDayName());
  const totalDrillsToday = todayPlan?.drills.length ?? 0;
  const completedToday = todayPlan?.completedDrillIds.length ?? 0;

  async function handleGeneratePlan() {
    if (!profile?.apiKey) {
      router.push('/(tabs)/profile');
      return;
    }
    setGenerating(true);
    setGenerationError(null);
    try {
      const plan = await generatePracticePlan(profile, rounds, profile.apiKey);
      setPlan(plan);
    } catch (err: any) {
      setGenerationError(err.message ?? 'Failed to generate plan');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}, {profile?.name?.split(' ')[0] ?? 'Golfer'} 👋
            </Text>
            <Text style={styles.date}>{formatDate()}</Text>
          </View>
          <View style={styles.hcpBadge}>
            <Text style={styles.hcpLabel}>HCP</Text>
            <Text style={styles.hcpValue}>{profile ? formatHandicap(profile.handicap) : '—'}</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <StatBox label="Rounds this month" value={roundsThisMonth(rounds).toString()} />
          <StatBox label="Avg score" value={avgScore(rounds)} />
          <StatBox label="Best score" value={bestScore(rounds)} />
        </View>

        {/* Today's Practice */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Practice</Text>
          {isGenerating ? (
            <View style={styles.card}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>Building your personalized plan…</Text>
            </View>
          ) : todayPlan ? (
            <TouchableOpacity
              style={[styles.card, styles.practiceCard]}
              onPress={() => router.push('/(tabs)/practice')}
              activeOpacity={0.85}
            >
              <View style={styles.practiceCardTop}>
                <View style={styles.practiceInfo}>
                  <Text style={styles.practiceTheme}>{todayPlan.theme}</Text>
                  <Text style={styles.practiceDuration}>{todayPlan.duration} min session</Text>
                </View>
                <View style={styles.practiceProgress}>
                  <Text style={styles.progressNum}>{completedToday}/{totalDrillsToday}</Text>
                  <Text style={styles.progressLabel}>done</Text>
                </View>
              </View>
              {totalDrillsToday > 0 && (
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(completedToday / totalDrillsToday) * 100}%` },
                    ]}
                  />
                </View>
              )}
              <Text style={styles.cardCta}>View full plan →</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.card}>
              {generationError ? (
                <>
                  <Text style={styles.errorText}>⚠️ {generationError}</Text>
                  <TouchableOpacity style={styles.generateButton} onPress={handleGeneratePlan} activeOpacity={0.85}>
                    <Text style={styles.generateButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </>
              ) : !profile?.apiKey ? (
                <>
                  <Text style={styles.emptyTitle}>No practice plan yet</Text>
                  <Text style={styles.emptyText}>
                    Add your Claude API key in Profile to generate AI-powered practice plans.
                  </Text>
                  <TouchableOpacity
                    style={styles.generateButton}
                    onPress={() => router.push('/(tabs)/profile')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.generateButtonText}>Add API Key →</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>Ready to train?</Text>
                  <Text style={styles.emptyText}>
                    Generate your personalized weekly practice plan based on your game data.
                  </Text>
                  <TouchableOpacity
                    style={styles.generateButton}
                    onPress={handleGeneratePlan}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.generateButtonText}>Generate Practice Plan 🎯</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {/* Recent Rounds */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Rounds</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/track')}>
              <Text style={styles.seeAll}>Track round →</Text>
            </TouchableOpacity>
          </View>
          {rounds.length === 0 ? (
            <View style={[styles.card, styles.emptyCard]}>
              <Text style={styles.emptyTitle}>No rounds yet</Text>
              <Text style={styles.emptyText}>
                Start tracking your rounds to get data-driven insights.
              </Text>
            </View>
          ) : (
            rounds.slice(0, 3).map((round) => <RoundRow key={round.id} round={round} />)
          )}
        </View>

        {/* Goal Progress */}
        {profile && (
          <View style={[styles.section, { marginBottom: Spacing.xl }]}>
            <Text style={styles.sectionTitle}>Handicap Goal</Text>
            <View style={styles.card}>
              <View style={styles.goalRow}>
                <View>
                  <Text style={styles.goalLabel}>Current</Text>
                  <Text style={styles.goalValue}>{profile.handicap}</Text>
                </View>
                <View style={styles.goalArrow}>
                  <Text style={styles.goalArrowText}>→</Text>
                </View>
                <View>
                  <Text style={styles.goalLabel}>Target</Text>
                  <Text style={[styles.goalValue, { color: Colors.primary }]}>
                    {profile.targetHandicap}
                  </Text>
                </View>
                <View style={styles.goalDiff}>
                  <Text style={styles.goalDiffText}>
                    {(profile.handicap - profile.targetHandicap).toFixed(1)} strokes to go
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function RoundRow({ round }: { round: Round }) {
  const date = new Date(round.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const sign = round.scoreToPar > 0 ? '+' : '';
  return (
    <View style={roundStyles.row}>
      <View style={roundStyles.left}>
        <Text style={roundStyles.course}>{round.courseName}</Text>
        <Text style={roundStyles.date}>{date}</Text>
      </View>
      <View style={roundStyles.right}>
        <Text style={roundStyles.score}>{round.totalScore}</Text>
        <Text style={[roundStyles.par, round.scoreToPar < 0 ? roundStyles.under : round.scoreToPar > 0 ? roundStyles.over : {}]}>
          {sign}{round.scoreToPar}
        </Text>
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  value: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  label: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
});

const roundStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
    alignItems: 'center',
  },
  left: { flex: 1 },
  course: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text },
  date: { fontSize: FontSize.sm, color: Colors.textSecondary },
  right: { alignItems: 'flex-end' },
  score: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  par: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  under: { color: Colors.success },
  over: { color: Colors.error },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  greeting: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  date: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  hcpBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  hcpLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  hcpValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.surface },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  section: { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  seeAll: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.md,
  },
  practiceCard: { backgroundColor: Colors.primary },
  practiceCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  practiceInfo: { flex: 1 },
  practiceTheme: { fontSize: FontSize.md, fontWeight: '700', color: Colors.surface, marginBottom: 4 },
  practiceDuration: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)' },
  practiceProgress: { alignItems: 'center' },
  progressNum: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.surface },
  progressLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
  },
  cardCta: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  loadingText: { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.sm },
  emptyCard: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs, textAlign: 'center' },
  emptyText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.md },
  generateButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    alignSelf: 'center',
  },
  generateButtonText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.surface },
  errorText: { color: Colors.error, textAlign: 'center', marginBottom: Spacing.md, fontSize: FontSize.sm },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  goalLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  goalValue: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  goalArrow: { paddingHorizontal: Spacing.xs },
  goalArrowText: { fontSize: FontSize.xl, color: Colors.textLight },
  goalDiff: { flex: 1, alignItems: 'flex-end' },
  goalDiffText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'right' },
});
