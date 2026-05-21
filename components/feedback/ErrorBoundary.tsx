import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../../constants/theme';

interface Props { children: React.ReactNode }
interface State { hasError: boolean }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  handleRestart = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.emoji}>⛳</Text>
          <Text style={styles.heading}>Something went wrong</Text>
          <Text style={styles.subtext}>
            We hit an unexpected error. Try restarting the app — your round data is safe.
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={this.handleRestart}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Restart App</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.sm,
  },
  heading: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtext: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.circle,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
  },
  btnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.background,
  },
});
