import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { useUserStore } from '../../store/useUserStore';
import { usePracticeStore } from '../../store/usePracticeStore';
import { useRoundStore } from '../../store/useRoundStore';
import { WEAKNESS_OPTIONS, GOAL_OPTIONS } from '../../constants/data';
import { WeaknessArea, GoalType, ExperienceLevel, PracticeFacility, MissTendency } from '../../types';
import { HandicapDial, formatHandicap, formatTargetHandicap, HCP_MIN, HCP_MAX } from '../../components/HandicapDial';
import Constants from 'expo-constants';
import { GolferFingerprint } from '../../types/diagnostic';

const EXPERIENCE_OPTIONS: { key: ExperienceLevel; label: string; sub: string }[] = [
  { key: 'beginner', label: 'Beginner', sub: 'Less than 2 years' },
  { key: 'casual', label: 'Casual', sub: 'Play for fun' },
  { key: 'dedicated', label: 'Dedicated', sub: 'Focused on improving' },
  { key: 'competitive', label: 'Competitive', sub: 'Tournaments / serious' },
];

const DAY_OPTIONS = [
  { value: 1, label: '1 day' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
  { value: 4, label: '4 days' },
  { value: 5, label: '5+ days' },
];

const SESSION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hr' },
  { value: 90, label: '1.5 hrs' },
  { value: 120, label: '2+ hrs' },
];

const FACILITY_OPTIONS: { key: PracticeFacility; label: string; emoji: string }[] = [
  { key: 'driving_range', label: 'Driving Range', emoji: '🏌️' },
  { key: 'putting_green', label: 'Putting Green', emoji: '⛳' },
  { key: 'chipping_area', label: 'Chipping Area', emoji: '🎯' },
  { key: 'full_course', label: 'Full Course', emoji: '🌿' },
  { key: 'simulator', label: 'Simulator', emoji: '📺' },
  { key: 'home_net', label: 'Home Net', emoji: '🏠' },
];

