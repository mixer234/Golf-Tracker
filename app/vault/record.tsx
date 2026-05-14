import { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { getThumbnailAsync } from 'expo-video-thumbnails';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import { useSwingStore } from '../../store/useSwingStore';
import { SwingClub } from '../../types';

const MAX_DURATION = 30;
const WARN_AT = 25;
const { width: W, height: H } = Dimensions.get('window');

const CLUB_OPTIONS: { key: SwingClub; label: string }[] = [
  { key: 'driver',       label: 'Driver'     },
  { key: 'fairway_wood', label: 'Wood'        },
  { key: 'hybrid',       label: 'Hybrid'      },
  { key: 'long_iron',    label: 'Long Iron'   },
  { key: 'mid_iron',     label: 'Mid Iron'    },
  { key: 'short_iron',   label: 'Short Iron'  },
  { key: 'wedge',        label: 'Wedge'       },
  { key: 'chipper',      label: 'Chip'        },
  { key: 'putter',       label: 'Putter'      },
];

function formatTimer(seconds: number): string {
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function RecordScreen() {
  const router = useRouter();
  const { addSwing } = useSwingStore();
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();

  const [facing,          setFacing]         = useState<'front' | 'back'>('back');
  const [isRecording,     setIsRecording]    = useState(false);
  const [elapsed,         setElapsed]        = useState(0);
  const [slowMo,          setSlowMo]         = useState(false);
  const [gridOn,          setGridOn]         = useState(false);
  const [showSave,        setShowSave]       = useState(false);
  const [pendingUri,      setPendingUri]     = useState<string | null>(null);
  const [pendingDuration, setPendingDuration]= useState(0);
  const [saveTitle,       setSaveTitle]      = useState('My Swing');
  const [saveClub,        setSaveClub]       = useState<SwingClub>('driver');
  const [saving,          setSaving]         = useState(false);

  const cameraRef     = useRef<CameraView>(null);
  const isRecRef      = useRef(false);
  const elapsedRef    = useRef(0);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim     = useRef(new Animated.Value(1)).current;
  const pulseOpacity  = useRef(new Animated.Value(1)).current;
  const pulseLoopRef  = useRef<Animated.CompositeAnimation | null>(null);

  // Start/stop pulse animation with recording state
  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim,    { toValue: 1.18, duration: 550, useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0.55, duration: 550, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim,    { toValue: 1,    duration: 550, useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 1,    duration: 550, useNativeDriver: true }),
          ]),
        ])
      );
      pulseLoopRef.current = loop;
      loop.start();
    } else {
      pulseLoopRef.current?.stop();
      pulseAnim.setValue(1);
      pulseOpacity.setValue(1);
    }
  }, [isRecording]);

  async function ensurePermissions(): Promise<boolean> {
    let cam = camPerm;
    let mic = micPerm;
    if (!cam?.granted) {
      const res = await requestCamPerm();
      if (!res.granted) return false;
      cam = res;
    }
    if (!mic?.granted) {
      const res = await requestMicPerm();
      if (!res.granted) return false;
    }
    return true;
  }

  async function startRecording() {
    if (isRecRef.current) return;
    const ok = await ensurePermissions();
    if (!ok) {
      Alert.alert('Permissions Required', 'Camera and microphone access is needed to record swings.');
      return;
    }

    elapsedRef.current = 0;
    setElapsed(0);
    isRecRef.current = true;
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      elapsedRef.current = Math.min(elapsedRef.current + 0.1, MAX_DURATION);
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= MAX_DURATION) {
        clearInterval(timerRef.current!);
        cameraRef.current?.stopRecording();
      }
    }, 100);

    try {
      const result = await cameraRef.current?.recordAsync({ maxDuration: MAX_DURATION });
      clearInterval(timerRef.current!);
      const duration = elapsedRef.current;
      isRecRef.current = false;
      setIsRecording(false);
      if (result?.uri) {
        setPendingUri(result.uri);
        setPendingDuration(Math.min(duration, MAX_DURATION));
        setShowSave(true);
      }
    } catch {
      clearInterval(timerRef.current!);
      isRecRef.current = false;
      setIsRecording(false);
    }
  }

  function stopRecording() {
    if (!isRecRef.current) return;
    clearInterval(timerRef.current!);
    cameraRef.current?.stopRecording();
    // recordAsync promise resolves and handles state reset
  }

  async function handleSave() {
    if (!pendingUri || saving) return;
    setSaving(true);
    try {
      const dir = `${FileSystem.documentDirectory}swings/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const fileId = Date.now().toString(36);
      const ext = Platform.OS === 'ios' ? 'mov' : 'mp4';
      const dest = `${dir}${fileId}.${ext}`;
      await FileSystem.moveAsync({ from: pendingUri, to: dest });

      let thumbnailUri: string | undefined;
      try {
        const thumb = await getThumbnailAsync(dest, { time: 200, quality: 0.6 });
        const thumbDest = `${dir}thumb_${fileId}.jpg`;
        await FileSystem.moveAsync({ from: thumb.uri, to: thumbDest });
        thumbnailUri = thumbDest;
      } catch { /* thumbnail is optional */ }

      addSwing({
        title: saveTitle.trim() || 'Swing',
        uri: dest,
        thumbnailUri,
        durationSeconds: pendingDuration,
        club: saveClub,
        slowMo,
      });
      router.back();
    } catch {
      setSaving(false);
      Alert.alert('Save Failed', 'Could not save the recording. Please try again.');
    }
  }

  function handleDiscard() {
    if (pendingUri) FileSystem.deleteAsync(pendingUri, { idempotent: true }).catch(() => {});
    setShowSave(false);
    setPendingUri(null);
    setElapsed(0);
  }

  const progress = Math.min(elapsed / MAX_DURATION, 1);
  const progressColor = elapsed >= WARN_AT ? Colors.warning : Colors.primary;

  // Permissions not yet loaded
  if (camPerm === null) return null;

  // Permissions denied — show explanation
  if (!camPerm.granted) {
    return (
      <SafeAreaView style={permStyles.container}>
        <StatusBar style="light" />
        <Text style={permStyles.icon}>🎥</Text>
        <Text style={permStyles.title}>Camera Access Required</Text>
        <Text style={permStyles.sub}>
          Allow camera and microphone access to record your swing videos.
        </Text>
        <TouchableOpacity style={permStyles.btn} onPress={ensurePermissions} activeOpacity={0.85}>
          <Text style={permStyles.btnText}>Grant Access</Text>
        </TouchableOpacity>
        <TouchableOpacity style={permStyles.cancelBtn} onPress={() => router.back()}>
          <Text style={permStyles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Camera preview */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
      />

      {/* Rule-of-thirds grid overlay */}
      {gridOn && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={[styles.gridLine, styles.gridV, { left: '33.33%' }]} />
          <View style={[styles.gridLine, styles.gridV, { left: '66.66%' }]} />
          <View style={[styles.gridLine, styles.gridH, { top: '33.33%' }]}  />
          <View style={[styles.gridLine, styles.gridH, { top: '66.66%' }]}  />
        </View>
      )}

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progress * W, backgroundColor: progressColor }]} />
      </View>

      {/* Top bar */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={() => {
            if (isRecRef.current) stopRecording();
            else router.back();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.topBtnText}>{isRecording ? '⏹' : '✕'}</Text>
        </TouchableOpacity>

        {isRecording ? (
          <View style={styles.timerBadge}>
            <View style={styles.recDot} />
            <Text style={styles.timerText}>{formatTimer(elapsed)}</Text>
            {elapsed >= WARN_AT && (
              <Text style={styles.warnText}> — {Math.ceil(MAX_DURATION - elapsed)}s left</Text>
            )}
          </View>
        ) : (
          <View style={styles.timerBadge}>
            <Text style={styles.readyText}>Ready</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.topBtn, isRecording && styles.topBtnDisabled]}
          onPress={() => !isRecording && setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.topBtnText, isRecording && { opacity: 0.4 }]}>🔄</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        {/* Settings row */}
        <View style={styles.settingsRow}>
          <TouchableOpacity
            style={[styles.settingChip, slowMo && styles.settingChipSlowMo]}
            onPress={() => !isRecording && setSlowMo((v) => !v)}
            activeOpacity={0.75}
          >
            <Text style={[styles.settingText, slowMo && styles.settingTextSlowMo]}>
              {slowMo ? 'Slow-Mo ON' : 'Slow-Mo'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingChip, gridOn && styles.settingChipActive]}
            onPress={() => setGridOn((v) => !v)}
            activeOpacity={0.75}
          >
            <Text style={[styles.settingText, gridOn && styles.settingTextActive]}>
              {gridOn ? 'Grid ON' : 'Grid'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Record button */}
        <View style={styles.recordRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Animated.View
              style={[
                styles.recordOuter,
                isRecording && { transform: [{ scale: pulseAnim }], opacity: pulseOpacity },
              ]}
            >
              {isRecording ? (
                <View style={styles.stopInner} />
              ) : (
                <View style={styles.recInner} />
              )}
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Save overlay ── */}
      <Modal visible={showSave} transparent animationType="slide">
        <View style={saveStyles.overlay}>
          <View style={saveStyles.sheet}>
            <Text style={saveStyles.heading}>Save Swing</Text>

            <Text style={saveStyles.label}>Title</Text>
            <TextInput
              style={saveStyles.input}
              value={saveTitle}
              onChangeText={setSaveTitle}
              placeholder="e.g. Driver down-the-line"
              placeholderTextColor={Colors.textLight}
              autoFocus
              returnKeyType="done"
            />

            <Text style={[saveStyles.label, { marginTop: Spacing.md }]}>Club</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              <View style={saveStyles.clubRow}>
                {CLUB_OPTIONS.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    style={[saveStyles.clubChip, saveClub === c.key && saveStyles.clubChipActive]}
                    onPress={() => setSaveClub(c.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[saveStyles.clubText, saveClub === c.key && saveStyles.clubTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={saveStyles.actions}>
              <TouchableOpacity style={saveStyles.discardBtn} onPress={handleDiscard}>
                <Text style={saveStyles.discardText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[saveStyles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={saveStyles.saveBtnText}>{saving ? 'Saving…' : 'Save Swing'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  // Grid
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.25)' },
  gridV: { width: 1, top: 0, bottom: 0 },
  gridH: { height: 1, left: 0, right: 0 },
  // Progress bar
  progressTrack: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.15)', zIndex: 10 },
  progressFill: { height: 3 },
  // Top bar
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 3, zIndex: 20 },
  topBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  topBtnDisabled: { opacity: 0.5 },
  topBtnText: { fontSize: 20 },
  timerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.full,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  timerText: { fontSize: FontSize.base, fontWeight: '700', color: '#fff', fontVariant: ['tabular-nums'] },
  warnText: { fontSize: FontSize.sm, color: Colors.warning, fontWeight: '600' },
  readyText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  // Bottom
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: 48, paddingTop: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  settingsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  settingChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  settingChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryPale },
  settingChipSlowMo: { borderColor: Colors.warning, backgroundColor: 'rgba(251,191,36,0.15)' },
  settingText: { fontSize: FontSize.sm, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  settingTextActive: { color: Colors.primary },
  settingTextSlowMo: { color: Colors.warning },
  recordRow: { alignItems: 'center' },
  recordOuter: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 4, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  recInner: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#ef4444',
  },
  stopInner: {
    width: 26, height: 26, borderRadius: 5,
    backgroundColor: '#ef4444',
  },
});

const saveStyles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  heading: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    fontSize: FontSize.md, color: Colors.text,
  },
  clubRow: { flexDirection: 'row', gap: 8 },
  clubChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  clubChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryPale },
  clubText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  clubTextActive: { color: Colors.primary, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  discardBtn: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.full,
    alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  discardText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textSecondary },
  saveBtn: {
    flex: 2, paddingVertical: 14, borderRadius: Radius.full,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  saveBtnText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.background },
});

const permStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  icon: { fontSize: 64, marginBottom: Spacing.md },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm, textAlign: 'center' },
  sub: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: Spacing.xl },
  btn: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingVertical: 14, paddingHorizontal: Spacing.xxl, marginBottom: Spacing.md },
  btnText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.background },
  cancelBtn: { paddingVertical: 8 },
  cancelText: { fontSize: FontSize.base, color: Colors.textSecondary },
});
