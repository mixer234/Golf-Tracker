import { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';
import { haptics } from '../../utils/haptics';

export interface YardageRange {
  from: number;
  to: number;
}

interface Props {
  value: YardageRange;
  onChange: (range: YardageRange) => void;
  min?: number;
  max?: number;
}

const SNAP = 5; // snap to 5-yard increments

function snap(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(v / SNAP) * SNAP));
}

export default function YardageDial({ value, onChange, min = 0, max = 125 }: Props) {
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState<'from' | 'to' | null>(null);
  const widthRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    widthRef.current = e.nativeEvent.layout.width;
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const toPixel = (yard: number) => ((yard - min) / (max - min)) * (widthRef.current || 1);
  const toYard = (px: number) => snap(min + (px / (widthRef.current || 1)) * (max - min), min, max);

  const makeResponder = (thumb: 'from' | 'to') => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      setDragging(thumb);
      haptics.light();
    },
    onPanResponderMove: (_, gs) => {
      const startPx = toPixel(thumb === 'from' ? valueRef.current.from : valueRef.current.to);
      const newPx = startPx + gs.dx;
      const yard = toYard(newPx);
      if (thumb === 'from') {
        if (yard < valueRef.current.to) onChange({ from: yard, to: valueRef.current.to });
      } else {
        if (yard > valueRef.current.from) onChange({ from: valueRef.current.from, to: yard });
      }
    },
    onPanResponderRelease: () => {
      setDragging(null);
      haptics.light();
    },
  });

  const fromResponder = useRef(makeResponder('from')).current;
  const toResponder = useRef(makeResponder('to')).current;

  const fromPx = width ? toPixel(value.from) : 0;
  const toPx = width ? toPixel(value.to) : width;

  // Distance markers
  const markers = [0, 25, 50, 75, 100, 125];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Drag to select your uncomfortable distance range
      </Text>
      <Text style={styles.rangeLabel}>
        {value.from === value.to
          ? `${value.from} yards`
          : `${value.from}–${value.to} yards`}
      </Text>

      <View style={styles.trackWrap} onLayout={onLayout}>
        {/* Background track */}
        <View style={styles.track}>
          {/* Selected range fill */}
          {width > 0 && (
            <View style={[styles.fill, { left: fromPx, width: toPx - fromPx }]} />
          )}
        </View>

        {/* Thumb: from */}
        {width > 0 && (
          <View
            {...fromResponder.panHandlers}
            style={[styles.thumb, { left: fromPx - 14 }, dragging === 'from' && styles.thumbActive]}
          >
            <Text style={styles.thumbLabel}>{value.from}</Text>
          </View>
        )}

        {/* Thumb: to */}
        {width > 0 && (
          <View
            {...toResponder.panHandlers}
            style={[styles.thumb, { left: toPx - 14 }, dragging === 'to' && styles.thumbActive]}
          >
            <Text style={styles.thumbLabel}>{value.to}</Text>
          </View>
        )}
      </View>

      {/* Yard markers */}
      <View style={styles.markers}>
        {markers.map((m) => (
          <Text key={m} style={styles.markerText}>{m}</Text>
        ))}
      </View>
      <Text style={styles.markerLabel}>yards</Text>
    </View>
  );
}

const THUMB_SIZE = 28;

const styles = StyleSheet.create({
  container: { gap: Spacing.sm, paddingHorizontal: 14 },
  header: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600', textAlign: 'center' },
  rangeLabel: { fontSize: FontSize.md, fontWeight: '800', color: Colors.primary, textAlign: 'center' },
  trackWrap: { height: 48, justifyContent: 'center', position: 'relative' },
  track: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    top: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbActive: { transform: [{ scale: 1.2 }] },
  thumbLabel: { fontSize: 9, fontWeight: '800', color: Colors.background },
  markers: { flexDirection: 'row', justifyContent: 'space-between' },
  markerText: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '600' },
  markerLabel: { fontSize: FontSize.xs, color: Colors.textLight, textAlign: 'center' },
});
