import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AppHeader,
  Card,
  AmountText,
  PrimaryButton,
  EmptyState,
  CardSkeleton,
  ListItemSkeleton,
  ErrorBanner,
} from '../../src/components';
import { CreditReportModal } from '../../src/features/credit/CreditReportModal';
import { StatementModal } from '../../src/features/ledger/StatementModal';
import { colors } from '../../src/theme/colors';
import { dataService } from '../../src/services/dataService';
import { Party, Transaction, TransactionKind, UpdatePartyInput, UpdateTransactionInput } from '../../src/types';
import { formatDate, parseINRToPaise } from '../../src/utils/format';

export default function PartyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [party, setParty] = useState<Party | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [creditReportVisible, setCreditReportVisible] = useState(false);
  const [statementVisible, setStatementVisible] = useState(false);
  const [editPartyVisible, setEditPartyVisible] = useState(false);
  const [editTxModalVisible, setEditTxModalVisible] = useState(false);

  // Filter state
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d' | 'month'>('all');
  const [kindFilter, setKindFilter] = useState<'all' | 'DR' | 'CR'>('all');

  // Edit Party form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editOpening, setEditOpening] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editDueDays, setEditDueDays] = useState('30');
  const [savingParty, setSavingParty] = useState(false);

  // Edit Transaction form state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txAmount, setTxAmount] = useState('');
  const [txKind, setTxKind] = useState<TransactionKind>('DR');
  const [txDate, setTxDate] = useState('');
  const [txParticulars, setTxParticulars] = useState('');
  const [savingTx, setSavingTx] = useState(false);

  const fetchPartyData = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const [partyData, txList] = await Promise.all([
        dataService.getParty(id),
        dataService.listTransactions({ party_id: id }),
      ]);
      setParty(partyData);
      setTransactions(txList);
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to live ledger server.');
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
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err?.message || 'Failed to load party ledger.');
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

  // --- Party Management Actions ---

  const openEditPartyModal = () => {
    if (!party) return;
    setEditName(party.name);
    setEditPhone(party.phone || '');
    setEditOpening((party.opening_balance / 100).toString());
    setEditLimit((party.credit_limit / 100).toString());
    setEditDueDays(party.due_days.toString());
    setEditPartyVisible(true);
  };

  const handleSaveParty = async () => {
    if (!party || !editName.trim()) return;
    setSavingParty(true);
    try {
      const input: UpdatePartyInput = {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        opening_balance: editOpening ? parseINRToPaise(editOpening) : 0,
        credit_limit: editLimit ? parseINRToPaise(editLimit) : 0,
        due_days: parseInt(editDueDays, 10) || 30,
      };

      await dataService.updateParty(party.id, input);
      setEditPartyVisible(false);
      await fetchPartyData();
      Alert.alert('Success', 'Party profile updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update party.');
    } finally {
      setSavingParty(false);
    }
  };

  const handleArchiveParty = () => {
    if (!party) return;
    Alert.alert(
      'Archive Party',
      `Are you sure you want to archive ${party.name}? They will be hidden from the active list, but ledger history remains intact.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await dataService.archiveParty(party.id);
              Alert.alert('Archived', `${party.name} archived successfully.`, [
                { text: 'OK', onPress: () => router.replace('/(tabs)/parties') },
              ]);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to archive party.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteParty = () => {
    if (!party) return;
    Alert.alert(
      'Delete Party',
      `Permanently delete ${party.name}? This will remove the party record. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dataService.deleteParty(party.id);
              Alert.alert('Deleted', 'Party deleted successfully.', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/parties') },
              ]);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete party.');
            }
          },
        },
      ]
    );
  };

  // --- Transaction Management Actions ---

  const openEditTxModal = (tx: Transaction) => {
    setEditingTx(tx);
    setTxAmount((tx.amount / 100).toString());
    setTxKind(tx.kind);
    setTxDate(tx.txn_date);
    setTxParticulars(tx.particulars || '');
    setEditTxModalVisible(true);
  };

  const handleSaveTransaction = async () => {
    if (!editingTx) return;
    const paise = parseINRToPaise(txAmount);
    if (paise <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    setSavingTx(true);
    try {
      const input: UpdateTransactionInput = {
        amount: paise,
        kind: txKind,
        txn_date: txDate,
        particulars: txParticulars.trim() || null,
      };

      await dataService.updateTransaction(editingTx.id, input);
      setEditTxModalVisible(false);
      setEditingTx(null);
      await fetchPartyData();
      Alert.alert('Updated', 'Transaction updated and balance recalculated.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update transaction.');
    } finally {
      setSavingTx(false);
    }
  };

  const handleDeleteTransaction = (tx: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      `Delete this ${tx.kind} entry of ₹${(tx.amount / 100).toLocaleString('en-IN')}? The party balance will recalculate immediately.`,
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

  // --- Filtered Transactions ---

  const filteredTransactions = useMemo(() => {
    let list = transactions.filter((t) => !t.deleted_at);

    // Kind filter
    if (kindFilter !== 'all') {
      list = list.filter((t) => t.kind === kindFilter);
    }

    // Date range filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      if (dateFilter === '7d') {
        cutoff.setDate(now.getDate() - 7);
      } else if (dateFilter === '30d') {
        cutoff.setDate(now.getDate() - 30);
      } else if (dateFilter === 'month') {
        cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      const cutoffStr = cutoff.toISOString().split('T')[0];
      list = list.filter((t) => t.txn_date >= cutoffStr);
    }

    return list;
  }, [transactions, kindFilter, dateFilter]);

  if (loading && !party) {
    return (
      <View style={styles.container}>
        <AppHeader title="Party Ledger" showBack />
        <View style={{ padding: 16 }}>
          <CardSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </View>
      </View>
    );
  }

  if (!party) {
    return (
      <View style={styles.container}>
        <AppHeader title="Party Ledger" showBack />
        <View style={{ padding: 16 }}>
          {error ? (
            <ErrorBanner message={error} onRetry={handleRefresh} />
          ) : null}
          <EmptyState
            icon="alert-circle-outline"
            title="Party Not Found"
            description="The requested party could not be found."
            actionTitle="Back to Parties"
            onActionPress={() => router.back()}
          />
        </View>
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
          icon: 'ellipsis-horizontal',
          onPress: openEditPartyModal,
          accessibilityLabel: 'Party Options',
        }}
      />

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <>
            {error ? (
              <ErrorBanner
                message={error}
                onRetry={handleRefresh}
                onDismiss={() => setError(null)}
              />
            ) : null}

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

            {/* Quick Action Buttons */}
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

            {/* Phase 4 Advanced Tools: Statement & Credit Report */}
            <View style={styles.toolsRow}>
              <TouchableOpacity
                style={styles.toolBtn}
                onPress={() => setStatementVisible(true)}
              >
                <Ionicons name="document-text-outline" size={16} color={colors.primaryGreen} />
                <Text style={styles.toolBtnText}>View Statement</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolBtn}
                onPress={() => setCreditReportVisible(true)}
              >
                <Ionicons name="analytics-outline" size={16} color={colors.primaryGreen} />
                <Text style={styles.toolBtnText}>Credit Report</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolBtn}
                onPress={handleCall}
              >
                <Ionicons name="call-outline" size={16} color={colors.primaryGreen} />
                <Text style={styles.toolBtnText}>Call</Text>
              </TouchableOpacity>
            </View>

            {/* Ledger Filters Bar */}
            <View style={styles.filterSection}>
              {/* Date Filters */}
              <View style={styles.filterRow}>
                {(['all', '7d', '30d', 'month'] as const).map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.filterChip,
                      dateFilter === key && styles.filterChipActive,
                    ]}
                    onPress={() => setDateFilter(key)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        dateFilter === key && styles.filterChipTextActive,
                      ]}
                    >
                      {key === 'all'
                        ? 'All Time'
                        : key === '7d'
                        ? '7 Days'
                        : key === '30d'
                        ? '30 Days'
                        : 'This Month'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Kind Filters */}
              <View style={styles.filterRow}>
                {(['all', 'DR', 'CR'] as const).map((kind) => (
                  <TouchableOpacity
                    key={kind}
                    style={[
                      styles.kindChip,
                      kindFilter === kind && styles.kindChipActive,
                    ]}
                    onPress={() => setKindFilter(kind)}
                  >
                    <Text
                      style={[
                        styles.kindChipText,
                        kindFilter === kind && styles.kindChipTextActive,
                      ]}
                    >
                      {kind === 'all' ? 'All Entries' : kind === 'DR' ? 'DR Only (Sales)' : 'CR Only (Payments)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Ledger Header */}
            <View style={styles.ledgerHeaderRow}>
              <Text style={styles.ledgerTitle}>Ledger Records</Text>
              <Text style={styles.ledgerCount}>{filteredTransactions.length} entries</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.entryRow}
            activeOpacity={0.7}
            onPress={() => openEditTxModal(item)}
          >
            <View
              style={[
                styles.entryBadge,
                { backgroundColor: item.kind === 'DR' ? colors.debitLight : colors.creditLight },
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
              <View style={styles.entryActions}>
                <TouchableOpacity
                  onPress={() => openEditTxModal(item)}
                  style={styles.actionIconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="pencil-outline" size={15} color={colors.primaryGreen} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteTransaction(item)}
                  style={styles.actionIconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={15} color={colors.debit} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No ledger entries found"
            description="No transactions match your current filters. Tap '+ Gave Credit' or '+ Received' above to add one."
          />
        }
      />

      {/* Credit Report Modal */}
      <CreditReportModal
        partyId={party.id}
        visible={creditReportVisible}
        onClose={() => setCreditReportVisible(false)}
      />

      {/* On-Screen Statement View Modal */}
      <StatementModal
        party={party}
        transactions={filteredTransactions}
        visible={statementVisible}
        onClose={() => setStatementVisible(false)}
        dateRangeLabel={
          dateFilter === '7d'
            ? 'Last 7 Days'
            : dateFilter === '30d'
            ? 'Last 30 Days'
            : dateFilter === 'month'
            ? 'This Month'
            : 'Complete Ledger'
        }
      />

      {/* Edit Party Modal */}
      <Modal
        visible={editPartyVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditPartyVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Party Settings</Text>
              <TouchableOpacity onPress={() => setEditPartyVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Party Name *</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Text style={styles.inputLabel}>Opening Balance (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={editOpening}
                  onChangeText={setEditOpening}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.halfCol}>
                <Text style={styles.inputLabel}>Credit Limit (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={editLimit}
                  onChangeText={setEditLimit}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Payment Due Term (Days)</Text>
            <TextInput
              style={styles.input}
              value={editDueDays}
              onChangeText={setEditDueDays}
              keyboardType="number-pad"
            />

            <PrimaryButton
              title="Save Changes"
              onPress={handleSaveParty}
              loading={savingParty}
              variant="primary"
              size="md"
              style={{ marginTop: 16 }}
            />

            <View style={styles.dangerRow}>
              <TouchableOpacity
                style={styles.archiveBtn}
                onPress={handleArchiveParty}
              >
                <Ionicons name="archive-outline" size={16} color={colors.warning} />
                <Text style={styles.archiveBtnText}>Archive Party</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDeleteParty}
              >
                <Ionicons name="trash-outline" size={16} color={colors.debit} />
                <Text style={styles.deleteBtnText}>Delete Party</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal
        visible={editTxModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditTxModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Transaction</Text>
              <TouchableOpacity onPress={() => setEditTxModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* DR / CR Toggle */}
            <View style={styles.txToggleRow}>
              <TouchableOpacity
                style={[styles.txToggleBtn, txKind === 'DR' && styles.txToggleBtnDR]}
                onPress={() => setTxKind('DR')}
              >
                <Text style={[styles.txToggleText, txKind === 'DR' && styles.txToggleTextActive]}>
                  Credit Sale (DR)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.txToggleBtn, txKind === 'CR' && styles.txToggleBtnCR]}
                onPress={() => setTxKind('CR')}
              >
                <Text style={[styles.txToggleText, txKind === 'CR' && styles.txToggleTextActive]}>
                  Payment (CR)
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Amount (₹) *</Text>
            <TextInput
              style={styles.input}
              value={txAmount}
              onChangeText={setTxAmount}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Transaction Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={txDate}
              onChangeText={setTxDate}
            />

            <Text style={styles.inputLabel}>Particulars / Description</Text>
            <TextInput
              style={styles.input}
              value={txParticulars}
              onChangeText={setTxParticulars}
              multiline
              numberOfLines={2}
            />

            <PrimaryButton
              title="Update Entry"
              onPress={handleSaveTransaction}
              loading={savingTx}
              variant={txKind === 'DR' ? 'danger' : 'primary'}
              size="md"
              style={{ marginTop: 18 }}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  toolsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryGreen,
  },
  filterSection: {
    backgroundColor: colors.surface,
    padding: 10,
    borderRadius: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 6,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.creamBackground,
  },
  filterChipActive: {
    backgroundColor: colors.primaryGreen,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textWhite,
  },
  kindChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  kindChipActive: {
    backgroundColor: colors.creditSubtle,
    borderColor: colors.primaryGreen,
  },
  kindChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  kindChipTextActive: {
    color: colors.primaryGreen,
    fontWeight: '700',
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
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
    fontSize: 13,
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
    backgroundColor: colors.creditSubtle,
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
    gap: 6,
  },
  entryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconBtn: {
    padding: 3,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.creamBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfCol: {
    flex: 1,
  },
  dangerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  archiveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.warningLight,
  },
  archiveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warningText,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.debitLight,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.debit,
  },
  txToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  txToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  txToggleBtnDR: {
    backgroundColor: colors.debit,
    borderColor: colors.debit,
  },
  txToggleBtnCR: {
    backgroundColor: colors.credit,
    borderColor: colors.credit,
  },
  txToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  txToggleTextActive: {
    color: colors.textWhite,
    fontWeight: '700',
  },
});
