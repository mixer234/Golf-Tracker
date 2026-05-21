import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';

function ChartIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      {/* Axes */}
      <Line x1="20" y1="95" x2="105" y2="95" stroke={Colors.darkGreen} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
      <Line x1="20" y1="20" x2="20" y2="95" stroke={Colors.darkGreen} strokeWidth={2} strokeLinecap="round" opacity={0.4} />

      {/* Rising chart line */}
      <Polyline
        points="25,85 45,72 62,60 78,45 95,30"
        stroke={Colors.darkGreen}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Shaded area under line */}
      <Path
        d="M25 85 L45 72 L62 60 L78 45 L95 30 L95 95 L25 95 Z"
        fill={Colors.darkGreen}
        opacity={0.08}
      />

      {/* Data dots */}
      <Circle cx="25" cy="85" r="3.5" fill={Colors.darkGreen} opacity={0.6} />
      <Circle cx="45" cy="72" r="3.5" fill={Colors.darkGreen} opacity={0.6} />
      <Circle cx="62" cy="60" r="3.5" fill={Colors.darkGreen} opacity={0.6} />
      <Circle cx="78" cy="45" r="3.5" fill={Colors.darkGreen} opacity={0.6} />

      {/* Golf ball at the tip */}
      <Circle cx="95" cy="30" r="8" fill={Colors.darkGreen} />
      {/* Dimple lines on ball */}
      <Line x1="91" y1="28" x2="99" y2="28" stroke={Colors.background} strokeWidth={1} opacity={0.5} />
      <Line x1="90" y1="31" x2="100" y2="31" stroke={Colors.background} strokeWidth={1} opacity={0.5} />
    </Svg>
  );
}

export default function EmptyProgress({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.container}>
      <ChartIllustration />
      <Text style={styles.headline}>Nothing to show yet</Text>
      <Text style={styles.subtext}>
        Play a few rounds and your stats, trends, and handicap journey will appear here.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.btnText}>Track a Round</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  headline: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  subtext: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.circle,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
  },
  btnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.background,
  },
});
