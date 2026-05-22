import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { useUserStore } from '../../store/useUserStore';
import { ExperienceLevel } from '../../types';
import { HandicapDial, HCP_MIN, HCP_MAX } from '../../components/HandicapDial';

const EXPERIENCE_OPTIONS: { key: ExperienceLevel; label: string; sub: string; emoji: string }[] = [
  { key: 'beginner', label: 'Beginner', sub: 'Playing less than 2 years', emoji: '🌱' },
  { key: 'casual', label: 'Casual', sub: 'Play occasionally for fun', emoji: '⛳' },
  { key: 'dedicated', label: 'Dedicated', sub: 'Play regularly, focused on improving', emoji: '🎯' },
  { key: 'competitive', label: 'Competitive', sub: 'Play tournaments or serious competition', emoji: '🏆' },
];

export default function SetupScreen() {
  const router = useRouter();
  const setProfile = useUserStore((s) => s.setProfile);
  const existing = useUserStore((s) => s.profile);

  const [name, setName] = useState(existing?.name ?? '');
  const [experience, setExperience] = useState<ExperienceLevel>(existing?.experienceLevel ?? 'casual');
  const [noHandicap, setNoHandicap] = useState(false);
  const [handicap, setHandicap] = useState<number>(
    existing?.handicap != null
      ? Math.max(HCP_MIN, Math.min(HCP_MAX, Math.round(existing.handicap)))
      : 18,
  );
  const [targetHandicap, setTargetHandicap] = useState<number>(
    existing?.targetHandicap != null
      ? Math.max(HCP_MIN, Math.min(HCP_MAX, Math.round(existing.targetHandicap)))
      : 10,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Please enter your name';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleNext() {
    if (!validate()) return;
    setProfile({
      name: name.trim(),
      experienceLevel: experience,
      handicap: noHandicap ? 36 : handicap,
      targetHandicap,
      targetTimeline: '6_months',
      weaknesses: existing?.weaknesses ?? [],
      strengths: existing?.strengths ?? [],
      missTendencies: existing?.missTendencies ?? [],
      goals: existing?.goals ?? [],
      ballSpeed: existing?.ballSpeed,
      practiceDaysPerWeek: existing?.practiceDaysPerWeek ?? 3,
      sessionLengthMinutes: existing?.sessionLengthMinutes ?? 60,
      facilities: existing?.facilities ?? [],
      hasCompletedOnboarding: false,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    });
    router.push('/onboarding/schedule');
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ProgressDots current={1} total={4} />

        <Text style={styles.title}>Tell us about{'\n'}yourself</Text>
        <Text style={styles.subtitle}>We'll use this to build a plan that fits your game.</Text>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Your First Name</Text>
          <TextInput
            style={[styles.input, errors.name ? styles.inputError : null]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Jordan"
            placeholderTextColor={Colors.textLight}
            returnKeyType="done"
          />
          {errors.name && <Text style={styles.error}>{errors.name}</Text>}
        </View>

        {/* Experience */}
        <View style={styles.field}>
          <Text style={styles.label}>Experience Level</Text>
          <View style={styles.expGrid}>
            {EXPERIENCE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.expCard, experience === opt.key && styles.expCardActive]}
                onPress={() => setExperience(opt.key)}
                activeOpacity={0.75}
              >
                <Text style={styles.expEmoji}>{opt.emoji}</Text>
                <Text style={[styles.expLabel, experience === opt.key && styles.expLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.expSub}>{opt.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Current Handicap */}
        <View style={styles.field}>
          <Text style={styles.label}>Current Handicap Index</Text>
          <Text style={styles.hint}>
            Drag the dial or tap the buttons. Slide left for + (plus) handicaps.
          </Text>
          <TouchableOpacity
            style={styles.noHcpToggle}
            onPress={() => setNoHandicap(!noHandicap)}
            activeOpacity={0.75}
          >
            <View style={[styles.checkbox, noHandicap && styles.checkboxActive]}>
              {noHandicap && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.noHcpText}>I don't have an official handicap yet</Text>
          </TouchableOpacity>
          <View style={styles.dialWrap}>
            <HandicapDial
              value={noHandicap ? 36 : handicap}
              onChange={setHandicap}
              disabled={noHandicap}
            />
          </View>
        </View>

        {/* Target Handicap */}
        <View style={styles.field}>
          <Text style={styles.label}>Target Handicap</Text>
          <Text style={styles.hint}>Where do you want to get to?</Text>
          <View style={styles.dialWrap}>
            <HandicapDial value={targetHandicap} onChange={setTargetHandicap} />
          </View>
        </View>

        {/* SG tip — shown only for sub-20 handicap players */}
        {!noHandicap && handicap < 20 && (
          <View style={styles.sgTip}>
            <Text style={styles.sgTipIcon}>✦</Text>
            <Text style={styles.sgTipText}>
              For players under 20 handicap: enter shot distances during rounds to unlock Strokes Gained analysis.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.nextText}>Next →</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i < current && dotStyles.dotActive,
            i === current - 1 && dotStyles.dotCurrent,
          ]}
        />
      ))}
      <Text style={dotStyles.label}>Step {current} of {total}</Text>
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.1)' },
  dotActive: { backgroundColor: Colors.darkGreen },
  dotCurrent: { width: 24, backgroundColor: Colors.darkGreen },
  label: { fontSize: FontSize.xs, color: Colors.textSecondary, marginLeft: 4, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { padding: Spacing.xl, paddingBottom: 100 },
  title: { fontSize: FontSize.xxl, fontWeight: '600', color: Colors.textPrimary, lineHeight: 34, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.xl },
  field: { marginBottom: Spacing.lg, gap: 6 },
  label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  hint: { fontSize: FontSize.xs, color: Colors.textLight },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  inputError: { borderColor: Colors.error },
  error: { fontSize: FontSize.xs, color: Colors.error },
  expGrid: { gap: Spacing.sm },
  expCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  expCardActive: { borderColor: Colors.darkGreen, backgroundColor: Colors.paleGreen },
  expEmoji: { fontSize: 22, width: 30 },
  expLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textSecondary, flex: 1 },
  expLabelActive: { color: Colors.darkGreen, fontWeight: '600' },
  expSub: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 2, textAlign: 'right' },
  noHcpToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.darkGreen, borderColor: Colors.darkGreen },
  checkmark: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  noHcpText: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  dialWrap: { alignItems: 'center', marginTop: Spacing.xs },
  sgTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    marginBottom: Spacing.sm,
  },
  sgTipIcon: { fontSize: 12, color: Colors.darkGreen, fontWeight: '700', marginTop: 2 },
  sgTipText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18, flex: 1 },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  backBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: Radius.circle,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  backText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textSecondary },
  nextBtn: {
    flex: 2,
    backgroundColor: Colors.darkGreen,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: Radius.circle,
  },
  nextText: { fontSize: FontSize.base, fontWeight: '700', color: '#ffffff' },
});
