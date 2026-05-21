import React, {
  createContext, useContext, useRef, useState, useCallback, useEffect,
} from 'react';
import {
  Animated, StyleSheet, Text, TouchableOpacity, View, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ToastType = 'error' | 'warning' | 'success';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  type: ToastType;
  title: string;
  message: string;
  action?: ToastAction;
  duration?: number; // ms before auto-dismiss, default 5000
}

interface ToastContextValue {
  showToast: (opts: ToastOptions) => void;
}

// ─── Context ────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToastContext() {
  return useContext(ToastContext);
}

// ─── Provider ───────────────────────────────────────────────────────────────

interface ToastState extends ToastOptions {
  id: number;
}

interface ProviderProps { children: React.ReactNode }

export function ToastProvider({ children }: ProviderProps) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((opts: ToastOptions) => {
    setToast({ ...opts, id: Date.now() });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <ToastRenderer
          key={toast.id}
          toast={toast}
          onDismiss={() => setToast(null)}
        />
      )}
    </ToastContext.Provider>
  );
}

// ─── Renderer (absolutely positioned, reads context) ────────────────────────

const TYPE_CONFIG = {
  error: {
    accent: Colors.error,
    bg: Colors.errorBg,
    icon: '✕',
  },
  warning: {
    accent: Colors.warning,
    bg: Colors.warningBg,
    icon: '!',
  },
  success: {
    accent: Colors.success,
    bg: Colors.successBg,
    icon: '✓',
  },
};

function ToastRenderer({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  }, [onDismiss, translateY, opacity]);

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    const duration = toast.duration ?? (toast.type === 'success' ? 4000 : 5500);
    timerRef.current = setTimeout(dismiss, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const cfg = TYPE_CONFIG[toast.type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          backgroundColor: cfg.bg,
          borderLeftColor: cfg.accent,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      {/* Left icon */}
      <View style={[styles.iconWrap, { backgroundColor: cfg.accent + '22' }]}>
        <Text style={[styles.icon, { color: cfg.accent }]}>{cfg.icon}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
        {!!toast.message && (
          <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
        )}
        {toast.action && (
          <TouchableOpacity
            onPress={() => {
              dismiss();
              toast.action!.onPress();
            }}
            activeOpacity={0.75}
          >
            <Text style={[styles.actionLabel, { color: cfg.accent }]}>
              {toast.action.label}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dismiss button */}
      <TouchableOpacity onPress={dismiss} style={styles.dismissBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={styles.dismissIcon}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Radius.lg,
    borderLeftWidth: 4,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    // Elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 999,
    zIndex: 9999,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: Radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  icon: {
    fontSize: 13,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    marginTop: 4,
  },
  dismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
  },
  dismissIcon: {
    fontSize: 20,
    color: Colors.textLight,
    fontWeight: '300',
    lineHeight: 24,
  },
});
