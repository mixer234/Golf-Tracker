import { useRef, useState, useCallback } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../constants/theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastState {
  visible: boolean;
  type: ToastType;
  title: string;
  message?: string;
}

const BG: Record<ToastType, string> = {
  success: Colors.success,
  error: Colors.error,
  warning: Colors.warning,
  info: Colors.primary,
};

export interface ToastProps extends ToastState {
  opacity: Animated.Value;
}

export function Toast({ visible, type, title, message, opacity }: ToastProps) {
  if (!visible) return null;
  return (
    <Animated.View style={[styles.container, { backgroundColor: BG[type], opacity }]}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </Animated.View>
  );
}

export function useToast() {
  const [state, setState] = useState<ToastState>({ visible: false, type: 'info', title: '' });
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    ({ type = 'info' as ToastType, title, message }: { type?: ToastType; title: string; message?: string }) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setState({ visible: true, type, title, message });
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      timerRef.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() =>
          setState((s) => ({ ...s, visible: false })),
        );
      }, 3500);
    },
    [opacity],
  );

  return { showToast, toastProps: { ...state, opacity } };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 110,
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    zIndex: 9999,
    ...Shadow.md,
  },
  title: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff' },
  message: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
});
