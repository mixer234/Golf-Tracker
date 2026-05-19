import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { GLOSSARY, GlossaryKey } from '../../data/glossary';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';

interface Props {
  statKey: GlossaryKey;
  visible: boolean;
  onClose: () => void;
}

export default function GlossaryBottomSheet({ statKey, visible, onClose }: Props) {
  const entry = GLOSSARY[statKey];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1} onPress={() => {}}>
          <View style={styles.handle} />

          <Text style={styles.term}>{entry.term}</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.explanation}>{entry.explanation}</Text>

            <View style={styles.exampleCard}>
              <Text style={styles.exampleLabel}>EXAMPLE</Text>
              <Text style={styles.exampleText}>{entry.example}</Text>
            </View>

            <Text style={styles.whyLabel}>WHY IT MATTERS</Text>
            <Text style={styles.whyText}>{entry.whyItMatters}</Text>
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.closeBtnText}>Got it</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: 40,
    maxHeight: '75%',
    gap: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  term: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  scrollContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  explanation: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  exampleCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    gap: Spacing.xs,
  },
  exampleLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  exampleText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  whyLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textLight,
    letterSpacing: 0.8,
  },
  whyText: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    lineHeight: 20,
  },
  closeBtn: {
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  closeBtnText: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#ffffff',
  },
});
