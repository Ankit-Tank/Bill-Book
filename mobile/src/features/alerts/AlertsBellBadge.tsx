import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { dataService } from '../../services/dataService';

export interface AlertsBellBadgeProps {
  onPress: () => void;
  badgeCount?: number;
}

export const AlertsBellBadge: React.FC<AlertsBellBadgeProps> = ({
  onPress,
  badgeCount: propCount,
}) => {
  const [localUnread, setLocalUnread] = useState<number>(0);
  const unreadCount = propCount !== undefined ? propCount : localUnread;

  useEffect(() => {
    if (propCount !== undefined) return;
    let isMounted = true;
    dataService
      .listAlerts({ unread_only: true })
      .then((alerts) => {
        if (isMounted && Array.isArray(alerts)) {
          setLocalUnread(alerts.filter((a) => !a.read_at).length);
        }
      })
      .catch(() => {
        // Fail quietly
      });

    return () => {
      isMounted = false;
    };
  }, [propCount]);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
      accessibilityLabel={`Alerts. ${unreadCount} unread.`}
    >
      <Ionicons name="notifications-outline" size={22} color={colors.textWhite} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.receivableRed,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.primaryGreen,
  },
  badgeText: {
    color: colors.textWhite,
    fontSize: 10,
    fontWeight: '800',
  },
});
