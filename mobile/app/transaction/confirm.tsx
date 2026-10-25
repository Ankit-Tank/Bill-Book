import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, Card, PrimaryButton, AmountText } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { dataService } from '../../src/services/dataService';
import { Party, ExtractionResult, ExtractedItem } from '../../src/types';
import { captureState } from '../../src/features/capture/captureState';

export default function ConfirmExtractionScreen() {
  const router = useRouter();

  // Pending extraction data from memory
  const pending = captureState.getPending();

  // Fallback default extraction if opened directly
  const initialResult: ExtractionResult = pending?.result || {
    party_name: 'Rahul Sharma',
    party_candidates: [
      { id: 'p-1', name: 'Rahul Sharma', phone: '+91 98765 43210', score: 0.96 },
    ],
    kind: 'DR',
    amount: 245000,
    txn_date: new Date().toISOString().slice(0, 10),
    particulars: 'Extracted: 2x Basmati rice, 5L mustard oil',
    items: [
      { name: 'Basmati Rice 5kg', quantity: 2, rate: 72500, amount: 145000 },
      { name: 'Fortune Mustard Oil 5L', quantity: 1, rate: 100000, amount: 100000 },
    ],
    confidence: 0.94,
    needs_review_fields: [],
  };

  const source = pending?.source || 'photo';
  const billImagePath = pending?.fileUri || null;
  const needsReview = initialResult.needs_review_fields || [];

  // Form states
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string>(
    initialResult.party_candidates?.[0]?.id || ''
  );
  const [kind, setKind] = useState<'DR' | 'CR'>((initialResult.kind as 'DR' | 'CR') || 'DR');
  const [amountRupees, setAmountRupees] = useState<string>(
    initialResult.amount ? (initialResult.amount / 100).toString() : '0'
  );
  const [txnDate, setTxnDate] = useState<string>(
    initialResult.txn_date || new Date().toISOString().slice(0, 10)
  );
  const [particulars, setParticulars] = useState<string>(initialResult.particulars || '');
  const [items] = useState<ExtractedItem[]>(initialResult.items || []);
  const [showItems, setShowItems] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Party Inline Modal
  const [showNewPartyModal, setShowNewPartyModal] = useState<boolean>(false);
  const [newPartyName, setNewPartyName] = useState<string>(initialResult.party_name || '');
  const [newPartyPhone, setNewPartyPhone] = useState<string>('');
  const [isCreatingParty, setIsCreatingParty] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    dataService.listParties().then((all) => {
      if (!isMounted) return;
      setParties(all);
      // Auto-match if candidate exists in parties
      if (!selectedPartyId && initialResult.party_candidates?.length > 0) {
        const match = all.find((p) => p.name.toLowerCase() === initialResult.party_name.toLowerCase());
        if (match) setSelectedPartyId(match.id);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [initialResult.party_name, initialResult.party_candidates, selectedPartyId]);

  const handleCreateNewParty = async () => {
    if (!newPartyName.trim()) {
      Alert.alert('Required', 'Please enter a name for the new party.');
      return;
    }
    setIsCreatingParty(true);
    try {
      const created = await dataService.createParty({
        name: newPartyName.trim(),
        phone: newPartyPhone.trim() || undefined,
        type: 'customer',
        opening_balance: 0,
      });
      setParties((prev) => [created, ...prev]);
      setSelectedPartyId(created.id);
      setShowNewPartyModal(false);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create party.');
    } finally {
      setIsCreatingParty(false);
    }
  };

  const handleSaveTransaction = async () => {
    setFormError(null);

    if (!selectedPartyId) {
      setFormError('Please select a party or create a new one.');
      return;
    }

    const parsedRupees = parseFloat(amountRupees);
    if (isNaN(parsedRupees) || parsedRupees <= 0) {
      setFormError('Please enter a valid transaction amount greater than ₹0.');
      return;
    }

    const amountPaise = Math.round(parsedRupees * 100);

    setIsSubmitting(true);
    try {
      await dataService.createTransaction({
        party_id: selectedPartyId,
        kind,
        amount: amountPaise,
        txn_date: txnDate,
        particulars: particulars.trim() || undefined,
        source: source as 'photo' | 'voice',
        bill_image_path: billImagePath || undefined,
      });

      // Clear pending state
      captureState.clear();

      // Navigate to party detail screen
      router.replace(`/party/${selectedPartyId}` as any);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to record transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader
        title="Confirm Extracted Entry"
        subtitle={`Verified via Gemini AI (${source === 'photo' ? 'Bill Scan' : 'Voice Memo'})`}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner with Review Status */}
        <Card variant="cream" style={styles.reviewBanner}>
          <View style={styles.reviewHeader}>
            <View style={styles.aiBadge}>
              <Ionicons
                name={source === 'photo' ? 'camera' : 'mic'}
                size={14}
                color={colors.primaryGreen}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.aiBadgeText}>
                {source === 'photo' ? 'Extracted from Bill Photo' : 'Extracted from Voice Memo'}
              </Text>
            </View>

            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                {Math.round((initialResult.confidence || 0.9) * 100)}% Confidence
              </Text>
            </View>
          </View>

          {needsReview.length > 0 ? (
            <View style={styles.needsReviewAlert}>
              <Ionicons name="alert-circle" size={16} color={colors.warningText} />
              <Text style={styles.needsReviewText}>
                Please verify highlighted fields: {needsReview.join(', ')}
              </Text>
            </View>
          ) : (
            <Text style={styles.reviewOkText}>
              All key data fields extracted successfully. Review and save below.
            </Text>
          )}
        </Card>

        {formError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.debit} />
            <Text style={styles.errorBannerText}>{formError}</Text>
          </View>
        ) : null}

        {/* 1. Party Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>
              Customer / Supplier Party <Text style={styles.req}>*</Text>
            </Text>
            {needsReview.includes('party_name') ? (
              <View style={styles.reviewChip}>
                <Text style={styles.reviewChipText}>Needs Review</Text>
              </View>
            ) : null}
          </View>

          {/* AI Suggested Candidates */}
          {initialResult.party_candidates && initialResult.party_candidates.length > 0 ? (
            <View style={styles.candidatesWrapper}>
              <Text style={styles.candidatesHint}>AI Suggested Matches:</Text>
              <View style={styles.candidatesRow}>
                {initialResult.party_candidates.map((cand) => (
                  <TouchableOpacity
                    key={cand.id}
                    style={[
                      styles.candidateChip,
                      selectedPartyId === cand.id && styles.candidateChipActive,
                    ]}
                    onPress={() => setSelectedPartyId(cand.id)}
                  >
                    <Ionicons
                      name={selectedPartyId === cand.id ? 'checkmark-circle' : 'person-outline'}
                      size={14}
                      color={selectedPartyId === cand.id ? colors.primaryGreen : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.candidateText,
                        selectedPartyId === cand.id && styles.candidateTextActive,
                      ]}
                    >
                      {cand.name} ({Math.round(cand.score * 100)}%)
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {/* Party Dropdown / Card */}
          <Card
            variant="default"
            style={[
              styles.partyCard,
              needsReview.includes('party_name') && styles.inputWarning,
            ]}
          >
            {selectedParty ? (
              <View style={styles.selectedPartyRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{selectedParty.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedPartyName}>{selectedParty.name}</Text>
                  <Text style={styles.selectedPartyPhone}>{selectedParty.phone || 'No phone'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.changePartyBtn}
                  onPress={() => setSelectedPartyId('')}
                >
                  <Text style={styles.changePartyText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.partyPickerBox}>
                <Text style={styles.pickerTitle}>Choose an existing party:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {parties.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.partyPill,
                          selectedPartyId === p.id && styles.partyPillActive,
                        ]}
                        onPress={() => setSelectedPartyId(p.id)}
                      >
                        <Text
                          style={[
                            styles.partyPillText,
                            selectedPartyId === p.id && styles.partyPillTextActive,
                          ]}
                        >
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={styles.addNewPartyBtn}
                  onPress={() => {
                    setNewPartyName(initialResult.party_name || '');
                    setShowNewPartyModal(true);
                  }}
                >
                  <Ionicons name="person-add" size={16} color={colors.primaryGreen} style={{ marginRight: 6 }} />
                  <Text style={styles.addNewPartyText}>
                    {`+ Create New Party "${initialResult.party_name || 'Customer'}"`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        </View>

        {/* 2. Transaction Type (DR vs CR) */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Transaction Type</Text>
          <View style={styles.kindSelector}>
            <TouchableOpacity
              style={[
                styles.kindOption,
                kind === 'DR' && styles.kindOptionDrActive,
                needsReview.includes('kind') && styles.inputWarning,
              ]}
              onPress={() => setKind('DR')}
            >
              <Ionicons
                name="arrow-up-circle"
                size={20}
                color={kind === 'DR' ? colors.debit : colors.textMuted}
              />
              <View>
                <Text style={[styles.kindTitle, kind === 'DR' && { color: colors.debit }]}>
                  {"DR • You'll Get"}
                </Text>
                <Text style={styles.kindSubtitle}>Customer owes shop (Debit)</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.kindOption,
                kind === 'CR' && styles.kindOptionCrActive,
                needsReview.includes('kind') && styles.inputWarning,
              ]}
              onPress={() => setKind('CR')}
            >
              <Ionicons
                name="arrow-down-circle"
                size={20}
                color={kind === 'CR' ? colors.primaryGreen : colors.textMuted}
              />
              <View>
                <Text style={[styles.kindTitle, kind === 'CR' && { color: colors.primaryGreen }]}>
                  {"CR • You'll Give"}
                </Text>
                <Text style={styles.kindSubtitle}>Payment received (Credit)</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Amount */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>
              Amount (₹) <Text style={styles.req}>*</Text>
            </Text>
            {needsReview.includes('amount') ? (
              <View style={styles.reviewChip}>
                <Text style={styles.reviewChipText}>Needs Review</Text>
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.amountContainer,
              needsReview.includes('amount') && styles.inputWarning,
            ]}
          >
            <Text style={styles.rupeeSymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              keyboardType="decimal-pad"
              value={amountRupees}
              onChangeText={setAmountRupees}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* 4. Date & Particulars */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Date</Text>
            {needsReview.includes('txn_date') ? (
              <View style={styles.reviewChip}>
                <Text style={styles.reviewChipText}>Needs Review</Text>
              </View>
            ) : null}
          </View>
          <TextInput
            style={[styles.input, needsReview.includes('txn_date') && styles.inputWarning]}
            value={txnDate}
            onChangeText={setTxnDate}
            placeholder="YYYY-MM-DD"
          />

          <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
            <Text style={styles.sectionLabel}>Particulars / Description</Text>
            {needsReview.includes('particulars') ? (
              <View style={styles.reviewChip}>
                <Text style={styles.reviewChipText}>Needs Review</Text>
              </View>
            ) : null}
          </View>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              needsReview.includes('particulars') && styles.inputWarning,
            ]}
            value={particulars}
            onChangeText={setParticulars}
            placeholder="Items, notes or invoice number"
            multiline
            numberOfLines={2}
          />
        </View>

        {/* 5. Line Items Breakdown */}
        {items.length > 0 ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.itemsHeaderToggle}
              activeOpacity={0.7}
              onPress={() => setShowItems(!showItems)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="receipt-outline" size={16} color={colors.primaryGreen} />
                <Text style={styles.itemsTitle}>
                  Extracted Line Items ({items.length})
                </Text>
              </View>
              <Ionicons
                name={showItems ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {showItems ? (
              <Card variant="default" style={styles.itemsTableCard}>
                {items.map((it, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{it.name}</Text>
                      {it.quantity ? (
                        <Text style={styles.itemQty}>Qty: {it.quantity} {it.rate ? `• Rate: ₹${it.rate / 100}` : ''}</Text>
                      ) : null}
                    </View>
                    <AmountText
                      amount={it.amount || (it.rate ? (it.rate * (it.quantity || 1)) : 0)}
                      kind="neutral"
                      size="sm"
                    />
                  </View>
                ))}
              </Card>
            ) : null}
          </View>
        ) : null}

        {/* Save CTA */}
        <PrimaryButton
          title={isSubmitting ? 'Recording Transaction...' : 'Save to Ledger'}
          onPress={handleSaveTransaction}
          loading={isSubmitting}
          style={styles.saveBtn}
        />
      </ScrollView>

      {/* Inline New Party Modal */}
      <Modal
        visible={showNewPartyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewPartyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.newPartyModal}>
            <Text style={styles.newPartyTitle}>Create New Party</Text>
            <Text style={styles.newPartySub}>Add party to your ledger from extraction</Text>

            <Text style={styles.inputLabel}>Party Name *</Text>
            <TextInput
              style={styles.modalInput}
              value={newPartyName}
              onChangeText={setNewPartyName}
              placeholder="e.g. Rahul Sharma"
            />

            <Text style={styles.inputLabel}>Phone (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={newPartyPhone}
              onChangeText={setNewPartyPhone}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowNewPartyModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCreate}
                onPress={handleCreateNewParty}
                disabled={isCreatingParty}
              >
                <Text style={styles.modalCreateText}>
                  {isCreatingParty ? 'Creating...' : 'Create & Select'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  reviewBanner: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.creditLight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryGreen,
  },
  confidenceBadge: {
    backgroundColor: colors.surfaceNeutral,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  needsReviewAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warningLight,
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  needsReviewText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warningText,
    flex: 1,
  },
  reviewOkText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.debitSubtle,
    borderWidth: 1,
    borderColor: colors.debitBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 12,
    color: colors.debit,
    fontWeight: '600',
    flex: 1,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  req: {
    color: colors.debit,
  },
  reviewChip: {
    backgroundColor: colors.warningLight,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  reviewChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.warningText,
  },
  inputWarning: {
    borderColor: colors.warning,
    borderWidth: 1.5,
  },
  candidatesWrapper: {
    marginBottom: 8,
  },
  candidatesHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  candidatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  candidateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  candidateChipActive: {
    borderColor: colors.primaryGreen,
    backgroundColor: colors.creditSubtle,
  },
  candidateText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  candidateTextActive: {
    color: colors.primaryGreen,
    fontWeight: '700',
  },
  partyCard: {
    padding: 14,
    borderRadius: 14,
  },
  selectedPartyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.creditLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryGreen,
  },
  selectedPartyName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  selectedPartyPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  changePartyBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.surfaceNeutral,
  },
  changePartyText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryGreen,
  },
  partyPickerBox: {
    paddingVertical: 4,
  },
  pickerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  partyPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.surfaceNeutral,
    borderWidth: 1,
    borderColor: colors.border,
  },
  partyPillActive: {
    backgroundColor: colors.creditSubtle,
    borderColor: colors.primaryGreen,
  },
  partyPillText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  partyPillTextActive: {
    color: colors.primaryGreen,
    fontWeight: '700',
  },
  addNewPartyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.creditSubtle,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  addNewPartyText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryGreen,
  },
  kindSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  kindOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
  },
  kindOptionDrActive: {
    borderColor: colors.debit,
    backgroundColor: colors.debitSubtle,
  },
  kindOptionCrActive: {
    borderColor: colors.primaryGreen,
    backgroundColor: colors.creditSubtle,
  },
  kindTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  kindSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  rupeeSymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryGreen,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingVertical: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  itemsHeaderToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 6,
  },
  itemsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemsTableCard: {
    padding: 12,
    borderRadius: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemQty: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  saveBtn: {
    marginTop: 10,
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  newPartyModal: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  newPartyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  newPartySub: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: colors.creamBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surfaceNeutral,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalCreate: {
    flex: 2,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.primaryGreen,
    borderRadius: 10,
  },
  modalCreateText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textWhite,
  },
});
