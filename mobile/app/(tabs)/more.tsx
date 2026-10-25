import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, Card, PrimaryButton } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { mockDataService } from '../../src/services/mockDataService';

export default function MoreScreen() {
  const [resetting, setResetting] = useState(false);

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
              <Text style={styles.shopName}>Gupta Kirana Store</Text>
              <Text style={styles.shopDetails}>Demo Merchant • Sector 14, Gurugram</Text>
              <View style={styles.demoTag}>
                <Text style={styles.demoTagText}>PROTOTYPE v0.1</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Feature Roadmap Items */}
        <Text style={styles.sectionTitle}>Advanced Modules</Text>

        <View style={styles.menuGroup}>
          <View style={styles.menuItem}>
            <View style={styles.menuIconCircle}>
              <Ionicons name="chatbubbles" size={20} color={colors.primaryGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>KhataAI Copilot</Text>
              <Text style={styles.menuSub}>Voice & Hindi query assistant</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Phase 6</Text>
            </View>
          </View>

          <View style={styles.menuItem}>
            <View style={styles.menuIconCircle}>
              <Ionicons name="notifications" size={20} color={colors.goldFab} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Overdue & Risk Alerts</Text>
              <Text style={styles.menuSub}>Automated payment reminders</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Phase 8</Text>
            </View>
          </View>

          <View style={styles.menuItem}>
            <View style={styles.menuIconCircle}>
              <Ionicons name="cloud-upload" size={20} color={colors.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Live Supabase Sync</Text>
              <Text style={styles.menuSub}>Flask REST API backend</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Phase 4</Text>
            </View>
          </View>
        </View>

        {/* Demo Management */}
        <Text style={styles.sectionTitle}>Mentor Demo Tools</Text>
        <Card variant="cream" style={styles.demoCard}>
          <Text style={styles.demoTitle}>Need to restart the demo scenario?</Text>
          <Text style={styles.demoDesc}>
            This restores the original 6 parties and 20 ledger transactions into AsyncStorage.
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
    marginBottom: 20,
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
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  shopDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  demoTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  demoTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
    marginTop: 8,
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
    backgroundColor: '#F1F5F9',
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
    backgroundColor: '#F8FAFC',
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
});
