import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { useUserStore } from '../../store/useUserStore';
import { useRoundStore } from '../../store/useRoundStore';
import { usePracticeStore } from '../../store/usePracticeStore';
import { generatePracticePlan } from '../../services/ai';
import { Drill, DayOfWeek, ClubEntry } from '../../types';
import { DEFAULT_BAG } from '../../store/useUserStore';
import { useRouter } from 'expo-router';
import { haptics } from '../../utils/haptics';
import { Toast, useToast } from '../../components/Toast';
import { checkConnection } from '../../utils/network';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const FACILITY_EMOJI: Record<string, string> = {
  driving_range: '🏌️',
  putting_green: '⛳',
  chipping_area: '🎯',
  full_course: '🏌️',
  simulator: '🖥️',
  home_net: '🏠',
};

const FACILITY_SHORT: Record<string, string> = {
  driving_range: 'Range',
  putting_green: 'Putting Green',
  chipping_area: 'Chipping Area',
  full_course: 'Course',
  simulator: 'Simulator',
  home_net: 'Home Net',
};
const REST_DURATION = 30;
const RING_SIZE = 200;
const RING_STROKE = 10;

function todayIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

function formatTime(seconds: number): string {
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.abs(seconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── SVG Progress Ring ─────────────────────────────────────────────────────────

function ProgressRing({
  progress,
  size,
  strokeWidth,
  color,
  children,
}: {
  progress: number; // 0 → 1
  size: number;
  strokeWidth: number;
  color: string;
  children?: React.ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const strokeDashoffset = circ * (1 - Math.max(0, Math.min(1, progress)));
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={Colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc — starts at 12 o'clock */}
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      {children}
    </View>
  );
}

// ── Animated celebration checkmark ────────────────────────────────────────────

function CelebrationCheck({ onReady }: { onReady: () => void }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => onReady());
  }, []);

  return (
    <Animated.View style={[celebStyles.checkWrap, { transform: [{ scale }], opacity }]}>
      <Text style={celebStyles.checkEmoji}>✅</Text>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function PracticeScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const updateClub = useUserStore((s) => s.updateClub);
  const rounds = useRoundStore((s) => s.rounds);
  const {
    currentPlan, isGenerating, generationError, setPlan, setGenerating,
    setGenerationError, markDrillComplete, sessions,
    activeSessionDay, activeSessionStartTime, activeDrillIndex,
    startSession, nextDrill, endSession,
  } = usePracticeStore();

  // ── Existing state ──────────────────────────────────────────────────────────
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex());
  const [expandedDrillId, setExpandedDrillId] = useState<string | null>(null);
  const [showBag, setShowBag] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedInSession, setCompletedInSession] = useState<string[]>([]);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── New session state ───────────────────────────────────────────────────────
  const [sessionPhase, setSessionPhase] = useState<'drill' | 'rest' | 'celebration'>('drill');
  const [drillSecondsLeft, setDrillSecondsLeft] = useState(0);
  const [restSecondsLeft, setRestSecondsLeft] = useState(REST_DURATION);
  const [autoAdvanceCount, setAutoAdvanceCount] = useState<number | null>(null);
  const [skippedDrillIds, setSkippedDrillIds] = useState<string[]>([]);

  const { showToast, toastProps } = useToast();

  const drillTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs for values needed inside setInterval closures
  const drillSecsRef      = useRef(0);
  const restSecsRef       = useRef(REST_DURATION);
  const sessionPhaseRef   = useRef<'drill' | 'rest' | 'celebration'>('drill');
  const completedRef      = useRef<string[]>([]);
  const skippedRef        = useRef<string[]>([]);
  const activeDrillRef    = useRef(0);
  const sessionDrillsRef  = useRef<Drill[]>([]);

  const bag: ClubEntry[] = profile?.bag ?? DEFAULT_BAG;

  // ── Derive session drill info ───────────────────────────────────────────────
  const sessionDayPlan = activeSessionDay
    ? currentPlan?.days.find((d) => d.day === activeSessionDay)
    : null;
  const sessionDrills = sessionDayPlan?.drills ?? [];
  const currentSessionDrill = sessionDrills[activeDrillIndex] ?? null;
  const nextSessionDrill = sessionDrills[activeDrillIndex + 1] ?? null;
  const isSessionActive = !!activeSessionDay && !!activeSessionStartTime;
  const isLastDrill = activeDrillIndex >= sessionDrills.length - 1;

  // Keep refs in sync
  useEffect(() => { activeDrillRef.current = activeDrillIndex; }, [activeDrillIndex]);
  useEffect(() => { sessionDrillsRef.current = sessionDrills; }, [sessionDrills]);
  useEffect(() => { completedRef.current = completedInSession; }, [completedInSession]);
  useEffect(() => { skippedRef.current = skippedDrillIds; }, [skippedDrillIds]);
  useEffect(() => { sessionPhaseRef.current = sessionPhase; }, [sessionPhase]);

  // ── Clear all timers ────────────────────────────────────────────────────────
  const clearAllTimers = useCallback(() => {
    if (drillTimerRef.current) { clearInterval(drillTimerRef.current); drillTimerRef.current = null; }
    if (restTimerRef.current)  { clearInterval(restTimerRef.current);  restTimerRef.current = null; }
    if (autoTimerRef.current)  { clearInterval(autoTimerRef.current);  autoTimerRef.current = null; }
  }, []);

  // ── Advance to celebration ──────────────────────────────────────────────────
  const enterCelebration = useCallback(() => {
    clearAllTimers();
    setSessionPhase('celebration');
    setAutoAdvanceCount(null);
    haptics.success();
    setTimeout(() => haptics.heavy(), 500);
  }, [clearAllTimers]);

  // ── Advance to next drill ───────────────────────────────────────────────────
  const advanceToNextDrill = useCallback(() => {
    clearAllTimers();
    setSessionPhase('drill');
    setRestSecondsLeft(REST_DURATION);
    setAutoAdvanceCount(null);
    nextDrill();
    // drillSecondsLeft will reset in the useEffect below
  }, [clearAllTimers, nextDrill]);

  // ── Start rest period ───────────────────────────────────────────────────────
  const enterRest = useCallback(() => {
    clearAllTimers();
    setSessionPhase('rest');
    setAutoAdvanceCount(null);
    restSecsRef.current = REST_DURATION;
    setRestSecondsLeft(REST_DURATION);
    haptics.light();

    const deadline = Date.now() + REST_DURATION * 1000;
    restTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      if (remaining !== restSecsRef.current) {
        restSecsRef.current = remaining;
        setRestSecondsLeft(remaining);
        if (remaining === 0) {
          clearInterval(restTimerRef.current!);
          restTimerRef.current = null;
          const drills = sessionDrillsRef.current;
          const idx = activeDrillRef.current;
          if (idx >= drills.length - 1) {
            enterCelebration();
          } else {
            advanceToNextDrill();
          }
        }
      }
    }, 200);
  }, [clearAllTimers, enterCelebration, advanceToNextDrill]);

  // ── Start auto-advance countdown (3→2→1→0) ─────────────────────────────────
  const startAutoAdvance = useCallback((isLast: boolean) => {
    let count = 3;
    setAutoAdvanceCount(count);

    autoTimerRef.current = setInterval(() => {
      count--;
      setAutoAdvanceCount(count);
      if (count === 0) {
        clearInterval(autoTimerRef.current!);
        autoTimerRef.current = null;
        setAutoAdvanceCount(null);
        if (isLast) {
          enterCelebration();
        } else {
          enterRest();
        }
      }
    }, 1000);
  }, [enterCelebration, enterRest]);

  // ── Start drill countdown ───────────────────────────────────────────────────
  const startDrillTimer = useCallback((seconds: number, isLast: boolean) => {
    if (drillTimerRef.current) { clearInterval(drillTimerRef.current); drillTimerRef.current = null; }
    drillSecsRef.current = seconds;
    setDrillSecondsLeft(seconds);

    const deadline = Date.now() + seconds * 1000;
    drillTimerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      if (remaining !== drillSecsRef.current) {
        drillSecsRef.current = remaining;
        setDrillSecondsLeft(remaining);
        if (remaining === 10) haptics.warning();
        if (remaining === 0) {
          clearInterval(drillTimerRef.current!);
          drillTimerRef.current = null;
          haptics.success();
          startAutoAdvance(isLast);
        }
      }
    }, 200);
  }, [startAutoAdvance]);

  // ── Session start / end lifecycle ───────────────────────────────────────────
  useEffect(() => {
    if (activeSessionDay && activeSessionStartTime) {
      // Reset session state
      setCompletedInSession([]);
      setSkippedDrillIds([]);
      setSessionPhase('drill');
      setAutoAdvanceCount(null);

      // Elapsed timer (for total session time stat)
      elapsedTimerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - activeSessionStartTime!) / 1000));
      }, 1000);
    } else {
      clearAllTimers();
      if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
      setElapsedSeconds(0);
      setCompletedInSession([]);
      setSkippedDrillIds([]);
      setSessionPhase('drill');
      setAutoAdvanceCount(null);
    }
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [activeSessionDay, activeSessionStartTime]);

  // ── Reset drill timer whenever the active drill changes ─────────────────────
  useEffect(() => {
    if (!isSessionActive || !currentSessionDrill || sessionPhase !== 'drill') return;
    const isLast = activeDrillRef.current >= sessionDrillsRef.current.length - 1;
    startDrillTimer(currentSessionDrill.duration * 60, isLast);
    return () => {
      if (drillTimerRef.current) { clearInterval(drillTimerRef.current); drillTimerRef.current = null; }
    };
  }, [isSessionActive, activeDrillIndex, sessionPhase]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => () => clearAllTimers(), []);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleMarkDone() {
    if (!currentSessionDrill) return;
    clearAllTimers();
    const updated = [...completedRef.current, currentSessionDrill.id];
    setCompletedInSession(updated);
    if (isLastDrill) {
      enterCelebration();
    } else {
      enterRest();
    }
  }

  function handleSkipDrill() {
    Alert.alert('Skip this drill?', 'You can still complete it later from the plan view.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Skip',
        style: 'destructive',
        onPress: () => {
          if (!currentSessionDrill) return;
          haptics.light();
          clearAllTimers();
          const updatedSkipped = [...skippedRef.current, currentSessionDrill.id];
          setSkippedDrillIds(updatedSkipped);
          if (isLastDrill) {
            enterCelebration();
          } else {
            enterRest();
          }
        },
      },
    ]);
  }

  function handleSkipRest() {
    clearAllTimers();
    if (isLastDrill) {
      enterCelebration();
    } else {
      advanceToNextDrill();
    }
  }

  function handleCancelSession() {
    Alert.alert('End Session?', 'Your progress so far will be saved.', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'End Session',
        onPress: () => {
          clearAllTimers();
          endSession(completedRef.current, sessionDrillsRef.current.length);
        },
      },
    ]);
  }

  function handleSessionComplete() {
    endSession(completedRef.current, sessionDrillsRef.current.length);
  }

  function handleLogRound() {
    endSession(completedRef.current, sessionDrillsRef.current.length);
    router.push('/(tabs)/track');
  }

  // ── Plan generation (unchanged) ─────────────────────────────────────────────
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

    if (currentPlan) {
      const hasProgress = currentPlan.days.some((d) => d.completedDrillIds.length > 0);
      const message = hasProgress
        ? 'You have drill progress this week. Regenerating will erase that progress. Continue?'
        : 'This will replace your current practice plan. Continue?';
      Alert.alert('Regenerate Plan?', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Regenerate', style: 'destructive', onPress: doGenerate },
      ]);
      return;
    }

    doGenerate();
  }

  async function doGenerate() {
    const connected = await checkConnection();
    if (!connected) {
      showToast({ type: 'warning', title: 'No internet connection', message: 'Check your connection and try again.' });
      return;
    }
    setGenerating(true);
    setGenerationError(null);
    try {
      const plan = await generatePracticePlan(profile!, rounds, profile!.apiKey!);
      setPlan(plan);
    } catch (err: any) {
      const isNetwork = err instanceof TypeError;
      setGenerationError(err.message ?? 'Failed to generate plan');
      showToast({
        type: 'error',
        title: isNetwork ? 'No internet connection' : "Couldn't generate your plan",
        message: isNetwork ? 'Check your connection and try again.' : 'Tap to try again.',
      });
    } finally {
      setGenerating(false);
    }
  }

  // ── Drill countdown progress (0→1 as time elapses) ─────────────────────────
  const totalDrillSeconds = (currentSessionDrill?.duration ?? 1) * 60;
  const drillProgress = currentSessionDrill
    ? Math.max(0, Math.min(1, (totalDrillSeconds - drillSecondsLeft) / totalDrillSeconds))
    : 0;

  const restProgress = Math.max(0, Math.min(1, (REST_DURATION - restSecondsLeft) / REST_DURATION));

  // ── Focus area label ────────────────────────────────────────────────────────
  const focusLabel = currentPlan?.focusAreas[0]
    ?.replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'General Practice';

  return (
    <SafeAreaView style={styles.container}>

      {/* ── SESSION: DRILL PHASE ──────────────────────────────────────────────── */}
      {isSessionActive && sessionPhase === 'drill' && currentSessionDrill && (
        <View style={styles.sessionOverlay}>
          {/* Header */}
          <View style={styles.sessionHeader}>
            <View>
              <Text style={styles.sessionDay}>{activeSessionDay}</Text>
              <Text style={styles.sessionProgress}>
                Drill {activeDrillIndex + 1} of {sessionDrills.length}
              </Text>
            </View>
            <View style={styles.elapsedBadge}>
              <Text style={styles.elapsedText}>{formatTime(elapsedSeconds)}</Text>
            </View>
          </View>

          {/* Drill progress bar */}
          <View style={styles.sessionProgressBar}>
            <View style={[styles.sessionProgressFill, {
              width: `${(activeDrillIndex / sessionDrills.length) * 100}%`,
            }]} />
          </View>

          {/* Countdown ring + timer */}
          <View style={styles.ringArea}>
            <ProgressRing
              progress={drillProgress}
              size={RING_SIZE}
              strokeWidth={RING_STROKE}
              color={drillSecondsLeft <= 10 && drillSecondsLeft > 0 ? Colors.warning : Colors.primary}
            >
              <View style={styles.ringInner}>
                <Text style={[
                  styles.countdownText,
                  drillSecondsLeft <= 10 && drillSecondsLeft > 0 && styles.countdownWarning,
                ]}>
                  {formatTime(drillSecondsLeft)}
                </Text>
                <Text style={styles.countdownLabel}>remaining</Text>
              </View>
            </ProgressRing>

            {/* Auto-advance overlay */}
            {autoAdvanceCount !== null && (
              <View style={styles.autoAdvanceBanner}>
                <Text style={styles.autoAdvanceText}>
                  {autoAdvanceCount > 0 ? `Next drill in ${autoAdvanceCount}…` : 'Loading next drill…'}
                </Text>
              </View>
            )}
          </View>

          {/* Drill info */}
          <ScrollView style={styles.drillScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.sessionCard}>
              <View style={styles.sessionDrillHeader}>
                <View style={[styles.diffDot, {
                  backgroundColor: currentSessionDrill.difficulty === 'beginner' ? Colors.success
                    : currentSessionDrill.difficulty === 'intermediate' ? Colors.warning
                    : Colors.error,
                }]} />
                <Text style={styles.sessionDrillName}>{currentSessionDrill.name}</Text>
              </View>
              <Text style={styles.sessionDrillDesc}>{currentSessionDrill.description}</Text>

              <View style={styles.sessionMeta}>
                <View style={styles.sessionMetaChip}>
                  <Text style={styles.sessionMetaText}>⏱ {currentSessionDrill.duration} min</Text>
                </View>
                {currentSessionDrill.equipment.length > 0 && (
                  <View style={styles.sessionMetaChip}>
                    <Text style={styles.sessionMetaText}>🎒 {currentSessionDrill.equipment.join(', ')}</Text>
                  </View>
                )}
              </View>

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
            <TouchableOpacity
              style={styles.sessionSkipBtn}
              onPress={handleSkipDrill}
              activeOpacity={0.75}
              disabled={autoAdvanceCount !== null}
            >
              <Text style={styles.sessionSkipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sessionDoneBtn, autoAdvanceCount !== null && { opacity: 0.5 }]}
              onPress={handleMarkDone}
              activeOpacity={0.85}
              disabled={autoAdvanceCount !== null}
            >
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

      {/* ── SESSION: REST PHASE ───────────────────────────────────────────────── */}
      {isSessionActive && sessionPhase === 'rest' && (
        <View style={styles.sessionOverlay}>
          <View style={styles.restContainer}>
            <Text style={styles.restHeading}>Rest</Text>
            <Text style={styles.restSub}>Next drill in {restSecondsLeft}s</Text>

            <ProgressRing
              progress={restProgress}
              size={RING_SIZE}
              strokeWidth={RING_STROKE}
              color={Colors.accent}
            >
              <View style={styles.ringInner}>
                <Text style={styles.restCountdownText}>{restSecondsLeft}</Text>
                <Text style={styles.countdownLabel}>seconds</Text>
              </View>
            </ProgressRing>

            <TouchableOpacity style={styles.skipRestBtn} onPress={handleSkipRest} activeOpacity={0.85}>
              <Text style={styles.skipRestText}>Skip rest →</Text>
            </TouchableOpacity>

            {nextSessionDrill && (
              <View style={styles.nextDrillPreview}>
                <Text style={styles.nextDrillLabel}>UP NEXT</Text>
                <Text style={styles.nextDrillName}>{nextSessionDrill.name}</Text>
                <Text style={styles.nextDrillDesc} numberOfLines={2}>{nextSessionDrill.description}</Text>
                <View style={styles.nextDrillMeta}>
                  <View style={styles.sessionMetaChip}>
                    <Text style={styles.sessionMetaText}>⏱ {nextSessionDrill.duration} min</Text>
                  </View>
                  <View style={[styles.diffPill, {
                    backgroundColor: (nextSessionDrill.difficulty === 'beginner' ? Colors.success
                      : nextSessionDrill.difficulty === 'intermediate' ? Colors.warning
                      : Colors.error) + '25',
                  }]}>
                    <Text style={[styles.diffPillText, {
                      color: nextSessionDrill.difficulty === 'beginner' ? Colors.success
                        : nextSessionDrill.difficulty === 'intermediate' ? Colors.warning
                        : Colors.error,
                    }]}>
                      {nextSessionDrill.difficulty}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.sessionCancelRow} onPress={handleCancelSession}>
            <Text style={styles.sessionCancelText}>End session early</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── SESSION: CELEBRATION PHASE ────────────────────────────────────────── */}
      {isSessionActive && sessionPhase === 'celebration' && (
        <View style={styles.sessionOverlay}>
          <View style={styles.celebContainer}>
            <CelebrationCheck onReady={() => {}} />

            <Text style={styles.celebHeading}>Session complete!</Text>
            <Text style={styles.celebSub}>That's a wrap — great work on the range today.</Text>

            {/* Stats */}
            <View style={styles.celebStats}>
              <View style={styles.celebStatBox}>
                <Text style={styles.celebStatNum}>{completedInSession.length}</Text>
                <Text style={styles.celebStatLabel}>Drills done</Text>
              </View>
              <View style={styles.celebStatDivider} />
              <View style={styles.celebStatBox}>
                <Text style={styles.celebStatNum}>
                  {skippedDrillIds.length > 0 ? skippedDrillIds.length : '—'}
                </Text>
                <Text style={styles.celebStatLabel}>Skipped</Text>
              </View>
              <View style={styles.celebStatDivider} />
              <View style={styles.celebStatBox}>
                <Text style={styles.celebStatNum}>{Math.round(elapsedSeconds / 60)}m</Text>
                <Text style={styles.celebStatLabel}>Total time</Text>
              </View>
            </View>

            {currentPlan?.focusAreas[0] && (
              <View style={styles.focusBadge}>
                <Text style={styles.focusBadgeText}>
                  Focus: {focusLabel}
                </Text>
              </View>
            )}

            <View style={styles.celebActions}>
              <TouchableOpacity style={styles.celebPrimaryBtn} onPress={handleSessionComplete} activeOpacity={0.85}>
                <Text style={styles.celebPrimaryText}>Back to practice</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.celebSecondaryBtn} onPress={handleLogRound} activeOpacity={0.85}>
                <Text style={styles.celebSecondaryText}>Log a round? →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── Normal view (hidden when session active) ──────────────────────────── */}
      {!isSessionActive && (
        <>
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
              ? profile.facilities && profile.facilities.length > 0
                ? `Drills tailored to your ${profile.facilities.length === 1 ? FACILITY_SHORT[profile.facilities[0]] ?? 'facility' : `${profile.facilities.length} facilities`} — generated from your handicap, weaknesses, and goals.`
                : 'Generate a personalized weekly plan based on your handicap, weaknesses, and goals.'
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
              const todayIdx = todayIndex();
              const isToday = index === todayIdx;
              const isPast = index < todayIdx;
              const totalDrills = dayPlanItem?.drills.length ?? 0;
              const doneDrills = dayPlanItem?.completedDrillIds.length ?? 0;
              const allDone = totalDrills > 0 && doneDrills === totalDrills;
              const isMissed = isPast && hasContent && doneDrills === 0;
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayChip,
                    isActive && styles.dayChipActive,
                    !hasContent && styles.dayChipEmpty,
                    allDone && !isActive && styles.dayChipDone,
                    isMissed && !isActive && styles.dayChipMissed,
                    isToday && !isActive && styles.dayChipToday,
                  ]}
                  onPress={() => setSelectedDayIndex(index)}
                  activeOpacity={0.75}
                >
                  <Text style={[
                    styles.dayChipText,
                    isActive && styles.dayChipTextActive,
                    allDone && !isActive && styles.dayChipTextDone,
                    isMissed && !isActive && styles.dayChipTextMissed,
                    isToday && !isActive && styles.dayChipTextToday,
                  ]}>
                    {day.slice(0, 3)}
                  </Text>
                  {totalDrills > 0 && (
                    <Text style={[styles.dayChipCount, isActive && styles.dayChipCountActive]}>
                      {doneDrills}/{totalDrills}
                    </Text>
                  )}
                  {isToday && !isActive && <View style={styles.todayDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {currentPlan?.focusAreas && currentPlan.focusAreas.length > 0 && (
              <WeeklyFocusCard focusAreas={currentPlan.focusAreas} />
            )}
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

                {dayPlan.drills.length > 0 && (
                  <TouchableOpacity
                    style={styles.startSessionBtn}
                    onPress={() => startSession(selectedDayName)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.startSessionText}>▶  Start Practice Session</Text>
                  </TouchableOpacity>
                )}

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

            <PracticeHistorySection sessions={sessions} />

            {/* My Bag */}
            <TouchableOpacity
              style={styles.bagHeader}
              onPress={() => setShowBag(!showBag)}
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
    <Toast {...toastProps} />
  </SafeAreaView>
  );
}

// ── WeeklyFocusCard ────────────────────────────────────────────────────────────

const FOCUS_INFO: Record<string, { label: string; tip: string }> = {
  driving:           { label: 'Driver / Tee Shots',      tip: 'Focus on tempo and staying behind the ball through impact.' },
  long_irons:        { label: 'Long Irons (2–5)',         tip: 'Sweep the ball with a shallow angle of attack and trust the loft.' },
  mid_irons:         { label: 'Mid Irons (6–8)',          tip: 'Ball position center, compress with a slight forward shaft lean.' },
  short_irons:       { label: 'Short Irons (9–PW)',       tip: 'Control trajectory with ball position and finish height.' },
  wedges:            { label: 'Wedge Play',               tip: 'Dial in your three stock distances and commit to each shot.' },
  bunkers:           { label: 'Bunker Shots',             tip: 'Open face, open stance, splash the sand 2 inches behind the ball.' },
  chipping:          { label: 'Chipping & Pitching',      tip: 'Land the ball on your spot and let it run to the hole.' },
  putting:           { label: 'Putting',                  tip: 'Consistent pace and start line. Make 100% of putts inside 4 ft.' },
  mental:            { label: 'Mental Game',              tip: 'One shot at a time. Commit fully, then reset after each shot.' },
  course_management: { label: 'Course Management',        tip: 'Play to your misses. Leave the ball below the hole every time.' },
};

function WeeklyFocusCard({ focusAreas }: { focusAreas: string[] }) {
  if (!focusAreas || focusAreas.length === 0) return null;
  const primary = FOCUS_INFO[focusAreas[0]];
  if (!primary) return null;
  return (
    <View style={focusCardStyles.card}>
      <View style={focusCardStyles.header}>
        <Text style={focusCardStyles.label}>THIS WEEK'S FOCUS</Text>
        <View style={focusCardStyles.areaRow}>
          {focusAreas.slice(0, 3).map((a) => (
            <View key={a} style={focusCardStyles.areaPill}>
              <Text style={focusCardStyles.areaPillText}>{FOCUS_INFO[a]?.label ?? a}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={focusCardStyles.tip}>💡 {primary.tip}</Text>
    </View>
  );
}

const focusCardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    gap: Spacing.sm,
  },
  header: { gap: 6 },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  areaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  areaPill: {
    backgroundColor: Colors.primary + '18',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  areaPillText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  tip: { fontSize: FontSize.sm, color: Colors.primary, lineHeight: 20, fontStyle: 'italic' },
});

// ── PracticeHistorySection ─────────────────────────────────────────────────────

import { PracticeSession } from '../../types';

function PracticeHistorySection({ sessions }: { sessions: PracticeSession[] }) {
  const recent = sessions.slice(0, 8);
  if (recent.length === 0) return null;
  return (
    <View style={histStyles.container}>
      <Text style={histStyles.heading}>Recent Sessions</Text>
      {recent.map((s) => {
        const pct = s.totalDrills > 0
          ? Math.round((s.drillsCompleted.length / s.totalDrills) * 100)
          : 0;
        const mins = Math.round(s.durationSeconds / 60);
        const dateStr = new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return (
          <View key={s.id} style={histStyles.row}>
            <View style={histStyles.rowLeft}>
              <Text style={histStyles.rowDay}>{s.day}</Text>
              <Text style={histStyles.rowDate}>{dateStr}</Text>
            </View>
            <View style={histStyles.rowRight}>
              <Text style={histStyles.rowDrills}>{s.drillsCompleted.length}/{s.totalDrills} drills</Text>
              <View style={histStyles.pctRow}>
                <View style={histStyles.pctTrack}>
                  <View style={[histStyles.pctFill, { width: `${pct}%` as any }]} />
                </View>
                <Text style={histStyles.pctLabel}>{pct}%</Text>
              </View>
            </View>
            <Text style={histStyles.rowTime}>{mins}m</Text>
          </View>
        );
      })}
    </View>
  );
}

const histStyles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  heading: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowLeft: { flex: 1 },
  rowDay: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  rowDate: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
  rowRight: { flex: 1.5, gap: 4 },
  rowDrills: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  pctRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pctTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  pctFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: Radius.full },
  pctLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, minWidth: 28, textAlign: 'right' },
  rowTime: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary, minWidth: 30, textAlign: 'right' },
});

