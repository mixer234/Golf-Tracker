import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  const absGap = Math.abs(gap);
  const pct = Math.min(95, Math.max(5,
    profile.handicap > 0
      ? (1 - absGap / profile.handicap) * 100
      : 95
  ));

  const completed = rounds.filter((r) => r.isComplete && r.totalScore > 0).slice(0, 5);
  const recentGIR = completed.length > 0
    ? Math.round(completed.reduce((s, r) => s + r.greensInRegulation, 0) / completed.length)
    : null;
  const recentPutts = completed.length > 0
    ? (completed.reduce((s, r) => s + r.totalPutts, 0) / completed.length).toFixed(1)
    : null;

  return (
    <LinearGradient
      colors={[Colors.heroGradientTop, Colors.heroGradientMid, Colors.background]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1.2 }}
      style={heroStyles.card}
    >
      {/* Overline */}
      <Text style={heroStyles.overline}>HANDICAP INDEX</Text>

      {/* Numbers row */}
      <View style={heroStyles.row}>
        <View style={heroStyles.col}>
          <Text style={heroStyles.colLabel}>CURRENT</Text>
          <Text style={heroStyles.colNum}>{formatHandicap(profile.handicap)}</Text>
        </View>
        <View style={heroStyles.middle}>
          {achieved ? (
            <Text style={heroStyles.achievedText}>Goal{'\n'}reached 🎉</Text>
          ) : (
            <>
              <Text style={heroStyles.gapNum}>{absGap.toFixed(1)}</Text>
              <Text style={heroStyles.gapLabel}>to go</Text>
            </>
          )}
        </View>
        <View style={[heroStyles.col, heroStyles.colEnd]}>
          <Text style={heroStyles.colLabel}>TARGET</Text>
          <Text style={[heroStyles.colNum, heroStyles.colNumTarget]}>
            {formatHandicap(profile.targetHandicap)}
          </Text>
        </View>
      </View>

      {/* Thick progress bar */}
      {!achieved && (
        <View style={heroStyles.progressWrap}>
          <View style={heroStyles.progressTrack}>
            <View style={[heroStyles.progressFill, { width: `${pct}%` }]} />
          </View>
          <View style={heroStyles.progressLabels}>
            <Text style={heroStyles.progressLabelText}>Current: {formatHandicap(profile.handicap)}</Text>
            <Text style={heroStyles.progressLabelText}>Goal: {formatHandicap(profile.targetHandicap)}</Text>
          </View>
        </View>
      )}

      {/* Stats strip */}
      {(recentGIR !== null || recentPutts !== null) && (
        <View style={heroStyles.statsStrip}>
          {recentGIR !== null && (
            <View style={heroStyles.statChip}>
              <Text style={heroStyles.statChipNum}>{recentGIR}/18</Text>
              <Text style={heroStyles.statChipLabel}>GIR avg</Text>
            </View>
          )}
          {recentPutts !== null && (
            <View style={heroStyles.statChip}>
              <Text style={heroStyles.statChipNum}>{recentPutts}</Text>
              <Text style={heroStyles.statChipLabel}>putts avg</Text>
            </View>
          )}
          <View style={heroStyles.statChip}>
            <Text style={heroStyles.statChipNum}>{completed.length}</Text>
            <Text style={heroStyles.statChipLabel}>rounds</Text>
          </View>
        </View>
      )}

      {/* Coaching insight */}
      <View style={heroStyles.insightRow}>
        <Text style={heroStyles.insightIcon}>💡</Text>
        <Text style={heroStyles.insightText}>{getHandicapCoachingLine(profile, rounds)}</Text>
      </View>
    </LinearGradient>
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
  const currentRound = useRoundStore((s) => s.currentRound);
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

        {/* ── Resume Round Banner ───────────────────────── */}
        {currentRound && (
          <TouchableOpacity
            style={styles.resumeBanner}
            onPress={() => router.push('/(tabs)/track')}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.resumeTitle}>Round in progress</Text>
              <Text style={styles.resumeSub} numberOfLines={1}>{currentRound.courseName}</Text>
            </View>
            <Text style={styles.resumeArrow}>Resume →</Text>
          </TouchableOpacity>
        )}

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

        {/* ── AI Coach Card ──────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.coachCard}
            onPress={() => router.push('/coach')}
            activeOpacity={0.85}
          >
            <View style={styles.coachLeft}>
              <View style={styles.coachIcon}>
                <Text style={styles.coachIconText}>C</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.coachTitle}>Caddie AI</Text>
                <Text style={styles.coachSubtitle}>Ask your coach anything about your game</Text>
              </View>
            </View>
            <Text style={styles.coachArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* ── Quick Links ───────────────────────────────── */}
        <View style={[styles.section, styles.quickLinksRow]}>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => router.push('/courses')}
            activeOpacity={0.85}
          >
            <Text style={styles.quickLinkIcon}>🏌️</Text>
            <Text style={styles.quickLinkLabel}>My Courses</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLink}
            onPress={() => router.push('/sg')}
            activeOpacity={0.85}
          >
            <Text style={styles.quickLinkIcon}>📊</Text>
            <Text style={styles.quickLinkLabel}>Strokes Gained</Text>
          </TouchableOpacity>
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
            rounds.slice(0, 3).map((round) => <RoundRow key={round.id} round={round} />)
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
  const stripColor = stp <= -3 ? Colors.accent
    : stp < 0 ? Colors.success
    : stp === 0 ? Colors.textSecondary
    : Colors.error;
  const udPct = round.upAndDownAttempts > 0
    ? Math.round((round.upAndDowns / round.upAndDownAttempts) * 100)
    : null;

  return (
    <View style={roundStyles.row}>
      <View style={[roundStyles.strip, { backgroundColor: stripColor }]} />
      <View style={roundStyles.body}>
        <View style={roundStyles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={roundStyles.course} numberOfLines={1}>{round.courseName}</Text>
            <Text style={roundStyles.date}>{date}
              {round.roundType ? ` · ${round.roundType.charAt(0).toUpperCase() + round.roundType.slice(1)}` : ''}
            </Text>
          </View>
          <View style={roundStyles.scoreBlock}>
            <Text style={roundStyles.score}>{round.totalScore}</Text>
            <Text style={[roundStyles.par, { color: stripColor }]}>{parLabel}</Text>
          </View>
        </View>
        <View style={roundStyles.pills}>
          <StatPill label={`${round.greensInRegulation}/18 GIR`} />
          <StatPill label={`${round.totalPutts} putts`} />
          {udPct !== null && <StatPill label={`${udPct}% U&D`} />}
          {round.scoreDifferential !== undefined && (
            <StatPill label={`${round.scoreDifferential > 0 ? '+' : ''}${round.scoreDifferential.toFixed(1)} diff`} accent />
          )}
        </View>
      </View>
    </View>
  );
}

