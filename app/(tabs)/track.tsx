import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { useRoundStore } from '../../store/useRoundStore';
import { HoleScore, Round, RoundType, MissDirection } from '../../types';

function buildRoundSummary(r: Round): { headline: string; highlights: string[] } {
  const stp = r.scoreToPar;
  const parStr = stp === 0 ? 'Even par' : stp < 0 ? `${Math.abs(stp)} under par` : `${stp} over par`;
  const headline = `${r.totalScore} — ${parStr}`;

  const highlights: string[] = [];
  const girPct = Math.round((r.greensInRegulation / 18) * 100);
  highlights.push(`${r.greensInRegulation}/18 greens in regulation (${girPct}%)`);
  if (r.fairwaysTotal > 0) {
    const fwPct = Math.round((r.fairwaysHit / r.fairwaysTotal) * 100);
    highlights.push(`${r.fairwaysHit}/${r.fairwaysTotal} fairways hit (${fwPct}%)`);
  }
  highlights.push(`${r.totalPutts} total putts`);
  if (r.upAndDownAttempts > 0) {
    const udPct = Math.round((r.upAndDowns / r.upAndDownAttempts) * 100);
    highlights.push(`${udPct}% scrambling (${r.upAndDowns}/${r.upAndDownAttempts} up & downs)`);
  }
  if (r.totalPenalties > 0) {
    highlights.push(`${r.totalPenalties} penalty stroke${r.totalPenalties > 1 ? 's' : ''}`);
  }
  if (r.scoreDifferential !== undefined) {
    const diff = r.scoreDifferential.toFixed(1);
    highlights.push(`Score differential: ${r.scoreDifferential > 0 ? '+' : ''}${diff}`);
  }
  return { headline, highlights };
}

