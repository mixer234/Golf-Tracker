import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { formatHandicap } from '../../components/HandicapDial';
import { useUserStore } from '../../store/useUserStore';
import { useRoundStore } from '../../store/useRoundStore';
import { usePracticeStore } from '../../store/usePracticeStore';
import { generatePracticePlan } from '../../services/ai';
import { haptics } from '../../utils/haptics';
import { Round, UserProfile, PracticePlan, DayOfWeek, WeaknessArea, PracticeSession } from '../../types';
import { WEEKLY_FOCUS_DATA } from '../../constants/data';

const SG_TIP_KEY = '@golf_sg_tip_dismissed';
const DIAGNOSTIC_REMINDER_KEY = '@golf_diagnostic_reminder_shown';

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
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return DAY_ORDER.map(({ name, letter }, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { date: d, dayName: name, letter };
  });
}

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

// ─── Streak calculation ───────────────────────────────────────────────────────

function calcStreak(sessions: PracticeSession[]): { current: number; longest: number } {
  if (sessions.length === 0) return { current: 0, longest: 0 };

  // Unique calendar dates that had at least one session, sorted ascending.
  const uniqueDates = Array.from(
    new Set(sessions.map((s) => s.date.split('T')[0]))
  ).sort();

  // Longest streak ever
  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1]);
    const curr = new Date(uniqueDates[i]);
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current streak: count backwards from today (or yesterday, to allow for not
  // yet practising today without breaking the streak).
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const dateSet = new Set(uniqueDates);

  let current = 0;
  const startStr = dateSet.has(todayStr) ? todayStr : dateSet.has(yesterdayStr) ? yesterdayStr : null;
  if (startStr) {
    const cursor = new Date(startStr);
    while (dateSet.has(cursor.toISOString().split('T')[0])) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return { current, longest: Math.max(longest, current) };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function getHandicapCoachingLine(profile: UserProfile, rounds: Round[]): string {
  const completed = rounds.filter((r) => r.isComplete && r.totalScore > 0).slice(0, 5);
  if (completed.length === 0) return 'Start tracking rounds to see your progress.';

  const avgPutts = completed.reduce((s, r) => s + r.totalPutts, 0) / completed.length;

  // Beginner tips: focus on simple, achievable wins
  if (profile.handicap >= 28) {
    if (avgPutts > 38) return `Averaging ${avgPutts.toFixed(0)} putts per round — try to 2-putt every green and you'll save strokes fast.`;
    if (avgPutts > 34) return `Focus on getting the ball onto the green and avoiding big numbers — consistency beats perfection.`;
    return `Every round you log helps build your game. Keep it simple: one shot at a time.`;
  }

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
      <Text style={heroStyles.overline}>HANDICAP INDEX</Text>

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

function StreakCard({ sessions }: { sessions: PracticeSession[] }) {
  const { current, longest } = calcStreak(sessions);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekDays = getWeekDays();
  // One entry per calendar date that had a session
  const sessionDateStrings = new Set(sessions.map((s) => s.date.split('T')[0]));

  return (
    <View style={streakStyles.card}>
      <View style={streakStyles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={streakStyles.overline}>PRACTICE STREAK</Text>
          {current === 0 ? (
            <Text style={streakStyles.emptyText}>Start your streak today</Text>
          ) : (
            <View style={streakStyles.streakRow}>
              <Text style={streakStyles.streakNum}>{current}</Text>
              <Text style={streakStyles.streakUnit}> day{current !== 1 ? 's' : ''} 🔥</Text>
            </View>
          )}
        </View>
        <View style={streakStyles.longestBlock}>
          <Text style={streakStyles.longestLabel}>Best</Text>
          <Text style={streakStyles.longestNum}>{longest === 0 ? '—' : longest}</Text>
        </View>
      </View>

      {/* 7-day session dots */}
      <View style={streakStyles.dotsRow}>
        {weekDays.map(({ date, dayName, letter }) => {
          const isToday = isSameDay(date, today);
          const isPast = date < today && !isToday;
          const dateStr = date.toISOString().split('T')[0];
          const hadSession = sessionDateStrings.has(dateStr);
          const isFuture = date > today;

          return (
            <View key={dayName} style={streakStyles.dotCol}>
              <Text style={[streakStyles.dotLabel, (isPast || isFuture) && !isToday && streakStyles.dotLabelFaded]}>
                {letter}
              </Text>
              <View
                style={[
                  streakStyles.dot,
                  hadSession && streakStyles.dotDone,
                  isToday && !hadSession && streakStyles.dotToday,
                  isPast && !hadSession && streakStyles.dotMissed,
                  isFuture && streakStyles.dotFuture,
                ]}
              />
            </View>
          );
        })}
      </View>
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
  const { currentPlan, sessions, isGenerating, generationError, setPlan, setGenerating, setGenerationError } =
    usePracticeStore();

  const fingerprint = useUserStore((s) => s.fingerprint);
  const [refreshing, setRefreshing] = useState(false);
  const [showSGTip, setShowSGTip] = useState(false);
  const [showDiagnosticReminder, setShowDiagnosticReminder] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  // Show SG tip when there are completed rounds with no SG data, up to 5 such rounds,
  // and the user hasn't dismissed it yet.
  useEffect(() => {
    const completed = rounds.filter((r) => r.isComplete && r.totalScore > 0);
    const noSGRounds = completed.filter((r) => !r.sgTotal).length;
    if (noSGRounds === 0 || noSGRounds > 5) { setShowSGTip(false); return; }
    AsyncStorage.getItem(SG_TIP_KEY).then((val) => {
      setShowSGTip(val !== 'true');
    });
  }, [rounds]);

  function dismissSGTip() {
    haptics.light();
    setShowSGTip(false);
    AsyncStorage.setItem(SG_TIP_KEY, 'true');
  }

  // Show diagnostic reminder once after first practice plan is generated for users who skipped assessment
  useEffect(() => {
    if (fingerprint) { setShowDiagnosticReminder(false); return; }
    const completedRounds = rounds.filter((r) => r.isComplete).length;
    if (completedRounds === 0) return;
    AsyncStorage.getItem(DIAGNOSTIC_REMINDER_KEY).then((val) => {
      if (val !== 'true') setShowDiagnosticReminder(true);
    });
  }, [fingerprint, rounds.length]);

  function dismissDiagnosticReminder() {
    haptics.light();
    setShowDiagnosticReminder(false);
    AsyncStorage.setItem(DIAGNOSTIC_REMINDER_KEY, 'true');
  }

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
  const todayPlan = currentPlan?.days.find((d) => d.day === todayName);
  const totalDrillsToday = todayPlan?.drills.length ?? 0;
  const completedToday = todayPlan?.completedDrillIds.length ?? 0;

  // Last 3 completed rounds with a score
  const recentRounds = rounds
    .filter((r) => r.isComplete && r.totalScore > 0)
    .slice(0, 3);

  // First name with safe fallback for empty/blank name
  const firstName = profile?.name?.trim().split(' ')[0] || 'Golfer';

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >

        {/* ── Header ────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {getGreeting()},{' '}
            <Text style={styles.greetingName}>{firstName}</Text> 👋
          </Text>
          <Text style={styles.date}>{formatHeaderDate()}</Text>
        </View>

        {/* ── Quick Actions ─────────────────────────────── */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => { haptics.medium(); router.push('/(tabs)/track'); }}
            activeOpacity={0.85}
          >
            <Text style={styles.quickActionIcon}>⛳</Text>
            <Text style={styles.quickActionLabel}>Track Round</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, styles.quickActionPrimary]}
            onPress={() => { haptics.medium(); router.push('/(tabs)/practice'); }}
            activeOpacity={0.85}
          >
            <Text style={styles.quickActionIcon}>🎯</Text>
            <Text style={[styles.quickActionLabel, styles.quickActionLabelPrimary]}>Practice</Text>
          </TouchableOpacity>
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

        {/* ── SG Discovery Tip / Beginner Tip ─────────── */}
        {showSGTip && (
          profile.handicap >= 28 ? (
            <View style={styles.sgTipCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sgTipTitle}>
                  🏌️ Beginner tip
                </Text>
                <Text style={styles.sgTipBody}>
                  Focus on strokes and putts for now. As your game improves you can unlock fairways, GIR, and Strokes Gained tracking.
                </Text>
              </View>
              <TouchableOpacity onPress={dismissSGTip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.sgTipDismiss}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.sgTipCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sgTipTitle}>
                  💡 Tip: Unlock Strokes Gained
                </Text>
                <Text style={styles.sgTipBody}>
                  Enter approach distances during your round to unlock Strokes Gained — golf's most powerful stat.
                </Text>
              </View>
              <TouchableOpacity onPress={dismissSGTip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.sgTipDismiss}>✕</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {/* ── Diagnostic reminder card ─────────────────── */}
        {showDiagnosticReminder && (
          <View style={styles.diagnosticCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.diagnosticTitle}>🎯 Get a more personalised plan</Text>
              <Text style={styles.diagnosticBody}>
                Complete your 3-minute game assessment and your practice plans will be tailored to your exact struggles — not just your handicap.
              </Text>
              <TouchableOpacity
                onPress={() => { dismissDiagnosticReminder(); router.push('/diagnostic'); }}
                activeOpacity={0.85}
              >
                <Text style={styles.diagnosticCTA}>Start assessment →</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={dismissDiagnosticReminder}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.diagnosticDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
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

        {/* ── Streak ────────────────────────────────────── */}
        <StreakCard sessions={sessions} />

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
                  <Text style={styles.practiceDur}>
                    {todayPlan.duration} min · {totalDrillsToday} drill{totalDrillsToday !== 1 ? 's' : ''}
                  </Text>
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
              <Text style={styles.cardCta}>
                {completedToday === 0
                  ? 'Start Practice →'
                  : completedToday >= totalDrillsToday
                  ? 'Session complete ✓'
                  : `Continue (${completedToday}/${totalDrillsToday} done) →`}
              </Text>
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
          {recentRounds.length === 0 ? (
            <View style={[styles.card, styles.emptyCard]}>
              <Text style={styles.emptyTitle}>No rounds yet</Text>
              <Text style={styles.emptyText}>
                Start tracking rounds to see your data here.
              </Text>
            </View>
          ) : (
            recentRounds.map((round) => <RoundRow key={round.id} round={round} />)
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
    color: Colors.text,
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

const streakStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    ...Shadow.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  overline: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  streakNum: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  streakUnit: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  longestBlock: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  longestLabel: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  longestNum: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.accent,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  dotCol: { flex: 1, alignItems: 'center', gap: 5 },
  dotLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  dotLabelFaded: { opacity: 0.4 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.borderLight,
  },
  dotDone: { backgroundColor: Colors.success },
  dotToday: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dotMissed: { backgroundColor: Colors.border },
  dotFuture: { backgroundColor: Colors.borderLight },
});

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 120 },
  header: { marginBottom: Spacing.md },
  greeting: { fontSize: FontSize.xl, fontWeight: '600', color: Colors.text },
  greetingName: { fontWeight: '800' },
  date: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  quickActionPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  quickActionIcon: { fontSize: 18 },
  quickActionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  quickActionLabelPrimary: { color: Colors.background },
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
  sgTipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent,
    ...Shadow.sm,
  },
  sgTipTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  sgTipBody: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  sgTipDismiss: { fontSize: 16, color: Colors.textLight, fontWeight: '600', paddingLeft: 4 },
  diagnosticCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    ...Shadow.sm,
  },
  diagnosticTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  diagnosticBody: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16, marginBottom: 8 },
  diagnosticCTA: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  diagnosticDismiss: { fontSize: 16, color: Colors.textLight, fontWeight: '600', paddingLeft: 4 },
});
