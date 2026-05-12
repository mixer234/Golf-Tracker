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
import { Round, UserProfile, DayOfWeek } from '../../types';
import { useHydration } from '../../hooks/useHydration';
import SkeletonHome from '../../components/skeletons/SkeletonHome';
import { useToast } from '../../hooks/useToast';
import { checkConnectivity } from '../../hooks/useNetworkStatus';
import { haptics } from '../../utils/haptics';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function avgScore(rounds: Round[]): string {
  const done = rounds.filter((r) => r.isComplete && r.totalScore > 0).slice(0, 5);
  if (!done.length) return '—';
  return (done.reduce((s, r) => s + r.totalScore, 0) / done.length).toFixed(1);
}

function HandicapCard({ profile, rounds }: { profile: UserProfile; rounds: Round[] }) {
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
          <Text style={hStyles.label}>CURRENT</Text>
          <Text style={hStyles.num} numberOfLines={1} adjustsFontSizeToFit>
            {formatHandicap(profile.handicap)}
          </Text>
        </View>

        <View style={hStyles.mid}>
          {achieved ? (
            <Text style={hStyles.achieved}>Goal{'\n'}reached!</Text>
          ) : (
            <>
              <Text style={hStyles.gap}>{absGap}</Text>
              <Text style={hStyles.gapSub}>to go</Text>
            </>
          )}
        </View>

        <View style={[hStyles.col, { alignItems: 'flex-end' }]}>
          <Text style={hStyles.label}>TARGET</Text>
          <Text style={[hStyles.num, { color: Colors.primaryLight }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatHandicap(profile.targetHandicap)}
          </Text>
        </View>
      </View>

      {!achieved && (
        <View style={hStyles.barTrack}>
          <View style={[hStyles.barFill, { width: `${progress * 100}%` }]} />
        </View>
      )}
    </View>
  );
}

function RoundRow({ round }: { round: Round }) {
  const date = new Date(round.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const stp = round.scoreToPar;
  const parLabel = stp === 0 ? 'E' : stp > 0 ? `+${stp}` : String(stp);
  return (
    <View style={rStyles.row}>
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
  const { currentPlan, isGenerating, generationError, setPlan, setGenerating, setGenerationError } =
    usePracticeStore();

  const { showToast } = useToast();
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
  const todayPlan = currentPlan?.days.find((d) => d.day === todayName);
  const totalDrills = todayPlan?.drills.length ?? 0;
  const doneDrills = todayPlan?.completedDrillIds.length ?? 0;

  async function handleGeneratePlan() {
    if (!profile?.apiKey) { router.push('/(tabs)/profile'); return; }

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
      const plan = await generatePracticePlan(profile, rounds, profile.apiKey);
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
        <ScrollView showsVerticalScrollIndicator={false}>
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
          <Text style={s.greeting} numberOfLines={1}>
            {getGreeting()}, <Text style={s.name}>{firstName}</Text>
          </Text>
          <Text style={s.avg}>Avg score: {avgScore(rounds)}</Text>
        </View>

        {/* Handicap */}
        <HandicapCard profile={profile} rounds={rounds} />

        {/* Quick actions */}
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.actionBtn, s.actionPrimary]}
            onPress={() => { haptics.light(); router.push('/(tabs)/track'); }}
            activeOpacity={0.85}
          >
            <Text style={s.actionIcon}>⛳</Text>
            <Text style={s.actionLabel} numberOfLines={1}>Track Round</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, s.actionSecondary]}
            onPress={() => { haptics.light(); router.push('/(tabs)/practice'); }}
            activeOpacity={0.85}
          >
            <Text style={s.actionIcon}>🎯</Text>
            <Text style={s.actionLabel} numberOfLines={1}>Practice</Text>
          </TouchableOpacity>
        </View>

        {/* Today's practice */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Today's Practice</Text>
          {isGenerating ? (
            <View style={s.card}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={s.loadingText}>Building your plan…</Text>
            </View>
          ) : todayPlan ? (
            <TouchableOpacity
              style={[s.card, s.practiceCard]}
              onPress={() => router.push('/(tabs)/practice')}
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
              {!profile.apiKey ? (
                <>
                  <Text style={s.emptyTitle}>No plan yet</Text>
                  <Text style={s.emptyText}>Add your Claude API key in Profile to unlock AI plans.</Text>
                  <TouchableOpacity style={s.genBtn} onPress={() => { haptics.light(); router.push('/(tabs)/profile'); }}>
                    <Text style={s.genBtnText}>Add API Key</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={s.emptyTitle}>Ready to train?</Text>
                  <Text style={s.emptyText}>Generate your personalised weekly plan.</Text>
                  <TouchableOpacity style={s.genBtn} onPress={handleGeneratePlan}>
                    <Text style={s.genBtnText}>Generate Plan 🎯</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {/* Recent rounds */}
        <View style={[s.section, { marginBottom: Spacing.xxl }]}>
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

const hStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  col: { flex: 1 },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.8, marginBottom: 2 },
  num: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.background, letterSpacing: -1 },
  mid: { flex: 1, alignItems: 'center' },
  gap: { fontSize: FontSize.xxl, fontWeight: '800', color: 'rgba(255,255,255,0.9)' },
  gapSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },
  achieved: { fontSize: FontSize.sm, color: Colors.primaryLight, fontWeight: '700', textAlign: 'center' },
  barTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.full, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.primaryLight, borderRadius: Radius.full },
});

const rStyles = StyleSheet.create({
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
  left: { flex: 1, marginRight: Spacing.sm },
  course: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text },
  date: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  score: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  par: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  under: { color: Colors.success },
  over: { color: Colors.error },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },

  header: { marginBottom: Spacing.md },
  greeting: { fontSize: FontSize.xl, fontWeight: '600', color: Colors.text },
  name: { fontWeight: '800' },
  avg: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  actions: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  actionBtn: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: 4,
    ...Shadow.sm,
  },
  actionPrimary: { backgroundColor: Colors.primary },
  actionSecondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  actionIcon: { fontSize: 22 },
  actionLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },

  section: { marginBottom: Spacing.md },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  link: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600', marginBottom: Spacing.sm },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  practiceCard: { backgroundColor: Colors.primary, borderWidth: 0 },
  practiceRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  practiceTheme: { fontSize: FontSize.md, fontWeight: '700', color: Colors.background, marginBottom: 4 },
  practiceDur: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },
  progressBox: { alignItems: 'center', marginLeft: Spacing.sm },
  progressNum: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.background },
  progressSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
  bar: { height: 5, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: Radius.full, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: Radius.full },

  loadingText: { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.sm },
  emptyTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: Spacing.xs },
  emptyText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.md },
  genBtn: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingVertical: 12, paddingHorizontal: Spacing.xl, alignSelf: 'center' },
  genBtnText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.background },
  errorText: { color: Colors.error, textAlign: 'center', marginBottom: Spacing.md, fontSize: FontSize.sm },
});
