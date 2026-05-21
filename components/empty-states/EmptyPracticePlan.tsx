import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';

function BagIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      {/* Bag body */}
      <Path
        d="M35 55 Q33 100 40 105 L80 105 Q87 100 85 55 Z"
        stroke={Colors.darkGreen}
        strokeWidth={2.5}
        fill="none"
        strokeLinejoin="round"
      />
      {/* Bag top collar */}
      <Rect
        x="38" y="48"
        width="44" height="12"
        rx="6"
        stroke={Colors.darkGreen}
        strokeWidth={2.5}
        fill="none"
      />
      {/* Handle */}
      <Path
        d="M50 48 Q50 38 60 38 Q70 38 70 48"
        stroke={Colors.darkGreen}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
      />
      {/* Clubs sticking out */}
      <Line x1="52" y1="48" x2="48" y2="22" stroke={Colors.darkGreen} strokeWidth={2} strokeLinecap="round" />
      <Line x1="60" y1="48" x2="60" y2="20" stroke={Colors.darkGreen} strokeWidth={2} strokeLinecap="round" />
      <Line x1="68" y1="48" x2="72" y2="22" stroke={Colors.darkGreen} strokeWidth={2} strokeLinecap="round" />
      {/* Club heads */}
      <Ellipse cx="47" cy="21" rx="5" ry="3" stroke={Colors.darkGreen} strokeWidth={2} fill="none" />
      <Ellipse cx="60" cy="19" rx="5" ry="3" stroke={Colors.darkGreen} strokeWidth={2} fill="none" />
      <Ellipse cx="73" cy="21" rx="5" ry="3" stroke={Colors.darkGreen} strokeWidth={2} fill="none" />
      {/* Pocket zip */}
      <Path
        d="M42 78 Q60 74 78 78"
        stroke={Colors.darkGreen}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        opacity={0.5}
      />
      {/* Stand leg */}
      <Line x1="47" y1="104" x2="42" y2="115" stroke={Colors.darkGreen} strokeWidth={2.5} strokeLinecap="round" opacity={0.6} />
      <Line x1="73" y1="104" x2="78" y2="115" stroke={Colors.darkGreen} strokeWidth={2.5} strokeLinecap="round" opacity={0.6} />
    </Svg>
  );
}

export default function EmptyPracticePlan({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.container}>
      <BagIllustration />
      <Text style={styles.headline}>No practice plan yet</Text>
      <Text style={styles.subtext}>
        Generate your personalised plan and start improving today.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.btnText}>Generate My Plan</Text>
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
