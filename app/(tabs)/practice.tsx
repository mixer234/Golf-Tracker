import { useState, useEffect, useRef } from 'react';
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
import { Drill, DayOfWeek, ClubEntry, UserProfile, PracticePlan, WeaknessArea } from '../../types';
import { DEFAULT_BAG } from '../../store/useUserStore';
import { WEEKLY_FOCUS_DATA } from '../../constants/data';
import EmptyPracticePlan from '../../components/empty-states/EmptyPracticePlan';
import { useHydration } from '../../hooks/useHydration';
import SkeletonPractice from '../../components/skeletons/SkeletonPractice';
import { useToast } from '../../hooks/useToast';
import { checkConnectivity } from '../../hooks/useNetworkStatus';
import { haptics } from '../../utils/haptics';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ── Week calendar helpers ────────────────────────────────────────────────────

const DAY_LETTERS: { name: DayOfWeek; letter: string }[] = [
  { name: 'Monday', letter: 'M' }, { name: 'Tuesday', letter: 'T' },
  { name: 'Wednesday', letter: 'W' }, { name: 'Thursday', letter: 'T' },
  { name: 'Friday', letter: 'F' }, { name: 'Saturday', letter: 'S' },
  { name: 'Sunday', letter: 'S' },
];

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getWeekDays() {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return DAY_LETTERS.map(({ name, letter }, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { date: d, dayName: name, letter };
  });
}

