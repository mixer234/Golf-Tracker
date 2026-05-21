import { View, StyleSheet } from 'react-native';
import SkeletonBlock from './SkeletonBlock';
import { Colors, Spacing, Radius } from '../../constants/theme';

function Row({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[{ flexDirection: 'row' }, style]}>{children}</View>;
}

function StatCardSkeleton() {
  return (
    <View style={s.statCard}>
      <SkeletonBlock width="65%" height={28} borderRadius={8} style={{ marginBottom: 8 }} />
      <SkeletonBlock width="80%" height={11} borderRadius={5} style={{ marginBottom: 4 }} />
      <SkeletonBlock width="55%" height={10} borderRadius={5} />
    </View>
  );
}

function SGRowSkeleton() {
  return (
    <Row style={{ alignItems: 'center', paddingVertical: 8, gap: Spacing.sm }}>
      <SkeletonBlock width={110} height={13} borderRadius={5} />
      <View style={{ flex: 1 }}>
        <SkeletonBlock width="100%" height={8} borderRadius={Radius.circle} />
      </View>
      <SkeletonBlock width={44} height={13} borderRadius={5} />
    </Row>
  );
}

export default function SkeletonProgress() {
  return (
    <View style={s.container}>

      {/* Page title */}
      <SkeletonBlock width="35%" height={28} borderRadius={8} style={s.title} />

      {/* Trend alert card */}
      <Row style={[s.card, { alignItems: 'center', gap: Spacing.sm }]}>
        <SkeletonBlock width={24} height={24} borderRadius={Radius.circle} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBlock width="25%" height={10} borderRadius={4} />
          <SkeletonBlock width="90%" height={13} borderRadius={5} />
        </View>
      </Row>

      {/* 2×3 stats grid */}
      <Row style={{ flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </Row>

      {/* Scoring trend section */}
      <View style={s.section}>
        <SkeletonBlock width="42%" height={17} borderRadius={6} style={s.sectionTitle} />
        <View style={s.chartCard}>
          {/* Bar chart placeholder — 10 bars rising */}
          <Row style={{ alignItems: 'flex-end', gap: 6, height: 130, paddingHorizontal: Spacing.sm }}>
            {[55, 70, 48, 80, 65, 90, 72, 85, 60, 100].map((h, i) => (
              <SkeletonBlock key={i} width={`${100 / 10 - 1}%` as `${number}%`} height={(h / 100) * 120} borderRadius={4} />
            ))}
          </Row>
          <SkeletonBlock width="40%" height={10} borderRadius={5} style={{ alignSelf: 'center', marginTop: 10 }} />
        </View>
      </View>

      {/* Strokes Gained section */}
      <View style={s.section}>
        <SkeletonBlock width="58%" height={17} borderRadius={6} style={s.sectionTitle} />
        <View style={s.card}>
          <SkeletonBlock width="55%" height={10} borderRadius={4} style={{ marginBottom: Spacing.sm }} />
          <SGRowSkeleton />
          <SGRowSkeleton />
          <SGRowSkeleton />
          <SGRowSkeleton />
          <Row style={{ justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.sm, marginTop: 4, borderTopWidth: 1, borderTopColor: Colors.border }}>
            <SkeletonBlock width={80} height={11} borderRadius={4} />
            <SkeletonBlock width={48} height={18} borderRadius={6} />
          </Row>
        </View>
      </View>

      {/* Two medium cards side by side */}
      <Row style={{ gap: Spacing.sm, marginBottom: Spacing.lg }}>
        <View style={[s.card, { flex: 1 }]}>
          <SkeletonBlock width="60%" height={14} borderRadius={5} style={{ marginBottom: Spacing.sm }} />
          <Row style={{ gap: Spacing.sm }}>
            {[3, 4, 5].map((p) => (
              <View key={p} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <SkeletonBlock width="70%" height={10} borderRadius={4} />
                <SkeletonBlock width="80%" height={24} borderRadius={6} />
                <SkeletonBlock width="60%" height={14} borderRadius={5} />
              </View>
            ))}
          </Row>
        </View>
        <View style={[s.card, { flex: 1 }]}>
          <SkeletonBlock width="55%" height={14} borderRadius={5} style={{ marginBottom: Spacing.sm }} />
          <Row style={{ gap: Spacing.sm }}>
            {['F9', 'M6', 'B9'].map((seg) => (
              <View key={seg} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <SkeletonBlock width="70%" height={10} borderRadius={4} />
                <SkeletonBlock width="80%" height={24} borderRadius={6} />
                <SkeletonBlock width="60%" height={11} borderRadius={5} />
              </View>
            ))}
          </Row>
        </View>
      </Row>

    </View>
  );
}

const s = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  title: {
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
