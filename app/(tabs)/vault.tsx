import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  Platform,
  ActionSheetIOS,
  KeyboardAvoidingView,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../../constants/theme';
import { useSwingStore, FREE_TIER_LIMIT } from '../../store/useSwingStore';
import { SwingVideo, SwingClub } from '../../types';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP   = Spacing.sm;
const CARD_WIDTH = (SCREEN_W - Spacing.lg * 2 - CARD_GAP) / 2;

// ─── Club labels & filter mapping ─────────────────────────────────────────────

const CLUB_LABELS: Record<SwingClub, string> = {
  driver:       'Driver',
  fairway_wood: 'Wood',
  hybrid:       'Hybrid',
  long_iron:    'Long Iron',
  mid_iron:     'Mid Iron',
  short_iron:   'Short Iron',
  wedge:        'Wedge',
  chipper:      'Chip',
  putter:       'Putter',
};

type FilterKey = 'all' | 'driver' | 'irons' | 'wedges' | 'putting' | 'chipping';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',      label: 'All'      },
  { key: 'driver',   label: 'Driver'   },
  { key: 'irons',    label: 'Irons'    },
  { key: 'wedges',   label: 'Wedges'   },
  { key: 'putting',  label: 'Putting'  },
  { key: 'chipping', label: 'Chipping' },
];

const CLUB_FILTER: Record<SwingClub, FilterKey> = {
  driver:       'driver',
  fairway_wood: 'driver',
  hybrid:       'irons',
  long_iron:    'irons',
  mid_iron:     'irons',
  short_iron:   'irons',
  wedge:        'wedges',
  chipper:      'chipping',
  putter:       'putting',
};