const DEFAULT_PRACTICE_DAYS: Record<number, DayOfWeek[]> = {
  1: ['Wednesday'], 2: ['Tuesday', 'Saturday'], 3: ['Monday', 'Wednesday', 'Saturday'],
  4: ['Monday', 'Wednesday', 'Friday', 'Saturday'], 5: ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday'],
  6: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  7: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

function getPracticeDays(profile: UserProfile, plan: PracticePlan | null): Set<DayOfWeek> {
  if (plan && plan.days.length > 0) return new Set(plan.days.map((d) => d.day));
  const count = Math.min(7, Math.max(1, profile.practiceDaysPerWeek ?? 3));
  return new Set(DEFAULT_PRACTICE_DAYS[count] ?? DEFAULT_PRACTICE_DAYS[3]);
}

const DEFAULT_FOCUS_ROTATION: WeaknessArea[] = [
  'putting', 'chipping', 'driving', 'mid_irons', 'course_management',
  'wedges', 'short_irons', 'mental', 'long_irons', 'bunkers',
];

function getWeeklyFocusArea(profile: UserProfile, plan: PracticePlan | null, weekNum: number): WeaknessArea {
  if (plan && plan.focusAreas.length > 0) return plan.focusAreas[weekNum % plan.focusAreas.length];
  if (profile.weaknesses.length > 0) return profile.weaknesses[weekNum % profile.weaknesses.length];
  return DEFAULT_FOCUS_ROTATION[weekNum % DEFAULT_FOCUS_ROTATION.length];
}

function WeekCalendar({ profile, plan }: { profile: UserProfile; plan: PracticePlan | null }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekDays = getWeekDays();
  const practiceDays = getPracticeDays(profile, plan);
  const weekNum = getISOWeek(today);

  return (
    <View style={calStyles.card}>
      <View style={calStyles.headerRow}>
        <Text style={calStyles.title}>This Week</Text>
        <View style={calStyles.pill}><Text style={calStyles.pillText}>Wk {weekNum}</Text></View>
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
              <Text style={[calStyles.letter, isPast && !isToday && calStyles.faded]}>{letter}</Text>
              <View style={[calStyles.circle, isToday && calStyles.todayCircle, isPractice && !isToday && calStyles.practiceCircle]}>
                <Text style={[calStyles.dateNum, isToday && calStyles.todayNum, isPast && !isToday && calStyles.faded]}>
                  {date.getDate()}
                </Text>
              </View>
              {hasDone ? <View style={[calStyles.dot, { backgroundColor: Colors.success }]} />
                : isMissed ? <View style={[calStyles.dot, { backgroundColor: Colors.warning }]} />
                : isPractice ? <View style={[calStyles.dot, { backgroundColor: Colors.darkGreen }]} />
                : <View style={calStyles.dot} />}
            </View>
          );
        })}
      </View>
      <View style={calStyles.legend}>
        {[{ color: Colors.darkGreen, label: 'Practice' }, { color: Colors.success, label: 'Done' }, { color: Colors.warning, label: 'Missed' }].map(({ color, label }) => (
          <View key={label} style={calStyles.legendItem}>
            <View style={[calStyles.legendDot, { backgroundColor: color }]} />
            <Text style={calStyles.legendText}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function WeeklyFocusCard({ profile, plan }: { profile: UserProfile; plan: PracticePlan | null }) {
  const weekNum = getISOWeek(new Date());
  const area = getWeeklyFocusArea(profile, plan, weekNum);
  const focus = WEEKLY_FOCUS_DATA[area];
  return (
    <View style={focusStyles.card}>
      <View style={focusStyles.headerRow}>
        <Text style={focusStyles.overline} numberOfLines={1}>WEEKLY FOCUS</Text>
        <View style={focusStyles.pill}><Text style={focusStyles.pillText}>Week {weekNum}</Text></View>
      </View>
      <View style={focusStyles.titleRow}>
        <Text style={focusStyles.emoji}>{focus.emoji}</Text>
        <Text style={focusStyles.title} numberOfLines={1}>{focus.title}</Text>
      </View>
      <Text style={focusStyles.desc} numberOfLines={3}>{focus.desc}</Text>
      <View style={focusStyles.tips}>
        {focus.tips.map((tip, i) => (
          <View key={i} style={focusStyles.tipRow}>
            <View style={focusStyles.bullet} />
            <Text style={focusStyles.tipText} numberOfLines={2}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function todayIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PracticeScreen() {
  const profile = useUserStore((s) => s.profile);
  const updateClub = useUserStore((s) => s.updateClub);
  const rounds = useRoundStore((s) => s.rounds);
  const {
    currentPlan, isGenerating, generationError, setPlan, setGenerating,
    setGenerationError, markDrillComplete,
    activeSessionDay, activeSessionStartTime, activeDrillIndex,
    startSession, nextDrill, endSession,
  } = usePracticeStore();

  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex());
  const [expandedDrillId, setExpandedDrillId] = useState<string | null>(null);
  const [showBag, setShowBag] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedInSession, setCompletedInSession] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { showToast } = useToast();

  const bag: ClubEntry[] = profile?.bag ?? DEFAULT_BAG;

  // Timer for active session
  useEffect(() => {
    if (activeSessionDay && activeSessionStartTime) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - activeSessionStartTime) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedSeconds(0);
      setCompletedInSession([]);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeSessionDay, activeSessionStartTime]);

  // Derive session drill info
  const sessionDayPlan = activeSessionDay
    ? currentPlan?.days.find((d) => d.day === activeSessionDay)
    : null;
  const sessionDrills = sessionDayPlan?.drills ?? [];
  const currentSessionDrill = sessionDrills[activeDrillIndex] ?? null;
  const isSessionActive = !!activeSessionDay && !!activeSessionStartTime;
  const isLastDrill = activeDrillIndex >= sessionDrills.length - 1;

  function handleCompleteDrill() {
    if (!currentSessionDrill) return;
    const updated = [...completedInSession, currentSessionDrill.id];
    setCompletedInSession(updated);
    if (isLastDrill) {
      haptics.success();
      setTimeout(() => haptics.heavy(), 400);
      Alert.alert(
        'Session Complete! 🎯',
        `You nailed ${updated.length} of ${sessionDrills.length} drill${sessionDrills.length > 1 ? 's' : ''}. Great work!`,
        [{ text: 'Done', onPress: () => endSession(updated, sessionDrills.length) }],
      );
    } else {
      haptics.medium();
      nextDrill();
    }
  }

  function handleSkipDrill() {
    haptics.light();
    if (isLastDrill) {
      Alert.alert(
        'Session Finished',
        `Completed ${completedInSession.length} of ${sessionDrills.length} drills.`,
        [{ text: 'Done', onPress: () => endSession(completedInSession, sessionDrills.length) }],
      );
    } else {
      nextDrill();
    }
  }

  function handleCancelSession() {
    haptics.warning();
    Alert.alert('End Session?', 'Your progress so far will be saved.', [
      { text: 'Keep Going', style: 'cancel' },
      { text: 'End Session', onPress: () => endSession(completedInSession, sessionDrills.length) },
    ]);
  }

  const planDays = currentPlan?.days ?? [];
  const selectedDayName = DAYS[selectedDayIndex];
  const dayPlan = planDays.find((d) => d.day === selectedDayName);

  async function handleGenerate() {
    if (!profile?.apiKey) {
      Alert.alert(
        'API Key Required',
        'Add your Claude API key in Profile to generate personalised practice plans.',
        [{ text: 'OK' }]
      );
      return;
    }

    const connected = await checkConnectivity();
    if (!connected) {
      showToast({
        type: 'warning',
        title: 'No internet connection',
        message: 'Check your connection and try again.',
        action: { label: 'Retry', onPress: handleGenerate },
      });
      return;
    }

    haptics.light();
    setGenerating(true);
    setGenerationError(null);
    try {
      const plan = await generatePracticePlan(profile, rounds, profile.apiKey);
      setPlan(plan);
    } catch (err: any) {
      console.error('[Practice] AI generation failed:', err);
      showToast({
        type: 'error',
        title: "Couldn't generate your plan",
        message: 'Something went wrong with the AI. Tap to try again.',
        action: { label: 'Retry', onPress: handleGenerate },
      });
    } finally {
      setGenerating(false);
    }
  }

  const hydrated = useHydration();

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.container}>
        <SkeletonPractice />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Active Session Mode ────────────────────────────────────────────── */}
      {isSessionActive && currentSessionDrill && (
        <View style={styles.sessionOverlay}>
          {/* Session header */}
          <View style={styles.sessionHeader}>
            <View>
              <Text style={styles.sessionDay}>{activeSessionDay}</Text>
              <Text style={styles.sessionProgress}>
                Drill {activeDrillIndex + 1} of {sessionDrills.length}
              </Text>
            </View>
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.sessionProgressBar}>
            <View style={[styles.sessionProgressFill, {
              width: `${(activeDrillIndex / sessionDrills.length) * 100}%`,
            }]} />
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={styles.sessionCard}>
              {/* Drill title */}
              <View style={styles.sessionDrillHeader}>
                <View style={[styles.diffDot, {
                  backgroundColor: currentSessionDrill.difficulty === 'beginner' ? Colors.success
                    : currentSessionDrill.difficulty === 'intermediate' ? Colors.warning
                    : Colors.error,
                }]} />
                <Text style={styles.sessionDrillName}>{currentSessionDrill.name}</Text>
              </View>
              <Text style={styles.sessionDrillDesc} numberOfLines={3}>{currentSessionDrill.description}</Text>

              {/* Duration + Equipment */}
              <View style={styles.sessionMeta}>
                <View style={styles.sessionMetaChip}>
                  <Text style={styles.sessionMetaText} numberOfLines={1}>⏱ {currentSessionDrill.duration} min</Text>
                </View>
                {currentSessionDrill.equipment.length > 0 && (
                  <View style={[styles.sessionMetaChip, { flexShrink: 1 }]}>
                    <Text style={styles.sessionMetaText} numberOfLines={1}>🎒 {currentSessionDrill.equipment.join(', ')}</Text>
                  </View>
                )}
              </View>

              {/* Goal */}
              {currentSessionDrill.focusPoints.length > 0 && (
                <View style={styles.sessionSection}>
                  <Text style={styles.sessionSectionTitle}>GOALS & FOCUS</Text>
                  {currentSessionDrill.focusPoints.map((p, i) => (
                    <View key={i} style={styles.sessionBulletRow}>
                      <View style={styles.sessionBullet} />
                      <Text style={styles.sessionBulletText}>{p}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Instructions */}
              <View style={styles.sessionSection}>
                <Text style={styles.sessionSectionTitle}>INSTRUCTIONS</Text>
                {currentSessionDrill.instructions.map((step, i) => (
                  <View key={i} style={styles.sessionStepRow}>
                    <View style={styles.sessionStepNum}>
                      <Text style={styles.sessionStepNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.sessionStepText}>{step}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.sessionActions}>
            <TouchableOpacity style={styles.sessionSkipBtn} onPress={handleSkipDrill} activeOpacity={0.75}>
              <Text style={styles.sessionSkipText}>{isLastDrill ? 'Finish' : 'Skip →'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sessionDoneBtn} onPress={handleCompleteDrill} activeOpacity={0.85}>
              <Text style={styles.sessionDoneText}>
                ✓  {isLastDrill ? 'Complete Session' : 'Done, Next Drill'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.sessionCancelRow} onPress={handleCancelSession}>
            <Text style={styles.sessionCancelText}>End session early</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Normal view (hidden when session active) ──────────────────────── */}
      {!isSessionActive && (
        <>
      <View style={styles.header}>
        <Text style={styles.title}>Practice Plan</Text>
        {currentPlan && (
          <Text style={styles.subtitle} numberOfLines={1}>Week of {new Date(currentPlan.weekOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
        )}
      </View>

      {!currentPlan && !isGenerating ? (
        <EmptyPracticePlan onPress={handleGenerate} />
      ) : isGenerating ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.darkGreen} />
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
                  onPress={() => { haptics.light(); setSelectedDayIndex(index); }}
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
            <WeekCalendar profile={profile!} plan={currentPlan} />
            <WeeklyFocusCard profile={profile!} plan={currentPlan} />
            {dayPlan ? (
              <>
                <View style={styles.dayHeader}>
                  <View style={{ flex: 1, marginRight: Spacing.sm }}>
                    <Text style={styles.dayTitle} numberOfLines={1}>{dayPlan.day}</Text>
                    <Text style={styles.dayTheme} numberOfLines={2}>{dayPlan.theme}</Text>
                  </View>
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText} numberOfLines={1}>{dayPlan.duration} min</Text>
                  </View>
                </View>

                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel} numberOfLines={1}>
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

                {dayPlan.drills.length > 0 && (
                  <TouchableOpacity
                    style={styles.startSessionBtn}
                    onPress={() => { haptics.medium(); startSession(selectedDayName); }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.startSessionText}>▶  Start Practice Session</Text>
                  </TouchableOpacity>
                )}

                {dayPlan.drills.map((drill) => {
                  const isCompleted = dayPlan.completedDrillIds.includes(drill.id);
                  const isLastUncompleted =
                    !isCompleted &&
                    dayPlan.drills.filter((d) => !dayPlan.completedDrillIds.includes(d.id)).length === 1;
                  return (
                    <DrillCard
                      key={drill.id}
                      drill={drill}
                      isCompleted={isCompleted}
                      isExpanded={expandedDrillId === drill.id}
                      onToggleComplete={() => {
                        if (isCompleted) {
                          haptics.light();
                        } else if (isLastUncompleted) {
                          haptics.success();
                        } else {
                          haptics.medium();
                        }
                        markDrillComplete(dayPlan.day, drill.id);
                      }}
                      onToggleExpand={() => {
                        haptics.light();
                        setExpandedDrillId(expandedDrillId === drill.id ? null : drill.id);
                      }}
                    />
                  );
                })}
              </>
            ) : (
              <View style={styles.restDay}>
                <Text style={styles.restEmoji}>😴</Text>
                <Text style={styles.restTitle}>Rest Day</Text>
                <Text style={styles.restText}>No practice scheduled. Recovery is part of the plan.</Text>
              </View>
            )}

            <TouchableOpacity style={styles.regenerateButton} onPress={() => { haptics.light(); handleGenerate(); }} activeOpacity={0.75}>
              <Text style={styles.regenerateText}>↻  Regenerate Plan</Text>
            </TouchableOpacity>

            {/* My Bag */}
            <TouchableOpacity
              style={styles.bagHeader}
              onPress={() => { haptics.light(); setShowBag(!showBag); }}
              activeOpacity={0.75}
            >
              <Text style={styles.bagTitle}>🏌️ My Bag</Text>
              <Text style={styles.bagChevron}>{showBag ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showBag && (
              <View style={styles.bagCard}>
                <Text style={styles.bagHint}>
                  Set your carry distances. Used to personalise practice drills and club recommendations.
                </Text>
                {bag.map((entry) => (
                  <View key={entry.club} style={styles.bagRow}>
                    <Text style={styles.bagClub}>{entry.club}</Text>
                    <View style={styles.bagCounter}>
                      <TouchableOpacity
                        style={styles.bagBtn}
                        onPress={() => updateClub(entry.club, Math.max(0, entry.carryYards - 5))}
                      >
                        <Text style={styles.bagBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.bagYards}>{entry.carryYards} <Text style={styles.bagUnit}>yds</Text></Text>
                      <TouchableOpacity
                        style={styles.bagBtn}
                        onPress={() => updateClub(entry.club, entry.carryYards + 5)}
                      >
                        <Text style={styles.bagBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </>
      )}
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
          <Text style={drillStyles.description} numberOfLines={2}>{drill.description}</Text>
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

const calStyles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border, ...Shadow.card },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  pill: { backgroundColor: Colors.paleGreen, borderRadius: Radius.circle, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.darkGreen },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  dayCol: { flex: 1, alignItems: 'center', gap: 4 },
  letter: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary },
  faded: { opacity: 0.35 },
  circle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  todayCircle: { backgroundColor: Colors.darkGreen },
  practiceCircle: { borderWidth: 1.5, borderColor: Colors.lightGreen },
  dateNum: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  todayNum: { color: Colors.background, fontWeight: '800' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  legend: { flexDirection: 'row', gap: Spacing.md, paddingTop: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: FontSize.xs, color: Colors.textLight },
});

const focusStyles = StyleSheet.create({
  card: { backgroundColor: Colors.darkGreen, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.card },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  overline: { fontSize: FontSize.xs, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 0.8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  emoji: { fontSize: 24 },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: '#fff', flex: 1 },
  desc: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)', lineHeight: 20, marginBottom: Spacing.sm },
  tips: { gap: 6 },
  tipRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.lightGreen, marginTop: 6, flexShrink: 0 },
  tipText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)', lineHeight: 19, flex: 1 },
  pill: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.circle, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: FontSize.xs, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
});

const drillStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadow.card,
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
    backgroundColor: Colors.darkGreen,
    borderColor: Colors.darkGreen,
  },
  checkmark: { color: Colors.background, fontSize: 14, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: FontSize.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  nameCompleted: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  description: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xs, flexShrink: 1 },
  meta: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  duration: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600' },
  diffBadge: { borderRadius: Radius.circle, paddingHorizontal: 8, paddingVertical: 2 },
  diffText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  chevron: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 4 },
  expandedContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.md,
  },
  section: { gap: 4 },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionText: { fontSize: FontSize.sm, color: Colors.textPrimary },
  step: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20 },
  focusPoint: { fontSize: FontSize.sm, color: Colors.darkGreen, lineHeight: 20 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  dayScroll: { maxHeight: 60 },
  dayScrollContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, alignItems: 'center' },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    minWidth: 56,
  },
  dayChipActive: { backgroundColor: Colors.darkGreen, borderColor: Colors.darkGreen },
  dayChipEmpty: { opacity: 0.5 },
  dayChipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  dayChipTextActive: { color: Colors.background },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.midGreen,
    marginTop: 2,
  },
  scroll: { padding: Spacing.lg, paddingBottom: 100 },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  dayTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  dayTheme: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: 2 },
  durationBadge: {
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.circle,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  durationText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.darkGreen },
  progressRow: { marginBottom: Spacing.md, gap: 6 },
  progressLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: Radius.circle,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.circle,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  emptyText: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  errorText: { fontSize: FontSize.sm, color: Colors.error, textAlign: 'center' },
  generateButton: {
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.circle,
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
  loadingTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  loadingText: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  restDay: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  restEmoji: { fontSize: 48 },
  restTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary },
  restText: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center' },
  regenerateButton: {
    marginTop: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.circle,
    borderWidth: 1.5,
    borderColor: Colors.darkGreen,
    alignItems: 'center',
  },
  regenerateText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.darkGreen },
  bagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bagTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  bagChevron: { fontSize: FontSize.xs, color: Colors.textLight },
  bagCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  bagHint: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  bagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bagClub: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  bagCounter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  bagBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.circle,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagBtnText: { fontSize: FontSize.lg, color: Colors.textPrimary, fontWeight: '300', lineHeight: 22 },
  bagYards: { fontSize: FontSize.base, fontWeight: '700', color: Colors.textPrimary, minWidth: 72, textAlign: 'center' },
  bagUnit: { fontSize: FontSize.xs, fontWeight: '400', color: Colors.textSecondary },

  // ── Session mode ────────────────────────────────────────────────────────────
  sessionOverlay: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  sessionDay: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sessionProgress: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  timerBadge: {
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.circle,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.darkGreen + '40',
  },
  timerText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontVariant: ['tabular-nums'],
  },
  sessionProgressBar: {
    height: 4,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.circle,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  sessionProgressFill: {
    height: '100%',
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.circle,
  },
  sessionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  sessionDrillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  diffDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  sessionDrillName: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    flex: 1,
  },
  sessionDrillDesc: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  sessionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sessionMetaChip: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.circle,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sessionMetaText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  sessionSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sessionSectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sessionBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  sessionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.darkGreen,
    marginTop: 7,
    flexShrink: 0,
  },
  sessionBulletText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    lineHeight: 22,
    flex: 1,
  },
  sessionStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  sessionStepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.paleGreen,
    borderWidth: 1,
    borderColor: Colors.darkGreen + '40',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  sessionStepNumText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.darkGreen,
  },
  sessionStepText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    lineHeight: 22,
    flex: 1,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  sessionSkipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.circle,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  sessionSkipText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  sessionDoneBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: Radius.circle,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
  },
  sessionDoneText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.background,
  },
  sessionCancelRow: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  sessionCancelText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    textDecorationLine: 'underline',
  },
  startSessionBtn: {
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.circle,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  startSessionText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.background,
  },
});
