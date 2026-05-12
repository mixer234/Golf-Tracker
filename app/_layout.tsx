import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import ErrorBoundary from '../components/feedback/ErrorBoundary';
import { ToastProvider } from '../components/feedback/Toast';
import OfflineBanner from '../components/feedback/OfflineBanner';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ToastProvider>
          <GestureHandlerRootView style={styles.root}>
            <StatusBar style="light" />
            <OfflineBanner />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </GestureHandlerRootView>
        </ToastProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
