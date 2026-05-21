import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { usePracticeStore } from '../../store/usePracticeStore';
import { useRoundStore } from '../../store/useRoundStore';

function TabIcon({
  focused,
  label,
  emoji,
  badge,
}: {
  focused: boolean;
  label: string;
  emoji: string;
  badge?: boolean;
}) {
  return (
    <View style={styles.tabItem}>
      <View style={[styles.indicator, focused && styles.indicatorActive]} />
      <View style={styles.emojiWrap}>
        <Text style={[styles.emoji, focused && styles.emojiActive]}>{emoji}</Text>
        {badge && <View style={styles.badge} />}
      </View>
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  const currentPlan = usePracticeStore((s) => s.currentPlan);
  const currentRound = useRoundStore((s) => s.currentRound);
  const insets = useSafeAreaInsets();

  // Show badge on Practice tab when a plan exists with incomplete drills
  const hasPracticeBadge = !!currentPlan && currentPlan.days.some(
    (d) => d.drills.length > d.completedDrillIds.length
  );

  // Show badge on Round tab when a round is in progress
  const hasRoundBadge = !!currentRound;

  // Tab bar height must account for the iPhone home indicator (34pt on X+, 0 on
  // older devices). Hardcoding 80 leaves only 16pt clearance on home-indicator
  // phones, which clips icons into the system gesture area.
  const bottomInset = insets.bottom;
  const tabBarHeight = TAB_CONTENT_HEIGHT + Math.max(bottomInset, MIN_BOTTOM_PAD);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          height: tabBarHeight,
          paddingBottom: Math.max(bottomInset, MIN_BOTTOM_PAD),
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Home" emoji="🏠" />
          ),
        }}
      />
      <Tabs.Screen
        name="practice"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Practice" emoji="🎯" badge={hasPracticeBadge} />
          ),
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Round" emoji="⛳" badge={hasRoundBadge} />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Vault" emoji="🎥" />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Stats" emoji="📈" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Profile" emoji="👤" />
          ),
        }}
      />
    </Tabs>
  );
}

// The content area of the tab bar (indicator + emoji + label) without any
// bottom safe area padding. Derived from the original 80 - 16 = 64.
const TAB_CONTENT_HEIGHT = 64;
// Minimum bottom padding on devices without a home indicator.
const MIN_BOTTOM_PAD = 16;

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(248,249,246,0.97)',
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingTop: 10,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabItem: {
    alignItems: 'center',
    gap: 3,
  },
  indicator: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'transparent',
    marginBottom: 3,
  },
  indicatorActive: {
    backgroundColor: Colors.darkGreen,
  },
  emojiWrap: {
    position: 'relative',
  },
  emoji: {
    fontSize: 20,
    opacity: 0.4,
  },
  emojiActive: {
    fontSize: 20,
    opacity: 1,
  },
  badge: {
    position: 'absolute',
    top: -1,
    right: -4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.darkGreen,
    borderWidth: 1,
    borderColor: 'rgba(248,249,246,0.97)',
  },
  label: {
    fontSize: 9,
    color: Colors.textLight,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  labelActive: {
    color: Colors.darkGreen,
    fontWeight: '600',
  },
});
