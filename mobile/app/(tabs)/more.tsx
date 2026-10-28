import React, { useCallback, useEffect, useState } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, Card } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { mockDataService } from '../../src/services/mockDataService';
import {
  DEFAULT_SHOP_PROFILE,
  loadShopProfile,
  saveShopProfile,
  ShopProfile,
} from '../../src/services/shopProfile';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface ToolRowProps {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const ToolRow: React.FC<ToolRowProps> = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.toolRow} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.toolIcon}>
      <Ionicons name={icon} size={20} color={colors.primaryGreen} />
    </View>
    <View style={styles.toolText}>
      <Text style={styles.toolTitle}>{title}</Text>
      <Text style={styles.toolSubtitle}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
  </TouchableOpacity>
);

export default function MoreScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ShopProfile>(DEFAULT_SHOP_PROFILE);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ShopProfile>(DEFAULT_SHOP_PROFILE);
  const [saving, setSaving] = useState(false);

  // Only offered while developing against the built-in sample data.
  const canResetSampleData = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

  useEffect(() => {
    let mounted = true;
    loadShopProfile().then((p) => {
      if (mounted) setProfile(p);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const openEditor = useCallback(() => {
    setDraft(profile);
    setEditing(true);
  }, [profile]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const saved = await saveShopProfile(draft);
      setProfile(saved);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [draft]);

  const resetSampleData = useCallback(() => {
    const run = async () => {
      await mockDataService.resetToSeedData?.();
      if (Platform.OS === 'web') {
        alert('Sample data restored.');
      } else {
        Alert.alert('Done', 'Sample data restored.');
      }
    };
    if (Platform.OS === 'web') {
      if (confirm('Restore the original sample data?')) run();
    } else {
      Alert.alert('Reset sample data', 'Restore the original sample data?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: run },
      ]);
    }
  }, []);

  const hasDetails = profile.name !== DEFAULT_SHOP_PROFILE.name || !!profile.address || !!profile.phone;

  return (
    <View style={styles.container}>
      <AppHeader title="More" subtitle="Your shop and tools" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Shop profile */}
        <Card variant="default" style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.shopIcon}>
              <Ionicons name="storefront" size={26} color={colors.primaryGreen} />
            </View>
            <View style={styles.profileText}>
              <Text style={styles.shopName} numberOfLines={1}>
                {profile.name}
              </Text>
              {profile.address ? (
                <Text style={styles.shopMeta} numberOfLines={2}>
                  {profile.address}
                </Text>
              ) : null}
              {profile.phone ? <Text style={styles.shopMeta}>{profile.phone}</Text> : null}
            </View>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={openEditor}
              accessibilityRole="button"
              accessibilityLabel="Edit shop profile"
            >
              <Ionicons name="create-outline" size={16} color={colors.primaryGreen} />
              <Text style={styles.editBtnText}>{hasDetails ? 'Edit' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.profileHint}>
            {hasDetails
              ? 'These details appear at the top of every customer statement.'
              : 'Add your shop name, address and phone so they appear on customer statements.'}
          </Text>
        </Card>

        {/* Tools */}
        <Text style={styles.sectionLabel}>Tools</Text>
        <Card variant="default" style={styles.toolsCard}>
          <ToolRow
            icon="sparkles"
            title="KhataAI"
            subtitle="Ask about dues, sales and customers"
            onPress={() => router.push('/assistant')}
          />
          <View style={styles.rowDivider} />
          <ToolRow
            icon="notifications-outline"
            title="Alerts"
            subtitle="Overdue payments and unusual entries"
            onPress={() => router.push('/alerts')}
          />
        </Card>

        {canResetSampleData ? (
          <TouchableOpacity style={styles.devLink} onPress={resetSampleData}>
            <Text style={styles.devLinkText}>Reset sample data (development only)</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {/* Edit profile */}
      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Shop details</Text>
              <TouchableOpacity onPress={() => setEditing(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Shop name</Text>
            <TextInput
              style={styles.input}
              value={draft.name}
              onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
              placeholder="e.g. Sharma General Store"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={draft.address}
              onChangeText={(address) => setDraft((d) => ({ ...d, address }))}
              placeholder="Street, area, city"
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={draft.phone}
              onChangeText={(phone) => setDraft((d) => ({ ...d, phone }))}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={save}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 120, width: '100%', maxWidth: 640, alignSelf: 'center' },

  profileCard: { padding: 16 },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shopIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.successSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { flex: 1 },
  shopName: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  shopMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.successSubtle,
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: colors.primaryGreen },
  profileHint: { marginTop: 12, fontSize: 12, color: colors.textMuted, lineHeight: 17 },

  sectionLabel: {
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  toolsCard: { padding: 0, overflow: 'hidden' },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  toolIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.successSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolText: { flex: 1 },
  toolTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  toolSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: colors.divider, marginLeft: 66 },

  devLink: { alignSelf: 'center', marginTop: 28, padding: 8 },
  devLinkText: { fontSize: 12, color: colors.textMuted, textDecorationLine: 'underline' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  fieldLabel: { marginTop: 14, marginBottom: 6, fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
  saveBtn: {
    marginTop: 22,
    backgroundColor: colors.primaryGreen,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: colors.textWhite, fontSize: 15, fontWeight: '700' },
});
