import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, Card, AmountText, PrimaryButton, EmptyState } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { dataService } from '../../src/services/dataService';
import { Party, Transaction } from '../../src/types';
import { formatDate } from '../../src/utils/format';

export default function PartyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [party, setParty] = useState<Party | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPartyData = useCallback(async () => {
    if (!id) return;
    try {
      const [partyData, txList] = await Promise.all([
        dataService.getParty(id),
        dataService.listTransactions({ party_id: id }),
      ]);
      setParty(partyData);
      setTransactions(txList);
    } catch (err) {
      console.error('Failed to load party ledger:', err);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    Promise.all([
      dataService.getParty(id),
      dataService.listTransactions({ party_id: id }),
    ])
      .then(([partyData, txList]) => {
        if (isMounted) {
          setParty(partyData);
          setTransactions(txList);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load party ledger:', err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPartyData();
    setRefreshing(false);
  };

  const handleCall = () => {
    if (party?.phone) {
      Linking.openURL(`tel:${party.phone}`);
    } else {
      Alert.alert('No Phone', 'This party has no phone number recorded.');
    }
  };

  const handleDeleteTransaction = (tx: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      `Delete this ${tx.kind} entry of ${tx.amount / 100}? The party balance will recalculate automatically.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dataService.deleteTransaction(tx.id);
              await fetchPartyData();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not delete entry.');
            }
          },
        },
      ]
    );
  };

  if (loading && !party) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primaryGreen} />
        <Text style={styles.loadingText}>Loading party ledger...</Text>
      </View>
    );
  }

  if (!party) {
    return (
      <View style={styles.container}>
        <AppHeader title="Party Ledger" showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Party Not Found"
          description="The requested party could not be found."
          actionTitle="Back to Parties"
          onActionPress={() => router.back()}
        />
      </View>
    );
  }

  const isReceivable = party.balance > 0;
  const isPayable = party.balance < 0;

  return (
    <View style={styles.container}>
      <AppHeader
        title={party.name}
        subtitle={`${party.type === 'customer' ? 'Customer' : 'Supplier'} • ${party.phone || 'No phone'}`}
        showBack
        rightAction={{
          icon: 'call',
          onPress: handleCall,
          accessibilityLabel: 'Call party',
        }}
      />

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <>
            {/* Live Balance Card */}
            <Card
              variant={isReceivable ? 'receivable' : isPayable ? 'payable' : 'default'}
              style={styles.balanceCard}
            >
              <View style={styles.balanceHeader}>
                <Text
                  style={[
                    styles.balanceLabel,
                    (isReceivable || isPayable) && styles.whiteText,
                  ]}
                >
                  {isReceivable
                    ? 'CURRENT DUE (RECEIVABLE / DR)'
                    : isPayable
                    ? 'ADVANCE BALANCE (PAYABLE / CR)'
                    : 'ACCOUNT SETTLED'}
                </Text>
                <Ionicons
                  name={isReceivable ? 'wallet' : isPayable ? 'checkmark-circle' : 'ribbon'}
                  size={20}
                  color={isReceivable || isPayable ? colors.textWhite : colors.primaryGreen}
                />
              </View>

              <AmountText
                amount={Math.abs(party.balance)}
                kind={isReceivable || isPayable ? 'white' : 'neutral'}
                size="hero"
                style={styles.heroAmount}
              />

              <Text
                style={[
                  styles.balanceSub,
                  (isReceivable || isPayable) && styles.whiteTextSub,
                ]}
              >
                {isReceivable
                  ? `${party.name} owes you money`
                  : isPayable
                  ? `You owe money to ${party.name}`
                  : 'Zero balance • No pending dues'}
              </Text>

              {/* Total DR & CR Summary Row */}
              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text
                    style={[
                      styles.statLabel,
                      (isReceivable || isPayable) && styles.whiteTextSub,
                    ]}
                  >
                    Total Credit (DR)
                  </Text>
                  <AmountText
                    amount={party.total_dr}
                    kind={isReceivable || isPayable ? 'white' : 'DR'}
                    size="sm"
                  />
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statCol}>
                  <Text
                    style={[
                      styles.statLabel,
                      (isReceivable || isPayable) && styles.whiteTextSub,
                    ]}
                  >
                    Total Received (CR)
                  </Text>
                  <AmountText
                    amount={party.total_cr}
                    kind={isReceivable || isPayable ? 'white' : 'CR'}
                    size="sm"
                  />
                </View>
              </View>
            </Card>

            {/* DR / CR Action Buttons */}
            <View style={styles.actionButtonsRow}>
              <PrimaryButton
                title="+ Gave Credit (DR)"
                onPress={() =>
                  router.push({
                    pathname: '/transaction/new',
                    params: { partyId: party.id, defaultKind: 'DR' },
                  })
                }
                variant="danger"
                size="md"
                style={styles.actionBtn}
              />
              <PrimaryButton
                title="+ Received (CR)"
                onPress={() =>
                  router.push({
                    pathname: '/transaction/new',
                    params: { partyId: party.id, defaultKind: 'CR' },
                  })
                }
                variant="primary"
                size="md"
                style={styles.actionBtn}
              />
            </View>

            {/* Ledger Header */}
            <View style={styles.ledgerHeaderRow}>
              <Text style={styles.ledgerTitle}>Ledger Entries</Text>
              <Text style={styles.ledgerCount}>{transactions.length} entries</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.entryRow}>
            <View
              style={[
                styles.entryBadge,
                { backgroundColor: item.kind === 'DR' ? '#FEE2E2' : '#DCFCE7' },
              ]}
            >
              <Text
                style={[
                  styles.entryBadgeText,
                  { color: item.kind === 'DR' ? colors.debit : colors.credit },
                ]}
              >
                {item.kind}
              </Text>
            </View>

            <View style={styles.entryDetails}>
              <Text style={styles.entryParticulars} numberOfLines={2}>
                {item.particulars || (item.kind === 'DR' ? 'Credit sale' : 'Payment received')}
              </Text>
              <View style={styles.entryMeta}>
                <Text style={styles.entryDate}>{formatDate(item.txn_date)}</Text>
                {item.source !== 'manual' && (
                  <View style={styles.sourceTag}>
                    <Ionicons
                      name={item.source === 'photo' ? 'camera' : 'mic'}
                      size={10}
                      color={colors.primaryGreen}
                    />
                    <Text style={styles.sourceTagText}>{item.source}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.entryAmountCol}>
              <AmountText
                amount={item.amount}
                kind={item.kind}
                size="md"
                showSign
              />
              <TouchableOpacity
                onPress={() => handleDeleteTransaction(item)}
                style={styles.trashBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No ledger entries"
            description="Record your first credit sale or payment for this party above."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.creamBackground,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.creamBackground,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  balanceCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  heroAmount: {
    marginVertical: 6,
  },
  balanceSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  whiteText: {
    color: colors.textWhite,
  },
  whiteTextSub: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
    paddingTop: 10,
    marginTop: 6,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 8,
  },
  actionBtn: {
    flex: 1,
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  ledgerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ledgerCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  entryBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  entryBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  entryDetails: {
    flex: 1,
  },
  entryParticulars: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E8F5E9',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  sourceTagText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.primaryGreen,
    textTransform: 'capitalize',
  },
  entryAmountCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  trashBtn: {
    padding: 4,
  },
});
