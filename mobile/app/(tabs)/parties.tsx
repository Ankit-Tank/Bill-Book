import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, AmountText, PrimaryButton, EmptyState } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { dataService } from '../../src/services/dataService';
import { Party, PartyType, CreatePartyInput } from '../../src/types';
import { parseINRToPaise } from '../../src/utils/format';

export default function PartiesScreen() {
  const router = useRouter();
  const [parties, setParties] = useState<Party[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | PartyType>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Party Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partyType, setPartyType] = useState<PartyType>('customer');
  const [openingBalance, setOpeningBalance] = useState('');
  const [dueDays, setDueDays] = useState('30');
  const [submitting, setSubmitting] = useState(false);

  const fetchPartiesList = useCallback(async () => {
    try {
      const data = await dataService.listParties({
        search: search.trim() || undefined,
        type: selectedType === 'all' ? undefined : selectedType,
      });
      setParties(data);
    } catch (err) {
      console.error('Failed to load parties:', err);
    }
  }, [search, selectedType]);

  useEffect(() => {
    let isMounted = true;
    dataService
      .listParties({
        search: search.trim() || undefined,
        type: selectedType === 'all' ? undefined : selectedType,
      })
      .then((data) => {
        if (isMounted) {
          setParties(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load parties:', err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [search, selectedType]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPartiesList();
    setRefreshing(false);
  };

  const handleCreateParty = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter party name.');
      return;
    }

    setSubmitting(true);
    try {
      const input: CreatePartyInput = {
        name: name.trim(),
        phone: phone.trim() || null,
        type: partyType,
        opening_balance: openingBalance ? parseINRToPaise(openingBalance) : 0,
        due_days: parseInt(dueDays, 10) || 30,
      };

      const newParty = await dataService.createParty(input);
      setModalVisible(false);
      setName('');
      setPhone('');
      setOpeningBalance('');
      setDueDays('30');
      await fetchPartiesList();
      // Navigate to the newly created party detail
      router.push(`/party/${newParty.id}` as any);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not create party.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPartyItem = ({ item }: { item: Party }) => {
    const isReceivable = item.balance > 0;
    const isPayable = item.balance < 0;
    const isSettled = item.balance === 0;

    // Initials for avatar
    const initials = item.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    return (
      <TouchableOpacity
        style={styles.partyItem}
        activeOpacity={0.7}
        onPress={() => router.push(`/party/${item.id}` as any)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.partyInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.partyName} numberOfLines={1}>
              {item.name}
            </Text>
            <View
              style={[
                styles.typeTag,
                { backgroundColor: item.type === 'customer' ? '#E0F2FE' : '#FEF3C7' },
              ]}
            >
              <Text
                style={[
                  styles.typeTagText,
                  { color: item.type === 'customer' ? '#0369A1' : '#B45309' },
                ]}
              >
                {item.type}
              </Text>
            </View>
          </View>

          <Text style={styles.partyPhone}>
            {item.phone || 'No phone number'}
          </Text>
        </View>

        <View style={styles.balanceCol}>
          <AmountText
            amount={Math.abs(item.balance)}
            kind={isReceivable ? 'DR' : isPayable ? 'CR' : 'neutral'}
            size="md"
          />
          <Text
            style={[
              styles.balanceStatus,
              isReceivable && { color: colors.debit },
              isPayable && { color: colors.credit },
              isSettled && { color: colors.textMuted },
            ]}
          >
            {isReceivable ? 'You will get (DR)' : isPayable ? 'You will give (CR)' : 'Settled'}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.arrow} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Parties"
        subtitle={`${parties.length} contacts in Khata`}
        rightAction={{
          icon: 'person-add',
          onPress: () => setModalVisible(true),
          accessibilityLabel: 'Add Party',
        }}
      />

      {/* Search & Filter Bar */}
      <View style={styles.filterSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search party by name or phone..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Chips */}
        <View style={styles.chipsRow}>
          {(['all', 'customer', 'supplier'] as const).map((chip) => (
            <TouchableOpacity
              key={chip}
              style={[
                styles.chip,
                selectedType === chip && styles.chipActive,
              ]}
              onPress={() => setSelectedType(chip)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedType === chip && styles.chipTextActive,
                ]}
              >
                {chip === 'all' ? 'All Parties' : chip === 'customer' ? 'Customers' : 'Suppliers'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Parties List */}
      {loading && !parties.length ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primaryGreen} />
          <Text style={styles.loadingText}>Loading parties...</Text>
        </View>
      ) : (
        <FlatList
          data={parties}
          keyExtractor={(item) => item.id}
          renderItem={renderPartyItem}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No parties found"
              description={
                search
                  ? `No results for "${search}". Try another name or phone number.`
                  : 'Add your first customer or supplier to start recording credit transactions.'
              }
              actionTitle="+ Add New Party"
              onActionPress={() => setModalVisible(true)}
            />
          }
        />
      )}

      {/* Floating Add Party Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="person-add" size={20} color={colors.textWhite} style={{ marginRight: 6 }} />
        <Text style={styles.fabText}>Add Party</Text>
      </TouchableOpacity>

      {/* Add Party Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Party</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Party Type Selector */}
            <Text style={styles.inputLabel}>Party Type</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  partyType === 'customer' && styles.typeOptionActive,
                ]}
                onPress={() => setPartyType('customer')}
              >
                <Ionicons
                  name="person"
                  size={16}
                  color={partyType === 'customer' ? colors.primaryGreen : colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeOptionText,
                    partyType === 'customer' && styles.typeOptionTextActive,
                  ]}
                >
                  Customer (Buyer)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeOption,
                  partyType === 'supplier' && styles.typeOptionActive,
                ]}
                onPress={() => setPartyType('supplier')}
              >
                <Ionicons
                  name="storefront"
                  size={16}
                  color={partyType === 'supplier' ? colors.primaryGreen : colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeOptionText,
                    partyType === 'supplier' && styles.typeOptionTextActive,
                  ]}
                >
                  Supplier (Vendor)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Name Input */}
            <Text style={styles.inputLabel}>Party Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
            />

            {/* Phone Input */}
            <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            {/* Opening Balance */}
            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Opening Balance (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  value={openingBalance}
                  onChangeText={setOpeningBalance}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Due Term (Days)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="30"
                  placeholderTextColor={colors.textMuted}
                  value={dueDays}
                  onChangeText={setDueDays}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Buttons */}
            <PrimaryButton
              title="Save Party"
              onPress={handleCreateParty}
              loading={submitting}
              variant="primary"
              size="lg"
              style={styles.modalSubmitBtn}
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
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.creamBackground,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipActive: {
    backgroundColor: colors.primaryGreen,
    borderColor: colors.primaryGreen,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textWhite,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  partyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryGreen,
  },
  partyInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  partyName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  typeTag: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  partyPhone: {
    fontSize: 12,
    color: colors.textMuted,
  },
  balanceCol: {
    alignItems: 'flex-end',
    marginRight: 6,
  },
  balanceStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  arrow: {
    marginLeft: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: colors.primaryGreen,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 26,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  fabText: {
    color: colors.textWhite,
    fontWeight: '700',
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.creamBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeOptionActive: {
    borderColor: colors.primaryGreen,
    backgroundColor: '#E8F5E9',
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeOptionTextActive: {
    color: colors.primaryGreen,
    fontWeight: '700',
  },
  modalSubmitBtn: {
    marginTop: 20,
  },
});
