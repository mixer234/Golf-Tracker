import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { useRoundStore } from '../../store/useRoundStore';
import { useUserStore } from '../../store/useUserStore';
import { Round, MissDirection } from '../../types';
import { formatHandicap } from '../../components/HandicapDial';
import { calcHandicapIndex, whsDiffCount } from '../../utils/whs';
import { calcSGAverages } from '../../utils/strokesGained';
import { useTerminology } from '../../utils/useHandicap';
import GlossaryTooltip from '../../components/ui/GlossaryTooltip';
import { GlossaryKey } from '../../data/glossary';

// ── Stat helpers ───────────────────────────────────────────────────────────────

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function girPct(rounds: Round[]): string {
  const completed = rounds.filter((r) => r.isComplete && r.greensInRegulation !== undefined);
  if (completed.length === 0) return '—';
  const totalGIR = completed.reduce((s, r) => s + r.greensInRegulation, 0);
  // Use actual hole count per round so 9-hole rounds aren't counted as 18
  const totalHoles = completed.reduce((s, r) => s + r.holes.length, 0);
  if (totalHoles === 0) return '—';
  return `${Math.round((totalGIR / totalHoles) * 100)}%`;
}

function fwPct(rounds: Round[]): string {
  const completed = rounds.filter((r) => r.isComplete && r.fairwaysTotal > 0);
  if (completed.length === 0) return '—';
  const hit = completed.reduce((s, r) => s + r.fairwaysHit, 0);
  const total = completed.reduce((s, r) => s + r.fairwaysTotal, 0);
  return `${Math.round((hit / total) * 100)}%`;
}

// Returns average putts per HOLE (total putts / total holes played)
function avgPuttsPerHole(rounds: Round[]): string {
  const completed = rounds.filter((r) => r.isComplete && r.totalPutts > 0);
  if (completed.length === 0) return '—';
  const totalPutts = completed.reduce((s, r) => s + r.totalPutts, 0);
  const totalHoles = completed.reduce(
    (s, r) => s + r.holes.filter((h) => h.strokes > 0).length, 0
  );
  if (totalHoles === 0) return '—';
  return (totalPutts / totalHoles).toFixed(2);
}

