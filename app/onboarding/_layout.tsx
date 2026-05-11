import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="game" />
      <Stack.Screen name="goals" />
    </Stack>
  );
}
