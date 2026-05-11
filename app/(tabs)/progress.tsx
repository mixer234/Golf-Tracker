import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { useRoundStore } from '../../store/useRoundStore';
import { useUserStore } from '../../store/useUserStore';
import { Round } from '../../types';
import { formatHandicap } from '../../components/HandicapDial';
import { calcHandicapIndex } from '../../utils/whs';
import { calcSGAverages, SGAverages } from '../../utils/strokesGained';

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function girPct(rounds: Round[]): string {
  const completed = rounds.filter((r) => r.isComplete && r.greensInRegulation !== undefined);
  if (completed.length === 0) return '—';
  const totalGIR = completed.reduce((s, r) => s + r.greensInRegulation, 0);
  const totalHoles = completed.length * 18;
  return `${Math.round((totalGIR / totalHoles) * 100)}%`;
}

function fwPct(rounds: Round[]): string {
  const completed = rounds.filter((r) => r.isComplete && r.fairwaysTotal > 0);
  if (completed.length === 0) return '—';
  const hit = completed.reduce((s, r) => s + r.fairwaysHit, 0);
  const total = completed.reduce((s, r) => s + r.fairwaysTotal, 0);
  return `${Math.round((hit / total) * 100)}%`;
}

function avgPutts(rounds: Round[]): string {
  const completed = rounds.filter((r) => r.isComplete && r.totalPutts > 0);
  if (completed.length === 0) return '—';
  return avg(completed.map((r) => r.totalPutts)).toFixed(1);
}

function udPct(rounds: Round[]): string {
  const withAttempts = rounds.filter((r) => r.isComplete && r.upAndDownAttempts > 0);
  if (withAttempts.length === 0) return '—';
  const made = withAttempts.reduce((s, r) => s + r.upAndDowns, 0);
  const attempts = withAttempts.reduce((s, r) => s + r.upAndDownAttempts, 0);
  return `${Math.round((made / attempts) * 100)}%`;
}

