import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { formatHandicap, formatTargetHandicap } from '../../components/HandicapDial';
import { useUserStore } from '../../store/useUserStore';
import { useRoundStore } from '../../store/useRoundStore';
import { usePracticeStore } from '../../store/usePracticeStore';
import { generatePracticePlan } from '../../services/ai';
import { Round, UserProfile, DayOfWeek } from '../../types';
import { useHydration } from '../../hooks/useHydration';
import SkeletonHome from '../../components/skeletons/SkeletonHome';
import { useToast } from '../../hooks/useToast';
import { checkConnectivity } from '../../hooks/useNetworkStatus';
import { haptics } from '../../utils/haptics';
import { hasValidApiKey, logApiKeyStatus } from '../../config/ai';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function HandicapCard({ profile }: { profile: UserProfile }) {
  const gap = profile.handicap - profile.targetHandicap;
  const achieved = gap <= 0;
  const absGap = Math.abs(Math.round(gap));
  const progress = achieved ? 1 : Math.min(0.95, Math.max(0.05,
    1 - absGap / Math.max(absGap + Math.abs(profile.targetHandicap), 1)
  ));

  return (
    <View style={hStyles.card}>
      <View style={hStyles.row}>
        <View style={hStyles.col}>
          <Text style={hStyles.label}>HANDICAP</Text>
          <Text style={hStyles.num} numberOfLines={1} adjustsFontSizeToFit>
            {formatHandicap(profile.handicap)}
          </Text>
        </View>
        <View style={[hStyles.col, { alignItems: 'flex-end' }]}>
          <Text style={hStyles.label}>TARGET</Text>
          <Text style={[hStyles.num, { color: Colors.lightGreen }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatTargetHandicap(profile.targetHandicap)}
          </Text>
        </View>
      </View>
      <View style={hStyles.barTrack}>
        <View style={[hStyles.barFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={hStyles.gapText}>
        {achieved ? 'Goal reached!' : `${absGap} strokes to go`}
      </Text>
    </View>
  );
}

function RoundRow({ round }: { round: Round }) {
  const date = new Date(round.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const stp = round.scoreToPar;
  const parLabel = stp === 0 ? 'E' : stp > 0 ? `+${stp}` : String(stp);
  const barColor = stp < 0 ? Colors.success : stp > 0 ? Colors.error : Colors.textMuted;
  return (
    <View style={[rStyles.row, { borderLeftColor: barColor }]}>
      <View style={rStyles.left}>
        <Text style={rStyles.course} numberOfLines={1}>{round.courseName}</Text>
        <Text style={rStyles.date}>{date}</Text>
      </View>
      <View style={rStyles.right}>
        <Text style={rStyles.score}>{round.totalScore}</Text>
        <Text style={[rStyles.par, stp < 0 && rStyles.under, stp > 0 && rStyles.over]}>
          {parLabel}
        </Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const rounds = useRoundStore((s) => s.rounds);
  const { currentPlan, isGenerating, setPlan, setGenerating, setGenerationError } = usePracticeStore();

  const { showToast } = useToast();
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
  const todayPlan = currentPlan?.days.find((d) => d.day === todayName);
  const totalDrills = todayPlan?.drills.length ?? 0;
  const doneDrills = todayPlan?.completedDrillIds.length ?? 0;

  async function handleGeneratePlan() {
    logApiKeyStatus();

    if (!hasValidApiKey()) return; // silently skip on home screen if no key

    const connected = await checkConnectivity();
    if (!connected) {
      showToast({
        type: 'warning',
        title: 'No internet connection',
        message: 'Check your connection and try again.',
        action: { label: 'Retry', onPress: handleGeneratePlan },
      });
      return;
    }

    haptics.light();
    setGenerating(true);
    setGenerationError(null);
    try {
      const plan = await generatePracticePlan(profile, rounds);
      haptics.success();
      setPlan(plan);
    } catch (err: any) {
      console.error('[Home] AI generation failed:', err);
      showToast({
        type: 'error',
        title: "Couldn't generate your plan",
        message: 'Something went wrong with the AI. Tap to try again.',
        action: { label: 'Retry', onPress: handleGeneratePlan },
      });
    } finally {
      setGenerating(false);
    }
  }

  const hydrated = useHydration();

  if (!hydrated) {
    return (
      <SafeAreaView style={s.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollLoading}>
          <SkeletonHome />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!profile) return null;

  const firstName = profile.name.split(' ')[0];
  const recentRounds = rounds.slice(0, 3);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.greetingSmall}>{getGreeting().toUpperCase()}</Text>
          <Text style={s.nameLarge}>{firstName}</Text>
        </View>

        {/* Handicap card */}
        <HandicapCard profile={profile} />

        {/* Coach Insight */}
        <View style={s.insightCard}>
          <View style={s.insightHeader}>
            <View style={s.insightDot} />
            <Text style={s.insightLabel}>COACH INSIGHT</Text>
          </View>
          <Text style={s.insightText} numberOfLines={3}>
            {profile.weaknesses?.length > 0
              ? `Focus area this week: ${profile.weaknesses[0].replace(/_/g, ' ')}. Consistent practice builds lasting improvement.`
              : 'Complete your game assessment in Profile to unlock personalised insights.'}
          </Text>
        </View>

        {/* Quick actions — 2×2 grid */}
        <View style={s.actionGrid}>
          {/* Track Round — primary */}
          <TouchableOpacity
            style={[s.actionCard, s.actionCardPrimary]}
            onPress={() => { haptics.light(); router.push('/(tabs)/track'); }}
            activeOpacity={0.85}
          >
            <View style={[s.iconSquare, s.iconSquarePrimary]}>
              <Ionicons name="flag-outline" size={20} color={Colors.midGreen} />
            </View>
            <Text style={s.actionTitle}>Track Round</Text>
            <Text style={s.actionSub}>Log a round</Text>
          </TouchableOpacity>

          {/* Train */}
          <TouchableOpacity
            style={s.actionCard}
            onPress={() => { haptics.light(); router.navigate('/(tabs)/practice'); }}
            activeOpacity={0.85}
          >
            <View style={[s.iconSquare, s.iconSquareSecondary]}>
              <Ionicons name="barbell-outline" size={20} color={Colors.textMuted} />
            </View>
            <Text style={s.actionTitle}>Train</Text>
            <Text style={s.actionSub}>Practice plan</Text>
          </TouchableOpacity>

          {/* Tournaments */}
          <TouchableOpacity
            style={s.actionCard}
            onPress={() => { haptics.light(); router.push('/tournaments'); }}
            activeOpacity={0.85}
          >
            <View style={[s.iconSquare, s.iconSquareSecondary]}>
              <Ionicons name="trophy-outline" size={20} color={Colors.textMuted} />
            </View>
            <Text style={s.actionTitle}>Tournaments</Text>
            <Text style={s.actionSub}>Coming soon</Text>
          </TouchableOpacity>

          {/* Coach */}
          <TouchableOpacity
            style={s.actionCard}
            onPress={() => { haptics.light(); router.push('/coach'); }}
            activeOpacity={0.85}
          >
            <View style={[s.iconSquare, s.iconSquareSecondary]}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.textMuted} />
            </View>
            <Text style={s.actionTitle}>Coach</Text>
            <Text style={s.actionSub}>AI chat</Text>
          </TouchableOpacity>
        </View>

        {/* Today's practice */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Today's Practice</Text>
          {isGenerating ? (
            <View style={s.card}>
              <ActivityIndicator color={Colors.darkGreen} />
              <Text style={s.loadingText}>Building your plan…</Text>
            </View>
          ) : todayPlan ? (
            <TouchableOpacity
              style={[s.card, s.practiceCard]}
              onPress={() => router.navigate('/(tabs)/practice')}
              activeOpacity={0.85}
            >
              <View style={s.practiceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.practiceTheme} numberOfLines={2}>{todayPlan.theme}</Text>
                  <Text style={s.practiceDur}>{todayPlan.duration} min</Text>
                </View>
                <View style={s.progressBox}>
                  <Text style={s.progressNum}>{doneDrills}/{totalDrills}</Text>
                  <Text style={s.progressSub}>done</Text>
                </View>
              </View>
              {totalDrills > 0 && (
                <View style={s.bar}>
                  <View style={[s.barFill, { width: `${(doneDrills / totalDrills) * 100}%` }]} />
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={s.card}>
              <Text style={s.emptyTitle}>Ready to train?</Text>
              <Text style={s.emptyText}>Generate your personalised weekly plan.</Text>
              <TouchableOpacity style={s.genBtn} onPress={handleGeneratePlan}>
                <Text style={s.genBtnText}>Generate Plan</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent rounds */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Recent Rounds</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/track')}>
              <Text style={s.link}>See all →</Text>
            </TouchableOpacity>
          </View>
          {recentRounds.length === 0 ? (
            <View style={[s.card, { alignItems: 'center', paddingVertical: Spacing.xl }]}>
              <Text style={s.emptyTitle}>No rounds yet</Text>
              <Text style={s.emptyText}>Start tracking to see your data here.</Text>
            </View>
          ) : (
            recentRounds.map((round) => <RoundRow key={round.id} round={round} />)
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Handicap card styles ───────────────────────────────────────────────────────

const hStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.md },
  col: { flex: 1 },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.8, marginBottom: 2, textTransform: 'uppercase' },
  num: { fontSize: FontSize.hero, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  barTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.circle, overflow: 'hidden', marginBottom: 6 },
  barFill: { height: '100%', backgroundColor: Colors.lightGreen, borderRadius: Radius.circle },
  gapText: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
});

// ── Round row styles ───────────────────────────────────────────────────────────

const rStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    ...Shadow.card,
  },
  left: { flex: 1, marginRight: Spacing.sm },
  course: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textPrimary },
  date: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  score: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  par: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  under: { color: Colors.success },
  over: { color: Colors.error },
});

// ── Main screen styles ─────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  scrollLoading: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },

  header: { marginBottom: Spacing.md },
  greetingSmall: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 2 },
  nameLarge: { fontSize: FontSize.xxl, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },

  insightCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  insightDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.midGreen },
  insightLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.midGreen, letterSpacing: 0.8 },
  insightText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },

  // 2×2 quick action grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionCard: {
    width: '48.5%',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
    gap: Spacing.sm,
    ...Shadow.card,
  },
  actionCardPrimary: {
    borderWidth: 1.5,
    borderColor: Colors.midGreen,
  },
  iconSquare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSquarePrimary: { backgroundColor: Colors.paleGreen },
  iconSquareSecondary: { backgroundColor: Colors.surfaceAlt },
  actionTitle: { fontSize: 13, fontWeight: '500', color: Colors.darkGreen },
  actionSub: { fontSize: 11, color: Colors.textMuted },

  section: { marginBottom: Spacing.md },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm },
  link: { fontSize: FontSize.sm, color: Colors.darkGreen, fontWeight: '600', marginBottom: Spacing.sm },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  practiceCard: { backgroundColor: Colors.darkGreen, borderWidth: 0 },
  practiceRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  practiceTheme: { fontSize: FontSize.md, fontWeight: '700', color: '#fff', marginBottom: 4 },
  practiceDur: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },
  progressBox: { alignItems: 'center', marginLeft: Spacing.sm },
  progressNum: { fontSize: FontSize.xl, fontWeight: '800', color: '#fff' },
  progressSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
  bar: { height: 5, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: Radius.circle, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: Radius.circle },

  loadingText: { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.sm },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.md },
  genBtn: { backgroundColor: Colors.darkGreen, borderRadius: Radius.circle, paddingVertical: 12, paddingHorizontal: Spacing.xl, alignSelf: 'center' },
  genBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff' },
});
