import { View, StyleSheet } from 'react-native';
import SkeletonBlock from './SkeletonBlock';
import { Colors, Spacing, Radius } from '../../constants/theme';

function Row({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[{ flexDirection: 'row' }, style]}>{children}</View>;
}

function RoundRowSkeleton() {
  return (
    <View style={s.roundRow}>
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBlock width="70%" height={15} borderRadius={6} />
        <SkeletonBlock width="40%" height={12} borderRadius={6} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <SkeletonBlock width={36} height={22} borderRadius={6} />
        <SkeletonBlock width={28} height={12} borderRadius={6} />
      </View>
    </View>
  );
}

export default function SkeletonHome() {
  return (
    <View style={s.container}>

      {/* Greeting */}
      <View style={s.header}>
        <SkeletonBlock width="55%" height={26} borderRadius={8} />
        <SkeletonBlock width="35%" height={13} borderRadius={6} style={{ marginTop: 6 }} />
      </View>

      {/* Handicap card */}
      <View style={s.handicapCard}>
        <Row style={{ marginBottom: Spacing.md }}>
          {/* Current col */}
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonBlock width="60%" height={10} borderRadius={4} style={{ opacity: 0.5 }} />
            <SkeletonBlock width="70%" height={52} borderRadius={8} style={{ opacity: 0.5 }} />
          </View>
          {/* Middle gap col */}
          <View style={{ flex: 1, alignItems: 'center', gap: 6, paddingTop: 10 }}>
            <SkeletonBlock width={40} height={32} borderRadius={8} style={{ opacity: 0.5 }} />
            <SkeletonBlock width={44} height={10} borderRadius={4} style={{ opacity: 0.5 }} />
          </View>
          {/* Target col */}
          <View style={{ flex: 1, alignItems: 'flex-end', gap: 6 }}>
            <SkeletonBlock width="60%" height={10} borderRadius={4} style={{ opacity: 0.5 }} />
            <SkeletonBlock width="70%" height={52} borderRadius={8} style={{ opacity: 0.5 }} />
          </View>
        </Row>
        {/* Progress bar */}
        <SkeletonBlock width="100%" height={4} borderRadius={Radius.circle} style={{ opacity: 0.4 }} />
      </View>

      {/* Quick action buttons */}
      <Row style={{ gap: Spacing.sm, marginBottom: Spacing.md }}>
        <View style={[s.actionBtn, { marginRight: 0 }]}>
          <SkeletonBlock width={26} height={26} borderRadius={Radius.circle} />
          <SkeletonBlock width="60%" height={14} borderRadius={6} style={{ marginTop: 6 }} />
        </View>
        <View style={s.actionBtn}>
          <SkeletonBlock width={26} height={26} borderRadius={Radius.circle} />
          <SkeletonBlock width="60%" height={14} borderRadius={6} style={{ marginTop: 6 }} />
        </View>
      </Row>

      {/* Today's Practice section */}
      <View style={s.section}>
        <SkeletonBlock width="45%" height={18} borderRadius={6} style={s.sectionTitle} />
        <View style={s.practiceCard}>
          <Row style={{ justifyContent: 'space-between', marginBottom: Spacing.md }}>
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonBlock width="80%" height={16} borderRadius={6} />
              <SkeletonBlock width="40%" height={12} borderRadius={6} />
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <SkeletonBlock width={36} height={28} borderRadius={6} />
              <SkeletonBlock width={28} height={11} borderRadius={4} />
            </View>
          </Row>
          <SkeletonBlock width="100%" height={5} borderRadius={Radius.circle} style={{ opacity: 0.4 }} />
        </View>
      </View>

      {/* Recent Rounds section */}
      <View style={s.section}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
          <SkeletonBlock width="40%" height={18} borderRadius={6} />
          <SkeletonBlock width="22%" height={13} borderRadius={6} />
        </Row>
        <RoundRowSkeleton />
        <RoundRowSkeleton />
        <RoundRowSkeleton />
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.md,
  },
  handicapCard: {
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    opacity: 0.85,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  practiceCard: {
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    opacity: 0.6,
  },
  roundRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
