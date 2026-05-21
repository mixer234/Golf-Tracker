import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '../store/useUserStore';
import { Colors } from '../constants/theme';

export default function Entry() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!useUserStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const unsub = useUserStore.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
        });
      }
      if (cancelled) return;
      setReady(true);
    }

    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const profile = useUserStore.getState().profile;
    if (profile?.hasCompletedOnboarding) {
      router.replace('/(tabs)');
    } else {
      router.replace('/onboarding');
    }
  }, [ready]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={Colors.lightGreen} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
