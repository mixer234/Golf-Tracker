import { View, StyleSheet, ScrollView } from 'react-native';
import SkeletonBlock from './SkeletonBlock';
import { Colors, Spacing, Radius } from '../../constants/theme';

function Row({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[{ flexDirection: 'row' }, style]}>{children}</View>;
}

function DrillCardSkeleton() {
  return (
    <View style={s.drillCard}>
      <Row style={{ alignItems: 'flex-start', gap: Spacing.sm, marginBottom: 10 }}>
        {/* Checkbox */}
        <SkeletonBlock width={26} height={26} borderRadius={Radius.sm} />
        {/* Info */}
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBlock width="70%" height={15} borderRadius={6} />
          <SkeletonBlock width="90%" height={12} borderRadius={6} />
          <SkeletonBlock width="60%" height={12} borderRadius={6} />
          {/* Meta tags row */}
          <Row style={{ gap: 8, marginTop: 2 }}>
            <SkeletonBlock width={48} height={20} borderRadius={Radius.full} />
            <SkeletonBlock width={64} height={20} borderRadius={Radius.full} />
            <SkeletonBlock width={52} height={20} borderRadius={Radius.full} />
          </Row>
        </View>
      </Row>
    </View>
  );
}

export default function SkeletonPractice() {
  return (
    <View style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <SkeletonBlock width="50%" height={28} borderRadius={8} />
        <SkeletonBlock width="35%" height={13} borderRadius={6} style={{ marginTop: 6 }} />
      </View>

      {/* Day selector strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.dayScroll}
        style={s.dayScrollWrap}
        scrollEnabled={false}
      >
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonBlock key={i} width={56} height={36} borderRadius={Radius.full} />
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Weekly calendar card */}
        <View style={s.card}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
            <SkeletonBlock width="30%" height={16} borderRadius={6} />
            <SkeletonBlock width={52} height={22} borderRadius={Radius.full} />
          </Row>
          {/* 7 day circles */}
          <Row style={{ justifyContent: 'space-between', marginBottom: Spacing.sm }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                <SkeletonBlock width={10} height={10} borderRadius={Radius.full} />
                <SkeletonBlock width={30} height={30} borderRadius={15} />
                <SkeletonBlock width={6} height={6} borderRadius={Radius.full} />
              </View>
            ))}
          </Row>
          {/* Legend */}
          <Row style={{ gap: Spacing.md, paddingTop: Spacing.xs, borderTopWidth: 1, borderTopColor: Colors.borderLight }}>
            {['Practice', 'Done', 'Missed'].map((l) => (
              <Row key={l} style={{ alignItems: 'center', gap: 5 }}>
                <SkeletonBlock width={7} height={7} borderRadius={4} />
                <SkeletonBlock width={40} height={10} borderRadius={4} />
              </Row>
            ))}
          </Row>
        </View>

        {/* Weekly focus card */}
        <View style={[s.card, s.focusCard]}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
            <SkeletonBlock width="35%" height={10} borderRadius={4} />
            <SkeletonBlock width={60} height={22} borderRadius={Radius.full} />
          </Row>
          <Row style={{ alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm }}>
            <SkeletonBlock width={28} height={28} borderRadius={Radius.full} />
            <SkeletonBlock width="55%" height={20} borderRadius={6} />
          </Row>
          <SkeletonBlock width="100%" height={13} borderRadius={6} style={{ marginBottom: 6 }} />
          <SkeletonBlock width="85%" height={13} borderRadius={6} style={{ marginBottom: Spacing.sm }} />
          {/* Tips */}
          {Array.from({ length: 3 }).map((_, i) => (
            <Row key={i} style={{ gap: Spacing.sm, alignItems: 'center', marginBottom: 8 }}>
              <SkeletonBlock width={6} height={6} borderRadius={3} />
              <SkeletonBlock width={`${[88, 75, 82][i]}%`} height={12} borderRadius={5} />
            </Row>
          ))}
        </View>

        {/* Day header */}
        <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
          <View style={{ gap: 6 }}>
            <SkeletonBlock width={110} height={22} borderRadius={8} />
            <SkeletonBlock width={150} height={14} borderRadius={6} />
          </View>
          <SkeletonBlock width={72} height={32} borderRadius={Radius.full} />
        </Row>

        {/* Progress row */}
        <View style={{ marginBottom: Spacing.md, gap: 8 }}>
          <SkeletonBlock width="50%" height={12} borderRadius={5} />
          <SkeletonBlock width="100%" height={6} borderRadius={Radius.full} />
        </View>

        {/* Start session button */}
        <SkeletonBlock width="100%" height={48} borderRadius={Radius.full} style={{ marginBottom: Spacing.md }} />

        {/* Drill cards */}
        <DrillCardSkeleton />
        <DrillCardSkeleton />
        <DrillCardSkeleton />

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  dayScrollWrap: { maxHeight: 60 },
  dayScroll: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, alignItems: 'center' },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  focusCard: {
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  drillCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
