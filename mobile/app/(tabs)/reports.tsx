import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, Card } from '../../src/components';
import { colors } from '../../src/theme/colors';

const REPORT_ITEMS = [
  {
    id: 'day-book',
    title: 'Day Book',
    description: 'Daily debit sales and credit collections',
    icon: 'calendar-outline',
    badge: 'Phase 5',
  },
  {
    id: 'outstanding',
    title: 'Outstanding Dues (Receivables)',
    description: 'Customers with unpaid balances & aging analysis',
    icon: 'hourglass-outline',
    badge: 'Phase 5',
  },
  {
    id: 'payables',
    title: 'Payables (Suppliers)',
    description: 'Pending payments owed to wholesale vendors',
    icon: 'business-outline',
    badge: 'Phase 5',
  },
  {
    id: 'collection',
    title: 'Collection & Recoveries',
    description: 'Cash and online UPI payments collected over time',
    icon: 'cash-outline',
    badge: 'Phase 5',
  },
  {
    id: 'weekly-monthly',
    title: 'Weekly & Monthly Trends',
    description: 'Visual charts, top debtors, and CSV export',
    icon: 'trending-up-outline',
    badge: 'Phase 7',
  },
];

export default function ReportsScreen() {
  return (
    <View style={styles.container}>
      <AppHeader
        title="Reports & Statements"
        subtitle="Business Analytics & Statements"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card variant="cream" style={styles.bannerCard}>
          <View style={styles.bannerRow}>
            <Ionicons name="sparkles" size={24} color={colors.goldFab} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Reports Coming in Phase 5</Text>
              <Text style={styles.bannerText}>
                Automated day book, customer aging buckets, and CSV exports will be activated once the backend report engine connects.
              </Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Available Statements</Text>

        {REPORT_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.reportRow}
            activeOpacity={0.7}
          >
            <View style={styles.iconCircle}>
              <Ionicons
                name={item.icon as any}
                size={22}
                color={colors.primaryGreen}
              />
            </View>

            <View style={styles.reportDetails}>
              <View style={styles.titleRow}>
                <Text style={styles.reportTitle}>{item.title}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              </View>
              <Text style={styles.reportDesc}>{item.description}</Text>
            </View>

            <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
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
  bannerCard: {
    padding: 16,
    marginBottom: 20,
    borderRadius: 16,
  },
  bannerRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.creditLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportDetails: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badge: {
    backgroundColor: colors.surfaceNeutral,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  reportDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
