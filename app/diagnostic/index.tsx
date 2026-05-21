import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, Modal, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { useUserStore } from '../../store/useUserStore';
import { haptics } from '../../utils/haptics';
import { estimateTierFromHandicap, determineGolferTier } from '../../utils/ai/golferTier';
import { getQuestionsForTier } from '../../utils/ai/diagnosticQuestions';
import { extractGolferFingerprint, DIAGNOSTIC_SKIPPED_KEY } from '../../utils/ai/extractGolferFingerprint';
import { GolferTier, DiagnosticQuestion, ConversationEntry } from '../../types/diagnostic';
import QuickChips from '../../components/diagnostic/QuickChips';
import BallFlightGrid from '../../components/diagnostic/BallFlightGrid';
import GreenMissGrid from '../../components/diagnostic/GreenMissGrid';
import ClubSelector from '../../components/diagnostic/ClubSelector';
import PuttingMissSelector from '../../components/diagnostic/PuttingMissSelector';
import YardageDial, { YardageRange } from '../../components/diagnostic/YardageDial';
import { Toast, useToast } from '../../components/Toast';

// ── Typing indicator ────────────────────────────────────────────────────────

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start();
    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  return (
    <View style={dotStyles.row}>
      {[dot1, dot2, dot3].map((d, i) => (
        <Animated.View key={i} style={[dotStyles.dot, { opacity: d }]} />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, paddingVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.darkGreen },
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatVisualAnswer(inputType: string, chips: string[], text: string, visual: unknown): string {
  const parts: string[] = [];
  if (chips.length > 0) parts.push(chips.join(', '));
  if (text.trim()) parts.push(text.trim());
  if (visual && typeof visual === 'object' && 'from' in (visual as object)) {
    const r = visual as YardageRange;
    parts.push(`${r.from}–${r.to} yards`);
  }
  return parts.join(' · ') || '(skipped)';
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function DiagnosticScreen() {
  const router = useRouter();
  const { profile, setFingerprint } = useUserStore();
  const { showToast, toastProps } = useToast();

  const firstName = profile?.name?.trim().split(' ')[0] ?? 'there';
  const handicap = profile?.handicap ?? 18;

  // Determine initial tier
  const [tier] = useState<GolferTier>(() => estimateTierFromHandicap(handicap));
  const [questions] = useState<DiagnosticQuestion[]>(() => getQuestionsForTier(estimateTierFromHandicap(handicap)));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [entries, setEntries] = useState<ConversationEntry[]>([]);
  const [isTyping, setIsTyping] = useState(true); // start with typing indicator for first question

  // Current input state
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [textInput, setTextInput] = useState('');
  const [visualValue, setVisualValue] = useState<unknown>(null);
  const [yardageRange, setYardageRange] = useState<YardageRange>({ from: 30, to: 80 });

  // Completion state
  const [isComplete, setIsComplete] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedFingerprint, setExtractedFingerprint] = useState<import('../../types/diagnostic').GolferFingerprint | null>(null);

  // Skip sheet
  const [showSkipSheet, setShowSkipSheet] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const currentQuestion = questions[currentIndex] ?? null;
  const progress = questions.length > 0 ? (currentIndex) / questions.length : 0;

  // Scroll to bottom when entries or typing state changes
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    return () => clearTimeout(t);
  }, [entries.length, isTyping]);

  // Show first question after mount
  useEffect(() => {
    const t = setTimeout(() => setIsTyping(false), 1200);
    return () => clearTimeout(t);
  }, []);

  function canConfirm(): boolean {
    if (!currentQuestion) return false;
    if (currentQuestion.skippable) return true;
    if (currentQuestion.inputType === 'text') return textInput.trim().length > 0 || !!currentQuestion.skippable;
    if (currentQuestion.inputType === 'chips') return selectedChips.length > 0;
    if (currentQuestion.inputType === 'mixed') return selectedChips.length > 0 || textInput.trim().length > 0;
    if (currentQuestion.inputType === 'visual_grid') return (visualValue as string[] ?? []).length > 0;
    if (currentQuestion.inputType === 'visual_clubs') return (visualValue as string[] ?? []).length > 0;
    if (currentQuestion.inputType === 'visual_putting') return (visualValue as string[] ?? []).length > 0;
    if (currentQuestion.inputType === 'visual_yardage') return true; // always valid
    return false;
  }

  function buildDisplayAnswer(): string {
    if (!currentQuestion) return '';
    const chips = selectedChips;
    const text = textInput.trim();
    const visual = currentQuestion.inputType === 'visual_yardage' ? yardageRange : visualValue;
    return formatVisualAnswer(currentQuestion.inputType, chips, text, visual);
  }

  async function handleConfirm() {
    if (!currentQuestion) return;
    if (!canConfirm() && !currentQuestion.skippable) return;

    haptics.light();

    const displayAnswer = buildDisplayAnswer();
    const visual = currentQuestion.inputType === 'visual_yardage' ? yardageRange
      : currentQuestion.inputType === 'visual_grid' || currentQuestion.inputType === 'visual_clubs' || currentQuestion.inputType === 'visual_putting'
      ? visualValue : null;

    const entry: ConversationEntry = {
      id: currentQuestion.id,
      question: currentQuestion.text,
      displayAnswer,
      answerChips: selectedChips.length > 0 ? selectedChips : undefined,
      answerText: textInput.trim() || undefined,
      answerVisual: visual,
      inputType: currentQuestion.inputType,
    };

    const newEntries = [...entries, entry];
    setEntries(newEntries);

    // Reset inputs
    setSelectedChips([]);
    setTextInput('');
    setVisualValue(null);
    setYardageRange({ from: 30, to: 80 });

    const isLast = currentIndex >= questions.length - 1;

    if (isLast) {
      // Show typing, then completion flow
      setIsTyping(true);
      setTimeout(async () => {
        setIsTyping(false);
        setIsComplete(true);
        setIsExtracting(true);
        try {
          if (!profile) return;
          const fp = await extractGolferFingerprint(newEntries, tier, profile);
          setFingerprint(fp);
          setExtractedFingerprint(fp);
          haptics.success();
        } catch {
          showToast({ type: 'error', title: 'Could not save profile', message: 'Your answers were recorded.' });
        } finally {
          setIsExtracting(false);
        }
      }, 1500);
    } else {
      setIsTyping(true);
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setIsTyping(false);
      }, 1000);
    }
  }

  function handleSkip() {
    if (!currentQuestion?.skippable) return;
    haptics.light();
    const entry: ConversationEntry = {
      id: currentQuestion.id,
      question: currentQuestion.text,
      displayAnswer: '(skipped)',
      inputType: currentQuestion.inputType,
    };
    const newEntries = [...entries, entry];
    setEntries(newEntries);
    setSelectedChips([]);
    setTextInput('');
    setVisualValue(null);

    const isLast = currentIndex >= questions.length - 1;
    if (isLast) {
      setIsTyping(true);
      setTimeout(async () => {
        setIsTyping(false);
        setIsComplete(true);
        setIsExtracting(true);
        try {
          if (!profile) return;
          const fp = await extractGolferFingerprint(newEntries, tier, profile);
          setFingerprint(fp);
          setExtractedFingerprint(fp);
          haptics.success();
        } catch {
          showToast({ type: 'error', title: 'Could not save profile' });
        } finally {
          setIsExtracting(false);
        }
      }, 1500);
    } else {
      setIsTyping(true);
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setIsTyping(false);
      }, 1000);
    }
  }

  async function handleSkipDiagnostic() {
    haptics.light();
    await AsyncStorage.setItem(DIAGNOSTIC_SKIPPED_KEY, 'true');
    router.replace('/(tabs)');
  }

  function handleBackPress() {
    if (entries.length > 0) {
      setShowSkipSheet(true);
    } else {
      setShowSkipSheet(true);
    }
  }

  // ── Render input for current question ─────────────────────────────────────

  function renderInput() {
    if (!currentQuestion || isTyping || isComplete) return null;

    const { inputType, chipOptions = [], multiSelect = false, placeholder, skippable } = currentQuestion;

    return (
      <View style={styles.inputArea}>
        {/* Visual selectors */}
        {inputType === 'visual_grid' && (
          <View style={styles.visualWrap}>
            {currentQuestion.id.includes('driver') || currentQuestion.id.includes('ballfligh') || currentQuestion.id.includes('c_p3_driver') ? (
              <BallFlightGrid
                selected={(visualValue as string[]) ?? []}
                multiSelect={multiSelect}
                onSelect={setVisualValue}
              />
            ) : (
              <GreenMissGrid
                selected={(visualValue as string[]) ?? []}
                onSelect={setVisualValue}
              />
            )}
          </View>
        )}

        {inputType === 'visual_clubs' && (
          <View style={styles.visualWrap}>
            <ClubSelector
              selected={(visualValue as string[]) ?? []}
              onSelect={setVisualValue}
            />
          </View>
        )}

        {inputType === 'visual_putting' && (
          <View style={styles.visualWrap}>
            <PuttingMissSelector
              selected={(visualValue as string[]) ?? []}
              onSelect={setVisualValue}
            />
          </View>
        )}

        {inputType === 'visual_yardage' && (
          <View style={styles.visualWrap}>
            <YardageDial value={yardageRange} onChange={setYardageRange} />
            {chipOptions.length > 0 && (
              <View style={styles.yardageChips}>
                <QuickChips
                  options={chipOptions}
                  selected={selectedChips}
                  multiSelect={multiSelect}
                  onSelect={setSelectedChips}
                />
              </View>
            )}
          </View>
        )}

        {(inputType === 'chips' || inputType === 'mixed') && chipOptions.length > 0 && (
          <View style={styles.chipsWrap}>
            <QuickChips
              options={chipOptions}
              selected={selectedChips}
              multiSelect={multiSelect}
              onSelect={setSelectedChips}
            />
          </View>
        )}

        {(inputType === 'text' || inputType === 'mixed') && (
          <TextInput
            ref={inputRef}
            style={styles.textBox}
            value={textInput}
            onChangeText={setTextInput}
            placeholder={placeholder ?? 'Type your answer...'}
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={400}
            returnKeyType="default"
          />
        )}

        {/* Action row */}
        <View style={styles.actionRow}>
          {skippable && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleConfirm}
            style={[styles.confirmBtn, !canConfirm() && styles.confirmBtnDisabled]}
            disabled={!canConfirm()}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmBtnText}>
              {currentIndex >= questions.length - 1 ? 'Finish →' : 'Next →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Completion view ────────────────────────────────────────────────────────

  function renderComplete() {
    if (!isComplete) return null;

    if (isExtracting) {
      return (
        <View style={styles.extractingWrap}>
          <ActivityIndicator size="large" color={Colors.darkGreen} />
          <Text style={styles.extractingText}>Building your coaching profile...</Text>
        </View>
      );
    }

    const fp = extractedFingerprint;
    return (
      <View style={styles.completionCard}>
        <Text style={styles.completionTitle}>Your coaching profile is ready ✦</Text>
        <Text style={styles.completionSubtitle}>Here's what I'll focus on with you:</Text>
        {fp?.priorityAreas.slice(0, 3).map((area, i) => (
          <View key={i} style={styles.priorityRow}>
            <View style={styles.priorityNum}>
              <Text style={styles.priorityNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.priorityArea}>{area}</Text>
          </View>
        ))}
        {!fp && (
          <Text style={styles.noFpText}>Your answers have been saved to your profile.</Text>
        )}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => { haptics.medium(); router.replace('/(tabs)/practice'); }}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>See my practice plan →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => { haptics.light(); router.replace('/(tabs)'); }}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryBtnText}>Go to home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <Toast {...toastProps} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBackPress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ minWidth: 60 }}
        >
          <Text style={styles.headerBack}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Game Assessment</Text>
          {!isComplete && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          )}
        </View>
        {!isComplete ? (
          <TouchableOpacity
            onPress={() => setShowSkipSheet(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ minWidth: 60, alignItems: 'flex-end' }}
          >
            <Text style={styles.skipAllText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ minWidth: 60 }} />
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
          {/* Intro message */}
          <CoachBubble
            text={`Hi ${firstName}! I'm going to ask you a few questions about your game — this only takes 3–4 minutes and helps me build you a much more personalised coaching plan. Let's go.`}
          />

          {/* Conversation history */}
          {entries.map((entry, i) => (
            <View key={entry.id} style={styles.entryGroup}>
              <CoachBubble text={entry.question} />
              <PlayerBubble text={entry.displayAnswer} />
            </View>
          ))}

          {/* Current question */}
          {!isComplete && !isTyping && currentQuestion && (
            <CoachBubble text={currentQuestion.text} />
          )}

          {/* Typing indicator */}
          {isTyping && (
            <View style={styles.typingBubble}>
              <TypingDots />
            </View>
          )}

          {/* Completion */}
          {isComplete && !isTyping && !isExtracting && (
            <CoachBubble
              text={`Thanks ${firstName} — I've got a really clear picture of your game now. I'm putting together your personalised coaching profile...`}
            />
          )}

          {renderComplete()}
        </ScrollView>

        {/* Input area */}
        {!isComplete && renderInput()}
      </KeyboardAvoidingView>

      {/* Skip confirmation sheet */}
      <Modal visible={showSkipSheet} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Skip your game assessment?</Text>
            <Text style={styles.sheetBody}>
              Your practice plans will be based on your basic profile. You can complete this anytime from your Profile screen.
            </Text>
            <TouchableOpacity
              style={styles.sheetPrimaryBtn}
              onPress={() => setShowSkipSheet(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.sheetPrimaryText}>Complete it (takes 3 mins)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetSecondaryBtn}
              onPress={handleSkipDiagnostic}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetSecondaryText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function CoachBubble({ text }: { text: string }) {
  return (
    <View style={styles.coachRow}>
      <View style={styles.coachAvatar}>
        <Text style={styles.coachAvatarText}>C</Text>
      </View>
      <View style={styles.coachBubble}>
        <Text style={styles.coachBubbleText}>{text}</Text>
      </View>
    </View>
  );
}

function PlayerBubble({ text }: { text: string }) {
  return (
    <View style={styles.playerRow}>
      <View style={styles.playerBubble}>
        <Text style={styles.playerBubbleText}>{text}</Text>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBack: { fontSize: FontSize.sm, color: Colors.darkGreen, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.textPrimary },
  progressBar: {
    height: 3,
    width: 100,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.darkGreen, borderRadius: 2 },
  skipAllText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },

  // Chat
  chatArea: { flex: 1 },
  chatContent: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 24 },
  entryGroup: { gap: Spacing.sm },

  coachRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '88%' },
  coachAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2, flexShrink: 0,
  },
  coachAvatarText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  coachBubble: {
    flex: 1,
    backgroundColor: Colors.darkGreen,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  coachBubbleText: { fontSize: FontSize.sm, color: '#ffffff', lineHeight: 20 },

  playerRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  playerBubble: {
    maxWidth: '75%',
    backgroundColor: Colors.paleGreen,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  playerBubbleText: { fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 18 },

  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 36,
  },

  // Input
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  chipsWrap: {},
  visualWrap: {},
  yardageChips: { marginTop: Spacing.sm },
  textBox: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    maxHeight: 100,
    minHeight: 48,
  },
  actionRow: { flexDirection: 'row', gap: Spacing.sm },
  skipBtn: {
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.circle,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  skipBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.darkGreen,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: Radius.circle,
  },
  confirmBtnDisabled: { opacity: 0.35 },
  confirmBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#ffffff' },

  // Completion
  extractingWrap: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  extractingText: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center' },
  completionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  completionTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  completionSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  priorityNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center', justifyContent: 'center',
  },
  priorityNumText: { fontSize: FontSize.xs, fontWeight: '800', color: '#ffffff' },
  priorityArea: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  noFpText: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: Colors.darkGreen,
    paddingVertical: 16,
    borderRadius: Radius.circle,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#ffffff' },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },

  // Skip sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    paddingBottom: 40,
  },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  sheetBody: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  sheetPrimaryBtn: {
    backgroundColor: Colors.darkGreen,
    paddingVertical: 16,
    borderRadius: Radius.circle,
    alignItems: 'center',
  },
  sheetPrimaryText: { fontSize: FontSize.base, fontWeight: '700', color: '#ffffff' },
  sheetSecondaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetSecondaryText: { fontSize: FontSize.base, color: Colors.textSecondary, fontWeight: '600' },
});
