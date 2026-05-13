import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../constants/theme';
import { useRoundStore } from '../store/useRoundStore';
import { calcSGAverages } from '../utils/strokesGained';
import { Round } from '../types';

const SG_CATEGORIES = [
  { key: 'sgOffTee' as const, label: 'Off the Tee', short: 'OTT', emoji: '🏌️' },
  { key: 'sgApproach' as const, label: 'Approach', short: 'APP', emoji: '🎯' },
  { key: 'sgAroundGreen' as const, label: 'Around Green', short: 'ARG', emoji: '🌿' },
  { key: 'sgPutting' as const, label: 'Putting', short: 'PUT', emoji: '⛳' },
];

function sgColor(v: number): string {
  if (v > 0.5) return Colors.success;
  if (v < -0.5) return Colors.error;
  return Colors.textSecondary;
}

function sgSign(v: number): string {
  return v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
}

function SGOverallBar({ label, value, maxAbs }: { label: string; value: number; maxAbs: number }) {
  const pct = maxAbs > 0 ? Math.min(100, (Math.abs(value) / maxAbs) * 100) : 0;
  const color = sgColor(value);
  const isPos = value >= 0;

  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label}>{label}</Text>
      <View style={barStyles.track}>
        <View style={barStyles.center} />
        {isPos ? (
          <View style={[barStyles.fill, barStyles.fillRight, { width: `${pct / 2}%`, backgroundColor: color }]} />
        ) : (
          <View style={[barStyles.fill, barStyles.fillLeft, { width: `${pct / 2}%`, backgroundColor: color }]} />
        )}
      </View>
      <Text style={[barStyles.value, { color }]}>{sgSign(value)}</Text>
    </View>
  );
}

function RoundSGCard({ round }: { round: Round }) {
  const hasSG = round.sgTotal !== undefined && round.sgTotal !== null;
  if (!hasSG) return null;

  const total = round.sgTotal as number;
  const totalColor = sgColor(total);
  const stp = round.scoreToPar;
  const parLabel = stp === 0 ? 'E' : stp > 0 ? `+${stp}` : String(stp);

  return (
    <View style={cardStyles.card}>
      {/* Card header */}
      <View style={cardStyles.header}>
        <View style={{ flex: 1 }}>
          <Text style={cardStyles.course} numberOfLines={1}>{round.courseName}</Text>
          <Text style={cardStyles.date}>
            {new Date(round.date).toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
            })}
            {round.roundType ? ` · ${round.roundType.charAt(0).toUpperCase() + round.roundType.slice(1)}` : ''}
          </Text>
        </View>
        <View style={cardStyles.scoreBlock}>
          <Text style={cardStyles.score}>{round.totalScore}</Text>
          <Text style={[cardStyles.par, stp < 0 ? { color: Colors.success } : stp > 0 ? { color: Colors.error } : {}]}>
            {parLabel}
          </Text>
        </View>
      </View>

      {/* SG category chips */}
      <View style={cardStyles.chips}>
        {SG_CATEGORIES.map(({ key, short }) => {
          const val = round[key] as number | undefined;
          if (val === undefined || val === null) return null;
          const col = sgColor(val);
          return (
            <View key={key} style={[cardStyles.chip, { borderColor: col + '60' }]}>
              <Text style={[cardStyles.chipLabel, { color: Colors.textLight }]}>{short}</Text>
              <Text style={[cardStyles.chipVal, { color: col }]}>{sgSign(val)}</Text>
            </View>
          );
        })}
      </View>

      {/* Total bar */}
      <View style={cardStyles.totalRow}>
        <Text style={cardStyles.totalLabel}>TOTAL SG</Text>
        <View style={cardStyles.totalBar}>
          <View style={[
            cardStyles.totalFill,
            {
              width: `${Math.min(100, Math.abs(total) / 6 * 100)}%`,
              backgroundColor: totalColor,
              alignSelf: total >= 0 ? 'flex-start' : 'flex-end',
            },
          ]} />
        </View>
        <Text style={[cardStyles.totalVal, { color: totalColor }]}>{sgSign(total)}</Text>
      </View>
    </View>
  );
}

