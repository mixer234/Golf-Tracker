import { useState } from 'react';
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
import { HoleScore } from '../../types';

export default function TrackScreen() {
  const { rounds, currentRound, startRound, updateHole, completeRound, discardCurrentRound } =
    useRoundStore();
  const [showNewRound, setShowNewRound] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseRating, setCourseRating] = useState('');
  const [slopeRating, setSlopeRating] = useState('');
  const [selectedHole, setSelectedHole] = useState(1);

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
      !isNaN(sr) && sr >= 55 && sr <= 155 ? sr : undefined
    );
    setShowNewRound(false);
    setCourseName('');
    setCourseRating('');
    setSlopeRating('');
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
                const sign = round.scoreToPar >= 0 ? '+' : '';
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
                          Differential: {round.scoreDifferential > 0 ? '+' : ''}{round.scoreDifferential}
                        </Text>
                      )}
                    </View>
                    <View style={styles.historyScores}>
                      <Text style={styles.historyTotal}>{round.totalScore}</Text>
                      <Text style={[
                        styles.historyPar,
                        round.scoreToPar < 0 ? { color: Colors.success } : round.scoreToPar > 0 ? { color: Colors.error } : {},
                      ]}>
                        {sign}{round.scoreToPar}
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

function HoleInputCard({
  hole,
  onUpdate,
  onNext,
}: {
  hole: HoleScore;
  onUpdate: (data: Partial<HoleScore>) => void;
  onNext: () => void;
}) {
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
        value={hole.greenInRegulation ? true : hole.greenInRegulation === false ? false : undefined}
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
  nextBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.background },
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
  noRoundContent: { padding: Spacing.xl },
  noRoundHero: { alignItems: 'center', marginBottom: Spacing.xxl },
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
});
