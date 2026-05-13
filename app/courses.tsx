import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize, Shadow } from '../constants/theme';
import { useCourseStore } from '../store/useCourseStore';
import { useRoundStore } from '../store/useRoundStore';
import { Course, TeeColor } from '../types';

const TEE_COLORS: { key: TeeColor; label: string; color: string }[] = [
  { key: 'black', label: 'Black', color: '#1a1a1a' },
  { key: 'blue',  label: 'Blue',  color: '#3b82f6' },
  { key: 'white', label: 'White', color: '#e8f0e9' },
  { key: 'red',   label: 'Red',   color: '#ef4444' },
  { key: 'gold',  label: 'Gold',  color: '#d4af37' },
];

export default function CoursesScreen() {
  const router = useRouter();
  const { courses, addCourse, deleteCourse } = useCourseStore();
  const rounds = useRoundStore((s) => s.rounds.filter((r) => r.isComplete && r.totalScore > 0));
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [courseRating, setCourseRating] = useState('');
  const [slopeRating, setSlopeRating] = useState('');
  const [defaultTee, setDefaultTee] = useState<TeeColor>('white');

  function handleAdd() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter the course name.');
      return;
    }
    const cr = parseFloat(courseRating);
    const sr = parseInt(slopeRating, 10);
    const id = addCourse({
      name: name.trim(),
      city: city.trim() || undefined,
      courseRating: !isNaN(cr) && cr > 50 && cr < 90 ? cr : undefined,
      slopeRating: !isNaN(sr) && sr >= 55 && sr <= 155 ? sr : undefined,
      defaultTee,
    });
    setShowAdd(false);
    resetForm();
    router.push(`/course-editor?id=${id}`);
  }

  function resetForm() {
    setName(''); setCity(''); setCourseRating(''); setSlopeRating(''); setDefaultTee('white');
  }

  function handleDelete(course: Course) {
    Alert.alert(
      `Delete "${course.name}"?`,
      'All hole data for this course will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteCourse(course.id) },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Courses</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {courses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏌️</Text>
            <Text style={styles.emptyTitle}>No courses yet</Text>
            <Text style={styles.emptyText}>
              Add your home courses to auto-fill hole pars, track yardages, and unlock per-hole analytics.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
              <Text style={styles.emptyBtnText}>Add First Course</Text>
            </TouchableOpacity>
          </View>
        ) : (
          courses.map((course) => {
            const filledHoles = course.holes.filter((h) => Object.keys(h.yardages).length > 0).length;
            const totalPar = course.holes.reduce((s, h) => s + h.par, 0);
            const defTee = TEE_COLORS.find((t) => t.key === course.defaultTee);

            // Cross-reference rounds played at this course
            const courseRounds = rounds.filter(
              (r) => r.courseId === course.id || r.courseName === course.name
            );
            const avgScore = courseRounds.length > 0
              ? courseRounds.reduce((s, r) => s + r.totalScore, 0) / courseRounds.length
              : null;
            const bestScore = courseRounds.length > 0
              ? Math.min(...courseRounds.map((r) => r.totalScore))
              : null;
            const avgGir = courseRounds.length > 0
              ? Math.round(courseRounds.reduce((s, r) => s + r.greensInRegulation, 0) / courseRounds.length)
              : null;

            return (
              <TouchableOpacity
                key={course.id}
                style={styles.card}
                onPress={() => router.push(`/course-editor?id=${course.id}`)}
                activeOpacity={0.85}
              >
                <View style={[styles.teeStrip, { backgroundColor: defTee?.color ?? Colors.border }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.courseName}>{course.name}</Text>
                      {course.city && <Text style={styles.courseCity}>{course.city}</Text>}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(course)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cardStats}>
                    <StatChip label="Par" value={String(totalPar)} />
                    {course.courseRating && <StatChip label="Rating" value={String(course.courseRating)} />}
                    {course.slopeRating && <StatChip label="Slope" value={String(course.slopeRating)} />}
                    <StatChip
                      label="Holes"
                      value={`${filledHoles}/18`}
                      accent={filledHoles === 18 ? Colors.success : undefined}
                    />
                  </View>

                  {courseRounds.length > 0 && (
                    <View style={styles.perfRow}>
                      <View style={styles.perfItem}>
                        <Text style={styles.perfValue}>{courseRounds.length}</Text>
                        <Text style={styles.perfLabel}>Rounds</Text>
                      </View>
                      <View style={styles.perfDivider} />
                      <View style={styles.perfItem}>
                        <Text style={styles.perfValue}>{avgScore!.toFixed(1)}</Text>
                        <Text style={styles.perfLabel}>Avg Score</Text>
                      </View>
                      <View style={styles.perfDivider} />
                      <View style={styles.perfItem}>
                        <Text style={[styles.perfValue, { color: Colors.accent }]}>{bestScore}</Text>
                        <Text style={styles.perfLabel}>Best</Text>
                      </View>
                      <View style={styles.perfDivider} />
                      <View style={styles.perfItem}>
                        <Text style={styles.perfValue}>{avgGir}/18</Text>
                        <Text style={styles.perfLabel}>Avg GIR</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.cardFooter}>
                    <View style={[styles.teePill, { borderColor: defTee?.color ?? Colors.border }]}>
                      <View style={[styles.teeDot, { backgroundColor: defTee?.color ?? Colors.border }]} />
                      <Text style={styles.teePillText}>{defTee?.label ?? course.defaultTee} tees</Text>
                    </View>
                    <Text style={styles.editHint}>Tap to edit holes →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Add Course Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setShowAdd(false); resetForm(); }}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Course</Text>
              <TouchableOpacity onPress={handleAdd}>
                <Text style={styles.modalSave}>Add →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.inputLabel}>Course Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Pebble Beach Golf Links"
                placeholderTextColor={Colors.textLight}
                autoFocus
              />

              <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>City / Location</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Pebble Beach, CA"
                placeholderTextColor={Colors.textLight}
              />

              <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>
                Course Rating & Slope{' '}
                <Text style={styles.inputOptional}>(optional)</Text>
              </Text>
              <View style={styles.ratingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputSublabel}>Rating</Text>
                  <TextInput
                    style={styles.input}
                    value={courseRating}
                    onChangeText={setCourseRating}
                    placeholder="72.1"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputSublabel}>Slope</Text>
                  <TextInput
                    style={styles.input}
                    value={slopeRating}
                    onChangeText={setSlopeRating}
                    placeholder="131"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { marginTop: Spacing.md }]}>Default Tee Box</Text>
              <View style={styles.teeRow}>
                {TEE_COLORS.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.teeChip, defaultTee === t.key && { borderColor: t.color, backgroundColor: t.color + '20' }]}
                    onPress={() => setDefaultTee(t.key)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.teeChipDot, { backgroundColor: t.color }]} />
                    <Text style={[styles.teeChipText, defaultTee === t.key && { color: Colors.text }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  After adding, you'll be taken to the hole editor to enter par, yardage, and stroke index for each hole.
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function StatChip({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={[chipStyles.chip, accent && { borderColor: accent + '60' }]}>
      <Text style={chipStyles.label}>{label}</Text>
      <Text style={[chipStyles.value, accent && { color: accent }]}>{value}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  label: { fontSize: 9, color: Colors.textLight, fontWeight: '600', letterSpacing: 0.4 },
  value: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.text },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600', minWidth: 60 },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 60,
    alignItems: 'center',
  },
  addBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.background },
  scroll: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.md, paddingHorizontal: Spacing.lg },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  emptyText: { fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  emptyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  emptyBtnText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.background },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  teeStrip: { width: 5 },
  cardBody: { flex: 1, padding: Spacing.md, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  courseName: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  courseCity: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  deleteText: { fontSize: FontSize.base, color: Colors.textLight, fontWeight: '600' },
  cardStats: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  perfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  perfItem: { flex: 1, alignItems: 'center' },
  perfValue: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  perfLabel: { fontSize: 9, color: Colors.textLight, marginTop: 1, fontWeight: '600', letterSpacing: 0.3 },
  perfDivider: { width: 1, height: 28, backgroundColor: Colors.border },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  teeDot: { width: 8, height: 8, borderRadius: 4 },
  teePillText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  editHint: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600' },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCancel: { fontSize: FontSize.base, color: Colors.textSecondary },
  modalTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  modalSave: { fontSize: FontSize.base, fontWeight: '700', color: Colors.primary },
  modalContent: { padding: Spacing.lg, gap: 4, paddingBottom: Spacing.xxl },
  inputLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  inputOptional: { fontSize: FontSize.xs, color: Colors.textLight, fontWeight: '400' },
  inputSublabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4, fontWeight: '500' },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.text,
  },
  ratingRow: { flexDirection: 'row', gap: Spacing.md },
  teeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  teeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  teeChipDot: { width: 10, height: 10, borderRadius: 5 },
  teeChipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  infoBox: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primaryPale,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  infoText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
});
