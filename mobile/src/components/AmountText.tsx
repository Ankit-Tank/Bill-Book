import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { formatINR } from '../utils/format';
import { colors } from '../theme/colors';

export type AmountKind = 'DR' | 'CR' | 'receivable' | 'payable' | 'neutral' | 'white';
export type AmountSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';

export interface AmountTextProps {
  amount: number; // in paise
  kind?: AmountKind;
  size?: AmountSize;
  showSign?: boolean;
  showSuffix?: boolean; // Append "DR" or "CR"
  style?: StyleProp<TextStyle>;
}

export const AmountText: React.FC<AmountTextProps> = ({
  amount,
  kind = 'neutral',
  size = 'md',
  showSign = false,
  showSuffix = false,
  style,
}) => {
  const formatted = formatINR(amount, showSign);

  const getColor = (): string => {
    switch (kind) {
      case 'DR':
      case 'receivable':
        return colors.debit; // Red
      case 'CR':
      case 'payable':
        return colors.credit; // Green
      case 'white':
        return colors.textWhite;
      case 'neutral':
      default:
        return colors.textPrimary;
    }
  };

  const getSuffix = (): string => {
    if (!showSuffix) return '';
    if (kind === 'DR' || (kind === 'receivable' && amount > 0)) return ' DR';
    if (kind === 'CR' || (kind === 'payable' && amount < 0)) return ' CR';
    return '';
  };

  return (
    <Text
      style={[
        styles.base,
        styles[`size_${size}`],
        { color: getColor() },
        style,
      ]}
      numberOfLines={1}
    >
      {formatted}
      {getSuffix()}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  size_xs: {
    fontSize: 12,
  },
  size_sm: {
    fontSize: 14,
  },
  size_md: {
    fontSize: 16,
  },
  size_lg: {
    fontSize: 20,
  },
  size_xl: {
    fontSize: 24,
  },
  size_hero: {
    fontSize: 32,
    letterSpacing: -0.5,
  },
});
