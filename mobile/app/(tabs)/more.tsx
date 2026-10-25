import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, Card, PrimaryButton } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { mockDataService } from '../../src/services/mockDataService';
import { apiClient } from '../../src/services/apiClient';

export default function MoreScreen() {
  const [resetting, setResetting] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const isLiveApi = process.env.EXPO_PUBLIC_USE_MOCK === 'false';

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
              <Text style={styles.shopName}>Gupta Kirana Store</Text>
              <Text style={styles.shopDetails}>Demo Merchant • Sector 14, Gurugram</Text>
              <View style={styles.demoTag}>
                <Text style={styles.demoTagText}>
                  {isLiveApi ? 'PHASE 4: LIVE SUPABASE API' : 'OFFLINE MOCK MODE'}
                </Text>
              </View>
            </View>
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
              <Ionicons name="cloud-done" size={20} color={colors.credit} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Live Supabase Sync</Text>
              <Text style={styles.menuSub}>Active on branch phase-4/live-data-ledger</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.creditLight }]}>
              <Text style={[styles.badgeText, { color: colors.credit }]}>Ready</Text>
            </View>
          </View>
        </View>

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