function udPct(rounds: Round[]): string {
  const withAttempts = rounds.filter((r) => r.isComplete && r.upAndDownAttempts > 0);
  if (withAttempts.length === 0) return '—';
  const made = withAttempts.reduce((s, r) => s + r.upAndDowns, 0);
  const attempts = withAttempts.reduce((s, r) => s + r.upAndDownAttempts, 0);
  return `${Math.round((made / attempts) * 100)}%`;
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const router = useRouter();
  const rounds = useRoundStore((s) => s.rounds);
  const profile = useUserStore((s) => s.profile);
  const t = useTerminology();

  const completed = rounds.filter((r) => r.isComplete && r.totalScore > 0);

  // Fewer than 2 rounds → empty state
  if (completed.length < 2) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Progress</Text>
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>Not enough data yet</Text>
            <Text style={styles.emptyText}>
              Complete at least 2 rounds and your performance trends will appear here.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Scoring average: last 20 rounds (all if ≤ 20)
  const last20 = completed.slice(0, 20);
  const scoringAvg = mean(last20.map((r) => r.totalScore));

  // Chart data
  const last10 = completed.slice(0, 10);

  // Trend: last 5 vs previous available rounds
  const last5 = completed.slice(0, 5);
  const prev5 = completed.slice(5, 10);
  const recentAvg = mean(last5.map((r) => r.totalScore));
  const prevAvg = prev5.length > 0 ? mean(prev5.map((r) => r.totalScore)) : null;
  const trend = prevAvg !== null ? recentAvg - prevAvg : null;

  const differentials = completed
    .filter((r) => r.scoreDifferential !== undefined)
    .map((r) => r.scoreDifferential as number);
  const calculatedHcp = calcHandicapIndex(differentials);
  const sgAverages = calcSGAverages(completed);

  // WHS note: how many differentials WHS uses from the available pool
  const diffPoolSize = Math.min(20, differentials.length);
  const whsUsedCount = differentials.length > 0 ? whsDiffCount(diffPoolSize) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Progress</Text>

        {/* Trend Alert Card — only shows when 5+ rounds logged */}
        {completed.length >= 5 && (
          <TrendAlertCard
            recentAvg={recentAvg}
            prevAvg={prevAvg}
            trend={trend}
            recentCount={last5.length}
            prevCount={prev5.length}
          />
        )}

        {/* Stat Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label={t('scoringAverage')}
            value={scoringAvg.toFixed(1)}
            sub={`Last ${last20.length} rounds`}
            accent={Colors.primary}
            statKey="scoringAverage"
          />
          <StatCard
            label={t('gir')}
            value={girPct(completed)}
            sub="Greens in regulation"
            accent={Colors.info}
            statKey="gir"
          />
          <StatCard
            label={t('fairways')}
            value={fwPct(completed)}
            sub="Fairways hit"
            accent={Colors.info}
            statKey="fairways"
          />
          <StatCard
            label={t('putts')}
            value={avgPuttsPerHole(completed)}
            sub="Per hole"
            accent={Colors.warning}
            statKey="putts"
          />
          <StatCard
            label={t('upAndDown')}
            value={udPct(completed)}
            sub={t('scrambling')}
            accent={Colors.success}
            statKey="upAndDown"
          />
          <StatCard
            label={t('whsIndex')}
            value={calculatedHcp !== null ? formatHandicap(calculatedHcp) : '—'}
            sub={differentials.length > 0 ? `From ${differentials.length} rounds` : 'No ratings tracked'}
            accent={Colors.accent}
            statKey="whsIndex"
          />
        </View>

        {/* Scoring Trend Chart — shows from 1 round */}
        {last10.length >= 1 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Scoring Trend</Text>
            </View>
            <View style={styles.chartCard}>
              <ScoreChart rounds={[...last10].reverse()} />
            </View>
          </View>
        )}

        {/* Strokes Gained */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('strokesGained')}</Text>
            {sgAverages && (
              <TouchableOpacity onPress={() => router.push('/sg')} activeOpacity={0.7}>
                <Text style={styles.sectionLink}>Full Analysis →</Text>
              </TouchableOpacity>
            )}
          </View>
          {sgAverages ? (
            <TouchableOpacity style={styles.sgCard} onPress={() => router.push('/sg')} activeOpacity={0.85}>
              <Text style={styles.sgNote}>
                Average per round · {sgAverages.roundCount} round{sgAverages.roundCount > 1 ? 's' : ''}
              </Text>
              <SGBar label={t('sgOffTee')}     value={sgAverages.sgOffTee}     statKey="sgOffTee" />
              <SGBar label={t('sgApproach')}   value={sgAverages.sgApproach}   statKey="sgApproach" />
              <SGBar label={t('sgAroundGreen')} value={sgAverages.sgAroundGreen} statKey="sgAroundGreen" />
              <SGBar label={t('sgPutting')}    value={sgAverages.sgPutting}    statKey="sgPutting" />
              <View style={styles.sgTotalRow}>
                <Text style={styles.sgTotalLabel}>TOTAL SG</Text>
                <Text style={[
                  styles.sgTotalValue,
                  sgAverages.sgTotal > 0 ? { color: Colors.success } : { color: Colors.error },
                ]}>
                  {sgAverages.sgTotal > 0 ? '+' : ''}{sgAverages.sgTotal}
                </Text>
              </View>
              <Text style={styles.sgTapHint}>Tap for per-round breakdown →</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.sgCard, styles.sgEmpty]}>
              <Text style={styles.sgEmptyIcon}>🎯</Text>
              <Text style={styles.sgEmptyHeading}>Unlock Strokes Gained</Text>
              <Text style={styles.sgEmptyText}>
                Track your approach distances and first putt distances during rounds to see exactly where you're gaining and losing shots.
              </Text>
              <View style={styles.sgStepList}>
                {[
                  'Start a round',
                  'On each hole, tap "Performance Details"',
                  'Enter approach distance and first putt distance',
                  'Your strokes gained analysis appears here',
                ].map((step, i) => (
                  <View key={i} style={styles.sgStepRow}>
                    <View style={styles.sgStepNum}><Text style={styles.sgStepNumText}>{i + 1}</Text></View>
                    <Text style={styles.sgStepText}>{step}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.sgStartBtn} onPress={() => router.push('/(tabs)/track')} activeOpacity={0.85}>
                <Text style={styles.sgStartBtnText}>Start a Round →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Scoring by Par Type */}
        <ParTypeSection rounds={completed} />

        {/* Round Segments */}
        <SegmentSection rounds={completed} />

        {/* Score Differential Chart */}
        {differentials.length >= 3 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>{t('differential')}s</Text>
            </View>
            <View style={styles.chartCard}>
              <DifferentialChart
                rounds={[...completed].reverse().filter((r) => r.scoreDifferential !== undefined)}
              />
            </View>
            <Text style={styles.chartNote}>
              WHS Index uses the lowest {whsUsedCount} of your last {diffPoolSize} differentials
            </Text>
          </View>
        )}

        {/* Handicap Progress */}
        {profile && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Handicap Journey</Text>
            </View>
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

        {/* Handicap History */}
        {differentials.length >= 4 && (
          <HandicapHistoryChart rounds={completed} />
        )}

        {/* Miss Pattern Heatmap */}
        <MissHeatmap rounds={completed} />

        {/* All-Time Stats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>All-Time Stats</Text>
          </View>
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
            <StatRow label={t('putts')} value={avgPuttsPerHole(completed)} />
            <StatRow
              label="Total Penalties"
              value={completed.reduce((s, r) => s + (r.totalPenalties ?? 0), 0).toString()}
            />
            {differentials.length > 0 && (
              <StatRow
                label={`Best ${t('differential')}`}
                value={Math.min(...differentials).toFixed(1)}
              />
            )}
            <StatRow
              label={t('scrambling')}
              value={udPct(completed)}
              isLast
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── TrendAlertCard ─────────────────────────────────────────────────────────────

function TrendAlertCard({
  recentAvg,
  prevAvg,
  trend,
  recentCount,
  prevCount,
}: {
  recentAvg: number;
  prevAvg: number | null;
  trend: number | null;
  recentCount: number;
  prevCount: number;
}) {
  const improving = trend !== null && trend < -0.5;
  const declining = trend !== null && trend > 0.5;
  const neutral = !improving && !declining;

  const icon = improving ? '📈' : declining ? '📉' : '➡️';
  const color = improving ? Colors.success : declining ? Colors.error : Colors.textSecondary;
  const borderColor = improving ? Colors.success + '50' : declining ? Colors.error + '50' : Colors.border;
  const bg = improving ? Colors.success + '0A' : declining ? Colors.error + '0A' : Colors.surface;

  let message: string;
  if (trend === null || prevCount === 0) {
    message = `Scoring avg last ${recentCount} rounds: ${recentAvg.toFixed(1)}`;
  } else if (improving) {
    message = `Scoring ${Math.abs(trend).toFixed(1)} strokes better than your previous ${prevCount} rounds`;
  } else if (declining) {
    message = `Scoring ${Math.abs(trend).toFixed(1)} strokes worse than your previous ${prevCount} rounds`;
  } else {
    message = `Scoring consistent with your previous ${prevCount} rounds`;
  }

  return (
    <View style={[trendStyles.card, { backgroundColor: bg, borderColor }]}>
      <Text style={trendStyles.icon}>{icon}</Text>
      <View style={trendStyles.body}>
        <Text style={[trendStyles.label, { color }]}>
          {improving ? 'Improving' : declining ? 'Declining' : 'Consistent'}
        </Text>
        <Text style={trendStyles.message}>{message}</Text>
      </View>
    </View>
  );
}

const trendStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  icon: { fontSize: 28 },
  body: { flex: 1, gap: 2 },
  label: { fontSize: FontSize.sm, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  message: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
});

// ── ParTypeSection ─────────────────────────────────────────────────────────────

function ParTypeSection({ rounds }: { rounds: Round[] }) {
  const parTypes = [3, 4, 5] as const;
  const data = parTypes.map((par) => {
    const holes = rounds.flatMap((r) => r.holes.filter((h) => h.par === par && h.strokes > 0));
    if (holes.length === 0) return { par, avgScore: null, avgVsPar: null, count: 0 };
    const avgScore = holes.reduce((s, h) => s + h.strokes, 0) / holes.length;
    const avgVsPar = avgScore - par;
    return { par, avgScore, avgVsPar, count: holes.length };
  });

  if (data.every((d) => d.avgScore === null)) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionDot} />
        <Text style={styles.sectionTitle}>Scoring by Par Type</Text>
      </View>
      <View style={[styles.chartCard, { flexDirection: 'row', gap: Spacing.sm }]}>
        {data.map(({ par, avgScore, avgVsPar }) => {
          if (avgScore === null) return null;
          const color = avgVsPar! < 0 ? Colors.success : avgVsPar! > 0.3 ? Colors.error : Colors.textSecondary;
          return (
            <View key={par} style={parStyles.col}>
              <Text style={parStyles.parLabel}>Par {par}</Text>
              <Text style={[parStyles.score, { color }]}>{avgScore.toFixed(2)}</Text>
              <Text style={[parStyles.vsPar, { color }]}>
                {avgVsPar! >= 0 ? '+' : ''}{avgVsPar!.toFixed(2)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const parStyles = StyleSheet.create({
  col: { flex: 1, alignItems: 'center', gap: 4 },
  parLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  score: { fontSize: FontSize.xl, fontWeight: '800' },
  vsPar: { fontSize: FontSize.sm, fontWeight: '700' },
});

// ── SegmentSection ─────────────────────────────────────────────────────────────

function SegmentSection({ rounds }: { rounds: Round[] }) {
  const segments = [
    { label: 'Front 9', range: [1, 9] as [number, number] },
    { label: 'Back 9', range: [10, 18] as [number, number] },
  ];

  const data = segments.map(({ label, range }) => {
    // Only count rounds that have scored holes in this range
    const roundsWithData = rounds.filter((r) =>
      r.holes.some((h) => h.holeNumber >= range[0] && h.holeNumber <= range[1] && h.strokes > 0)
    );
    if (roundsWithData.length === 0) return { label, avgVsPar: null };
    const totalVsPar = roundsWithData.reduce((sum, r) => {
      const segHoles = r.holes.filter(
        (h) => h.holeNumber >= range[0] && h.holeNumber <= range[1] && h.strokes > 0
      );
      return sum + segHoles.reduce((s, h) => s + (h.strokes - h.par), 0);
    }, 0);
    return { label, avgVsPar: totalVsPar / roundsWithData.length };
  });

  if (data.every((d) => d.avgVsPar === null)) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionDot} />
        <Text style={styles.sectionTitle}>Round Segments</Text>
      </View>
      <View style={[styles.chartCard, { flexDirection: 'row', gap: Spacing.sm }]}>
        {data.map(({ label, avgVsPar }) => {
          if (avgVsPar === null) return null;
          const color = avgVsPar < 0 ? Colors.success : avgVsPar > 1 ? Colors.error : Colors.textSecondary;
          return (
            <View key={label} style={parStyles.col}>
              <Text style={parStyles.parLabel}>{label}</Text>
              <Text style={[parStyles.score, { color, fontSize: FontSize.lg }]}>
                {avgVsPar >= 0 ? '+' : ''}{avgVsPar.toFixed(1)}
              </Text>
              <Text style={parStyles.vsPar}>avg vs par</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
  statKey,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
  statKey?: GlossaryKey;
}) {
  const labelEl = <Text style={cardStyles.overline}>{label.toUpperCase()}</Text>;
  return (
    <View style={[cardStyles.card, accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : {}]}>
      {statKey ? (
        <GlossaryTooltip statKey={statKey}>{labelEl}</GlossaryTooltip>
      ) : labelEl}
      <Text style={cardStyles.value}>{value}</Text>
      <Text style={cardStyles.sub}>{sub}</Text>
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

// ── SGBar ──────────────────────────────────────────────────────────────────────

function SGBar({ label, value, statKey }: { label: string; value: number; statKey?: GlossaryKey }) {
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 0.1;
  const barColor = isNeutral ? Colors.border : isPositive ? Colors.success : Colors.error;
  const pct = Math.min(100, Math.abs(value) / 4 * 100);

  const labelEl = <Text style={[sgStyles.label, statKey ? { width: undefined, flexShrink: 1 } : {}]}>{label}</Text>;

  return (
    <View style={sgStyles.row}>
      {statKey ? (
        <GlossaryTooltip statKey={statKey} style={sgStyles.labelWrap}>{labelEl}</GlossaryTooltip>
      ) : labelEl}
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
  labelWrap: { width: 126 },
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

// ── ScoreChart ─────────────────────────────────────────────────────────────────

function scoreTrendColor(scoreToPar: number): string {
  if (scoreToPar < 0) return Colors.success;
  if (scoreToPar === 0) return Colors.info ?? Colors.accent;
  if (scoreToPar <= 5) return Colors.warning;
  return Colors.error;
}

function ScoreChart({ rounds }: { rounds: Round[] }) {
  if (rounds.length === 0) return null;

  const scores = rounds.map((r) => r.totalScore);
  const minS = Math.min(...scores) - 3;
  const maxS = Math.max(...scores) + 3;
  const range = Math.max(maxS - minS, 1);

  return (
    <View style={lcStyles.wrap}>
      {/* Y axis */}
      <View style={lcStyles.yAxis}>
        <Text style={lcStyles.yLabel}>{maxS}</Text>
        <Text style={lcStyles.yLabel}>{Math.round(minS + range / 2)}</Text>
        <Text style={lcStyles.yLabel}>{minS}</Text>
      </View>

      {/* Chart area */}
      <View style={lcStyles.chart}>
        <View style={[lcStyles.gridLine, { top: 0 }]} />
        <View style={[lcStyles.gridLine, { top: '50%' }]} />
        <View style={[lcStyles.gridLine, { top: '100%' }]} />

        <View style={lcStyles.barsRow}>
          {rounds.map((round) => {
            const heightPct = ((maxS - round.totalScore) / range) * 100;
            const barColor = scoreTrendColor(round.scoreToPar);
            return (
              <View key={round.id} style={lcStyles.barCol}>
                <Text style={lcStyles.scoreLabel}>{round.totalScore}</Text>
                <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                  <View
                    style={[
                      lcStyles.bar,
                      { height: `${Math.max(5, heightPct)}%`, backgroundColor: barColor },
                    ]}
                  />
                </View>
                <View style={[lcStyles.dot, { backgroundColor: barColor }]} />
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const lcStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    height: 150,
    gap: Spacing.xs,
  },
  yAxis: {
    width: 28,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  yLabel: {
    fontSize: 9,
    color: Colors.textLight,
    textAlign: 'right',
  },
  chart: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.borderLight,
    zIndex: 0,
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingTop: 18, // room for score labels
    zIndex: 1,
  },
  barCol: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 0,
  },
  scoreLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.textSecondary,
    position: 'absolute',
    top: 0,
  },
  bar: {
    width: '80%',
    borderRadius: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: -3,
    zIndex: 2,
  },
});

