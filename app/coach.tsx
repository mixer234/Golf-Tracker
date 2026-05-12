import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../constants/theme';
import { useUserStore } from '../store/useUserStore';
import { useRoundStore } from '../store/useRoundStore';
import { useCourseStore } from '../store/useCourseStore';
import { sendCoachMessage, CoachMessage } from '../services/aiCoach';

const SUGGESTED_PROMPTS = [
  "Where should I focus to drop 3 shots?",
  "Analyze my putting stats",
  "What's my biggest scoring weakness?",
  "Give me a pre-round warmup routine",
  "How do I stop leaving shots short?",
  "Help me with course management on tight tee shots",
];

export default function CoachScreen() {
  const router = useRouter();
  const { profile } = useUserStore();
  const { rounds } = useRoundStore();
  const { courses } = useCourseStore();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    if (!profile?.apiKey) {
      Alert.alert('API Key Required', 'Add your Anthropic API key in Settings to use the AI Coach.');
      return;
    }

    const userMsg: CoachMessage = { role: 'user', content };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const reply = await sendCoachMessage(updated, profile, rounds, courses, profile.apiKey);
      setMessages([...updated, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      Alert.alert('Coach unavailable', err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    Alert.alert('Clear Conversation?', 'This will remove all messages in this session.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setMessages([]) },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>Caddie AI</Text>
          <View style={styles.onlinePill}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Claude Sonnet</Text>
          </View>
        </View>
        <TouchableOpacity onPress={messages.length > 0 ? handleClear : undefined} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.clearBtn, messages.length === 0 && { opacity: 0 }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏌️</Text>
              <Text style={styles.emptyTitle}>Your Personal Caddie</Text>
              <Text style={styles.emptySubtitle}>
                Ask me anything about your game. I have your full stats, round history, and course data.
              </Text>

              <View style={styles.statsPreview}>
                <StatBadge label="Handicap" value={profile ? String(profile.handicap) : '—'} />
                <StatBadge label="Rounds" value={String(rounds.length)} />
                <StatBadge label="Courses" value={String(courses.length)} />
              </View>

              <View style={styles.suggestionsWrap}>
                <Text style={styles.suggestLabel}>Try asking:</Text>
                <View style={styles.suggestGrid}>
                  {SUGGESTED_PROMPTS.map((p, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.suggestChip}
                      onPress={() => handleSend(p)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.suggestText}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))
          )}

          {loading && (
            <View style={styles.loadingBubble}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Thinking…</Text>
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your caddie…"
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={600}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || loading}
            activeOpacity={0.8}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message }: { message: CoachMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.avatarDot}>
          <Text style={styles.avatarText}>C</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBadge}>
      <Text style={styles.statBadgeValue}>{value}</Text>
      <Text style={styles.statBadgeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  back: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600', minWidth: 60 },
  title: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  onlineText: { fontSize: 10, color: Colors.textSecondary, fontWeight: '500' },
  clearBtn: { fontSize: FontSize.sm, color: Colors.error, fontWeight: '600', minWidth: 60, textAlign: 'right' },

  messages: { flex: 1 },
  messagesContent: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xl },

  emptyState: { alignItems: 'center', paddingTop: Spacing.xl, gap: Spacing.lg },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },

  statsPreview: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statBadge: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  statBadgeValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary },
  statBadgeLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600', marginTop: 2 },

  suggestionsWrap: { width: '100%', gap: Spacing.sm },
  suggestLabel: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600', letterSpacing: 0.5 },
  suggestGrid: { gap: 8 },
  suggestChip: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500' },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  avatarDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  avatarText: { fontSize: 12, fontWeight: '800', color: Colors.background },
  bubble: {
    maxWidth: '80%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: FontSize.sm, color: Colors.text, lineHeight: 20 },
  bubbleTextUser: { color: Colors.background },

  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 36,
  },
  loadingText: { fontSize: FontSize.sm, color: Colors.textLight, fontStyle: 'italic' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.base,
    color: Colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { fontSize: 18, fontWeight: '800', color: Colors.background },
});
