import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { useUserStore } from '../../store/useUserStore';
import { ExperienceLevel } from '../../types';

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
  const [handicap, setHandicap] = useState(existing?.handicap?.toString() ?? '');
  const [noHandicap, setNoHandicap] = useState(false);
  const [targetHandicap, setTargetHandicap] = useState(existing?.targetHandicap?.toString() ?? '');
  const [ballSpeed, setBallSpeed] = useState(existing?.ballSpeed?.toString() ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Please enter your name';
    if (!noHandicap) {
      const hcp = parseFloat(handicap);
      if (isNaN(hcp) || hcp < 0 || hcp > 54) next.handicap = 'Enter a valid handicap (0–54)';
    }
    const target = parseFloat(targetHandicap);
    if (isNaN(target) || target < 0 || target > 54) next.targetHandicap = 'Enter a valid target (0–54)';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleNext() {
    if (!validate()) return;
    setProfile({
      name: name.trim(),
      experienceLevel: experience,
      handicap: noHandicap ? 36 : parseFloat(handicap),
      targetHandicap: parseFloat(targetHandicap),
      targetTimeline: '6_months',
      weaknesses: existing?.weaknesses ?? [],
      strengths: existing?.strengths ?? [],
      missTendencies: existing?.missTendencies ?? [],
      goals: existing?.goals ?? [],
      ballSpeed: ballSpeed ? parseFloat(ballSpeed) : undefined,
      practiceDaysPerWeek: existing?.practiceDaysPerWeek ?? 3,
      sessionLengthMinutes: existing?.sessionLengthMinutes ?? 60,
      facilities: existing?.facilities ?? [],
      hasCompletedOnboarding: false,
      apiKey: existing?.apiKey ?? '',
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    });
    router.push('/onboarding/schedule');
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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
                  <Text style={[styles.expLabel, experience === opt.key && styles.expLabelActive]}>{opt.label}</Text>
                  <Text style={styles.expSub}>{opt.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Handicap */}
          <View style={styles.field}>
            <Text style={styles.label}>Current Handicap Index</Text>
            <TouchableOpacity
              style={[styles.noHcpToggle, noHandicap && styles.noHcpToggleActive]}
              onPress={() => setNoHandicap(!noHandicap)}
              activeOpacity={0.75}
            >
              <View style={[styles.checkbox, noHandicap && styles.checkboxActive]}>
                {noHandicap && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.noHcpText}>I don't have an official handicap yet</Text>
            </TouchableOpacity>
            {!noHandicap && (
              <TextInput
                style={[styles.input, errors.handicap ? styles.inputError : null]}
                value={handicap}
                onChangeText={setHandicap}
                placeholder="e.g. 14.2"
                placeholderTextColor={Colors.textLight}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            )}
            {errors.handicap && <Text style={styles.error}>{errors.handicap}</Text>}
          </View>

          {/* Target */}
          <View style={styles.field}>
            <Text style={styles.label}>Target Handicap</Text>
            <Text style={styles.hint}>Where do you want to get to?</Text>
            <TextInput
              style={[styles.input, errors.targetHandicap ? styles.inputError : null]}
              value={targetHandicap}
              onChangeText={setTargetHandicap}
              placeholder="e.g. 8.0"
              placeholderTextColor={Colors.textLight}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            {errors.targetHandicap && <Text style={styles.error}>{errors.targetHandicap}</Text>}
          </View>

          {/* Ball Speed (optional) */}
          <View style={styles.field}>
            <Text style={styles.label}>Ball Speed — <Text style={styles.optional}>optional</Text></Text>
            <Text style={styles.hint}>From a launch monitor or Trackman. Helps calibrate distance drills.</Text>
            <TextInput
              style={styles.input}
              value={ballSpeed}
              onChangeText={setBallSpeed}
              placeholder="e.g. 145 mph"
              placeholderTextColor={Colors.textLight}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.nextText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[dotStyles.dot, i < current && dotStyles.dotActive, i === current - 1 && dotStyles.dotCurrent]} />
      ))}
      <Text style={dotStyles.label}>Step {current} of {total}</Text>
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primaryLight },
  dotCurrent: { width: 24, backgroundColor: Colors.primary },
  label: { fontSize: FontSize.xs, color: Colors.textSecondary, marginLeft: 4, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.lg },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, lineHeight: 34, marginBottom: 8 },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.xl },
  field: { marginBottom: Spacing.lg, gap: 6 },
  label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  hint: { fontSize: FontSize.xs, color: Colors.textLight },
  optional: { fontWeight: '400', color: Colors.textLight },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: FontSize.base,
    color: Colors.text,
    ...Shadow.sm,
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
    ...Shadow.sm,
  },
  expCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryPale },
  expEmoji: { fontSize: 22, width: 30 },
  expLabel: { fontSize: FontSize.base, fontWeight: '700', color: Colors.text, flex: 1 },
  expLabelActive: { color: Colors.primary },
  expSub: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 2, textAlign: 'right' },
  noHcpToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  noHcpToggleActive: {},
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: Colors.surface, fontSize: 12, fontWeight: '800' },
  noHcpText: { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  backBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border },
  backText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textSecondary },
  nextBtn: { flex: 2, backgroundColor: Colors.primary, paddingVertical: 16, alignItems: 'center', borderRadius: Radius.full },
  nextText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.surface },
});
