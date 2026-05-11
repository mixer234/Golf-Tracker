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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { useUserStore } from '../../store/useUserStore';
import { usePracticeStore } from '../../store/usePracticeStore';
import { useRoundStore } from '../../store/useRoundStore';
import { WEAKNESS_OPTIONS, GOAL_OPTIONS } from '../../constants/data';
import { WeaknessArea, GoalType } from '../../types';
import { HandicapDial, formatHandicap, HCP_MIN, HCP_MAX } from '../../components/HandicapDial';

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const updateProfile = useUserStore((s) => s.updateProfile);
  const clearProfile = useUserStore((s) => s.clearProfile);
  const clearPlan = usePracticeStore((s) => s.clearPlan);
  const rounds = useRoundStore((s) => s.rounds);

  const [editingHandicap, setEditingHandicap] = useState(false);
  const [draftHandicap, setDraftHandicap] = useState(
    profile ? Math.max(HCP_MIN, Math.min(HCP_MAX, Math.round(profile.handicap))) : 18,
  );
  const [apiKeyInput, setApiKeyInput] = useState(profile?.apiKey ?? '');
  const [showApiKey, setShowApiKey] = useState(false);

  if (!profile) return null;

  function openHandicapEditor() {
    setDraftHandicap(Math.max(HCP_MIN, Math.min(HCP_MAX, Math.round(profile!.handicap))));
    setEditingHandicap(true);
  }

  function saveHandicap() {
    updateProfile({ handicap: draftHandicap });
    setEditingHandicap(false);
  }

  function cancelHandicap() {
    setEditingHandicap(false);
  }

  function saveApiKey() {
    updateProfile({ apiKey: apiKeyInput.trim() });
    clearPlan();
    Alert.alert('API Key Saved', 'Your key has been saved. You can now generate AI practice plans.');
  }

  function toggleWeakness(key: WeaknessArea) {
    const current = profile.weaknesses;
    updateProfile({
      weaknesses: current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    });
  }

  function toggleGoal(key: GoalType) {
    const current = profile.goals;
    updateProfile({
      goals: current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    });
  }

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profile</Text>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{profile.name}</Text>
            <Text style={styles.userSince}>
              Member since{' '}
              {new Date(profile.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Handicap */}
        <SectionHeader title="Handicap" />
        <View style={styles.card}>
          {editingHandicap ? (
            <View style={styles.dialSection}>
              <HandicapDial value={draftHandicap} onChange={setDraftHandicap} />
              <View style={styles.dialActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={cancelHandicap}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveHandicap}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.handicapRow}>
              <View>
                <Text style={styles.hcpValue}>{formatHandicap(profile.handicap)}</Text>
                <Text style={styles.hcpSub}>
                  Target: {formatHandicap(profile.targetHandicap)}
                </Text>
              </View>
              <TouchableOpacity style={styles.editBtn} onPress={openHandicapEditor}>
                <Text style={styles.editBtnText}>Update</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Practice Preferences */}
        <SectionHeader title="Practice Info" />
        <View style={styles.card}>
          <InfoRow label="Practice days/week" value={`${profile.practiceDaysPerWeek} days`} />
          <InfoRow label="Session length" value={`${profile.sessionLengthMinutes} min`} />
          {profile.ballSpeed != null && (
            <InfoRow label="Ball speed" value={`${profile.ballSpeed} mph`} />
          )}
          <InfoRow
            label="Rounds logged"
            value={rounds.filter((r) => r.isComplete).length.toString()}
            isLast
          />
        </View>

        {/* Weaknesses */}
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

        {/* Goals */}
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

        {/* API Key */}
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

        {/* Danger Zone */}
        <SectionHeader title="Account" />
        <View style={[styles.card, { marginBottom: Spacing.xxl }]}>
          <TouchableOpacity onPress={handleReset} activeOpacity={0.75}>
            <Text style={styles.resetText}>Reset all data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={headerStyles.title}>{title}</Text>;
}

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
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    paddingHorizontal: 2,
  },
});

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  border: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  label: { fontSize: FontSize.base, color: Colors.textSecondary },
  value: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.lg },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.surface },
  userName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.surface },
  userSince: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
    marginBottom: Spacing.xs,
  },
  handicapRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hcpValue: { fontSize: FontSize.xxxl, fontWeight: '800', color: Colors.text },
  hcpSub: { fontSize: FontSize.sm, color: Colors.textSecondary },
  editBtn: {
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  editBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  dialSection: { alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.md },
  dialActions: { flexDirection: 'row', gap: Spacing.sm, alignSelf: 'stretch' },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.surface },
  cancelBtn: {
    flex: 1,
    borderRadius: Radius.full,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cancelBtnText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textSecondary },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipSelected: { backgroundColor: Colors.primaryPale, borderColor: Colors.primary },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textSecondary },
  chipTextSelected: { color: Colors.primary, fontWeight: '700' },
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
    color: Colors.text,
    fontFamily: 'monospace',
  },
  apiActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  showKeyBtn: { paddingVertical: 4 },
  showKeyText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
  saveApiBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  saveApiBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.surface },
  keyStatus: { fontSize: FontSize.xs, color: Colors.success, fontWeight: '600' },
  keyStatusEmpty: { fontSize: FontSize.xs, color: Colors.textLight },
  resetText: { fontSize: FontSize.base, color: Colors.error, fontWeight: '600', textAlign: 'center', paddingVertical: 4 },
});
