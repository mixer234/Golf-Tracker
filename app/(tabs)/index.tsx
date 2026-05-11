import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { formatHandicap } from '../../components/HandicapDial';
import { useUserStore } from '../../store/useUserStore';
import { useRoundStore } from '../../store/useRoundStore';
import { usePracticeStore } from '../../store/usePracticeStore';
import { generatePracticePlan } from '../../services/ai';
import { Round, UserProfile, PracticePlan, DayOfWeek, WeaknessArea } from '../../types';
import { WEEKLY_FOCUS_DATA } from '../../constants/data';

// ─── Utilities ───────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatHeaderDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const DAY_ORDER: { name: DayOfWeek; letter: string }[] = [
  { name: 'Monday', letter: 'M' },
  { name: 'Tuesday', letter: 'T' },
  { name: 'Wednesday', letter: 'W' },
  { name: 'Thursday', letter: 'T' },
  { name: 'Friday', letter: 'F' },
  { name: 'Saturday', letter: 'S' },
  { name: 'Sunday', letter: 'S' },
];

function getWeekDays(): { date: Date; dayName: DayOfWeek; letter: string }[] {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun, 1=Mon
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return DAY_ORDER.map(({ name, letter }, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { date: d, dayName: name, letter };
  });
}

// Default practice day distribution when no plan exists
const DEFAULT_PRACTICE_DAYS: Record<number, DayOfWeek[]> = {
  1: ['Wednesday'],
  2: ['Tuesday', 'Saturday'],
  3: ['Monday', 'Wednesday', 'Saturday'],
  4: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
  5: ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday'],
  6: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  7: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

function getPracticeDays(profile: UserProfile, plan: PracticePlan | null): Set<DayOfWeek> {
  if (plan && plan.days.length > 0) {
    return new Set(plan.days.map((d) => d.day));
  }
  const count = Math.min(7, Math.max(1, profile.practiceDaysPerWeek ?? 3));
  return new Set(DEFAULT_PRACTICE_DAYS[count] ?? DEFAULT_PRACTICE_DAYS[3]);
}

const DEFAULT_FOCUS_ROTATION: WeaknessArea[] = [
  'putting', 'chipping', 'driving', 'mid_irons', 'course_management',
  'wedges', 'short_irons', 'mental', 'long_irons', 'bunkers',
];

function getWeeklyFocusArea(
  profile: UserProfile,
  plan: PracticePlan | null,
  weekNum: number,
): WeaknessArea {
  if (plan && plan.focusAreas.length > 0) {
    return plan.focusAreas[weekNum % plan.focusAreas.length];
  }
  if (profile.weaknesses.length > 0) {
    return profile.weaknesses[weekNum % profile.weaknesses.length];
  }
  return DEFAULT_FOCUS_ROTATION[weekNum % DEFAULT_FOCUS_ROTATION.length];
}

function avgScore(rounds: Round[]): string {
  const done = rounds.filter((r) => r.isComplete && r.totalScore > 0);
  if (!done.length) return '—';
  return (done.reduce((s, r) => s + r.totalScore, 0) / done.length).toFixed(1);
}

function roundsThisMonth(rounds: Round[]): number {
  const now = new Date();
  return rounds.filter((r) => {
    const d = new Date(r.date);
    return d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear() &&
      r.isComplete;
  }).length;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function getHandicapCoachingLine(profile: UserProfile, rounds: Round[]): string {
  const completed = rounds.filter((r) => r.isComplete && r.totalScore > 0).slice(0, 5);
  if (completed.length === 0) return 'Start tracking rounds to see your progress.';

  const avgPutts = completed.reduce((s, r) => s + r.totalPutts, 0) / completed.length;
  const girPct = completed.reduce((s, r) => s + r.greensInRegulation, 0) / (completed.length * 18);
  const udAttempts = completed.reduce((s, r) => s + r.upAndDownAttempts, 0);
  const udMade = completed.reduce((s, r) => s + r.upAndDowns, 0);
  const udPct = udAttempts > 0 ? udMade / udAttempts : null;

  if (avgPutts > 34) return `Averaging ${avgPutts.toFixed(1)} putts — reducing 3-putts could cut 2–3 strokes per round.`;
  if (girPct < 0.33) return `You're hitting ${Math.round(girPct * 18)} greens per round — focus on approach accuracy to unlock lower scores.`;
  if (udPct !== null && udPct < 0.4) return `${Math.round(udPct * 100)}% scrambling — improving short game touch could save 3–4 shots per round.`;
  if (girPct > 0.5) return `Strong ball striking — ${Math.round(girPct * 18)} GIR per round puts you in the top tier. Now convert those chances.`;
  return `${completed.length} recent rounds analysed. Keep logging to sharpen your insights.`;
}

function HandicapHeroCard({ profile, rounds }: { profile: UserProfile; rounds: Round[] }) {
  const gap = profile.handicap - profile.targetHandicap;
  const achieved = gap <= 0;
  const absGap = Math.abs(Math.round(gap));

  return (
    <View style={heroStyles.card}>
      <View style={heroStyles.row}>
        {/* Current */}
        <View style={heroStyles.col}>
          <Text style={heroStyles.colLabel}>CURRENT</Text>
          <Text style={heroStyles.colNum}>{formatHandicap(profile.handicap)}</Text>
        </View>

        {/* Gap */}
        <View style={heroStyles.middle}>
          {achieved ? (
            <Text style={heroStyles.achievedText}>Goal reached 🎉</Text>
          ) : (
            <>
              <Text style={heroStyles.gapNum}>{absGap}</Text>
              <Text style={heroStyles.gapLabel}>strokes{'\n'}to go</Text>
            </>
          )}
        </View>

        {/* Target */}
        <View style={[heroStyles.col, heroStyles.colEnd]}>
          <Text style={heroStyles.colLabel}>TARGET</Text>
          <Text style={[heroStyles.colNum, heroStyles.colNumTarget]}>
            {formatHandicap(profile.targetHandicap)}
          </Text>
        </View>
      </View>

      {/* Simple distance bar */}
      {!achieved && (
        <View style={heroStyles.barWrap}>
          <View style={heroStyles.barTrack}>
            <View
              style={[
                heroStyles.barFill,
                {
                  width: `${Math.min(
                    95,
                    Math.max(5, (1 - absGap / Math.max(absGap + Math.abs(profile.targetHandicap), 1)) * 100),
                  )}%`,
                },
              ]}
            />
          </View>
          <Text style={heroStyles.barHint}>
            {formatHandicap(profile.targetHandicap)} target
          </Text>
        </View>
      )}

      {/* Coaching insight */}
      <View style={heroStyles.insightRow}>
        <Text style={heroStyles.insightIcon}>💡</Text>
        <Text style={heroStyles.insightText}>{getHandicapCoachingLine(profile, rounds)}</Text>
      </View>
    </View>
  );
}

function WeekCalendar({
  profile,
  plan,
}: {
  profile: UserProfile;
  plan: PracticePlan | null;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekDays = getWeekDays();
  const practiceDays = getPracticeDays(profile, plan);
  const weekNum = getISOWeek(today);

  return (
    <View style={calStyles.card}>
      <View style={calStyles.headerRow}>
        <Text style={calStyles.title}>This Week</Text>
        <View style={calStyles.weekPill}>
          <Text style={calStyles.weekPillText}>Wk {weekNum}</Text>
        </View>
      </View>
      <View style={calStyles.days}>
        {weekDays.map(({ date, dayName, letter }) => {
          const isToday = isSameDay(date, today);
          const isPast = date < today;
          const isPractice = practiceDays.has(dayName);
          const planDay = plan?.days.find((d) => d.day === dayName);
          const hasDone = isPast && isPractice && (planDay?.completedDrillIds.length ?? 0) > 0;
          const isMissed = isPast && isPractice && !hasDone;

          return (
            <View key={dayName} style={calStyles.dayCol}>
              <Text style={[calStyles.letter, isPast && !isToday && calStyles.faded]}>
                {letter}
              </Text>
              <View
                style={[
                  calStyles.dateCircle,
                  isToday && calStyles.todayCircle,
                  isPractice && !isToday && calStyles.practiceCircle,
                ]}
              >
                <Text
                  style={[
                    calStyles.dateNum,
                    isToday && calStyles.todayNum,
                    isPast && !isToday && calStyles.faded,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>
              {/* Status indicator dot */}
              {hasDone ? (
                <View style={[calStyles.dot, calStyles.dotDone]} />
              ) : isMissed ? (
                <View style={[calStyles.dot, calStyles.dotMissed]} />
              ) : isPractice ? (
                <View style={[calStyles.dot, isToday ? calStyles.dotToday : calStyles.dotFuture]} />
              ) : (
                <View style={calStyles.dotSpacer} />
              )}
            </View>
          );
        })}
      </View>
      <View style={calStyles.legend}>
        <LegendItem color={Colors.primary} label="Practice day" />
        <LegendItem color={Colors.success} label="Completed" />
        <LegendItem color={Colors.warning} label="Missed" />
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={calStyles.legendItem}>
      <View style={[calStyles.legendDot, { backgroundColor: color }]} />
      <Text style={calStyles.legendText}>{label}</Text>
    </View>
  );
}

function WeeklyFocusCard({
  profile,
  plan,
}: {
  profile: UserProfile;
  plan: PracticePlan | null;
}) {
  const weekNum = getISOWeek(new Date());
  const area = getWeeklyFocusArea(profile, plan, weekNum);
  const focus = WEEKLY_FOCUS_DATA[area];

  return (
    <View style={focusStyles.card}>
      <View style={focusStyles.headerRow}>
        <Text style={focusStyles.overline}>WEEKLY FOCUS</Text>
        <View style={focusStyles.weekBadge}>
          <Text style={focusStyles.weekBadgeText}>Week {weekNum}</Text>
        </View>
      </View>

      <View style={focusStyles.titleRow}>
        <Text style={focusStyles.emoji}>{focus.emoji}</Text>
        <Text style={focusStyles.title}>{focus.title}</Text>
      </View>

      <Text style={focusStyles.desc}>{focus.desc}</Text>

      <View style={focusStyles.tipsWrap}>
        {focus.tips.map((tip, i) => (
          <View key={i} style={focusStyles.tipRow}>
            <View style={focusStyles.tipBullet} />
            <Text style={focusStyles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const rounds = useRoundStore((s) => s.rounds);
  const { currentPlan, isGenerating, generationError, setPlan, setGenerating, setGenerationError } =
    usePracticeStore();

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
  const todayPlan = currentPlan?.days.find((d) => d.day === todayName);
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

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {getGreeting()},{' '}
            <Text style={styles.greetingName}>{profile.name.split(' ')[0]}</Text> 👋
          </Text>
          <Text style={styles.date}>{formatHeaderDate()}</Text>
        </View>

        {/* ── Handicap Hero ─────────────────────────────── */}
        <HandicapHeroCard profile={profile} rounds={rounds} />

        {/* ── Quick stats row ───────────────────────────── */}
        <View style={styles.statsRow}>
          <StatBox value={roundsThisMonth(rounds).toString()} label="Rounds this month" />
          <StatBox value={avgScore(rounds)} label="Avg score (last 5)" />
        </View>

        {/* ── Trend insight ─────────────────────────────── */}
        <TrendInsightCard rounds={rounds} />

        {/* ── This Week Calendar ────────────────────────── */}
        <WeekCalendar profile={profile} plan={currentPlan} />

        {/* ── Weekly Focus ──────────────────────────────── */}
        <WeeklyFocusCard profile={profile} plan={currentPlan} />

        {/* ── Today's Practice ──────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Practice</Text>
          {isGenerating ? (
            <View style={styles.card}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>Building your personalised plan…</Text>
            </View>
          ) : todayPlan ? (
            <TouchableOpacity
              style={[styles.card, styles.practiceCard]}
              onPress={() => router.push('/(tabs)/practice')}
              activeOpacity={0.85}
            >
              <View style={styles.practiceTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.practiceTheme}>{todayPlan.theme}</Text>
                  <Text style={styles.practiceDur}>{todayPlan.duration} min session</Text>
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
                  <TouchableOpacity style={styles.genBtn} onPress={handleGeneratePlan} activeOpacity={0.85}>
                    <Text style={styles.genBtnText}>Try Again</Text>
                  </TouchableOpacity>
                </>
              ) : !profile.apiKey ? (
                <>
                  <Text style={styles.emptyTitle}>No practice plan yet</Text>
                  <Text style={styles.emptyText}>
                    Add your Claude API key in Profile to unlock AI-powered practice plans.
                  </Text>
                  <TouchableOpacity
                    style={styles.genBtn}
                    onPress={() => router.push('/(tabs)/profile')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.genBtnText}>Add API Key →</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>Ready to train?</Text>
                  <Text style={styles.emptyText}>
                    Generate your personalised weekly practice plan based on your game data.
                  </Text>
                  <TouchableOpacity style={styles.genBtn} onPress={handleGeneratePlan} activeOpacity={0.85}>
                    <Text style={styles.genBtnText}>Generate Practice Plan 🎯</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {/* ── Recent Rounds ─────────────────────────────── */}
        <View style={[styles.section, { marginBottom: Spacing.xxl }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Rounds</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/track')}>
              <Text style={styles.seeAll}>Track round →</Text>
            </TouchableOpacity>
          </View>
          {rounds.length === 0 ? (
            <View style={[styles.card, styles.emptyCard]}>
              <Text style={styles.emptyTitle}>No rounds yet</Text>
              <Text style={styles.emptyText}>
                Start tracking rounds to see your data here.
              </Text>
            </View>
          ) : (
            rounds.slice(0, 2).map((round) => <RoundRow key={round.id} round={round} />)
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View style={statStyles.box}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function TrendInsightCard({ rounds }: { rounds: Round[] }) {
  const completed = rounds.filter((r) => r.isComplete && r.totalScore > 0);
  if (completed.length < 4) return null;

  const recent = completed.slice(0, 4);
  const older = completed.slice(4, 8);
  if (older.length < 2) return null;

  const recentGir = recent.reduce((s, r) => s + r.greensInRegulation, 0) / (recent.length * 18);
  const olderGir = older.reduce((s, r) => s + r.greensInRegulation, 0) / (older.length * 18);
  const recentPutts = recent.reduce((s, r) => s + r.totalPutts, 0) / recent.length;
  const olderPutts = older.reduce((s, r) => s + r.totalPutts, 0) / older.length;
  const recentScore = recent.reduce((s, r) => s + r.totalScore, 0) / recent.length;
  const olderScore = older.reduce((s, r) => s + r.totalScore, 0) / older.length;

  const girDelta = Math.round((recentGir - olderGir) * 18 * 10) / 10;
  const puttsDelta = Math.round((recentPutts - olderPutts) * 10) / 10;
  const scoreDelta = Math.round((recentScore - olderScore) * 10) / 10;

  let emoji = '📊';
  let insight = '';
  let isPositive = false;

  if (Math.abs(scoreDelta) >= 1) {
    isPositive = scoreDelta < 0;
    insight = scoreDelta < 0
      ? `Scoring avg down ${Math.abs(scoreDelta)} strokes vs. your previous 4 rounds.`
      : `Scoring avg up ${scoreDelta} strokes vs. previous 4 rounds — time to focus.`;
    emoji = scoreDelta < 0 ? '📉' : '📈';
  } else if (Math.abs(girDelta) >= 1) {
    isPositive = girDelta > 0;
    insight = girDelta > 0
      ? `GIR up ${girDelta} greens/round — your approach game is trending up.`
      : `GIR down ${Math.abs(girDelta)} greens/round — approach accuracy needs attention.`;
    emoji = girDelta > 0 ? '🎯' : '⚠️';
  } else if (Math.abs(puttsDelta) >= 1) {
    isPositive = puttsDelta < 0;
    insight = puttsDelta < 0
      ? `Putting strokes down ${Math.abs(puttsDelta)}/round — the flat stick is improving.`
      : `Putts up ${puttsDelta}/round vs. recent average — focus on lag putting.`;
    emoji = puttsDelta < 0 ? '✅' : '⛳';
  } else {
    return null;
  }

  return (
    <View style={[trendStyles.card, isPositive ? trendStyles.cardGood : trendStyles.cardCaution]}>
      <Text style={trendStyles.emoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={trendStyles.label}>TREND ALERT</Text>
        <Text style={trendStyles.text}>{insight}</Text>
      </View>
    </View>
  );
}

function RoundRow({ round }: { round: Round }) {
  const date = new Date(round.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const stp = round.scoreToPar;
  const parLabel = stp === 0 ? 'E' : stp > 0 ? `+${stp}` : String(stp);
  return (
    <View style={roundStyles.row}>
      <View style={roundStyles.left}>
        <Text style={roundStyles.course}>{round.courseName}</Text>
        <Text style={roundStyles.date}>{date}</Text>
      </View>
      <View style={roundStyles.right}>
        <Text style={roundStyles.score}>{round.totalScore}</Text>
        <Text
          style={[
            roundStyles.par,
            stp < 0 && roundStyles.under,
            stp > 0 && roundStyles.over,
          ]}
        >
          {parLabel}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// Handicap hero card
const heroStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadow.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  col: { flex: 1 },
  colEnd: { alignItems: 'flex-end' },
  colLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  colNum: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.background,
    letterSpacing: -1,
  },
  colNumTarget: { color: Colors.primaryLight },
  middle: { flex: 1, alignItems: 'center' },
  gapNum: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: -0.5,
  },
  gapLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 15,
  },
  achievedText: {
    fontSize: FontSize.sm,
    color: Colors.primaryLight,
    fontWeight: '700',
    textAlign: 'center',
  },
  barWrap: { gap: 6 },
  barTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
  },
  barHint: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'right',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  insightIcon: { fontSize: 13 },
  insightText: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.75)',
    flex: 1,
    lineHeight: 18,
  },
});

// Week calendar
const calStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  weekPill: {
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  weekPillText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  dayCol: { flex: 1, alignItems: 'center', gap: 4 },
  letter: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  faded: { opacity: 0.35 },
  dateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: { backgroundColor: Colors.primary },
  practiceCircle: {
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
  },
  dateNum: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  todayNum: { color: Colors.background, fontWeight: '800' },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotToday: { backgroundColor: Colors.primaryLight },
  dotFuture: { backgroundColor: Colors.primaryLight },
  dotDone: { backgroundColor: Colors.success },
  dotMissed: { backgroundColor: Colors.warning },
  dotSpacer: { width: 6, height: 6 },
  legend: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: FontSize.xs, color: Colors.textLight },
});

// Weekly focus card
const focusStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    ...Shadow.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  overline: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  weekBadge: {
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  weekBadgeText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  emoji: { fontSize: 28 },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text, flex: 1 },
  desc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: Spacing.md,
  },
  tipsWrap: { gap: Spacing.sm },
  tipRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
    flexShrink: 0,
  },
  tipText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
    flex: 1,
  },
});

// Stat boxes
const statStyles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  value: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  label: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
});

// Trend insight card
const trendStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  cardGood: { backgroundColor: Colors.success + '15', borderColor: Colors.success + '40' },
  cardCaution: { backgroundColor: Colors.warning + '15', borderColor: Colors.warning + '40' },
  emoji: { fontSize: 20, marginTop: 1 },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.6, marginBottom: 2 },
  text: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
});

// Round rows
const roundStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
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

// Main screen layout
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  header: { marginBottom: Spacing.md },
  greeting: { fontSize: FontSize.xl, fontWeight: '600', color: Colors.text },
  greetingName: { fontWeight: '800' },
  date: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  section: { marginBottom: Spacing.sm },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  seeAll: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600', marginBottom: Spacing.sm },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  practiceCard: { backgroundColor: Colors.primary },
  practiceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  practiceTheme: { fontSize: FontSize.md, fontWeight: '700', color: Colors.background, marginBottom: 4 },
  practiceDur: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)' },
  practiceProgress: { alignItems: 'center' },
  progressNum: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.background },
  progressLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: Radius.full },
  cardCta: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  loadingText: { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.sm },
  emptyCard: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyTitle: {
    fontSize: FontSize.md, fontWeight: '700', color: Colors.text,
    marginBottom: Spacing.xs, textAlign: 'center',
  },
  emptyText: {
    fontSize: FontSize.sm, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 20, marginBottom: Spacing.md,
  },
  genBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    alignSelf: 'center',
  },
  genBtnText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.background },
  errorText: { color: Colors.error, textAlign: 'center', marginBottom: Spacing.md, fontSize: FontSize.sm },
});