const MISS_OPTIONS: { key: MissTendency; label: string; emoji: string }[] = [
  { key: 'slice', label: 'Slice', emoji: '↗️' },
  { key: 'hook', label: 'Hook', emoji: '↖️' },
  { key: 'fat_chunk', label: 'Fat / Chunk', emoji: '🌍' },
  { key: 'thin_top', label: 'Thin / Top', emoji: '✂️' },
  { key: 'three_putts', label: '3-putts', emoji: '😩' },
  { key: 'pull_left', label: 'Pull left', emoji: '⬅️' },
  { key: 'push_right', label: 'Push right', emoji: '➡️' },
  { key: 'distance_control', label: 'Distance control', emoji: '📏' },
  { key: 'sand_struggles', label: 'Bunker struggles', emoji: '🏖️' },
  { key: 'inconsistent_contact', label: 'Inconsistent contact', emoji: '🎰' },
  { key: 'pressure_nerves', label: 'Nerves / pressure', emoji: '🧠' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const updateProfile = useUserStore((s) => s.updateProfile);
  const clearProfile = useUserStore((s) => s.clearProfile);
  const clearPlan = usePracticeStore((s) => s.clearPlan);
  const rounds = useRoundStore((s) => s.rounds);

  // Handicap editing
  const [editingHandicap, setEditingHandicap] = useState(false);
  const [draftHandicap, setDraftHandicap] = useState(
    profile ? Math.max(HCP_MIN, Math.min(HCP_MAX, Math.round(profile.handicap))) : 18,
  );

  // Target handicap editing
  const [editingTarget, setEditingTarget] = useState(false);
  const [draftTarget, setDraftTarget] = useState(
    profile ? Math.max(HCP_MIN, Math.min(HCP_MAX, Math.round(profile.targetHandicap))) : 10,
  );

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(profile?.name ?? '');

  // API key
  const [apiKeyInput, setApiKeyInput] = useState(profile?.apiKey ?? '');
  const [showApiKey, setShowApiKey] = useState(false);

  if (!profile) return null;

  // ── Handicap ──────────────────────────────────────────────────────────────

  function openHandicapEditor() {
    setDraftHandicap(Math.max(HCP_MIN, Math.min(HCP_MAX, Math.round(profile!.handicap))));
    setEditingHandicap(true);
  }

  function saveHandicap() {
    updateProfile({ handicap: draftHandicap });
    setEditingHandicap(false);
  }

  // ── Target handicap ───────────────────────────────────────────────────────

  function openTargetEditor() {
    setDraftTarget(Math.max(HCP_MIN, Math.min(HCP_MAX, Math.round(profile!.targetHandicap))));
    setEditingTarget(true);
  }

  function saveTarget() {
    updateProfile({ targetHandicap: draftTarget });
    setEditingTarget(false);
  }

  // ── Name ──────────────────────────────────────────────────────────────────

  function saveName() {
    const trimmed = draftName.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a name.');
      return;
    }
    updateProfile({ name: trimmed });
    setEditingName(false);
  }

  // ── API Key ───────────────────────────────────────────────────────────────

  function saveApiKey() {
    updateProfile({ apiKey: apiKeyInput.trim() });
    clearPlan();
    Alert.alert('API Key Saved', 'Your key has been saved. You can now generate AI practice plans.');
  }

  // ── Toggle helpers ────────────────────────────────────────────────────────

  function toggleWeakness(key: WeaknessArea) {
    const current = profile!.weaknesses;
    updateProfile({
      weaknesses: current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    });
  }

  function toggleGoal(key: GoalType) {
    const current = profile!.goals;
    updateProfile({
      goals: current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    });
  }

  function toggleFacility(key: PracticeFacility) {
    const current = profile!.facilities ?? [];
    updateProfile({
      facilities: current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    });
  }

  function toggleMiss(key: MissTendency) {
    const current = profile!.missTendencies ?? [];
    updateProfile({
      missTendencies: current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    });
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  function handleReset() {
    Alert.alert(
      'Reset App',
      'This will delete all your data including rounds and practice history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: () => {
            clearProfile();
            clearPlan();
            router.replace('/onboarding');
          },
        },
      ]
    );
  }

  const appVersion = Constants.expoConfig?.version ?? '—';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Profile</Text>

        {/* ── User Card ── */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={draftName}
                  onChangeText={setDraftName}
                  autoFocus
                  maxLength={40}
                  returnKeyType="done"
                  onSubmitEditing={saveName}
                  placeholder="Your name"
                  placeholderTextColor={Colors.textLight}
                />
                <TouchableOpacity onPress={saveName} style={styles.nameBtn}>
                  <Text style={styles.nameBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingName(false)} style={styles.nameCancelBtn}>
                  <Text style={styles.nameCancelText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => { setDraftName(profile.name); setEditingName(true); }}
                activeOpacity={0.7}
              >
                <Text style={styles.userName} numberOfLines={1}>{profile.name}</Text>
                <Text style={styles.userSince}>
                  Tap to edit · Member since{' '}
                  {new Date(profile.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Handicap ── */}
        <SectionHeader title="Handicap" />
        <View style={styles.card}>
          {editingHandicap ? (
            <View style={styles.dialSection}>
              <HandicapDial value={draftHandicap} onChange={setDraftHandicap} />
              <View style={styles.dialActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingHandicap(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveHandicap}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : editingTarget ? (
            <View style={styles.dialSection}>
              <Text style={styles.dialLabel}>Target Handicap</Text>
              <HandicapDial value={draftTarget} onChange={setDraftTarget} />
              <View style={styles.dialActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingTarget(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveTarget}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.handicapRow}>
              <TouchableOpacity onPress={openHandicapEditor} activeOpacity={0.7} style={styles.hcpTouchable}>
                <Text style={styles.hcpLabel}>CURRENT</Text>
                <Text style={styles.hcpValue}>{formatHandicap(profile.handicap)}</Text>
                <Text style={styles.hcpEditHint}>Tap to update</Text>
              </TouchableOpacity>
              <View style={styles.hcpDivider} />
              <TouchableOpacity onPress={openTargetEditor} activeOpacity={0.7} style={[styles.hcpTouchable, styles.hcpTouchableRight]}>
                <Text style={styles.hcpLabel}>TARGET</Text>
                <Text style={[styles.hcpValue, styles.hcpValueTarget]}>{formatTargetHandicap(profile.targetHandicap)}</Text>
                <Text style={styles.hcpEditHint}>Tap to update</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Game Profile (Diagnostic Fingerprint) ── */}
        <GameProfileCard router={router} />

        {/* ── Experience ── */}
        <SectionHeader title="Experience Level" />
        <View style={styles.card}>
          <View style={styles.chipsWrap}>
            {EXPERIENCE_OPTIONS.map((opt) => {
              const isSelected = profile.experienceLevel === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => updateProfile({ experienceLevel: opt.key })}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                  {isSelected && <Text style={styles.chipCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Practice Schedule ── */}
        <SectionHeader title="Practice Schedule" />
        <View style={styles.card}>
          <Text style={styles.scheduleLabel}>Days per week</Text>
          <View style={styles.chipsWrap}>
            {DAY_OPTIONS.map((opt) => {
              const isSelected = profile.practiceDaysPerWeek === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => updateProfile({ practiceDaysPerWeek: opt.value })}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.scheduleLabel, { marginTop: Spacing.md }]}>Session length</Text>
          <View style={styles.chipsWrap}>
            {SESSION_OPTIONS.map((opt) => {
              const isSelected = profile.sessionLengthMinutes === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => {
                    updateProfile({ sessionLengthMinutes: opt.value });
                    AsyncStorage.setItem(STORAGE_KEYS.SESSION_LENGTH_PREFERENCE, String(opt.value));
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Available Facilities ── */}
        <SectionHeader title="Available Facilities" />
        <View style={styles.card}>
          <View style={styles.chipsWrap}>
            {FACILITY_OPTIONS.map((opt) => {
              const isSelected = (profile.facilities ?? []).includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleFacility(opt.key)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Areas to Improve ── */}
        <SectionHeader title="Areas to Improve" />
        <View style={styles.card}>
          <View style={styles.chipsWrap}>
            {WEAKNESS_OPTIONS.map((opt) => {
              const isSelected = profile.weaknesses.includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleWeakness(opt.key)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.chipEmoji}>{opt.icon}</Text>
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Miss Tendencies ── */}
        <SectionHeader title="Miss Tendencies" />
        <View style={styles.card}>
          <View style={styles.chipsWrap}>
            {MISS_OPTIONS.map((opt) => {
              const isSelected = (profile.missTendencies ?? []).includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleMiss(opt.key)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Goals ── */}
        <SectionHeader title="Goals" />
        <View style={styles.card}>
          <View style={styles.chipsWrap}>
            {GOAL_OPTIONS.map((opt) => {
              const isSelected = profile.goals.includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => toggleGoal(opt.key)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Stats ── */}
        <SectionHeader title="Stats" />
        <View style={styles.card}>
          <InfoRow label="Rounds logged" value={rounds.filter((r) => r.isComplete).length.toString()} />
          <InfoRow label="Practice days/week" value={`${profile.practiceDaysPerWeek} days`} />
          <InfoRow label="Session length" value={`${profile.sessionLengthMinutes} min`} />
          {profile.ballSpeed != null && (
            <InfoRow label="Ball speed" value={`${profile.ballSpeed} mph`} />
          )}
          <InfoRow label="Experience" value={profile.experienceLevel} isLast />
        </View>

        {/* ── Display Settings ── */}
        <SectionHeader title="Display Settings" />
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => { updateProfile({ advancedStatsMode: !profile.advancedStatsMode }); }}
            activeOpacity={0.75}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Advanced Stats Mode</Text>
              <Text style={styles.toggleSub}>
                Always show GIR, fairways, up & down, and Strokes Gained inputs regardless of handicap.
              </Text>
            </View>
            <View style={[styles.toggleSwitch, profile.advancedStatsMode && styles.toggleSwitchOn]}>
              <View style={[styles.toggleThumb, profile.advancedStatsMode && styles.toggleThumbOn]} />
            </View>
          </TouchableOpacity>
          {!profile.advancedStatsMode && (profile.handicap >= 28) && (
            <Text style={styles.toggleHint}>
              Currently simplified — tracking strokes and putts only (handicap ≥ 28).
            </Text>
          )}
        </View>

        {/* ── Claude AI Settings ── */}
        <SectionHeader title="Claude AI Settings" />
        <View style={styles.card}>
          <Text style={styles.apiNote}>
            Enter your Anthropic API key to enable AI-generated practice plans. Your key is stored
            locally on your device.
          </Text>
          <View style={styles.apiKeyRow}>
            <TextInput
              style={styles.apiInput}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              placeholder="sk-ant-..."
              placeholderTextColor={Colors.textLight}
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.apiActions}>
            <TouchableOpacity onPress={() => setShowApiKey(!showApiKey)} style={styles.showKeyBtn}>
              <Text style={styles.showKeyText}>{showApiKey ? 'Hide' : 'Show'} key</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveApiBtn} onPress={saveApiKey}>
              <Text style={styles.saveApiBtnText}>Save Key</Text>
            </TouchableOpacity>
          </View>
          {profile.apiKey ? (
            <Text style={styles.keyStatus}>✓ API key is set</Text>
          ) : (
            <Text style={styles.keyStatusEmpty}>No API key — AI features disabled</Text>
          )}
        </View>

        {/* ── Account ── */}
        <SectionHeader title="Account" />
        <View style={[styles.card, { marginBottom: Spacing.xs }]}>
          <TouchableOpacity onPress={handleReset} activeOpacity={0.75}>
            <Text style={styles.resetText}>Reset all data</Text>
          </TouchableOpacity>
        </View>

        {/* ── App Version ── */}
        <Text style={styles.versionText}>Golf Tracker v{appVersion}</Text>

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={headerStyles.title}>{title}</Text>;
}

function GameProfileCard({ router }: { router: ReturnType<typeof useRouter> }) {
  const fingerprint = useUserStore((s) => s.fingerprint);

  return (
    <View>
      <Text style={headerStyles.title}>My Game Profile</Text>
      <View style={gpStyles.card}>
        {fingerprint ? (
          <>
            <View style={gpStyles.statusRow}>
              <View style={gpStyles.statusDot} />
              <Text style={gpStyles.statusText}>
                Assessment completed · {new Date(fingerprint.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            <View style={gpStyles.tagsRow}>
              {fingerprint.priorityAreas.slice(0, 3).map((area) => (
                <View key={area} style={gpStyles.tag}>
                  <Text style={gpStyles.tagText}>{area}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={gpStyles.btn}
              onPress={() => router.push('/diagnostic')}
              activeOpacity={0.85}
            >
              <Text style={gpStyles.btnText}>Update my assessment</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={gpStyles.emptyTitle}>Not completed</Text>
            <Text style={gpStyles.emptyText}>
              Complete a 3-minute game assessment so your coach knows exactly where to focus.
            </Text>
            <TouchableOpacity
              style={gpStyles.btnPrimary}
              onPress={() => router.push('/diagnostic')}
              activeOpacity={0.85}
            >
              <Text style={gpStyles.btnPrimaryText}>Start game assessment →</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const gpStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginHorizontal: 0,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  statusText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: Colors.paleGreen,
    borderRadius: Radius.circle,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.darkGreen + '40',
  },
  tagText: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.darkGreen },
  btn: {
    borderWidth: 1.5,
    borderColor: Colors.darkGreen,
    borderRadius: Radius.circle,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.darkGreen },
  emptyTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  emptyText: { fontSize: FontSize.xs, color: Colors.textLight, lineHeight: 18 },
  btnPrimary: {
    backgroundColor: Colors.darkGreen,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  btnPrimaryText: { fontSize: FontSize.sm, fontWeight: '700', color: '#ffffff' },
});

function InfoRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[infoStyles.row, !isLast && infoStyles.border]}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  title: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.08,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    paddingHorizontal: 2,
  },
});

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  border: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  label: { fontSize: FontSize.base, color: Colors.textSecondary },
  value: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textPrimary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: '500', color: '#0d1a06', letterSpacing: -0.5, marginBottom: Spacing.lg },

  // User card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.darkGreen,
    ...Shadow.card,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  avatarText: { fontSize: FontSize.xl, fontWeight: '800', color: '#ffffff' },
  userName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  userSince: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  nameInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.darkGreen,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  nameBtn: {
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  nameBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: '#ffffff' },
  nameCancelBtn: { paddingHorizontal: 4 },
  nameCancelText: { fontSize: FontSize.base, color: Colors.textSecondary },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.card,
    marginBottom: Spacing.xs,
  },

  // Handicap
  handicapRow: { flexDirection: 'row', alignItems: 'stretch' },
  hcpTouchable: { flex: 1, paddingVertical: Spacing.xs },
  hcpTouchableRight: { alignItems: 'flex-end' },
  hcpDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  hcpLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.8, marginBottom: 2 },
  hcpValue: { fontSize: FontSize.hero, fontWeight: '800', color: Colors.textPrimary },
  hcpValueTarget: { color: Colors.darkGreen },
  hcpEditHint: { fontSize: FontSize.xs, color: Colors.textLight, marginTop: 2 },
  dialSection: { alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.md },
  dialLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  dialActions: { flexDirection: 'row', gap: Spacing.sm, alignSelf: 'stretch' },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.circle,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: FontSize.base, fontWeight: '700', color: '#ffffff' },
  cancelBtn: {
    flex: 1,
    borderRadius: Radius.circle,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cancelBtnText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textSecondary },

  // Chips
  scheduleLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.circle,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  chipSelected: { backgroundColor: Colors.paleGreen, borderColor: Colors.darkGreen },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textSecondary },
  chipTextSelected: { color: Colors.darkGreen, fontWeight: '600' },
  chipCheck: { fontSize: 12, color: Colors.darkGreen, fontWeight: '700' },

  // API Key
  apiNote: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md },
  apiKeyRow: { marginBottom: Spacing.sm },
  apiInput: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontFamily: 'monospace',
  },
  apiActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  showKeyBtn: { paddingVertical: 4 },
  showKeyText: { fontSize: FontSize.sm, color: Colors.darkGreen, fontWeight: '600' },
  saveApiBtn: {
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.circle,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  saveApiBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: '#ffffff' },
  keyStatus: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '600' },
  keyStatusEmpty: { fontSize: FontSize.xs, color: Colors.textLight },

  // Reset / version
  resetText: { fontSize: FontSize.base, color: Colors.error, fontWeight: '600', textAlign: 'center', paddingVertical: Spacing.xs },

  // Toggle row (Advanced Stats Mode)
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  toggleLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  toggleSub: { fontSize: FontSize.xs, color: Colors.textLight, lineHeight: 17, flexShrink: 1 },
  toggleHint: {
    fontSize: FontSize.xs, color: Colors.darkGreen, marginTop: Spacing.sm,
    paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  toggleSwitch: {
    width: 46, height: 26, borderRadius: 13,
    backgroundColor: Colors.border, justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleSwitchOn: { backgroundColor: Colors.darkGreen },
  toggleThumb: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#ffffff',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  versionText: { fontSize: FontSize.xs, color: Colors.textLight, textAlign: 'center', marginBottom: Spacing.xxl, marginTop: Spacing.sm },
});