export default function TrackScreen() {
  const { rounds, currentRound, lastCompletedRound, startRound, updateHole, completeRound, discardCurrentRound, clearLastCompleted, updateRoundNotes, updateRound } =
    useRoundStore();
  const [showNewRound, setShowNewRound] = useState(false);
  const [notesDraft, setNotesDraft] = useState(lastCompletedRound?.notes ?? '');

  // Sync draft whenever a new round is completed
  useEffect(() => {
    setNotesDraft(lastCompletedRound?.notes ?? '');
  }, [lastCompletedRound?.id]);
  const [courseName, setCourseName] = useState('');
  const [courseRating, setCourseRating] = useState('');
  const [slopeRating, setSlopeRating] = useState('');
  const [roundType, setRoundType] = useState<RoundType>('casual');
  const [selectedHole, setSelectedHole] = useState(1);

  // Mental ratings for post-round debrief
  const [mentalCommitment, setMentalCommitment] = useState(lastCompletedRound?.mentalCommitment ?? 0);
  const [mentalControl, setMentalControl] = useState(lastCompletedRound?.mentalControl ?? 0);
  const [mentalDecisions, setMentalDecisions] = useState(lastCompletedRound?.mentalDecisions ?? 0);
  const [mentalEnergy, setMentalEnergy] = useState(lastCompletedRound?.mentalEnergy ?? 0);

  useEffect(() => {
    setMentalCommitment(lastCompletedRound?.mentalCommitment ?? 0);
    setMentalControl(lastCompletedRound?.mentalControl ?? 0);
    setMentalDecisions(lastCompletedRound?.mentalDecisions ?? 0);
    setMentalEnergy(lastCompletedRound?.mentalEnergy ?? 0);
  }, [lastCompletedRound?.id]);

  function handleStartRound() {
    if (!courseName.trim()) {
      Alert.alert('Course name required', 'Enter the course name to start tracking.');
      return;
    }
    const cr = parseFloat(courseRating);
    const sr = parseInt(slopeRating, 10);
    startRound(
      courseName.trim(),
      !isNaN(cr) && cr > 50 && cr < 90 ? cr : undefined,
      !isNaN(sr) && sr >= 55 && sr <= 155 ? sr : undefined,
      roundType
    );
    setShowNewRound(false);
    setCourseName('');
    setCourseRating('');
    setSlopeRating('');
    setRoundType('casual');
    setSelectedHole(1);
  }

  function handleCompleteRound() {
    Alert.alert('Complete Round?', 'This will save your round and update your stats.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Complete', onPress: () => completeRound() },
    ]);
  }

  function handleDiscardRound() {
    Alert.alert('Discard Round?', 'All hole data will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: discardCurrentRound },
    ]);
  }

  const currentHole = currentRound?.holes.find((h) => h.holeNumber === selectedHole);

  return (
    <SafeAreaView style={styles.container}>
      {currentRound ? (
        <>
          {/* Active Round Header */}
          <View style={styles.roundHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.courseName} numberOfLines={1}>{currentRound.courseName}</Text>
              <Text style={styles.roundSubtitle}>
                {new Date(currentRound.date).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                })}
                {currentRound.courseRating && currentRound.slopeRating
                  ? ` · ${currentRound.courseRating} / ${currentRound.slopeRating}`
                  : ''}
              </Text>
            </View>
            <View style={styles.roundActions}>
              <TouchableOpacity onPress={handleDiscardRound} style={styles.discardBtn}>
                <Text style={styles.discardText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCompleteRound} style={styles.completeBtn}>
                <Text style={styles.completeText}>Finish</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Running Score */}
          <View style={styles.scoreSummary}>
            {(() => {
              const played = currentRound.holes.filter((h) => h.strokes > 0);
              const total = played.reduce((s, h) => s + h.strokes, 0);
              const par = played.reduce((s, h) => s + h.par, 0);
              const diff = total - par;
              const putts = played.reduce((s, h) => s + h.putts, 0);
              const penalties = played.reduce((s, h) => s + (h.penaltyStrokes ?? 0), 0);
              return (
                <>
                  <View style={styles.scoreBox}>
                    <Text style={styles.scoreBoxVal}>{total || '—'}</Text>
                    <Text style={styles.scoreBoxLabel}>Score</Text>
                  </View>
                  <View style={styles.scoreBox}>
                    <Text style={[
                      styles.scoreBoxVal,
                      diff < 0 ? { color: Colors.success } : diff > 0 ? { color: Colors.error } : {},
                    ]}>
                      {total ? (diff > 0 ? `+${diff}` : diff === 0 ? 'E' : diff) : '—'}
                    </Text>
                    <Text style={styles.scoreBoxLabel}>vs Par</Text>
                  </View>
                  <View style={styles.scoreBox}>
                    <Text style={styles.scoreBoxVal}>{played.length}/18</Text>
                    <Text style={styles.scoreBoxLabel}>Holes</Text>
                  </View>
                  <View style={styles.scoreBox}>
                    <Text style={styles.scoreBoxVal}>{putts || '—'}</Text>
                    <Text style={styles.scoreBoxLabel}>Putts</Text>
                  </View>
                  {penalties > 0 && (
                    <View style={styles.scoreBox}>
                      <Text style={[styles.scoreBoxVal, { color: Colors.warning }]}>{penalties}</Text>
                      <Text style={styles.scoreBoxLabel}>Penalty</Text>
                    </View>
                  )}
                </>
              );
            })()}
          </View>

          {/* Hole Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.holeScrollContent}
            style={styles.holeScroll}
          >
            {currentRound.holes.map((hole) => {
              const isActive = hole.holeNumber === selectedHole;
              const hasData = hole.strokes > 0;
              const diff = hole.strokes - hole.par;
              return (
                <TouchableOpacity
                  key={hole.holeNumber}
                  style={[
                    styles.holeChip,
                    isActive && styles.holeChipActive,
                    hasData && !isActive && styles.holeChipDone,
                  ]}
                  onPress={() => setSelectedHole(hole.holeNumber)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.holeNum, isActive && styles.holeNumActive]}>
                    {hole.holeNumber}
                  </Text>
                  {hasData && (
                    <Text style={[
                      styles.holeScore,
                      diff < 0 ? styles.under : diff === 0 ? styles.even : styles.over,
                    ]}>
                      {diff === 0 ? 'E' : diff > 0 ? `+${diff}` : diff}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {currentHole && (
            <ScrollView style={styles.holeInputArea} showsVerticalScrollIndicator={false}>
              <HoleInputCard
                hole={currentHole}
                onUpdate={(data) => updateHole(selectedHole, data)}
                onNext={() => { if (selectedHole < 18) setSelectedHole(selectedHole + 1); }}
              />
            </ScrollView>
          )}
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.noRoundContent} showsVerticalScrollIndicator={false}>
          {/* Post-round summary — shown immediately after completing a round */}
          {lastCompletedRound && (() => {
            const { headline, highlights } = buildRoundSummary(lastCompletedRound);
            const stp = lastCompletedRound.scoreToPar;
            return (
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View>
                    <Text style={styles.summaryOverline}>ROUND COMPLETE</Text>
                    <Text style={styles.summaryCourse}>{lastCompletedRound.courseName}</Text>
                  </View>
                  <TouchableOpacity onPress={clearLastCompleted} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.summaryClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[
                  styles.summaryHeadline,
                  stp < 0 ? { color: Colors.success } : stp > 0 ? { color: Colors.error } : { color: Colors.text },
                ]}>
                  {headline}
                </Text>
                <View style={styles.summaryHighlights}>
                  {highlights.map((h, i) => (
                    <View key={i} style={styles.highlightRow}>
                      <View style={styles.highlightBullet} />
                      <Text style={styles.highlightText}>{h}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Mental Game</Text>
                  {([
                    { label: 'Commitment', value: mentalCommitment, set: setMentalCommitment, key: 'mentalCommitment' },
                    { label: 'Emotional Control', value: mentalControl, set: setMentalControl, key: 'mentalControl' },
                    { label: 'Decision Making', value: mentalDecisions, set: setMentalDecisions, key: 'mentalDecisions' },
                    { label: 'Energy / Focus', value: mentalEnergy, set: setMentalEnergy, key: 'mentalEnergy' },
                  ] as const).map(({ label, value, set, key }) => (
                    <View key={key} style={styles.mentalRow}>
                      <Text style={styles.mentalLabel}>{label}</Text>
                      <View style={styles.mentalDots}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <TouchableOpacity
                            key={n}
                            style={[styles.mentalDot, n <= value && styles.mentalDotActive]}
                            onPress={() => {
                              set(n);
                              updateRound(lastCompletedRound.id, { [key]: n });
                            }}
                          />
                        ))}
                      </View>
                    </View>
                  ))}
                </View>

                <View style={[styles.notesSection, { borderTopWidth: 0, marginTop: 0 }]}>
                  <Text style={styles.notesLabel}>Round Notes</Text>
                  <TextInput
                    style={styles.notesInput}
                    value={notesDraft}
                    onChangeText={setNotesDraft}
                    onBlur={() => updateRoundNotes(lastCompletedRound.id, notesDraft.trim())}
                    placeholder="How did it go? Key takeaways, course conditions, things to work on…"
                    placeholderTextColor={Colors.textLight}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            );
          })()}

          <View style={styles.noRoundHero}>
            <Text style={styles.noRoundEmoji}>⛳</Text>
            <Text style={styles.noRoundTitle}>Track a Round</Text>
            <Text style={styles.noRoundText}>
              Record every hole with score, putts, fairways, and greens to build your performance data.
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => setShowNewRound(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.startButtonText}>Start New Round</Text>
            </TouchableOpacity>
          </View>

          {rounds.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>Round History</Text>
              {rounds.map((round) => {
                const stp = round.scoreToPar;
                const parLabel = stp === 0 ? 'E' : stp > 0 ? `+${stp}` : String(stp);
                const udPct = round.upAndDownAttempts > 0
                  ? Math.round((round.upAndDowns / round.upAndDownAttempts) * 100)
                  : null;
                return (
                  <View key={round.id} style={styles.historyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyCourse}>{round.courseName}</Text>
                      <Text style={styles.historyDate}>
                        {new Date(round.date).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                      </Text>
                      <Text style={styles.historyStats}>
                        {round.greensInRegulation} GIR · {round.fairwaysHit}/{round.fairwaysTotal} FW · {round.totalPutts} putts
                        {udPct !== null ? ` · ${udPct}% U&D` : ''}
                        {round.totalPenalties > 0 ? ` · ${round.totalPenalties} pen` : ''}
                      </Text>
                      {round.scoreDifferential !== undefined && (
                        <Text style={styles.historyDiff}>
                          Differential: {round.scoreDifferential > 0 ? '+' : ''}{round.scoreDifferential.toFixed(1)}
                        </Text>
                      )}
                      {round.notes ? (
                        <Text style={styles.historyNotes} numberOfLines={1}>📝 {round.notes}</Text>
                      ) : null}
                    </View>
                    <View style={styles.historyScores}>
                      <Text style={styles.historyTotal}>{round.totalScore}</Text>
                      <Text style={[
                        styles.historyPar,
                        stp < 0 ? { color: Colors.success } : stp > 0 ? { color: Colors.error } : {},
                      ]}>
                        {parLabel}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* New Round Modal */}
      <Modal visible={showNewRound} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowNewRound(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Round</Text>
              <TouchableOpacity onPress={handleStartRound}>
                <Text style={styles.modalStart}>Start</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.inputLabel}>Course Name</Text>
              <TextInput
                style={styles.textInput}
                value={courseName}
                onChangeText={setCourseName}
                placeholder="e.g. Pebble Beach"
                placeholderTextColor={Colors.textLight}
                autoFocus
                returnKeyType="next"
              />

              <Text style={[styles.inputLabel, { marginTop: Spacing.lg }]}>Round Type</Text>
              <View style={styles.roundTypeRow}>
                {([
                  { key: 'casual', label: 'Casual' },
                  { key: 'competitive', label: 'Competitive' },
                  { key: 'tournament', label: 'Tournament' },
                ] as { key: RoundType; label: string }[]).map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.roundTypeChip, roundType === opt.key && styles.roundTypeChipActive]}
                    onPress={() => setRoundType(opt.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.roundTypeText, roundType === opt.key && styles.roundTypeTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: Spacing.lg }]}>
                Course Rating & Slope{' '}
                <Text style={styles.inputOptional}>(optional — enables handicap differential)</Text>
              </Text>
              <View style={styles.ratingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputSublabel}>Course Rating</Text>
                  <TextInput
                    style={styles.textInput}
                    value={courseRating}
                    onChangeText={setCourseRating}
                    placeholder="72.1"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="decimal-pad"
                    returnKeyType="next"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputSublabel}>Slope Rating</Text>
                  <TextInput
                    style={styles.textInput}
                    value={slopeRating}
                    onChangeText={setSlopeRating}
                    placeholder="113"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleStartRound}
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Counter({
  value,
  onDecrement,
  onIncrement,
  min = 0,
  formatVal,
}: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  min?: number;
  formatVal?: (v: number) => string;
}) {
  return (
    <View style={holeStyles.counter}>
      <TouchableOpacity
        style={[holeStyles.counterBtn, value <= min && holeStyles.counterBtnDisabled]}
        onPress={onDecrement}
        disabled={value <= min}
      >
        <Text style={holeStyles.counterBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={holeStyles.counterVal}>{formatVal ? formatVal(value) : (value || '—')}</Text>
      <TouchableOpacity style={holeStyles.counterBtn} onPress={onIncrement}>
        <Text style={holeStyles.counterBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onYes,
  onNo,
}: {
  label: string;
  value: boolean | undefined;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <View style={holeStyles.row}>
      <Text style={holeStyles.rowLabel}>{label}</Text>
      <View style={holeStyles.toggle}>
        <TouchableOpacity
          style={[holeStyles.toggleBtn, value === true && holeStyles.toggleBtnYes]}
          onPress={onYes}
        >
          <Text style={[holeStyles.toggleText, value === true && holeStyles.toggleTextActive]}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[holeStyles.toggleBtn, value === false && holeStyles.toggleBtnNo]}
          onPress={onNo}
        >
          <Text style={[holeStyles.toggleText, value === false && holeStyles.toggleTextActive]}>No</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SGStepRow({
  label,
  value,
  unit,
  step,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: number | undefined;
  unit: string;
  step: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <View style={holeStyles.sgRow}>
      <Text style={holeStyles.sgLabel}>{label}</Text>
      <View style={holeStyles.counter}>
        <TouchableOpacity
          style={[holeStyles.counterBtn, (!value || value <= 0) && holeStyles.counterBtnDisabled]}
          onPress={onDecrement}
          disabled={!value || value <= 0}
        >
          <Text style={holeStyles.counterBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={holeStyles.sgVal}>
          {value ? `${value}${unit}` : <Text style={{ color: Colors.textLight }}>—</Text>}
        </Text>
        <TouchableOpacity style={holeStyles.counterBtn} onPress={onIncrement}>
          <Text style={holeStyles.counterBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const MISS_GRID: { dir: MissDirection; label: string }[][] = [
  [{ dir: 'long-left', label: '↖' }, { dir: 'long', label: '↑' }, { dir: 'long-right', label: '↗' }],
  [{ dir: 'left', label: '←' }, { dir: 'center', label: '◎' }, { dir: 'right', label: '→' }],
  [{ dir: 'short-left', label: '↙' }, { dir: 'short', label: '↓' }, { dir: 'short-right', label: '↘' }],
];

function MissGrid({ value, onSelect }: { value: MissDirection | undefined; onSelect: (d: MissDirection) => void }) {
  return (
    <View style={{ gap: 4 }}>
      {MISS_GRID.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 4 }}>
          {row.map(({ dir, label }) => {
            const isCenter = dir === 'center';
            const isActive = value === dir;
            return (
              <TouchableOpacity
                key={dir}
                style={[
                  holeStyles.missCell,
                  isCenter && holeStyles.missCellCenter,
                  isActive && (isCenter ? holeStyles.missCellCenterActive : holeStyles.missCellActive),
                ]}
                onPress={() => onSelect(dir)}
                activeOpacity={0.7}
              >
                <Text style={[holeStyles.missCellText, isActive && holeStyles.missCellTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function HoleInputCard({
  hole,
  onUpdate,
  onNext,
}: {
  hole: HoleScore;
  onUpdate: (data: Partial<HoleScore>) => void;
  onNext: () => void;
}) {
  const [showSG, setShowSG] = useState(false);
  const scoreVsPar = hole.strokes > 0 ? hole.strokes - hole.par : null;

  return (
    <View style={holeStyles.card}>
      <View style={holeStyles.cardHeader}>
        <Text style={holeStyles.holeLabel}>Hole {hole.holeNumber}</Text>
        {scoreVsPar !== null && (
          <View style={[
            holeStyles.scoreBadge,
            scoreVsPar < 0 ? holeStyles.scoreBadgeUnder
              : scoreVsPar === 0 ? holeStyles.scoreBadgeEven
              : holeStyles.scoreBadgeOver,
          ]}>
            <Text style={holeStyles.scoreBadgeText}>
              {scoreVsPar === 0 ? 'Par' : scoreVsPar < 0 ? scoreVsPar : `+${scoreVsPar}`}
            </Text>
          </View>
        )}
      </View>

      {/* Par */}
      <View style={holeStyles.row}>
        <Text style={holeStyles.rowLabel}>Par</Text>
        <View style={holeStyles.segmented}>
          {([3, 4, 5] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[holeStyles.seg, hole.par === p && holeStyles.segActive]}
              onPress={() => onUpdate({ par: p })}
              activeOpacity={0.75}
            >
              <Text style={[holeStyles.segText, hole.par === p && holeStyles.segTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Strokes */}
      <View style={holeStyles.row}>
        <Text style={holeStyles.rowLabel}>Strokes</Text>
        <Counter
          value={hole.strokes}
          onDecrement={() => onUpdate({ strokes: Math.max(0, hole.strokes - 1) })}
          onIncrement={() => onUpdate({ strokes: hole.strokes + 1 })}
        />
      </View>

      {/* Putts */}
      <View style={holeStyles.row}>
        <Text style={holeStyles.rowLabel}>Putts</Text>
        <Counter
          value={hole.putts}
          onDecrement={() => onUpdate({ putts: Math.max(0, hole.putts - 1) })}
          onIncrement={() => onUpdate({ putts: hole.putts + 1 })}
          formatVal={(v) => String(v)}
        />
      </View>

      {/* Penalties */}
      <View style={holeStyles.row}>
        <Text style={holeStyles.rowLabel}>Penalty Strokes</Text>
        <Counter
          value={hole.penaltyStrokes ?? 0}
          onDecrement={() => onUpdate({ penaltyStrokes: Math.max(0, (hole.penaltyStrokes ?? 0) - 1) })}
          onIncrement={() => onUpdate({ penaltyStrokes: (hole.penaltyStrokes ?? 0) + 1 })}
          formatVal={(v) => String(v)}
        />
      </View>

      {/* Fairway (par 4/5 only) */}
      {(hole.par === 4 || hole.par === 5) && (
        <ToggleRow
          label="Fairway Hit"
          value={hole.fairwayHit}
          onYes={() => onUpdate({ fairwayHit: true })}
          onNo={() => onUpdate({ fairwayHit: false })}
        />
      )}

      {/* GIR */}
      <ToggleRow
        label="Green in Regulation"
        value={hole.greenInRegulation}
        onYes={() => onUpdate({ greenInRegulation: true, upAndDown: undefined })}
        onNo={() => onUpdate({ greenInRegulation: false })}
      />

      {/* Up & Down (only when GIR = false and strokes > 0) */}
      {hole.greenInRegulation === false && hole.strokes > 0 && (
        <ToggleRow
          label="Up & Down"
          value={hole.upAndDown}
          onYes={() => onUpdate({ upAndDown: true })}
          onNo={() => onUpdate({ upAndDown: false })}
        />
      )}

      {/* Strokes Gained inputs (collapsible) */}
      <TouchableOpacity
        style={holeStyles.sgToggleRow}
        onPress={() => setShowSG(!showSG)}
        activeOpacity={0.7}
      >
        <Text style={holeStyles.sgToggleLabel}>Performance Details</Text>
        <Text style={holeStyles.sgToggleHint}>
          {showSG ? '▲ hide' : '▼ for Strokes Gained'}
        </Text>
      </TouchableOpacity>

      {showSG && (
        <View style={holeStyles.sgSection}>
          <Text style={holeStyles.sgSectionNote}>
            Optional. Used to calculate Strokes Gained across all 4 categories.
          </Text>

          <SGStepRow
            label="Approach Distance"
            value={hole.approachDistanceYards}
            unit=" yds"
            step={5}
            onDecrement={() => onUpdate({ approachDistanceYards: Math.max(5, (hole.approachDistanceYards ?? 5) - 5) })}
            onIncrement={() => onUpdate({ approachDistanceYards: (hole.approachDistanceYards ?? 0) + 5 })}
          />

          {hole.approachDistanceYards && hole.approachDistanceYards > 0 && (
            <View style={holeStyles.sgRow}>
              <Text style={holeStyles.sgLabel}>Approach Lie</Text>
              <View style={holeStyles.lieRow}>
                {(['fairway', 'rough', 'sand', 'recovery'] as const).map((lie) => (
                  <TouchableOpacity
                    key={lie}
                    style={[holeStyles.lieSeg, hole.approachLie === lie && holeStyles.lieSegActive]}
                    onPress={() => onUpdate({ approachLie: lie })}
                  >
                    <Text style={[holeStyles.lieText, hole.approachLie === lie && holeStyles.lieTextActive]}>
                      {lie === 'fairway' ? 'FW' : lie === 'rough' ? 'Rough' : lie === 'sand' ? 'Sand' : 'Rec'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {hole.putts > 0 && (
            <SGStepRow
              label="First Putt Distance"
              value={hole.firstPuttDistanceFeet}
              unit=" ft"
              step={1}
              onDecrement={() => onUpdate({ firstPuttDistanceFeet: Math.max(1, (hole.firstPuttDistanceFeet ?? 1) - 1) })}
              onIncrement={() => onUpdate({ firstPuttDistanceFeet: (hole.firstPuttDistanceFeet ?? 0) + 1 })}
            />
          )}

          <SGStepRow
            label="Proximity to Hole"
            value={hole.proximityFeet}
            unit=" ft"
            step={1}
            onDecrement={() => onUpdate({ proximityFeet: Math.max(1, (hole.proximityFeet ?? 1) - 1) })}
            onIncrement={() => onUpdate({ proximityFeet: (hole.proximityFeet ?? 0) + 1 })}
          />

          <View style={[holeStyles.sgRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
            <Text style={holeStyles.sgLabel}>Miss Direction</Text>
            <MissGrid value={hole.missDirection} onSelect={(dir) => onUpdate({ missDirection: dir })} />
          </View>
        </View>
      )}

      {hole.holeNumber < 18 && (
        <TouchableOpacity style={holeStyles.nextBtn} onPress={onNext} activeOpacity={0.85}>
          <Text style={holeStyles.nextBtnText}>Next Hole →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const holeStyles = StyleSheet.create({
  card: {
    margin: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  holeLabel: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  scoreBadgeUnder: { backgroundColor: Colors.success + '25' },
  scoreBadgeEven: { backgroundColor: Colors.border },
  scoreBadgeOver: { backgroundColor: Colors.error + '25' },
  scoreBadgeText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rowLabel: { fontSize: FontSize.base, fontWeight: '500', color: Colors.text },
  segmented: { flexDirection: 'row', gap: 6 },
  seg: {
    width: 44,
    height: 36,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.textSecondary },
  segTextActive: { color: Colors.background },
  counter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  counterBtnDisabled: { opacity: 0.3 },
  counterBtnText: { fontSize: FontSize.xl, color: Colors.text, fontWeight: '300', lineHeight: 24 },
  counterVal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, minWidth: 32, textAlign: 'center' },
  toggle: { flexDirection: 'row', gap: 6 },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  toggleBtnYes: { backgroundColor: Colors.success + '30', borderColor: Colors.success },
  toggleBtnNo: { backgroundColor: Colors.error + '30', borderColor: Colors.error },
  toggleText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  toggleTextActive: { color: Colors.text },
  sgToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sgToggleLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  sgToggleHint: { fontSize: FontSize.xs, color: Colors.primary },
  sgSection: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
  },
  sgSectionNote: { fontSize: FontSize.xs, color: Colors.textLight, marginBottom: Spacing.sm, lineHeight: 17 },
  sgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sgLabel: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.text, flex: 1 },
  sgVal: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text, minWidth: 60, textAlign: 'center' },
  lieRow: { flexDirection: 'row', gap: 4 },
  lieSeg: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lieSegActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  lieText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.textSecondary },
  lieTextActive: { color: Colors.background },
  nextBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.background },
  missCell: {
    width: 44,
    height: 36,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },
  missCellCenter: { borderColor: Colors.textLight },
  missCellActive: { backgroundColor: Colors.error + '30', borderColor: Colors.error },
  missCellCenterActive: { backgroundColor: Colors.success + '25', borderColor: Colors.success },
  missCellText: { fontSize: FontSize.md, color: Colors.textSecondary },
  missCellTextActive: { color: Colors.text },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  courseName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  roundSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary },
  roundActions: { flexDirection: 'row', gap: Spacing.sm },
  discardBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.error,
  },
  discardText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.error },
  completeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  completeText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.background },
  scoreSummary: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  scoreBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scoreBoxVal: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  scoreBoxLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  holeScroll: { maxHeight: 60 },
  holeScrollContent: { paddingHorizontal: Spacing.lg, gap: 6, alignItems: 'center' },
  holeChip: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  holeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  holeChipDone: { backgroundColor: Colors.primaryPale, borderColor: Colors.primaryMid },
  holeNum: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  holeNumActive: { color: Colors.background },
  holeScore: { fontSize: FontSize.xs, fontWeight: '700' },
  under: { color: Colors.success },
  even: { color: Colors.textSecondary },
  over: { color: Colors.error },
  holeInputArea: { flex: 1 },
  noRoundContent: { padding: Spacing.lg },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: Spacing.lg,
    ...Shadow.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  summaryOverline: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  summaryCourse: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  summaryClose: { fontSize: FontSize.base, color: Colors.textLight, fontWeight: '600' },
  summaryHeadline: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  summaryHighlights: { gap: 8 },
  highlightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  highlightBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
    flexShrink: 0,
  },
  highlightText: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1, lineHeight: 20 },
  notesSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  notesLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  notesInput: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.text,
    minHeight: 90,
    lineHeight: 20,
  },
  noRoundHero: { alignItems: 'center', marginBottom: Spacing.xl, paddingTop: Spacing.lg },
  noRoundEmoji: { fontSize: 64, marginBottom: Spacing.md },
  noRoundTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
  noRoundText: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  startButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    paddingHorizontal: Spacing.xxl,
  },
  startButtonText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.background },
  historySection: { gap: Spacing.sm },
  historyTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyCourse: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text },
  historyDate: { fontSize: FontSize.sm, color: Colors.textSecondary },
  historyStats: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  historyDiff: { fontSize: FontSize.xs, color: Colors.accent, marginTop: 2, fontWeight: '600' },
  historyNotes: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2, fontStyle: 'italic' },
  historyScores: { alignItems: 'flex-end' },
  historyTotal: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  historyPar: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  modalCancel: { fontSize: FontSize.base, color: Colors.textSecondary },
  modalStart: { fontSize: FontSize.base, fontWeight: '700', color: Colors.primary },
  modalContent: { padding: Spacing.xl, gap: 4 },
  inputLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  inputOptional: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '400' },
  inputSublabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4, fontWeight: '500' },
  ratingRow: { flexDirection: 'row', gap: Spacing.md },
  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  roundTypeRow: { flexDirection: 'row', gap: Spacing.sm },
  roundTypeChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  roundTypeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryPale },
  roundTypeText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  roundTypeTextActive: { color: Colors.primary },
  mentalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  mentalLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  mentalDots: { flexDirection: 'row', gap: 8 },
  mentalDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  mentalDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
});
