import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  isOffline?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  onDismiss,
  isOffline,
  style,
}) => {
  const isNetwork =
    isOffline ||
    message.toLowerCase().includes('network') ||
    message.toLowerCase().includes('connect') ||
    message.toLowerCase().includes('internet') ||
    message.toLowerCase().includes('timed out');

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={isNetwork ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={22}
          color={colors.debit}
        />
      </View>

      <View style={styles.contentCol}>
        <Text style={styles.title}>
          {isNetwork ? 'Connection Problem' : 'Failed to Load Data'}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        {onRetry ? (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={14} color={colors.textWhite} style={{ marginRight: 4 }} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        ) : null}

        {onDismiss ? (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.debitSubtle,
    borderWidth: 1,
    borderColor: colors.debitBorder,
    borderRadius: 14,
    padding: 12,
    marginVertical: 8,
    elevation: 1,
  },
  iconContainer: {
    marginRight: 10,
  },
  contentCol: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.debit,
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.debit,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textWhite,
  },
  dismissButton: {
    padding: 2,
  },
});
