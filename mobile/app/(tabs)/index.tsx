import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AppHeader,
  Card,
  AmountText,
  EmptyState,
  PrimaryButton,
  CardSkeleton,
  ListItemSkeleton,
  ErrorBanner,
} from '../../src/components';
import { WelcomeModal } from '../../src/features/onboarding/WelcomeModal';
import { colors } from '../../src/theme/colors';
import { dataService } from '../../src/services/dataService';
import { DashboardSummary, Transaction } from '../../src/types';
import { formatDate } from '../../src/utils/format';

export default function DashboardScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [welcomeVisible, setWelcomeVisible] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      setError(null);
      const data = await dataService.getDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err?.message || 'Could not connect to live ledger server.');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    dataService
      .getDashboardSummary()
      .then((data) => {
        if (isMounted) {
          setSummary(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err?.message || 'Failed to connect to ledger server.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSummary();
    setRefreshing(false);
  }, [fetchSummary]);

  const isLiveApi = process.env.EXPO_PUBLIC_USE_MOCK === 'false';

  return (
    <View style={styles.container}>
      <AppHeader
        title="BillBook"
        subtitle="Digital Khata & Credit Ledger"
        rightAction={{
          icon: 'refresh',
          onPress: onRefresh,
          accessibilityLabel: 'Refresh data',
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primaryGreen]}
            tintColor={colors.primaryGreen}
          />
        }
      >
        {/* Environment Status Badge */}
        <View style={styles.envBar}>
          <View style={[styles.dot, { backgroundColor: isLiveApi ? colors.credit : colors.goldFab }]} />
          <Text style={styles.envText}>
            {isLiveApi ? 'Live API Mode (Supabase Postgres)' : 'Offline Mock Mode (AsyncStorage)'}
          </Text>
          <TouchableOpacity onPress={() => setWelcomeVisible(true)}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primaryGreen} />
          </TouchableOpacity>
        </View>

        {/* Error Banner when network fails or API is down */}
        {error ? (
          <ErrorBanner
            message={error}
            onRetry={onRefresh}
            onDismiss={() => setError(null)}
          />
        ) : null}

        {/* Loading Skeletons */}
        {loading && !summary ? (
          <View style={styles.skeletonContainer}>
            <CardSkeleton />
            <View style={styles.twoColumnRow}>
              <View style={styles.skeletonHalf} />
              <View style={styles.skeletonHalf} />
            </View>
            <ListItemSkeleton />
            <ListItemSkeleton />
            <ListItemSkeleton />
          </View>
        ) : (
          <>
            {/* Main Receivable Card (Red Card from Theme) */}
            <Card variant="receivable" style={styles.receivableCard}>
              <View style={styles.receivableHeader}>
                <View style={styles.badgeReceivable}>
                  <Text style={styles.badgeText}>CUSTOMER CREDIT (DR)</Text>
                </View>
                <Ionicons name="trending-up" size={24} color={colors.textWhite} />
              </View>

              <Text style={styles.receivableSubLabel}>Total Receivable (You will get)</Text>
              <AmountText
                amount={summary?.total_receivable || 0}
                kind="white"
                size="hero"
                style={styles.heroAmount}
              />

              <View style={styles.receivableFooter}>
                <Text style={styles.receivableFooterText}>
                  Money owed by customers to your shop
                </Text>
              </View>
            </Card>

            {/* Row: Total Payable & Net Balance */}
            <View style={styles.twoColumnRow}>
              {/* Total Payable (Green Card) */}
              <Card variant="payable" style={styles.halfCard}>
                <View style={styles.cardHeaderSmall}>
                  <Text style={styles.cardLabelSmallWhite}>TOTAL PAYABLE</Text>
                  <Ionicons name="arrow-down-circle" size={18} color="rgba(255,255,255,0.8)" />
                </View>
                <Text style={styles.subtextSmallWhite}>You will give / CR</Text>
                <AmountText
                  amount={summary?.total_payable || 0}
                  kind="white"
                  size="lg"
                  style={styles.payableAmount}
                />
              </Card>

              {/* Net Balance (Surface Card) */}
              <Card variant="default" style={styles.halfCard}>
                <View style={styles.cardHeaderSmall}>
                  <Text style={styles.cardLabelSmall}>NET BALANCE</Text>
                  <Ionicons
                    name={(summary?.net_balance || 0) >= 0 ? 'shield-checkmark' : 'alert-circle'}
                    size={18}
                    color={(summary?.net_balance || 0) >= 0 ? colors.credit : colors.debit}
                  />
                </View>
                <Text style={styles.subtextSmall}>Receivable - Payable</Text>
                <AmountText
                  amount={summary?.net_balance || 0}
                  kind={(summary?.net_balance || 0) >= 0 ? 'CR' : 'DR'}
                  size="lg"
                  showSign
                />
              </Card>
            </View>

            {/* Today's DR & CR Breakdown Card */}
            <Card variant="default" style={styles.todayCard}>
              <View style={styles.todayHeader}>
                <Ionicons name="calendar-outline" size={18} color={colors.primaryGreen} />
                <Text style={styles.todayTitle}>{"Today's Khata Activity"}</Text>
              </View>

              <View style={styles.todayRow}>
                <View style={styles.todayCol}>
                  <Text style={styles.todayColLabel}>Credit Given (DR)</Text>
                  <AmountText
                    amount={summary?.today_dr || 0}
                    kind="DR"
                    size="md"
                    showSign
                  />
                </View>

                <View style={styles.todayDivider} />

                <View style={styles.todayCol}>
                  <Text style={styles.todayColLabel}>Payment Received (CR)</Text>
                  <AmountText
                    amount={summary?.today_cr || 0}
                    kind="CR"
                    size="md"
                    showSign
                  />
                </View>
              </View>
            </Card>

            {/* Quick Action Buttons */}
            <View style={styles.actionsRow}>
              <PrimaryButton
                title="+ Add Party"
                onPress={() => router.push('/(tabs)/parties')}
                variant="outline"
                size="sm"
                style={styles.actionBtn}
              />
              <PrimaryButton
                title="+ New Transaction"
                onPress={() => router.push('/transaction/new')}
                variant="gold"
                size="sm"
                style={styles.actionBtn}
              />
            </View>

            {/* Recent Transactions Section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/parties')}>
                <Text style={styles.sectionLink}>View All Parties</Text>
              </TouchableOpacity>
            </View>

            {!summary?.recent_transactions || summary.recent_transactions.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="No transactions yet"
                description="Start by recording your first credit sale (DR) or payment received (CR)."
                actionTitle="Add Transaction"
                onActionPress={() => router.push('/transaction/new')}
              />
            ) : (
              summary.recent_transactions.map((tx: Transaction) => (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.txRow}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/party/${tx.party_id}` as any)}
                >
                  <View
                    style={[
                      styles.txIconCircle,
                      { backgroundColor: tx.kind === 'DR' ? colors.debitLight : colors.creditLight },
                    ]}
                  >
                    <Ionicons
                      name={tx.kind === 'DR' ? 'arrow-up' : 'arrow-down'}
                      size={18}
                      color={tx.kind === 'DR' ? colors.debit : colors.credit}
                    />
                  </View>

                  <View style={styles.txDetails}>
                    <Text style={styles.txPartyName} numberOfLines={1}>
                      {tx.party_name || 'Customer'}
                    </Text>
                    <Text style={styles.txParticulars} numberOfLines={1}>
                      {tx.particulars || 'Regular ledger entry'}
                    </Text>
                    <View style={styles.txMetaRow}>
                      <Text style={styles.txDate}>{formatDate(tx.txn_date)}</Text>
                      {tx.source !== 'manual' && (
                        <View style={styles.sourceBadge}>
                          <Ionicons
                            name={tx.source === 'photo' ? 'camera' : 'mic'}
                            size={10}
                            color={colors.primaryGreen}
                          />
                          <Text style={styles.sourceBadgeText}>{tx.source}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.txAmountCol}>
                    <AmountText
                      amount={tx.amount}
                      kind={tx.kind}
                      size="md"
                      showSign
                      showSuffix
                    />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Welcome Onboarding Modal */}
      <WelcomeModal
        visible={welcomeVisible}
        onClose={() => setWelcomeVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.creamBackground,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  envBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  envText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  skeletonContainer: {
    paddingVertical: 10,
  },
  skeletonHalf: {
    flex: 1,
    height: 80,
    backgroundColor: colors.border,
    borderRadius: 14,
  },
  receivableCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
  },
  receivableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeReceivable: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badgeText: {
    color: colors.textWhite,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  receivableSubLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  heroAmount: {
    marginVertical: 8,
  },
  receivableFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 8,
    marginTop: 4,
  },
  receivableFooterText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  twoColumnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  halfCard: {
    flex: 1,
    padding: 14,
    marginVertical: 0,
  },
  cardHeaderSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardLabelSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  cardLabelSmallWhite: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
  },
  subtextSmall: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 6,
  },
  subtextSmallWhite: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 6,
  },
  payableAmount: {
    marginTop: 2,
  },
  todayCard: {
    padding: 16,
    marginVertical: 8,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  todayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayCol: {
    flex: 1,
    alignItems: 'center',
  },
  todayColLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  todayDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  actionBtn: {
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryGreen,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  txIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
  },
  txPartyName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  txParticulars: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.creditSubtle,
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primaryGreen,
    textTransform: 'capitalize',
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
});
