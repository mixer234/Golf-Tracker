import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';

function FlagIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      {/* Green */}
      <Path
        d="M20 90 Q60 75 100 90"
        stroke={Colors.primary}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
      />
      {/* Hole */}
      <Path
        d="M20 90 Q60 80 100 90 L100 100 Q60 92 20 100 Z"
        fill={Colors.primary}
        opacity={0.15}
      />
      {/* Pin */}
      <Line
        x1="60" y1="88"
        x2="60" y2="40"
        stroke={Colors.primary}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {/* Flag */}
      <Path
        d="M60 40 L88 50 L60 60 Z"
        fill={Colors.primary}
        opacity={0.9}
      />
      {/* Cup circle */}
      <Circle
        cx="60" cy="91"
        r="5"
        fill={Colors.primary}
        opacity={0.3}
      />
    </Svg>
  );
}

export default function EmptyRounds({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.container}>
      <FlagIllustration />
      <Text style={styles.headline}>No rounds yet</Text>
      <Text style={styles.subtext}>
        Track your first round to start seeing your stats and progress.
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
    color: Colors.text,
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
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
  },
  btnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.background,
  },
});
