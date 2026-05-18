import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { GlossaryKey } from '../../data/glossary';
import GlossaryBottomSheet from './GlossaryBottomSheet';
import { haptics } from '../../utils/haptics';
import { Colors, FontSize } from '../../constants/theme';

interface Props {
  statKey: GlossaryKey;
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function GlossaryTooltip({ statKey, children, style }: Props) {
  const [visible, setVisible] = useState(false);

  function open() {
    haptics.light();
    setVisible(true);
  }

  return (
    <>
      <View style={[styles.row, style]}>
        {children}
        <TouchableOpacity
          onPress={open}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          activeOpacity={0.6}
        >
          <Text style={styles.icon}>ⓘ</Text>
        </TouchableOpacity>
      </View>
      <GlossaryBottomSheet
        statKey={statKey}
        visible={visible}
        onClose={() => setVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 16,
    color: Colors.textLight,
    lineHeight: 20,
  },
});