function formatDuration(secs: number): string {
  const s = Math.floor(secs);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function VaultScreen() {
  const router = useRouter();
  const { swings, deleteSwing, renameSwing } = useSwingStore();

  const [filter,        setFilter]       = useState<FilterKey>('all');
  const [playerSwing,   setPlayerSwing]  = useState<SwingVideo | null>(null);
  const [renameVisible, setRenameVisible]= useState(false);
  const [renameTarget,  setRenameTarget] = useState<SwingVideo | null>(null);
  const [renameDraft,   setRenameDraft]  = useState('');

  const atLimit = swings.length >= FREE_TIER_LIMIT;

  const filtered = filter === 'all'
    ? swings
    : swings.filter((s) => CLUB_FILTER[s.club] === filter);

  // ── Context menu ────────────────────────────────────────────────────────────

  function openContextMenu(swing: SwingVideo) {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Rename', 'Delete'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 2,
          title: swing.title,
        },
        (idx) => {
          if (idx === 1) openRename(swing);
          if (idx === 2) confirmDelete(swing.id, swing.title);
        }
      );
    } else {
      Alert.alert(swing.title, undefined, [
        { text: 'Rename',                    onPress: () => openRename(swing) },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(swing.id, swing.title) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  function openRename(swing: SwingVideo) {
    setRenameTarget(swing);
    setRenameDraft(swing.title);
    setRenameVisible(true);
  }

  function confirmDelete(id: string, title: string) {
    Alert.alert('Delete Swing', `Delete "${title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSwing(id) },
    ]);
  }

  function submitRename() {
    if (renameTarget && renameDraft.trim()) {
      renameSwing(renameTarget.id, renameDraft.trim());
    }
    setRenameVisible(false);
    setRenameTarget(null);
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Swing Vault</Text>
        <View style={styles.headerBtns}>
          {/* TODO: build app/vault/compare.tsx then restore this button
          {swings.length >= 2 && (
            <TouchableOpacity style={styles.compareBtn} activeOpacity={0.8}>
              <Text style={styles.compareBtnText}>Compare</Text>
            </TouchableOpacity>
          )} */}
          {atLimit ? null : (
            <TouchableOpacity
              style={styles.recordBtn}
              onPress={() => router.push('/vault/record')}
              activeOpacity={0.85}
            >
              <Text style={styles.recordBtnText}>🎥  Record</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── Filter strip ──────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Upsell ────────────────────────────────────────────────────── */}
        {atLimit && (
          <View style={styles.upsellCard}>
            <Text style={styles.upsellIcon}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.upsellTitle}>Free limit reached ({FREE_TIER_LIMIT} swings)</Text>
              <Text style={styles.upsellSub}>Upgrade to Pro for unlimited swing storage</Text>
            </View>
          </View>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {swings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏌️</Text>
            <Text style={styles.emptyTitle}>No swings recorded yet</Text>
            <Text style={styles.emptySub}>
              Record your first swing to start tracking your technique
            </Text>
            <TouchableOpacity
              style={styles.recordBtn}
              onPress={() => router.push('/vault/record')}
              activeOpacity={0.85}
            >
              <Text style={styles.recordBtnText}>🎥  Record a Swing</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyFilter}>
            <Text style={styles.emptyFilterText}>No {filter} swings saved yet</Text>
          </View>
        ) : (
          /* ── Swing grid ─────────────────────────────────────────────── */
          <View style={styles.grid}>
            {filtered.map((swing) => (
              <SwingCard
                key={swing.id}
                swing={swing}
                onPress={() => setPlayerSwing(swing)}
                onLongPress={() => openContextMenu(swing)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Video player modal ────────────────────────────────────────────── */}
      <Modal
        visible={playerSwing !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPlayerSwing(null)}
      >
        <View style={playerStyles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setPlayerSwing(null)}
            activeOpacity={1}
          />
          {playerSwing && (
            <View style={playerStyles.card}>
              <View style={playerStyles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={playerStyles.title} numberOfLines={1}>{playerSwing.title}</Text>
                  <Text style={playerStyles.meta}>
                    {CLUB_LABELS[playerSwing.club]}
                    {playerSwing.slowMo ? '  ·  Slow-Mo' : ''}
                    {'  ·  ' + formatDuration(playerSwing.durationSeconds)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setPlayerSwing(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={playerStyles.close}>✕</Text>
                </TouchableOpacity>
              </View>
              <Video
                source={{ uri: playerSwing.uri }}
                style={playerStyles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
              />
            </View>
          )}
        </View>
      </Modal>

      {/* ── Rename modal ──────────────────────────────────────────────────── */}
      <Modal visible={renameVisible} transparent animationType="fade" onRequestClose={() => setRenameVisible(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <View style={renameStyles.overlay}>
          <View style={renameStyles.card}>
            <Text style={renameStyles.title}>Rename Swing</Text>
            <TextInput
              style={renameStyles.input}
              value={renameDraft}
              onChangeText={setRenameDraft}
              placeholder="Swing title"
              placeholderTextColor={Colors.textLight}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={submitRename}
            />
            <View style={renameStyles.actions}>
              <TouchableOpacity style={renameStyles.cancelBtn} onPress={() => setRenameVisible(false)}>
                <Text style={renameStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={renameStyles.saveBtn} onPress={submitRename} activeOpacity={0.85}>
                <Text style={renameStyles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Swing card ───────────────────────────────────────────────────────────────

function SwingCard({
  swing, onPress, onLongPress,
}: {
  swing: SwingVideo;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, { width: CARD_WIDTH }]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      activeOpacity={0.88}
    >
      {/* Thumbnail */}
      <View style={styles.thumbWrap}>
        {swing.thumbnailUri ? (
          <Image source={{ uri: swing.thumbnailUri }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={styles.thumbPlaceholderIcon}>🎬</Text>
          </View>
        )}
        {/* Duration badge — bottom right */}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(swing.durationSeconds)}</Text>
        </View>
        {/* Club badge — bottom left */}
        <View style={styles.clubBadge}>
          <Text style={styles.clubBadgeText}>{CLUB_LABELS[swing.club]}</Text>
        </View>
        {/* Slow-Mo badge */}
        {swing.slowMo && (
          <View style={styles.slowMoBadge}>
            <Text style={styles.slowMoText}>SLO</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{swing.title}</Text>
      <Text style={styles.cardDate}>
        {new Date(swing.date).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        })}
      </Text>
    </TouchableOpacity>
  );
}

// ─── StyleSheets ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  headerBtns: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  compareBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.circle,
    borderWidth: 1.5,
    borderColor: Colors.darkGreen,
  },
  compareBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.darkGreen },
  recordBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.circle,
    backgroundColor: Colors.darkGreen,
  },
  recordBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: '#ffffff' },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: Radius.circle,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterChipActive: { borderColor: Colors.darkGreen, backgroundColor: Colors.paleGreen },
  filterText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: Colors.darkGreen },
  // Upsell
  upsellCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  upsellIcon: { fontSize: 28 },
  upsellTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  upsellSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyIcon: { fontSize: 72, marginBottom: Spacing.sm },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: Spacing.sm },
  emptyFilter: { alignItems: 'center', paddingTop: Spacing.xxl },
  emptyFilterText: { fontSize: FontSize.base, color: Colors.textSecondary },
  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 100,
  },
  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: Colors.surfaceAlt,
    position: 'relative',
  },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbPlaceholderIcon: { fontSize: 36 },
  durationBadge: {
    position: 'absolute', bottom: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: Radius.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  durationText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  clubBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: Colors.darkGreen + 'cc',
    borderRadius: Radius.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  clubBadgeText: { fontSize: 9, fontWeight: '700', color: '#ffffff' },
  slowMoBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: Colors.warning + 'cc',
    borderRadius: Radius.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  slowMoText: { fontSize: 9, fontWeight: '800', color: '#000' },
  cardTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: 2,
  },
  cardDate: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
});

const playerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  title: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  meta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  close: { fontSize: FontSize.base, color: Colors.textLight, fontWeight: '600', padding: 4 },
  video: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
  },
});

const renameStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: Radius.circle,
    alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border,
  },
  cancelText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textSecondary },
  saveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: Radius.circle,
    alignItems: 'center', backgroundColor: Colors.darkGreen,
  },
  saveText: { fontSize: FontSize.base, fontWeight: '700', color: '#ffffff' },
});
