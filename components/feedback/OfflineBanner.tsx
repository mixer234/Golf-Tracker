import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Colors, FontSize } from '../../constants/theme';

type BannerState = 'hidden' | 'offline' | 'restored';

const BANNER_HEIGHT = 32;

export default function OfflineBanner() {
  const [bannerState, setBannerState] = useState<BannerState>('hidden');
  const height = useRef(new Animated.Value(0)).current;
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevConnected = useRef<boolean | null>(null);

  function show() {
    Animated.timing(height, {
      toValue: BANNER_HEIGHT,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }

  function hide() {
    Animated.timing(height, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start(() => setBannerState('hidden'));
  }

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? true;

      if (prevConnected.current === null) {
        // First event — only show if already offline
        prevConnected.current = connected;
        if (!connected) {
          setBannerState('offline');
          show();
        }
        return;
      }

      if (!connected && prevConnected.current) {
        // Went offline
        if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
        setBannerState('offline');
        show();
      } else if (connected && !prevConnected.current) {
        // Came back online
        if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
        setBannerState('restored');
        // Keep banner visible briefly to show "Back online" then hide
        restoreTimerRef.current = setTimeout(hide, 2000);
      }

      prevConnected.current = connected;
    });

    return () => {
      unsub();
      if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
    };
  }, []);

  if (bannerState === 'hidden') return null;

  const isOffline = bannerState === 'offline';

  return (
    <Animated.View
      style={[
        styles.banner,
        { height, backgroundColor: isOffline ? Colors.warning + 'dd' : Colors.success + 'dd' },
      ]}
    >
      <Text style={styles.text}>
        {isOffline ? '⚠ You\'re offline' : '✓ Back online'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.3,
  },
});
