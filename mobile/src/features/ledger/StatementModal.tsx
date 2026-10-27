import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Party, Transaction } from '../../types';
import { formatINR, formatDate } from '../../utils/format';
import { AmountText } from '../../components/AmountText';

export interface StatementModalProps {
  party: Party;
  transactions: Transaction[];
  visible: boolean;
  onClose: () => void;
  dateRangeLabel?: string;
}

export const StatementModal: React.FC<StatementModalProps> = ({
  party,
  transactions,
  visible,
  onClose,
  dateRangeLabel = 'Complete Ledger Statement',
}) => {
  if (!visible) return null;

  const activeTxs = transactions.filter((t) => !t.deleted_at);
  const totalDr = activeTxs.filter((t) => t.kind === 'DR').reduce((acc, t) => acc + t.amount, 0);
  const totalCr = activeTxs.filter((t) => t.kind === 'CR').reduce((acc, t) => acc + t.amount, 0);
  const closingBalance = (party.opening_balance || 0) + totalDr - totalCr;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.shopName}>Gupta Kirana Store</Text>
              <Text style={styles.statementTitle}>Account Statement / Khata Parcha</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Party Profile Banner */}
            <View style={styles.partyBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.partyName}>{party.name}</Text>
                <Text style={styles.partyDetails}>
                  Phone: {party.phone || 'N/A'} • Terms: {party.due_days} Days
                </Text>
                <Text style={styles.periodText}>Period: {dateRangeLabel}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {closingBalance > 0 ? 'DUE (DR)' : closingBalance < 0 ? 'ADVANCE (CR)' : 'SETTLED'}
                </Text>
              </View>
            </View>

            {/* Statement Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Opening Balance:</Text>
                <Text style={styles.summaryVal}>{formatINR(party.opening_balance || 0)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Total Credit Given (DR):</Text>
                <Text style={[styles.summaryVal, { color: colors.debit }]}>+{formatINR(totalDr)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Total Payments Received (CR):</Text>
                <Text style={[styles.summaryVal, { color: colors.credit }]}>-{formatINR(totalCr)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                <Text style={styles.totalKey}>Net Closing Balance:</Text>
                <AmountText
                  amount={Math.abs(closingBalance)}
                  kind={closingBalance > 0 ? 'DR' : closingBalance < 0 ? 'CR' : 'neutral'}
                  size="md"
                  showSuffix
                />
              </View>
            </View>

            {/* Itemized Table */}
            <Text style={styles.tableTitle}>Itemized Ledger Records ({activeTxs.length})</Text>

            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.th, { width: 85 }]}>Date</Text>
                <Text style={[styles.th, { flex: 1 }]}>Particulars</Text>
                <Text style={[styles.th, { width: 75, textAlign: 'right' }]}>DR (₹)</Text>
                <Text style={[styles.th, { width: 75, textAlign: 'right' }]}>CR (₹)</Text>
              </View>

              {activeTxs.length === 0 ? (
                <View style={styles.emptyTable}>
                  <Text style={styles.emptyTableText}>No transactions in selected period</Text>
                </View>
              ) : (
                activeTxs.map((tx) => (
                  <View key={tx.id} style={styles.tableDataRow}>
                    <Text style={[styles.tdDate, { width: 85 }]}>
                      {formatDate(tx.txn_date)}
                    </Text>
                    <Text style={[styles.tdParticulars, { flex: 1 }]} numberOfLines={2}>
                      {tx.particulars || (tx.kind === 'DR' ? 'Credit sale' : 'Payment')}
                    </Text>
                    <Text
                      style={[
                        styles.tdAmount,
                        { width: 75, textAlign: 'right', color: tx.kind === 'DR' ? colors.debit : colors.textMuted },
                      ]}
                    >
                      {tx.kind === 'DR' ? formatINR(tx.amount) : '-'}
                    </Text>
                    <Text
                      style={[
                        styles.tdAmount,
                        { width: 75, textAlign: 'right', color: tx.kind === 'CR' ? colors.credit : colors.textMuted },
                      ]}
                    >
                      {tx.kind === 'CR' ? formatINR(tx.amount) : '-'}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.footerNote}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={styles.footerNoteText}>
                Generated by BillBook. All monetary records are certified in integer paise.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: 10,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryGreen,
  },
  statementTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    paddingBottom: 20,
  },
  partyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldLight,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  partyName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  partyDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  periodText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: colors.creditSubtle,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryGreen,
  },
  summaryCard: {
    backgroundColor: colors.creamBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryKey: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  totalKey: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tableTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  table: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: 14,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tdDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  tdParticulars: {
    fontSize: 12,
    color: colors.textPrimary,
    paddingRight: 6,
  },
  tdAmount: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyTable: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTableText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  footerNoteText: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
  },
});
