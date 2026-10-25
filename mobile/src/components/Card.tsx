import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

export type CardVariant = 'default' | 'receivable' | 'payable' | 'cream' | 'dark' | 'outline';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  activeOpacity?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  style,
  onPress,
  activeOpacity = 0.75,
}) => {
  const cardStyle = [
    styles.base,
    styles[variant],
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={activeOpacity}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
  },
  default: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  receivable: {
    backgroundColor: colors.receivableRed,
    elevation: 4,
    shadowColor: colors.receivableRed,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  payable: {
    backgroundColor: colors.primaryGreen,
    elevation: 4,
    shadowColor: colors.primaryGreen,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  cream: {
    backgroundColor: '#FFFDF0',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  dark: {
    backgroundColor: colors.onboardingDarkGreen,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
});