// ── DrillCard (unchanged) ──────────────────────────────────────────────────────

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
      <View style={[drillStyles.diffStrip, { backgroundColor: difficultyColor }]} />

      <View style={{ flex: 1 }}>
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
              <View style={drillStyles.durationPill}>
                <Text style={drillStyles.durationText}>⏱ {drill.duration} min</Text>
              </View>
              <View style={[drillStyles.diffBadge, { backgroundColor: difficultyColor + '20', borderColor: difficultyColor + '40' }]}>
                <Text style={[drillStyles.diffText, { color: difficultyColor }]}>
                  {drill.difficulty}
                </Text>
              </View>
              {drill.facility && drill.facility !== 'anywhere' && (
                <View style={drillStyles.facilityBadge}>
                  <Text style={drillStyles.facilityText}>
                    {FACILITY_EMOJI[drill.facility] ?? '📍'} {FACILITY_SHORT[drill.facility] ?? drill.facility}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <Text style={drillStyles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={drillStyles.expandedContent}>
            {drill.equipment.length > 0 && (
              <View style={drillStyles.section}>
                <Text style={drillStyles.sectionTitle}>Equipment</Text>
                <View style={drillStyles.equipRow}>
                  {drill.equipment.map((item, i) => (
                    <View key={i} style={drillStyles.equipChip}>
                      <Text style={drillStyles.equipText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={drillStyles.section}>
              <Text style={drillStyles.sectionTitle}>Instructions</Text>
              {drill.instructions.map((step, i) => (
                <View key={i} style={drillStyles.stepRow}>
                  <View style={[drillStyles.stepNum, { backgroundColor: difficultyColor + '25' }]}>
                    <Text style={[drillStyles.stepNumText, { color: difficultyColor }]}>{i + 1}</Text>
                  </View>
                  <Text style={drillStyles.step}>{step}</Text>
                </View>
              ))}
            </View>

            {drill.focusPoints.length > 0 && (
              <View style={[drillStyles.section, drillStyles.focusSection]}>
                <Text style={drillStyles.sectionTitle}>Focus Points</Text>
                {drill.focusPoints.map((point, i) => (
                  <View key={i} style={drillStyles.focusRow}>
                    <View style={drillStyles.focusDot} />
                    <Text style={drillStyles.focusPoint}>{point}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const celebStyles = StyleSheet.create({
  checkWrap: {
    width: 100, height: 100,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  checkEmoji: { fontSize: 80 },
});

const drillStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    flexDirection: 'row',
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardCompleted: { opacity: 0.6 },
  diffStrip: { width: 4 },
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
  meta: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', flexWrap: 'wrap' },
  durationPill: {
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  durationText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  diffBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  diffText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  facilityBadge: {
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  facilityText: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600' },
  chevron: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 4 },
  expandedContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.md,
  },
  section: { gap: 6 },
  focusSection: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  equipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  equipChip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  equipText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  stepRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: { fontSize: FontSize.xs, fontWeight: '800' },
  step: { flex: 1, fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
  focusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  focusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 7,
    flexShrink: 0,
  },
  focusPoint: { flex: 1, fontSize: FontSize.sm, color: Colors.primary, lineHeight: 20 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  dayScroll: { maxHeight: 60 },
  dayScrollContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, alignItems: 'center' },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    minWidth: 52,
  },
  dayChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipEmpty: { opacity: 0.4 },
  dayChipDone: { borderColor: Colors.success, backgroundColor: Colors.success + '15' },
  dayChipMissed: { borderColor: Colors.error + '60', backgroundColor: Colors.error + '0A' },
  dayChipToday: { borderColor: Colors.accent, borderWidth: 2 },
  dayChipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  dayChipTextActive: { color: Colors.background },
  dayChipTextDone: { color: Colors.success },
  dayChipTextMissed: { color: Colors.error },
  dayChipTextToday: { color: Colors.accent, fontWeight: '700' },
  dayChipCount: { fontSize: 9, color: Colors.textLight, fontWeight: '700', marginTop: 1 },
  dayChipCountActive: { color: 'rgba(255,255,255,0.75)' },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
    marginTop: 2,
  },
  scroll: { padding: Spacing.lg, paddingBottom: 100 },
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
  bagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bagTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
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
    borderBottomColor: Colors.borderLight,
  },
  bagClub: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text, flex: 1 },
  bagCounter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  bagBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagBtnText: { fontSize: FontSize.lg, color: Colors.text, fontWeight: '300', lineHeight: 22 },
  bagYards: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text, minWidth: 72, textAlign: 'center' },
  bagUnit: { fontSize: FontSize.xs, fontWeight: '400', color: Colors.textSecondary },
  startSessionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  startSessionText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.background,
  },

  // ── Session shared ──────────────────────────────────────────────────────────
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
  sessionDay: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  sessionProgress: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  elapsedBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  elapsedText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  sessionProgressBar: {
    height: 4,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  sessionProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },

  // ── Ring area (drill phase) ─────────────────────────────────────────────────
  ringArea: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  ringInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  countdownWarning: { color: Colors.warning },
  countdownLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600', marginTop: 2 },
  autoAdvanceBanner: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
  },
  autoAdvanceText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },

  // ── Drill scroll + card ─────────────────────────────────────────────────────
  drillScroll: { flex: 1 },
  sessionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },
  sessionDrillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  diffDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  sessionDrillName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, flex: 1 },
  sessionDrillDesc: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.md },
  sessionMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  sessionMetaChip: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sessionMetaText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  sessionSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
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
  sessionBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  sessionBullet: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.primary, marginTop: 7, flexShrink: 0,
  },
  sessionBulletText: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 22, flex: 1 },
  sessionStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  sessionStepNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primaryPale,
    borderWidth: 1, borderColor: Colors.primary + '40',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  sessionStepNumText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  sessionStepText: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 22, flex: 1 },

  // ── Drill actions ───────────────────────────────────────────────────────────
  sessionActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  sessionSkipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  sessionSkipText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textSecondary },
  sessionDoneBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  sessionDoneText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.background },
  sessionCancelRow: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  sessionCancelText: { fontSize: FontSize.sm, color: Colors.textLight, textDecorationLine: 'underline' },

  // ── Rest phase ──────────────────────────────────────────────────────────────
  restContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  restHeading: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.text },
  restSub: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: -Spacing.md },
  restCountdownText: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.accent,
    fontVariant: ['tabular-nums'],
  },
  skipRestBtn: {
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
  },
  skipRestText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.primary },
  nextDrillPreview: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  nextDrillLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  nextDrillName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  nextDrillDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  nextDrillMeta: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  diffPill: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  diffPillText: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },

  // ── Celebration phase ───────────────────────────────────────────────────────
  celebContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  celebHeading: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  celebSub: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: -Spacing.sm },
  celebStats: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: 'stretch',
    ...Shadow.sm,
  },
  celebStatBox: { flex: 1, alignItems: 'center', gap: 4 },
  celebStatNum: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  celebStatLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  celebStatDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  focusBadge: {
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  focusBadgeText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  celebActions: {
    alignSelf: 'stretch',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  celebPrimaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: 'center',
  },
  celebPrimaryText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.background },
  celebSecondaryBtn: {
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  celebSecondaryText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textSecondary },
});
