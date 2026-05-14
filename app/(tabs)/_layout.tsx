import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
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

  // Show badge on Practice tab when a plan exists with incomplete drills
  const hasPracticeBadge = !!currentPlan && currentPlan.days.some(
    (d) => d.drills.length > d.completedDrillIds.length
  );

  // Show badge on Round tab when a round is in progress
  const hasRoundBadge = !!currentRound;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
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

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 0,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  tabItem: {
    alignItems: 'center',
    gap: 2,
  },
  indicator: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 2,
  },
  indicatorActive: {
    backgroundColor: Colors.primary,
  },
  emojiWrap: {
    position: 'relative',
  },
  emoji: {
    fontSize: 20,
  },
  emojiActive: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  label: {
    fontSize: 10,
    color: Colors.textLight,
    fontWeight: '500',
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
