import { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, runOnJS } from 'react-native-reanimated';
import { Colors, FontSize, Spacing, Shadow } from '../constants/theme';

const SIZE = 260;
const CENTER = SIZE / 2;
const OUTER_R = 108;
const INNER_R = 66;
const THUMB_SIZE = 26;

export const HCP_MIN = -10;
export const HCP_MAX = 54;
const HCP_RANGE = HCP_MAX - HCP_MIN;

// Arc: clockwise from 135° (7:30, lower-left) to 405°=45° (4:30, lower-right), sweep 270°
const ARC_START = 135;
const ARC_SWEEP = 270;

function valueToAngle(v: number): number {
  const t = (Math.max(HCP_MIN, Math.min(HCP_MAX, v)) - HCP_MIN) / HCP_RANGE;
  return ARC_START + t * ARC_SWEEP;
}

export function formatHandicap(v: number): string {
  const n = Math.round(v);
  if (n < 0) return `+${Math.abs(n)}`;
  return String(n);
}

export function formatTargetHandicap(v: number): string {
  return `${Math.abs(Math.round(v))}.0`;
}

interface HandicapDialProps {
  value: number;
  onChange: (val: number) => void;
  label?: string;
  disabled?: boolean;
}

export function HandicapDial({ value, onChange, label, disabled }: HandicapDialProps) {
  const raw = typeof value === 'number' && !isNaN(value) ? value : 0;
  const safeVal = Math.max(HCP_MIN, Math.min(HCP_MAX, Math.round(raw)));

  // Shared value kept in sync with the prop for gesture callbacks (UI thread)
  const syncedVal = useSharedValue(safeVal);
  useEffect(() => {
    syncedVal.value = safeVal;
  }, [safeVal]);

  const dragStart = useSharedValue(safeVal);
  const lastAngle = useSharedValue(0);
  const totalDelta = useSharedValue(0);

  const emit = useCallback(
    (v: number) => {
      if (!disabled) onChange(Math.max(HCP_MIN, Math.min(HCP_MAX, Math.round(v))));
    },
    [disabled, onChange],
  );

  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(0)
    .onBegin((e) => {
      'worklet';
      dragStart.value = syncedVal.value;
      lastAngle.value = Math.atan2(e.y - CENTER, e.x - CENTER) * (180 / Math.PI);
      totalDelta.value = 0;
    })
    .onUpdate((e) => {
      'worklet';
      const dx = e.x - CENTER;
      const dy = e.y - CENTER;
      // Ignore touches very close to center
      if (dx * dx + dy * dy < 400) return;

      const cur = Math.atan2(dy, dx) * (180 / Math.PI);
      let d = cur - lastAngle.value;
      // Handle ±180° wrap-around
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      lastAngle.value = cur;
      totalDelta.value += d;

      const next = dragStart.value + (totalDelta.value / ARC_SWEEP) * HCP_RANGE;
      runOnJS(emit)(next);
    });

  // Thumb position on the arc
  const tAngle = valueToAngle(safeVal);
  const tRad = (tAngle * Math.PI) / 180;
  const tX = CENTER + OUTER_R * Math.cos(tRad);
  const tY = CENTER + OUTER_R * Math.sin(tRad);

  const isPlus = safeVal < 0;
  const isScr = safeVal === 0;

  return (
    <View style={[styles.wrapper, disabled && styles.wrapperDisabled]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}

      <GestureDetector gesture={gesture}>
        <Animated.View style={styles.dial}>
          {/* Tick marks — one per integer value using full-height container + rotation */}
          {Array.from({ length: HCP_RANGE + 1 }, (_, i) => {
            const v = HCP_MIN + i;
            const ang = valueToAngle(v);
            const isMaj = v % 10 === 0 || v === HCP_MIN || v === HCP_MAX || v === 0;
            const isMed = !isMaj && v % 5 === 0;
            const tickH = isMaj ? 16 : isMed ? 10 : 6;
            const tickW = isMaj ? 2.5 : 1.5;
            const active = v <= safeVal;

            return (
              <View
                key={v}
                style={{
                  position: 'absolute',
                  width: tickW,
                  height: OUTER_R * 2,
                  left: CENTER - tickW / 2,
                  top: CENTER - OUTER_R,
                  // Rotation maps container "top" to the tick's arc position.
                  // Container top originally points UP (270°); rotating by (ang − 270°)
                  // makes it point at `ang` degrees, placing the tick on the arc.
                  transform: [{ rotate: `${ang - 270}deg` }],
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    width: tickW,
                    height: tickH,
                    backgroundColor: active ? Colors.darkGreen : Colors.border,
                    borderRadius: 1,
                  }}
                />
              </View>
            );
          })}

          {/* Inner circle covers tick containers, creating a clean ring appearance */}
          <View style={styles.innerCircle} />

          {/* Value display */}
          <View style={styles.valueWrap}>
            <Text style={[styles.valueNum, isPlus && styles.valuePlus]}>
              {formatHandicap(safeVal)}
            </Text>
            <Text style={styles.valueSub}>
              {isPlus ? '+ handicap' : isScr ? 'scratch' : 'handicap'}
            </Text>
          </View>

          {/* Draggable thumb */}
          {!disabled && (
            <View
              style={[
                styles.thumb,
                { left: tX - THUMB_SIZE / 2, top: tY - THUMB_SIZE / 2 },
                isPlus && styles.thumbGold,
              ]}
            />
          )}
        </Animated.View>
      </GestureDetector>

      {/* Fine-tune buttons for ±1 precision */}
      {!disabled && (
        <View style={styles.nudgeRow}>
          <TouchableOpacity
            style={styles.nudgeBtn}
            onPress={() => emit(safeVal - 1)}
            activeOpacity={0.7}
          >
            <Text style={styles.nudgeTxt}>−</Text>
          </TouchableOpacity>
          <Text style={styles.nudgeLabel}>
            {isPlus ? `+${Math.abs(safeVal)}` : isScr ? '0 (scratch)' : String(safeVal)}
          </Text>
          <TouchableOpacity
            style={styles.nudgeBtn}
            onPress={() => emit(safeVal + 1)}
            activeOpacity={0.7}
          >
            <Text style={styles.nudgeTxt}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: Spacing.sm },
  wrapperDisabled: { opacity: 0.4 },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    alignSelf: 'flex-start',
    marginBottom: -Spacing.xs,
  },
  dial: { width: SIZE, height: SIZE },
  innerCircle: {
    position: 'absolute',
    width: INNER_R * 2,
    height: INNER_R * 2,
    borderRadius: INNER_R,
    backgroundColor: Colors.surface,
    left: CENTER - INNER_R,
    top: CENTER - INNER_R,
    ...Shadow.card,
  },
  valueWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: CENTER - 36,
    alignItems: 'center',
    // Sits above inner circle (same stacking position, rendered after)
  },
  valueNum: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  valuePlus: { color: Colors.midGreen },
  valueSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: -4,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: Colors.darkGreen,
    borderWidth: 3,
    borderColor: Colors.surface,
    ...Shadow.card,
  },
  thumbGold: { backgroundColor: Colors.midGreen },
  nudgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  nudgeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nudgeTxt: {
    fontSize: 22,
    fontWeight: '300',
    color: Colors.textPrimary,
    lineHeight: 26,
    marginTop: -2,
  },
  nudgeLabel: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    fontWeight: '600',
    minWidth: 110,
    textAlign: 'center',
  },
});
