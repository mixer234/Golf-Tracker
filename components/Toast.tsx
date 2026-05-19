import { useRef, useState, useCallback } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../constants/theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastState {
  visible: boolean;
  type: ToastType;
  title: string;
  message?: string;
}

const BORDER_COLOR: Record<ToastType, string> = {
  success: Colors.success,
  error: Colors.error,
  warning: Colors.warning,
  info: Colors.info,
};

const ICON: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
};

const ICON_BG: Record<ToastType, string> = {
  success: Colors.successBg,
  error: Colors.errorBg,
  warning: Colors.warningBg,
  info: '#dbeafe',
};

export interface ToastProps extends ToastState {
  opacity: Animated.Value;
}

export function Toast({ visible, type, title, message, opacity }: ToastProps) {
  if (!visible) return null;
  return (
    <Animated.View
      style={[
        styles.container,
        { borderLeftColor: BORDER_COLOR[type], opacity },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: ICON_BG[type] }]}>
        <Text style={[styles.icon, { color: BORDER_COLOR[type] }]}>{ICON[type]}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
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
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timerRef.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(() =>
          setState((s) => ({ ...s, visible: false })),
        );
      }, 4000);
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
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    zIndex: 9999,
    ...Shadow.sm,
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  body: { flex: 1 },
  title: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  message: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 1 },
});