export default function ProgressScreen() {
  const rounds = useRoundStore((s) => s.rounds);
  const profile = useUserStore((s) => s.profile);

  const completed = rounds.filter((r) => r.isComplete && r.totalScore > 0);
  const last10 = completed.slice(0, 10);
  const last5 = completed.slice(0, 5);

  const recentAvg = last5.length > 0 ? avg(last5.map((r) => r.totalScore)) : null;
  const prevAvg =
    completed.length > 5 ? avg(completed.slice(5, 10).map((r) => r.totalScore)) : null;
  const trend = recentAvg && prevAvg ? recentAvg - prevAvg : null;

  const differentials = completed
    .filter((r) => r.scoreDifferential !== undefined)
    .map((r) => r.scoreDifferential as number);
  const calculatedHcp = calcHandicapIndex(differentials);
  const sgAverages = calcSGAverages(completed);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Progress</Text>

        {completed.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptyText}>
              Track a few rounds and your performance trends will appear here.
            </Text>
          </View>
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.statsGrid}>
              <StatCard
                label="Scoring Avg"
                value={recentAvg ? recentAvg.toFixed(1) : '—'}
                sub={`Last ${last5.length} rounds`}
                trend={trend !== null ? (trend < 0 ? 'up' : trend > 0 ? 'down' : 'flat') : undefined}
                trendValue={trend !== null ? `${Math.abs(trend).toFixed(1)} strokes` : undefined}
              />
              <StatCard
                label="GIR %"
                value={girPct(completed)}
                sub="Greens in regulation"
              />
              <StatCard
                label="FW %"
                value={fwPct(completed)}
                sub="Fairways hit"
              />
              <StatCard
                label="Avg Putts"
                value={avgPutts(completed)}
                sub="Per round"
              />
              <StatCard
                label="Up & Down"
                value={udPct(completed)}
                sub="Scrambling %"
              />
              {calculatedHcp !== null && (
                <StatCard
                  label="WHS Index"
                  value={formatHandicap(calculatedHcp)}
                  sub={`From ${differentials.length} rounds`}
                />
              )}
            </View>

            {/* Score Chart */}
            {last10.length >= 2 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Scoring Trend</Text>
                <View style={styles.chartCard}>
                  <ScoreChart rounds={[...last10].reverse()} />
                </View>
              </View>
            )}

            {/* Strokes Gained */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Strokes Gained vs. Scratch</Text>
              {sgAverages ? (
                <View style={styles.sgCard}>
                  <Text style={styles.sgNote}>
                    Average per round over {sgAverages.roundCount} tracked round{sgAverages.roundCount > 1 ? 's' : ''}
                  </Text>
                  <SGBar label="Off the Tee" value={sgAverages.sgOffTee} />
                  <SGBar label="Approach" value={sgAverages.sgApproach} />
                  <SGBar label="Around Green" value={sgAverages.sgAroundGreen} />
                  <SGBar label="Putting" value={sgAverages.sgPutting} />
                  <View style={styles.sgTotalRow}>
                    <Text style={styles.sgTotalLabel}>TOTAL SG</Text>
                    <Text style={[
                      styles.sgTotalValue,
                      sgAverages.sgTotal > 0 ? { color: Colors.success } : { color: Colors.error },
                    ]}>
                      {sgAverages.sgTotal > 0 ? '+' : ''}{sgAverages.sgTotal}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.sgCard, styles.sgEmpty]}>
                  <Text style={styles.sgEmptyTitle}>Not enough data yet</Text>
                  <Text style={styles.sgEmptyText}>
                    Enter Approach Distance and First Putt Distance in the Performance Details section while tracking rounds to unlock Strokes Gained analysis.
                  </Text>
                </View>
              )}
            </View>

            {/* Score Differential Chart */}
            {differentials.length >= 3 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Score Differentials</Text>
                <View style={styles.chartCard}>
                  <DifferentialChart
                    rounds={[...completed].reverse().filter((r) => r.scoreDifferential !== undefined)}
                  />
                </View>
                <Text style={styles.chartNote}>
                  WHS Handicap Index uses the lowest {Math.min(8, Math.ceil(differentials.length * 0.4))} of your last {Math.min(20, differentials.length)} differentials
                </Text>
              </View>
            )}

            {/* Handicap Progress */}
            {profile && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Handicap Journey</Text>
                <View style={styles.hcpCard}>
                  <View style={styles.hcpRow}>
                    <View style={styles.hcpItem}>
                      <Text style={styles.hcpNum}>{formatHandicap(profile.handicap)}</Text>
                      <Text style={styles.hcpSub}>Current</Text>
                    </View>
                    {calculatedHcp !== null && (
                      <>
                        <View style={styles.hcpDivider} />
                        <View style={styles.hcpItem}>
                          <Text style={[styles.hcpNum, { color: Colors.accent }]}>
                            {formatHandicap(calculatedHcp)}
                          </Text>
                          <Text style={styles.hcpSub}>WHS Calc</Text>
                        </View>
                      </>
                    )}
                    <View style={styles.hcpDivider} />
                    <View style={styles.hcpItem}>
                      <Text style={[styles.hcpNum, { color: Colors.primary }]}>
                        {formatHandicap(profile.targetHandicap)}
                      </Text>
                      <Text style={styles.hcpSub}>Target</Text>
                    </View>
                  </View>
                  <View style={styles.hcpBar}>
                    <View style={styles.hcpTrack}>
                      <View
                        style={[
                          styles.hcpFill,
                          {
                            width: profile.targetHandicap >= profile.handicap
                              ? '5%'
                              : `${Math.min(100, Math.max(5, ((profile.handicap - profile.targetHandicap) / profile.handicap) * 100))}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.hcpGap}>
                      {profile.handicap > profile.targetHandicap
                        ? `${Math.abs(profile.handicap - profile.targetHandicap).toFixed(1)} strokes to goal`
                        : 'Goal reached'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Key Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>All-Time Stats</Text>
              <View style={styles.statsTable}>
                <StatRow label="Rounds Played" value={completed.length.toString()} />
                <StatRow
                  label="Best Score"
                  value={Math.min(...completed.map((r) => r.totalScore)).toString()}
                />
                <StatRow
                  label="Worst Score"
                  value={Math.max(...completed.map((r) => r.totalScore)).toString()}
                />
                <StatRow
                  label="Rounds Under Par"
                  value={completed.filter((r) => r.scoreToPar < 0).length.toString()}
                />
                <StatRow label="Avg Putts" value={avgPutts(completed)} />
                <StatRow
                  label="Total Penalties"
                  value={completed.reduce((s, r) => s + (r.totalPenalties ?? 0), 0).toString()}
                />
                {differentials.length > 0 && (
                  <StatRow
                    label="Best Differential"
                    value={Math.min(...differentials).toFixed(1)}
                  />
                )}
                <StatRow
                  label="Scrambling %"
                  value={udPct(completed)}
                  isLast
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  sub,
  trend,
  trendValue,
}: {
  label: string;
  value: string;
  sub: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
}) {
  const trendColor = trend === 'up' ? Colors.success : trend === 'down' ? Colors.error : Colors.textLight;
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.value}>{value}</Text>
      <Text style={cardStyles.label}>{label}</Text>
      <Text style={cardStyles.sub}>{sub}</Text>
      {trend && trendValue && (
        <Text style={[cardStyles.trend, { color: trendColor }]}>
          {trendIcon} {trendValue}
        </Text>
      )}
    </View>
  );
}

function StatRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[rowStyles.row, !isLast && rowStyles.rowBorder]}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

function SGBar({ label, value }: { label: string; value: number }) {
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 0.1;
  const barColor = isNeutral ? Colors.border : isPositive ? Colors.success : Colors.error;
  // Scale: ±4 strokes = full bar width
  const pct = Math.min(100, Math.abs(value) / 4 * 100);

  return (
    <View style={sgStyles.row}>
      <Text style={sgStyles.label}>{label}</Text>
      <View style={sgStyles.barWrap}>
        <View style={sgStyles.track}>
          <View style={sgStyles.centerLine} />
          {isPositive ? (
            <View style={[sgStyles.fill, sgStyles.fillRight, { width: `${pct / 2}%`, backgroundColor: barColor }]} />
          ) : (
            <View style={[sgStyles.fill, sgStyles.fillLeft, { width: `${pct / 2}%`, backgroundColor: barColor }]} />
          )}
        </View>
      </View>
      <Text style={[sgStyles.value, { color: barColor }]}>
        {isNeutral ? '0.0' : `${isPositive ? '+' : ''}${value.toFixed(1)}`}
      </Text>
    </View>
  );
}

const sgStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: Spacing.sm,
  },
  label: { fontSize: FontSize.sm, color: Colors.textSecondary, width: 110 },
  barWrap: { flex: 1 },
  track: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
    flexDirection: 'row',
    position: 'relative',
  },
  centerLine: {
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
  value: { fontSize: FontSize.sm, fontWeight: '700', width: 44, textAlign: 'right' },
});

function ScoreChart({ rounds }: { rounds: Round[] }) {
  const scores = rounds.map((r) => r.totalScore);
  const min = Math.min(...scores) - 2;
  const max = Math.max(...scores) + 2;
  const range = max - min;
  const chartHeight = 120;
  const best = Math.min(...scores);

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.chart}>
        {rounds.map((round, i) => {
          // Invert: lower score (better) = taller bar
          const barHeight = range > 0 ? ((max - round.totalScore) / range) * chartHeight : chartHeight / 2;
          const isBest = round.totalScore === best;
          const isLast = i === rounds.length - 1;
          const barColor = isBest ? Colors.accent : isLast ? Colors.primary : Colors.primaryMid;
          return (
            <View key={round.id} style={chartStyles.barContainer}>
              <Text style={chartStyles.barLabel}>{round.totalScore}</Text>
              <View style={[chartStyles.bar, { height: Math.max(8, barHeight), backgroundColor: barColor }]} />
              <Text style={chartStyles.barDate}>
                {new Date(round.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={chartStyles.chartHint}>Taller bar = better round</Text>
    </View>
  );
}

function DifferentialChart({ rounds }: { rounds: Round[] }) {
  const diffs = rounds
    .filter((r) => r.scoreDifferential !== undefined)
    .map((r) => r.scoreDifferential as number);
  if (diffs.length === 0) return null;

  const min = Math.min(...diffs) - 1;
  const max = Math.max(...diffs) + 1;
  const range = max - min;
  const chartHeight = 100;
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const bestDiff = Math.min(...diffs);

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.chart}>
        {rounds
          .filter((r) => r.scoreDifferential !== undefined)
          .map((round, i) => {
            const diff = round.scoreDifferential as number;
            // Invert: lower differential (better) = taller bar
            const barHeight = range > 0 ? ((max - diff) / range) * chartHeight : chartHeight / 2;
            const isBelowAvg = diff < avgDiff;
            const isBest = diff === bestDiff;
            return (
              <View key={round.id} style={chartStyles.barContainer}>
                <Text style={[chartStyles.barLabel, { fontSize: 9 }]}>{diff.toFixed(1)}</Text>
                <View style={[
                  chartStyles.bar,
                  {
                    height: Math.max(8, barHeight),
                    backgroundColor: isBest ? Colors.accent : isBelowAvg ? Colors.primaryMid : Colors.surfaceElevated,
                  },
                ]} />
                <Text style={chartStyles.barDate}>
                  {new Date(round.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                </Text>
              </View>
            );
          })}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { paddingVertical: Spacing.md },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 160, paddingHorizontal: Spacing.sm },
  barContainer: { flex: 1, alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text },
  barDate: { fontSize: 9, color: Colors.textLight, textAlign: 'center' },
  chartHint: { fontSize: FontSize.xs, color: Colors.textLight, textAlign: 'center', marginTop: 6 },
});

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  value: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, marginTop: 2 },
  sub: { fontSize: FontSize.xs, color: Colors.textLight },
  trend: { fontSize: FontSize.xs, fontWeight: '700', marginTop: 4 },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  label: { fontSize: FontSize.base, color: Colors.textSecondary },
  value: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.lg },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.md },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  emptyText: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  sgCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  sgEmpty: { alignItems: 'center', paddingVertical: Spacing.lg },
  sgEmptyTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  sgEmptyText: { fontSize: FontSize.sm, color: Colors.textLight, textAlign: 'center', lineHeight: 20 },
  sgNote: { fontSize: FontSize.xs, color: Colors.textLight, marginBottom: Spacing.sm },
  sgTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sgTotalLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.6 },
  sgTotalValue: { fontSize: FontSize.lg, fontWeight: '800' },
  chartNote: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 6,
    textAlign: 'center',
  },
  hcpCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  hcpRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  hcpItem: { flex: 1, alignItems: 'center' },
  hcpNum: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.text },
  hcpSub: { fontSize: FontSize.sm, color: Colors.textSecondary },
  hcpDivider: { width: 1, height: 50, backgroundColor: Colors.border },
  hcpBar: { gap: 6 },
  hcpTrack: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  hcpFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  hcpGap: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  statsTable: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
});
