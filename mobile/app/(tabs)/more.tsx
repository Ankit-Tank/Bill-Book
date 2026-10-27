import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, Card, PrimaryButton } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { mockDataService } from '../../src/services/mockDataService';
import { apiClient } from '../../src/services/apiClient';

const SHOP_PROFILE_KEY = '@billbook_shop_profile';

export default function MoreScreen() {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Shop Profile state
  const [shopName, setShopName] = useState('Gupta Kirana Store');
  const [shopAddress, setShopAddress] = useState('Sector 14, Gurugram, Haryana');
  const [shopPhone, setShopPhone] = useState('+91 98765 43210');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [inputName, setInputName] = useState('');
  const [inputAddress, setInputAddress] = useState('');
  const [inputPhone, setInputPhone] = useState('');

  const isLiveApi = process.env.EXPO_PUBLIC_USE_MOCK === 'false';

  // Load shop profile from storage
  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(SHOP_PROFILE_KEY)
      .then((saved) => {
        if (saved && isMounted) {
          try {
            const data = JSON.parse(saved);
            if (data.name) setShopName(data.name);
            if (data.address) setShopAddress(data.address);
            if (data.phone) setShopPhone(data.phone);
          } catch {
            // Ignored
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const openEditProfile = () => {
    setInputName(shopName);
    setInputAddress(shopAddress);
    setInputPhone(shopPhone);
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    const trimmedName = inputName.trim() || 'Gupta Kirana Store';
    const trimmedAddr = inputAddress.trim() || 'Sector 14, Gurugram, Haryana';
    const trimmedPhone = inputPhone.trim() || '+91 98765 43210';

    setShopName(trimmedName);
    setShopAddress(trimmedAddr);
    setShopPhone(trimmedPhone);
    setEditModalVisible(false);

    try {
      await AsyncStorage.setItem(
        SHOP_PROFILE_KEY,
        JSON.stringify({
          name: trimmedName,
          address: trimmedAddr,
          phone: trimmedPhone,
        })
      );
    } catch {
      // Ignored
    }
  };

  const handleTestHealth = async () => {
    setCheckingHealth(true);
    try {
      const res = await apiClient.get<any>('/health');
      Alert.alert(
        'Backend Healthy (200 OK)',
        `Server Status: ${res.status}\nAPI Version: ${res.version}\nTimestamp: ${res.timestamp}\nConnected to Supabase PostgreSQL.`
      );
    } catch (err: any) {
      Alert.alert(
        'Backend Health Failed',
        `Could not reach API:\n${err?.message || 'Connection error'}`
      );
    } finally {
      setCheckingHealth(false);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset Demo Data',
      'Reset all parties and transactions back to the initial demo seed data (6 parties, 20 transactions)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Data',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              await mockDataService.resetToSeedData();
              Alert.alert('Success', 'Seed data reset successfully! Return to Dashboard to see changes.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not reset data.');
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="More"
        subtitle="Shop Profile & Settings"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Shop Profile Card */}
        <Card variant="default" style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Ionicons name="storefront" size={26} color={colors.primaryGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.shopName}>{shopName}</Text>
                <TouchableOpacity onPress={openEditProfile} style={styles.editBtn}>
                  <Ionicons name="pencil" size={14} color={colors.primaryGreen} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.shopDetails}>{shopAddress}</Text>
              <Text style={styles.shopPhone}>{shopPhone}</Text>
              <View style={styles.demoTag}>
                <Text style={styles.demoTagText}>
                  {isLiveApi ? 'PHASE 4: LIVE SUPABASE API' : 'OFFLINE MOCK MODE'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.profileFooter}>
            <Ionicons name="document-text-outline" size={13} color={colors.textMuted} />
            <Text style={styles.profileFooterText}>
              Printed on exported ledger statements and customer receipts
            </Text>
          </View>
        </Card>

        {/* Backend Connection Card */}
        <Text style={styles.sectionTitle}>Cloud Backend & Database</Text>
        <Card variant="default" style={styles.connectionCard}>
          <View style={styles.connectionHeader}>
            <View style={styles.connStatusDot} />
            <Text style={styles.connTitle}>Flask REST API + Supabase Postgres</Text>
          </View>
          <Text style={styles.connUrl}>
            {process.env.EXPO_PUBLIC_API_URL || 'https://powerful-giving-labeled-advances.trycloudflare.com/api/v1'}
          </Text>
          <PrimaryButton
            title="Check API Health (/health)"
            onPress={handleTestHealth}
            loading={checkingHealth}
            variant="outline"
            size="sm"
            style={{ marginTop: 10 }}
          />
        </Card>

        {/* Feature Roadmap Items */}
        <Text style={styles.sectionTitle}>Advanced Modules</Text>

        <View style={styles.menuGroup}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/assistant')}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="chatbubbles" size={20} color={colors.primaryGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>KhataAI Copilot</Text>
              <Text style={styles.menuSub}>Voice & Hindi query assistant</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.badgeText, { color: colors.primaryGreen }]}>Open</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/alerts')}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconCircle}>
              <Ionicons name="notifications" size={20} color={colors.goldFab} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Overdue & Risk Alerts</Text>
              <Text style={styles.menuSub}>Payment reminders & risk radar</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.badgeText, { color: '#D97706' }]}>Open</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <View style={styles.menuIconCircle}>
              <Ionicons name="cloud-done" size={20} color={colors.credit} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Live Supabase Sync</Text>
              <Text style={styles.menuSub}>Connected to PostgreSQL party_balances view</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.creditLight }]}>
              <Text style={[styles.badgeText, { color: colors.credit }]}>Ready</Text>
            </View>
          </View>
        </View>

        {/* About BillBook Section */}
        <Text style={styles.sectionTitle}>About BillBook</Text>
        <Card variant="default" style={styles.aboutCard}>
          <View style={styles.aboutHeader}>
            <View style={styles.aboutLogo}>
              <Ionicons name="book" size={24} color={colors.primaryGreen} />
            </View>
            <View>
              <Text style={styles.aboutAppName}>BillBook</Text>
              <Text style={styles.aboutVersion}>Version 1.0.0 (Release Candidate)</Text>
            </View>
          </View>

          <Text style={styles.aboutDesc}>
            Smart digital Khata and credit ledger app designed for local Indian merchants.
            Replaces physical paper bahi-khatas with AI multimodal bill extraction, voice
            transaction recording, conversational ledger queries, automated credit risk scoring,
            and proactive payment overdue alerts.
          </Text>

          <View style={styles.divider} />

          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Architecture</Text>
            <Text style={styles.aboutValue}>Expo React Native + Flask + Supabase + Gemini</Text>
          </View>

          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Money Rules</Text>
            <Text style={styles.aboutValue}>Strict Integer Paise (Zero Float Drift)</Text>
          </View>

          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Team</Text>
            <Text style={styles.aboutValue}>Team Thunderbytes (Avnish, Krishna, Ankit)</Text>
          </View>

          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>License</Text>
            <Text style={styles.aboutValue}>MIT License</Text>
          </View>
        </Card>

        {/* Demo Management */}
        <Text style={styles.sectionTitle}>Mentor Demo Tools</Text>
        <Card variant="cream" style={styles.demoCard}>
          <Text style={styles.demoTitle}>Need to reset offline mock data?</Text>
          <Text style={styles.demoDesc}>
            Restores the original 6 parties and 20 ledger transactions in AsyncStorage.
          </Text>
          <PrimaryButton
            title="Reset to Initial Seed Data"
            onPress={handleResetData}
            loading={resetting}
            variant="outline"
            size="sm"
            style={{ marginTop: 12 }}
          />
        </Card>
      </ScrollView>

      {/* Edit Shop Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setEditModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Shop Profile</Text>
                  <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>Shop Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={inputName}
                  onChangeText={setInputName}
                  placeholder="e.g. Gupta Kirana Store"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.fieldLabel}>Shop Address</Text>
                <TextInput
                  style={styles.modalInput}
                  value={inputAddress}
                  onChangeText={setInputAddress}
                  placeholder="e.g. Sector 14, Gurugram"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.fieldLabel}>Contact Phone / GSTIN</Text>
                <TextInput
                  style={styles.modalInput}
                  value={inputPhone}
                  onChangeText={setInputPhone}
                  placeholder="e.g. +91 98765 43210"
                  placeholderTextColor={colors.textMuted}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSaveProfile}
                  >
                    <Text style={styles.saveBtnText}>Save Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
  profileCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.creditLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.creditLight,
    borderRadius: 6,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryGreen,
  },
  shopDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  shopPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  demoTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.creditLight,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  demoTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primaryGreen,
  },
  profileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  profileFooterText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
    marginTop: 8,
  },
  connectionCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  connStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.credit,
  },
  connTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  connUrl: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginVertical: 4,
  },
  menuGroup: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 12,
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceNeutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  menuSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  badge: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  aboutCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  aboutLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.creditLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutAppName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryGreen,
  },
  aboutVersion: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  aboutDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 12,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  aboutLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  aboutValue: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  demoCard: {
    padding: 16,
    borderRadius: 16,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  demoDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceNeutral,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primaryGreen,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.surface,
  },
});
