import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 60 + Math.max(insets.bottom, 0);

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarAllowFontScaling: false,
        tabBarActiveTintColor: '#0d1a06',
        tabBarInactiveTintColor: '#bbbbbb',
        tabBarLabelStyle: {
          fontSize: 10,
          letterSpacing: 0.3,
          textTransform: 'capitalize',
          marginTop: 2,
        },
        tabBarStyle: route.name === 'track'
          ? { display: 'none' }
          : {
              backgroundColor: 'rgba(248,249,246,0.95)',
              borderTopWidth: 0.5,
              borderTopColor: 'rgba(0,0,0,0.08)',
              height: tabBarHeight,
              paddingBottom: Math.max(insets.bottom, 8),
              paddingTop: 4,
              elevation: 0,
              shadowOpacity: 0,
            },
        tabBarShowLabel: true,
      })}
    >
      {/* ── Vault ─────────────────────────────────────────────────────── */}
      <Tabs.Screen
        name="vault"
        options={{
          tabBarLabel: 'Vault',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'videocam' : 'videocam-outline'} size={22} color={color} />
          ),
        }}
      />

      {/* ── Train (Practice) ──────────────────────────────────────────── */}
      <Tabs.Screen
        name="practice"
        options={{
          tabBarLabel: 'Train',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'barbell' : 'barbell-outline'} size={22} color={color} />
          ),
        }}
      />

      {/* ── Home (default) ────────────────────────────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />

      {/* ── Stats (Progress) ──────────────────────────────────────────── */}
      <Tabs.Screen
        name="progress"
        options={{
          tabBarLabel: 'Stats',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={22} color={color} />
          ),
        }}
      />

      {/* ── Me (Profile) ──────────────────────────────────────────────── */}
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'Me',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />

      {/* ── Round tracker (hidden from tab bar) ───────────────────────── */}
      <Tabs.Screen
        name="track"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
