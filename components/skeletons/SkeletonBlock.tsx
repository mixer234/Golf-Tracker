import { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { Colors } from '../../constants/theme';

interface Props {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export default function SkeletonBlock({ width, height, borderRadius = 8, style }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 450,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: Colors.surfaceAlt,
          opacity,
        },
        style,
      ]}
    />
  );
}
