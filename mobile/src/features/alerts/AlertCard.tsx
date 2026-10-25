import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Alert, AlertSeverity } from '../../types';
import { formatDate } from '../../utils/format';

export interface AlertCardProps {
  alert: Alert;
  onPressParty?: (partyId: string, alertId: string) => void;
  onMarkRead?: (alertId: string) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onPressParty,
  onMarkRead,
}) => {
  const isUnread = !alert.read_at;

  const getSeverityConfig = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          icon: 'alert-circle' as const,
          color: colors.debit,
          bg: '#FEE2E2',
          border: '#FECACA',
          label: 'Critical Risk',
        };
      case 'warning':
        return {
          icon: 'warning' as const,
          color: '#D97706',
          bg: '#FEF3C7',
          border: '#FDE68A',
          label: 'Warning',
        };
      case 'info':
      default:
        return {
          icon: 'information-circle' as const,
          color: '#0284C7',
          bg: '#E0F2FE',
          border: '#BAE6FD',
          label: 'Notice',
        };
    }
  };

  const getKindLabel = (kind: string) => {
    switch (kind) {
      case 'overdue':
        return 'Payment Overdue';
      case 'credit_limit_exceeded':
        return 'Limit Exceeded';
      case 'duplicate_bill':
        return 'Duplicate Bill';
      case 'unusual_amount':
        return 'Unusual Amount';
      case 'repeat_late_payer':
        return 'Late Payer';
      default:
        return 'Account Alert';
    }
  };

  const config = getSeverityConfig(alert.severity);

  const handleCardPress = () => {
    if (alert.party_id && onPressParty) {
      onPressParty(alert.party_id, alert.id);
    } else if (isUnread && onMarkRead) {
      onMarkRead(alert.id);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isUnread && styles.cardUnread,
        { borderLeftColor: config.color },
      ]}
      onPress={handleCardPress}
      activeOpacity={0.8}
    >
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          <View style={[styles.severityBadge, { backgroundColor: config.bg, borderColor: config.border }]}>
            <Ionicons name={config.icon} size={13} color={config.color} style={{ marginRight: 4 }} />
            <Text style={[styles.severityBadgeText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
          <Text style={styles.kindTag}>{getKindLabel(alert.kind)}</Text>
        </View>

        <View style={styles.rightActions}>
          <Text style={styles.timeText}>{formatDate(alert.created_at)}</Text>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
      </View>

      {/* Party Name Row */}
      {alert.party_name && (
        <View style={styles.partyRow}>
          <View style={styles.partyAvatar}>
            <Text style={styles.partyAvatarText}>
              {alert.party_name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.partyName} numberOfLines={1}>
            {alert.party_name}
          </Text>
          {alert.party_id && (
            <View style={styles.viewPartyChip}>
              <Text style={styles.viewPartyText}>View Ledger</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primaryGreen} />
            </View>
          )}
        </View>
      )}

      {/* Message Text */}
      <Text style={styles.messageText}>{alert.message}</Text>

      {/* Footer / Mark as Read Action */}
      <View style={styles.footerRow}>
        {alert.party_id ? (
          <Text style={styles.tapPrompt}>Tap to open customer ledger</Text>
        ) : (
          <View />
        )}

        {isUnread && onMarkRead && (
          <TouchableOpacity
            style={styles.markReadBtn}
            onPress={(e) => {
              e.stopPropagation();
              onMarkRead(alert.id);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-done" size={14} color={colors.primaryGreen} />
            <Text style={styles.markReadText}>Mark read</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  cardUnread: {
    backgroundColor: '#FAFCFB',
    borderColor: '#C6EADF',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kindTag: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.receivableRed,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  partyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partyAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryGreen,
  },
  partyName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.darkGreenText,
    flex: 1,
  },
  viewPartyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFE7DA',
    gap: 2,
  },
  viewPartyText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryGreen,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.darkGreenText,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    marginTop: 2,
  },
  tapPrompt: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F0FDF4',
  },
  markReadText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryGreen,
  },
});
