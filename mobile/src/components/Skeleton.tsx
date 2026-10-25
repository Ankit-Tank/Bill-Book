import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, ViewStyle, StyleProp } from 'react-native';
import { colors } from '../theme/colors';

export interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const [opacity] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const CardSkeleton: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => {
  return (
    <View style={[styles.cardContainer, style]}>
      <Skeleton width="45%" height={14} borderRadius={6} style={{ marginBottom: 12 }} />
      <Skeleton width="70%" height={32} borderRadius={8} style={{ marginBottom: 12 }} />
      <Skeleton width="90%" height={12} borderRadius={4} />
    </View>
  );
};

export const ListItemSkeleton: React.FC = () => {
  return (
    <View style={styles.listItem}>
      <Skeleton width={42} height={42} borderRadius={21} style={{ marginRight: 12 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="60%" height={15} borderRadius={6} />
        <Skeleton width="40%" height={12} borderRadius={4} />
      </View>
      <Skeleton width={70} height={18} borderRadius={6} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.skeleton,
  },
  cardContainer: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
});