export default function SGScreen() {
  const router = useRouter();
  const rounds = useRoundStore((s) => s.rounds);
  const completed = rounds.filter((r) => r.isComplete && r.totalScore > 0);
  const withSG = completed.filter((r) => r.sgTotal !== undefined && r.sgTotal !== null);
  const averages = calcSGAverages(completed);

  const maxAbs = averages
    ? Math.max(
        Math.abs(averages.sgOffTee),
        Math.abs(averages.sgApproach),
        Math.abs(averages.sgAroundGreen),
        Math.abs(averages.sgPutting),
        0.5
      )
    : 2;

  // Category trend: last 10 rounds with SG
  const last10 = withSG.slice(0, 10);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Strokes Gained</Text>
        <View style={{ minWidth: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Strokes Gained</Text>
        <Text style={styles.subtitle}>
          Measures each part of your game vs. a scratch-level baseline.{'\n'}
          Positive = better than scratch on those shots.
        </Text>

        {withSG.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>No SG data yet</Text>
            <Text style={styles.emptyText}>
              When tracking rounds, expand{' '}
              <Text style={{ color: Colors.primary, fontWeight: '700' }}>Performance Details</Text>{' '}
              on each hole and enter Approach Distance and First Putt Distance to unlock Strokes Gained analysis.
            </Text>
          </View>
        ) : (
          <>
            {/* Overall averages */}
            {averages && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Average per Round{' '}
                  <Text style={styles.sectionSub}>({averages.roundCount} round{averages.roundCount > 1 ? 's' : ''})</Text>
                </Text>
                <View style={styles.overallCard}>
                  {SG_CATEGORIES.map(({ key, label, emoji }) => (
                    <SGOverallBar
                      key={key}
                      label={`${emoji} ${label}`}
                      value={averages[key]}
                      maxAbs={maxAbs}
                    />
                  ))}
                  <View style={styles.divider} />
                  <View style={barStyles.row}>
                    <Text style={[barStyles.label, { fontWeight: '700', color: Colors.text }]}>Total</Text>
                    <View style={barStyles.track}>
                      <View style={barStyles.center} />
                      {averages.sgTotal >= 0 ? (
                        <View style={[barStyles.fill, barStyles.fillRight, {
                          width: `${Math.min(100, averages.sgTotal / (maxAbs * 2) * 100)}%`,
                          backgroundColor: sgColor(averages.sgTotal),
                        }]} />
                      ) : (
                        <View style={[barStyles.fill, barStyles.fillLeft, {
                          width: `${Math.min(100, Math.abs(averages.sgTotal) / (maxAbs * 2) * 100)}%`,
                          backgroundColor: sgColor(averages.sgTotal),
                        }]} />
                      )}
                    </View>
                    <Text style={[barStyles.value, { color: sgColor(averages.sgTotal), fontSize: FontSize.md, fontWeight: '800' }]}>
                      {sgSign(averages.sgTotal)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Category breakdown explainer */}
            <View style={styles.explainerGrid}>
              {SG_CATEGORIES.map(({ key, short, label, emoji }) => {
                const val = averages ? averages[key] : null;
                const col = val !== null ? sgColor(val) : Colors.textSecondary;
                return (
                  <View key={key} style={[styles.explainerCard, { borderColor: col + '50' }]}>
                    <Text style={styles.explainerEmoji}>{emoji}</Text>
                    <Text style={styles.explainerShort}>{short}</Text>
                    <Text style={[styles.explainerVal, { color: col }]}>
                      {val !== null ? sgSign(val) : '—'}
                    </Text>
                    <Text style={styles.explainerLabel}>{label}</Text>
                  </View>
                );
              })}
            </View>

            {/* Per-round trend chart */}
            {last10.length >= 2 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Total SG — Last {last10.length} Rounds</Text>
                <View style={styles.trendCard}>
                  <SGTrendChart rounds={[...last10].reverse()} />
                </View>
              </View>
            )}

            {/* Per-round history */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Round Breakdown</Text>
              {withSG.length === 0 ? (
                <Text style={styles.emptyText}>No rounds with SG data yet.</Text>
              ) : (
                <View style={{ gap: Spacing.sm }}>
                  {withSG.map((round) => (
                    <RoundSGCard key={round.id} round={round} />
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SGTrendChart({ rounds }: { rounds: Round[] }) {
  const vals = rounds.map((r) => (r.sgTotal as number) ?? 0);
  const min = Math.min(...vals, -2) - 0.5;
  const max = Math.max(...vals, 2) + 0.5;
  const range = max - min;
  const chartH = 100;
  const zeroY = ((max - 0) / range) * chartH;

  return (
    <View style={trendStyles.wrap}>
      {/* Zero line label */}
      <View style={[trendStyles.zeroLine, { top: zeroY }]}>
        <Text style={trendStyles.zeroLabel}>0</Text>
      </View>
      <View style={trendStyles.chart}>
        {rounds.map((round, i) => {
          const v = (round.sgTotal as number) ?? 0;
          const barH = Math.abs((v / range) * chartH);
          const isPos = v >= 0;
          const col = sgColor(v);
          const isLast = i === rounds.length - 1;
          return (
            <View key={round.id} style={trendStyles.col}>
              <View style={trendStyles.barArea}>
                {isPos ? (
                  <View style={[trendStyles.barPos, { height: Math.max(3, barH), backgroundColor: isLast ? col : col + 'aa' }]} />
                ) : (
                  <View style={[trendStyles.barNeg, { height: Math.max(3, barH), backgroundColor: isLast ? col : col + 'aa' }]} />
                )}
              </View>
              <Text style={[trendStyles.val, { color: col }]}>{sgSign(v)}</Text>
              <Text style={trendStyles.date}>
                {new Date(round.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const trendStyles = StyleSheet.create({
  wrap: { position: 'relative', paddingTop: Spacing.sm },
  zeroLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    zIndex: 1,
  },
  zeroLabel: {
    position: 'absolute',
    right: 0,
    top: -8,
    fontSize: 9,
    color: Colors.textLight,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 160,
    paddingHorizontal: Spacing.sm,
  },
  col: { flex: 1, alignItems: 'center' },
  barArea: {
    height: 100,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
  },
  barPos: {
    width: '80%',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 'auto',
  },
  barNeg: {
    width: '80%',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 'auto',
  },
  val: { fontSize: 9, fontWeight: '700', marginTop: 2 },
  date: { fontSize: 8, color: Colors.textLight, textAlign: 'center' },
});

const barStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: Spacing.sm,
  },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, width: 120, lineHeight: 18 },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  center: {
    position: 'absolute',
    left: '50%',
    width: 1,
    height: '100%',
    backgroundColor: Colors.border,
    zIndex: 1,
  },
  fill: {
    position: 'absolute',
    height: '100%',
    borderRadius: Radius.full,
  },
  fillRight: { left: '50%' },
  fillLeft: { right: '50%' },
  value: { fontSize: FontSize.sm, fontWeight: '700', width: 46, textAlign: 'right' },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  course: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text },
  date: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  scoreBlock: { alignItems: 'flex-end' },
  score: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  par: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: {
    flex: 1,
    minWidth: 60,
    borderRadius: Radius.sm,
    borderWidth: 1,
    padding: 6,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  chipLabel: { fontSize: FontSize.xs, fontWeight: '600' },
  chipVal: { fontSize: FontSize.sm, fontWeight: '800', marginTop: 1 },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  totalLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textLight, letterSpacing: 0.5, width: 60 },
  totalBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  totalFill: {
    height: '100%',
    borderRadius: Radius.full,
    maxWidth: '100%',
  },
  totalVal: { fontSize: FontSize.base, fontWeight: '800', width: 46, textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  back: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600', minWidth: 60 },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.xl },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  sectionSub: { fontSize: FontSize.sm, fontWeight: '400', color: Colors.textSecondary },
  overallCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  explainerGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  explainerCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    gap: 2,
    ...Shadow.sm,
  },
  explainerEmoji: { fontSize: 20 },
  explainerShort: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary },
  explainerVal: { fontSize: FontSize.lg, fontWeight: '800' },
  explainerLabel: { fontSize: 9, color: Colors.textLight, textAlign: 'center' },
  trendCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.md },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  emptyText: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, marginTop: 4 },
});