function StatPill({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <View style={[pillStyles.pill, accent && pillStyles.pillAccent]}>
      <Text style={[pillStyles.text, accent && pillStyles.textAccent]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// Handicap hero card
const heroStyles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  overline: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
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
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  colNum: {
    fontSize: FontSize.display,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -2,
    lineHeight: 66,
  },
  colNumTarget: { color: Colors.primaryLight },
  middle: { flex: 1, alignItems: 'center' },
  gapNum: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: -1,
  },
  gapLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
  },
  achievedText: {
    fontSize: FontSize.sm,
    color: Colors.primaryLight,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
  progressWrap: { marginBottom: Spacing.md, gap: 6 },
  progressTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelText: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.4)',
  },
  statsStrip: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 7,
    alignItems: 'center',
  },
  statChipNum: {
    fontSize: FontSize.base,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.95)',
  },
  statChipLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  insightIcon: { fontSize: 13 },
  insightText: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
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
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    ...Shadow.sm,
  },
  value: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  label: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 3, lineHeight: 16 },
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
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  strip: { width: 4 },
  body: { flex: 1, padding: Spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  course: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text },
  date: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  scoreBlock: { alignItems: 'flex-end' },
  score: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  par: { fontSize: FontSize.sm, fontWeight: '700' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
});

const pillStyles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pillAccent: {
    backgroundColor: Colors.accentLight,
    borderColor: Colors.accent + '60',
  },
  text: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  textAccent: { color: Colors.accent },
});

// Main screen layout
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 100 },
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
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '60',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    ...Shadow.sm,
  },
  coachLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  coachIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachIconText: { fontSize: 16, fontWeight: '800', color: Colors.background },
  coachTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  coachSubtitle: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  coachArrow: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '700' },
  quickLinksRow: { flexDirection: 'row', gap: Spacing.md },
  quickLink: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    paddingVertical: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 8,
    ...Shadow.sm,
    borderTopWidth: 3,
    borderTopColor: Colors.primary,
  },
  quickLinkIcon: { fontSize: 24 },
  quickLinkLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary },
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
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '22',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.warning,
  },
  resumeTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.warning },
  resumeSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  resumeArrow: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.warning },
});
