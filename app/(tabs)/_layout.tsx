import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';
import { haptics } from '../../utils/haptics';

function TabIcon({ focused, label, emoji }: { focused: boolean; label: string; emoji: string }) {
  return (
    <View style={styles.tabItem}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
      screenListeners={{ tabPress: () => haptics.light() }}
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
            <TabIcon focused={focused} label="Practice" emoji="🎯" />
          ),
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Round" emoji="⛳" />
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
    backgroundColor: 'rgba(248,249,246,0.95)',
    borderTopColor: Colors.border,
    borderTopWidth: 0.5,
    height: 80,
    paddingBottom: 16,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: 'center',
    gap: 2,
  },
  emoji: {
    fontSize: 22,
  },
  label: {
    fontSize: 9,
    color: Colors.textLight,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  labelActive: {
    color: Colors.darkGreen,
    fontWeight: '700',
  },
});
