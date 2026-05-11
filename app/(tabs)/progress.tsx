import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { useRoundStore } from '../../store/useRoundStore';
import { useUserStore } from '../../store/useUserStore';
import { Round } from '../../types';

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
  return (avg(completed.map((r) => r.totalPutts))).toFixed(1);
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

            {/* Handicap Progress */}
            {profile && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Handicap Journey</Text>
                <View style={styles.hcpCard}>
                  <View style={styles.hcpRow}>
                    <View style={styles.hcpItem}>
                      <Text style={styles.hcpNum}>{profile.handicap}</Text>
                      <Text style={styles.hcpSub}>Current</Text>
                    </View>
                    <View style={styles.hcpDivider} />
                    <View style={styles.hcpItem}>
                      <Text style={[styles.hcpNum, { color: Colors.primary }]}>{profile.targetHandicap}</Text>
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
                      {(profile.handicap - profile.targetHandicap).toFixed(1)} strokes to goal
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
                  label="Total Rounds Under Par"
                  value={completed.filter((r) => r.scoreToPar < 0).length.toString()}
                />
                <StatRow
                  label="Avg Putts per Round"
                  value={avgPutts(completed)}
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

function ScoreChart({ rounds }: { rounds: Round[] }) {
  const scores = rounds.map((r) => r.totalScore);
  const min = Math.min(...scores) - 2;
  const max = Math.max(...scores) + 2;
  const range = max - min;
  const chartHeight = 120;

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.chart}>
        {rounds.map((round, i) => {
          const barHeight = range > 0 ? ((round.totalScore - min) / range) * chartHeight : chartHeight / 2;
          const isLast = i === rounds.length - 1;
          return (
            <View key={round.id} style={chartStyles.barContainer}>
              <Text style={chartStyles.barLabel}>{round.totalScore}</Text>
              <View style={[chartStyles.bar, { height: Math.max(8, barHeight), backgroundColor: isLast ? Colors.primary : Colors.primaryLight }]} />
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
});

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
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
    ...Shadow.sm,
  },
  hcpCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
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
    ...Shadow.sm,
  },
});
