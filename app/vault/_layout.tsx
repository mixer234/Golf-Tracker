import { Stack } from 'expo-router';

export default function VaultLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="record" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
