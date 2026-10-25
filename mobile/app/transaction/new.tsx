import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, PrimaryButton, Card, AmountText, ErrorBanner } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { dataService } from '../../src/services/dataService';
import { Party, TransactionKind, CreateTransactionInput } from '../../src/types';
import { parseINRToPaise } from '../../src/utils/format';

export default function NewTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ partyId?: string; defaultKind?: TransactionKind }>();

  const [parties, setParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string>(params.partyId || '');
  const [kind, setKind] = useState<TransactionKind>(params.defaultKind || 'DR');
  const [amountInput, setAmountInput] = useState('');
  const [particulars, setParticulars] = useState('');
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [showPartyPicker, setShowPartyPicker] = useState(!params.partyId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    dataService
      .listParties({ status: 'active' })
      .then((list) => {
        if (isMounted) {
          setParties(list);
        }
      })
      .catch((e) => {
        if (isMounted) {
          setError(e?.message || 'Failed to load parties.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  const handleSubmit = async () => {
    if (!selectedPartyId) {
      Alert.alert('Select Party', 'Please select a customer or supplier.');
      return;
    }

    const paise = parseINRToPaise(amountInput);
    if (paise <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than ₹0.');
      return;
    }

    setSubmitting(true);
    try {
      const input: CreateTransactionInput = {
        party_id: selectedPartyId,
        kind,
        amount: paise,
        txn_date: txnDate,
        particulars: particulars.trim() || (kind === 'DR' ? 'Credit sale' : 'Payment received'),
        source: 'manual',
      };

      await dataService.createTransaction(input);

      Alert.alert(
        'Transaction Recorded',
        `Successfully added ${kind === 'DR' ? 'credit given' : 'payment received'} for ${selectedParty?.name}.`,
        [
          {
            text: 'View Ledger',
            onPress: () => router.replace(`/party/${selectedPartyId}` as any),
          },
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not record transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAmount = (val: number) => {
    const current = parseINRToPaise(amountInput) / 100;
    const newVal = current + val;
    setAmountInput(newVal.toString());
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Add Transaction"
        subtitle="Record Credit Sale or Payment"
        showBack
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {error ? (
            <ErrorBanner
              message={error}
              onDismiss={() => setError(null)}
            />
          ) : null}

          {/* DR / CR Toggle Bar */}
          <Text style={styles.sectionLabel}>Transaction Type</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                kind === 'DR' && styles.toggleBtnDR,
              ]}
              onPress={() => setKind('DR')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-up-circle"
                size={22}
                color={kind === 'DR' ? colors.textWhite : colors.debit}
              />
              <View style={styles.toggleTextCol}>
                <Text
                  style={[
                    styles.toggleTitle,
                    kind === 'DR' && styles.toggleTitleActive,
                  ]}
                >
                  Gave Credit (DR)
                </Text>
                <Text
                  style={[
                    styles.toggleSub,
                    kind === 'DR' && styles.toggleSubActive,
                  ]}
                >
                  Customer owes shop
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleBtn,
                kind === 'CR' && styles.toggleBtnCR,
              ]}
              onPress={() => setKind('CR')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-down-circle"
                size={22}
                color={kind === 'CR' ? colors.textWhite : colors.credit}
              />
              <View style={styles.toggleTextCol}>
                <Text
                  style={[
                    styles.toggleTitle,
                    kind === 'CR' && styles.toggleTitleActive,
                  ]}
                >
                  Received (CR)
                </Text>
                <Text
                  style={[
                    styles.toggleSub,
                    kind === 'CR' && styles.toggleSubActive,
                  ]}
                >
                  Payment received
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Party Selection Card */}
          <Text style={styles.sectionLabel}>Party / Contact *</Text>
          {selectedParty && !showPartyPicker ? (
            <Card variant="default" style={styles.selectedPartyCard}>
              <View style={styles.selectedPartyRow}>
                <View style={styles.partyAvatar}>
                  <Text style={styles.partyAvatarText}>
                    {selectedParty.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedPartyName}>{selectedParty.name}</Text>
                  <Text style={styles.selectedPartyPhone}>
                    {selectedParty.phone || 'No phone'} • Balance:{' '}
                    <AmountText
                      amount={Math.abs(selectedParty.balance)}
                      kind={selectedParty.balance > 0 ? 'DR' : 'CR'}
                      size="xs"
                      showSuffix
                    />
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowPartyPicker(true)}
                  style={styles.changePartyBtn}
                >
                  <Text style={styles.changePartyText}>Change</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ) : (
            <View style={styles.pickerBox}>
              <Text style={styles.pickerHint}>Select contact:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.partyChipsList}
              >
                {parties.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.partyChip,
                      selectedPartyId === p.id && styles.partyChipActive,
                    ]}
                    onPress={() => {
                      setSelectedPartyId(p.id);
                      setShowPartyPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.partyChipText,
                        selectedPartyId === p.id && styles.partyChipTextActive,
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.addNewPartyInline}
                onPress={() => router.push('/(tabs)/parties')}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.primaryGreen} />
                <Text style={styles.addNewPartyInlineText}>Add new party</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Amount Input */}
          <Text style={styles.sectionLabel}>Amount (₹) *</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              value={amountInput}
              onChangeText={setAmountInput}
              keyboardType="numeric"
              autoFocus
            />
          </View>

          {/* Quick Amount Suggestion Chips */}
          <View style={styles.quickChipsRow}>
            {[500, 1000, 2000, 5000].map((val) => (
              <TouchableOpacity
                key={val}
                style={styles.quickChip}
                onPress={() => handleQuickAmount(val)}
              >
                <Text style={styles.quickChipText}>+₹{val.toLocaleString('en-IN')}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date Row */}
          <Text style={styles.sectionLabel}>Transaction Date (YYYY-MM-DD)</Text>
          <View style={styles.dateRow}>
            <TextInput
              style={styles.dateInput}
              value={txnDate}
              onChangeText={setTxnDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity
              style={styles.todayBtn}
              onPress={() => setTxnDate(new Date().toISOString().split('T')[0])}
            >
              <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>
          </View>

          {/* Particulars / Notes */}
          <Text style={styles.sectionLabel}>Particulars / Description</Text>
          <TextInput
            style={styles.particularsInput}
            placeholder={
              kind === 'DR'
                ? 'e.g. 2 bags rice, mustard oil, spices...'
                : 'e.g. UPI transfer, Cash on counter, Cheque...'
            }
            placeholderTextColor={colors.textMuted}
            value={particulars}
            onChangeText={setParticulars}
            multiline
            numberOfLines={3}
          />

          {/* Submit Button */}
          <PrimaryButton
            title={
              kind === 'DR'
                ? `Save Credit Sale (${amountInput ? `₹${amountInput}` : 'DR'})`
                : `Save Payment Received (${amountInput ? `₹${amountInput}` : 'CR'})`
            }
            onPress={handleSubmit}
            loading={submitting}
            variant={kind === 'DR' ? 'danger' : 'primary'}
            size="lg"
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.borderLight,
    gap: 8,
  },
  toggleBtnDR: {
    backgroundColor: colors.debit,
    borderColor: colors.debit,
  },
  toggleBtnCR: {
    backgroundColor: colors.credit,
    borderColor: colors.credit,
  },
  toggleTextCol: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  toggleTitleActive: {
    color: colors.textWhite,
  },
  toggleSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  toggleSubActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  selectedPartyCard: {
    padding: 14,
    marginVertical: 0,
  },
  selectedPartyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partyAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.creditLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  partyAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryGreen,
  },
  selectedPartyName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  selectedPartyPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  changePartyBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.surfaceNeutral,
    borderRadius: 8,
  },
  changePartyText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryGreen,
  },
  pickerBox: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pickerHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
  },
  partyChipsList: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  partyChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.creamBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  partyChipActive: {
    backgroundColor: colors.primaryGreen,
    borderColor: colors.primaryGreen,
  },
  partyChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  partyChipTextActive: {
    color: colors.textWhite,
  },
  addNewPartyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  addNewPartyInlineText: {
    fontSize: 12,
    color: colors.primaryGreen,
    fontWeight: '600',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primaryGreen,
    paddingHorizontal: 16,
    height: 64,
  },
  rupeeSymbol: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primaryGreen,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  quickChip: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryGreen,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  dateInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  todayBtn: {
    backgroundColor: colors.primaryGreen,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  todayBtnText: {
    color: colors.textWhite,
    fontSize: 13,
    fontWeight: '700',
  },
  particularsInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 28,
  },
});