// ── DifferentialChart ──────────────────────────────────────────────────────────

function DifferentialChart({ rounds }: { rounds: Round[] }) {
  const diffs = rounds
    .filter((r) => r.scoreDifferential !== undefined)
    .map((r) => r.scoreDifferential as number);
  if (diffs.length === 0) return null;

  const minD = Math.min(...diffs) - 1;
  const maxD = Math.max(...diffs) + 1;
  const range = Math.max(maxD - minD, 1);
  const chartHeight = 100;
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const bestDiff = Math.min(...diffs);

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.chart}>
        {rounds
          .filter((r) => r.scoreDifferential !== undefined)
          .map((round) => {
            const diff = round.scoreDifferential as number;
            const barHeight = ((maxD - diff) / range) * chartHeight;
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
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    ...Shadow.sm,
  },
  overline: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textLight,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  value: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  sub: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
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

// ── HandicapHistoryChart ───────────────────────────────────────────────────────

function HandicapHistoryChart({ rounds }: { rounds: Round[] }) {
  const withDiffs = [...rounds].reverse().filter((r) => r.scoreDifferential !== undefined);
  if (withDiffs.length < 4) return null;

  const points: { label: string; hcp: number }[] = [];
  for (let i = 0; i < withDiffs.length; i++) {
    const diffs = withDiffs.slice(0, i + 1).reverse().map((r) => r.scoreDifferential as number);
    const hcp = calcHandicapIndex(diffs);
    if (hcp !== null) {
      points.push({
        label: new Date(withDiffs[i].date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
        hcp,
      });
    }
  }
  if (points.length < 2) return null;

  const hcps = points.map((p) => p.hcp);
  const minH = Math.min(...hcps);
  const maxH = Math.max(...hcps);
  const range = Math.max(maxH - minH, 1);
  const chartH = 90;

  const first = points[0].hcp;
  const last = points[points.length - 1].hcp;
  const improved = last < first;
  const delta = Math.abs(last - first).toFixed(1);
  const labelEvery = Math.max(1, Math.floor(points.length / 5));

  return (
    <View style={styles.section}>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Handicap History</Text>
        <Text style={[hcpHStyles.delta, { color: improved ? Colors.success : Colors.error }]}>
          {improved ? '↓' : '↑'} {delta}
        </Text>
      </View>
      <View style={styles.chartCard}>
        <View style={hcpHStyles.chart}>
          {points.map((p, i) => {
            const barH = ((maxH - p.hcp) / range) * chartH;
            const isBest = p.hcp === minH;
            const isLast = i === points.length - 1;
            const color = isBest ? Colors.accent : isLast ? Colors.primary : Colors.primaryMid + '88';
            return (
              <View key={i} style={hcpHStyles.col}>
                {(i === 0 || isLast || isBest) ? (
                  <Text style={hcpHStyles.valLabel}>{p.hcp.toFixed(1)}</Text>
                ) : (
                  <View style={{ height: 14 }} />
                )}
                <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                  <View style={[hcpHStyles.bar, { height: Math.max(6, barH), backgroundColor: color }]} />
                </View>
                {i % labelEvery === 0 ? (
                  <Text style={hcpHStyles.dateLabel}>{p.label}</Text>
                ) : (
                  <View style={{ height: 11 }} />
                )}
              </View>
            );
          })}
        </View>
        <Text style={hcpHStyles.note}>
          {improved ? 'Improved' : 'Increased'} {delta} strokes since {points[0].label}
        </Text>
      </View>
    </View>
  );
}

const hcpHStyles = StyleSheet.create({
  chart: { flexDirection: 'row', height: 130, gap: 3, alignItems: 'flex-end', paddingBottom: 4 },
  col: { flex: 1, alignItems: 'center', height: '100%', gap: 0, paddingBottom: 4 },
  bar: { width: '80%', borderRadius: 3 },
  valLabel: { fontSize: 8, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  dateLabel: { fontSize: 8, color: Colors.textLight, textAlign: 'center' },
  delta: { fontSize: FontSize.sm, fontWeight: '700' },
  note: { fontSize: FontSize.xs, color: Colors.textLight, textAlign: 'center', marginTop: Spacing.sm },
});

// ── MissHeatmap ────────────────────────────────────────────────────────────────

const MISS_GRID: MissDirection[][] = [
  ['long-left', 'long', 'long-right'],
  ['left', 'center', 'right'],
  ['short-left', 'short', 'short-right'],
];

const MISS_LABEL: Record<MissDirection, string> = {
  'long-left': 'Long\nLeft', 'long': 'Long', 'long-right': 'Long\nRight',
  'left': 'Left', 'center': 'Center', 'right': 'Right',
  'short-left': 'Short\nLeft', 'short': 'Short', 'short-right': 'Short\nRight',
};

function MissHeatmap({ rounds }: { rounds: Round[] }) {
  const allMisses = rounds
    .flatMap((r) => r.holes.map((h) => h.missDirection))
    .filter((m): m is MissDirection => !!m);
  if (allMisses.length < 5) return null;

  const counts = {} as Record<MissDirection, number>;
  (['long-left','long','long-right','left','center','right','short-left','short','short-right'] as MissDirection[])
    .forEach((d) => (counts[d] = 0));
  allMisses.forEach((m) => counts[m]++);
  const missCounts = Object.entries(counts).filter(([k]) => k !== 'center').map(([, v]) => v);
  const maxCount = Math.max(...missCounts, 1);

  const topMiss = (Object.entries(counts) as [MissDirection, number][])
    .filter(([k]) => k !== 'center')
    .sort((a, b) => b[1] - a[1])[0];
  const topPct = topMiss ? Math.round((topMiss[1] / allMisses.length) * 100) : 0;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionDot} />
        <Text style={styles.sectionTitle}>Miss Pattern</Text>
      </View>
      <View style={missStyles.card}>
        <Text style={missStyles.note}>{allMisses.length} misses tracked · {rounds.length} rounds</Text>
        {MISS_GRID.map((row, ri) => (
          <View key={ri} style={missStyles.row}>
            {row.map((dir) => {
              const count = counts[dir];
              const isCenter = dir === 'center';
              const intensity = isCenter ? 0 : count / maxCount;
              const bg = isCenter
                ? Colors.primaryPale
                : `rgba(239,68,68,${Math.max(0.05, intensity * 0.75)})`;
              const textColor = intensity > 0.5 ? '#fff' : isCenter ? Colors.success : Colors.textSecondary;
              return (
                <View key={dir} style={[missStyles.cell, { backgroundColor: bg }, isCenter && missStyles.cellCenter]}>
                  <Text style={[missStyles.cellCount, { color: count > 0 ? textColor : Colors.textLight }]}>
                    {count > 0 ? count : '—'}
                  </Text>
                  <Text style={[missStyles.cellDir, { color: isCenter ? Colors.success : Colors.textLight }]}>
                    {MISS_LABEL[dir]}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
        {topMiss && topMiss[1] > 0 && (
          <View style={missStyles.insightRow}>
            <Text style={missStyles.insightLabel}>Most common miss:</Text>
            <Text style={missStyles.insightValue}>
              {topMiss[0].replace('-', ' ')} · {topMiss[1]}× ({topPct}%)
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const missStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
    ...Shadow.sm,
  },
  note: { fontSize: FontSize.xs, color: Colors.textLight, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 6 },
  cell: {
    flex: 1,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cellCenter: { borderColor: Colors.primary + '60' },
  cellCount: { fontSize: FontSize.md, fontWeight: '800' },
  cellDir: { fontSize: 9, textAlign: 'center', lineHeight: 12 },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    marginTop: 2,
  },
  insightLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  insightValue: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.error },
});

// ── Shared styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: 100 },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.lg },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.md },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  emptyText: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  sectionLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
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
  sgEmptyIcon: { fontSize: 40, marginBottom: Spacing.sm },
  sgEmptyHeading: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  sgEmptyText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.md },
  sgStepList: { width: '100%', gap: Spacing.sm, marginBottom: Spacing.md },
  sgStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  sgStepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  sgStepNumText: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.background },
  sgStepText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, flex: 1 },
  sgStartBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xs,
  },
  sgStartBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.background },
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
  sgTapHint: { fontSize: FontSize.xs, color: Colors.primary, textAlign: 'right', marginTop: Spacing.xs, fontWeight: '600' },
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
