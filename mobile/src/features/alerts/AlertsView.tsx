import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { dataService } from '../../services/dataService';
import { Alert, AlertSeverity } from '../../types';
import { AlertCard } from './AlertCard';

type FilterType = 'all' | 'unread' | 'critical' | 'warning';

export const AlertsView: React.FC = () => {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setError(null);
      const list = await dataService.listAlerts();
      setAlerts(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.message || 'Could not fetch alerts from ledger.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        fetchAlerts();
      }
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fetchAlerts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const handleMarkRead = async (alertId: string) => {
    try {
      await dataService.markAlertRead(alertId);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, read_at: new Date().toISOString() } : a
        )
      );
    } catch {
      // Optimistic update even if offline
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, read_at: new Date().toISOString() } : a
        )
      );
    }
  };

  const handleOpenParty = async (partyId: string, alertId: string) => {
    await handleMarkRead(alertId);
    router.push({
      pathname: '/party/[id]',
      params: { id: partyId },
    });
  };

  const handleMarkAllAsRead = async () => {
    const unreadAlerts = alerts.filter((a) => !a.read_at);
    if (unreadAlerts.length === 0) return;

    try {
      await Promise.all(unreadAlerts.map((a) => dataService.markAlertRead(a.id)));
    } catch {
      // Ignored
    }

    setAlerts((prev) =>
      prev.map((a) => ({ ...a, read_at: a.read_at || new Date().toISOString() }))
    );
  };

  // Counts for tabs
  const unreadCount = useMemo(() => alerts.filter((a) => !a.read_at).length, [alerts]);
  const criticalCount = useMemo(
    () => alerts.filter((a) => a.severity === 'critical').length,
    [alerts]
  );
  const warningCount = useMemo(
    () => alerts.filter((a) => a.severity === 'warning').length,
    [alerts]
  );

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    let result = [...alerts];
    if (activeFilter === 'unread') {
      result = result.filter((a) => !a.read_at);
    } else if (activeFilter === 'critical') {
      result = result.filter((a) => a.severity === 'critical');
    } else if (activeFilter === 'warning') {
      result = result.filter((a) => a.severity === 'warning');
    }

    // Sort by severity (critical > warning > info), then unread first, then newest
    const severityRank: Record<AlertSeverity, number> = {
      critical: 3,
      warning: 2,
      info: 1,
    };

    return result.sort((a, b) => {
      const aRank = severityRank[a.severity] || 0;
      const bRank = severityRank[b.severity] || 0;
      if (aRank !== bRank) return bRank - aRank;

      const aUnread = a.read_at ? 0 : 1;
      const bUnread = b.read_at ? 0 : 1;
      if (aUnread !== bUnread) return bUnread - aUnread;

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [alerts, activeFilter]);

  const renderFilterTab = (type: FilterType, label: string, count: number) => {
    const isActive = activeFilter === type;
    return (
      <TouchableOpacity
        style={[styles.filterTab, isActive && styles.filterTabActive]}
        onPress={() => setActiveFilter(type)}
        activeOpacity={0.7}
      >
        <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
          {label}
        </Text>
        {count > 0 && (
          <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
            <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Filter Chips & Mark All Read */}
      <View style={styles.topControlBar}>
        <View style={styles.filterScroll}>
          {renderFilterTab('all', 'All', alerts.length)}
          {renderFilterTab('unread', 'Unread', unreadCount)}
          {renderFilterTab('critical', 'Critical', criticalCount)}
          {renderFilterTab('warning', 'Warnings', warningCount)}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={handleMarkAllAsRead}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-done" size={14} color={colors.primaryGreen} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.debit} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchAlerts}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* List / Loading / Empty State */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primaryGreen} />
          <Text style={styles.loadingText}>Loading ledger risk alerts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAlerts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primaryGreen]}
              tintColor={colors.primaryGreen}
            />
          }
          renderItem={({ item }) => (
            <AlertCard
              alert={item}
              onPressParty={handleOpenParty}
              onMarkRead={handleMarkRead}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="shield-checkmark" size={36} color={colors.primaryGreen} />
              </View>
              <Text style={styles.emptyTitle}>
                {activeFilter === 'unread'
                  ? 'All Alerts Caught Up!'
                  : activeFilter === 'critical'
                  ? 'No Critical Risks Detected'
                  : 'No Alerts Found'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeFilter === 'unread'
                  ? 'You have reviewed all business alerts. Overdue payments and credit limits will trigger new notices.'
                  : 'Your shop ledger balances and payment terms are running smoothly.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.creamBackground,
  },
  topControlBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  filterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.creamBackground,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BFE7DA',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.primaryGreen,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tabBadgeActive: {
    backgroundColor: colors.primaryGreen,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: colors.textWhite,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
  },
  markAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryGreen,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.debit,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.debit,
    textDecorationLine: 'underline',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFE7DA',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.darkGreenText,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
