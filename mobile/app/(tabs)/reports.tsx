import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader, Card, AmountText } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { dataService } from '../../src/services/dataService';
import { DashboardSummary, ReportType } from '../../src/types';
import { ReportDetailModal } from '../../src/features/reports/ReportDetailModal';

interface ReportMenuItem {
  id: ReportType;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: 'daily' | 'ledger' | 'trends';
  badge?: string;
}

const REPORT_MENU_ITEMS: ReportMenuItem[] = [
  {
    id: 'day-book',
    title: 'Day Book Statement',
    description: 'Itemized debit sales, credit receipts, and net daily cash flow',
    icon: 'calendar-outline',
    category: 'daily',
    badge: 'Daily',
  },
  {
    id: 'outstanding',
    title: 'Outstanding Dues (Receivables)',
    description: 'Customers with unpaid balances, aging analysis & overdue alerts',
    icon: 'hourglass-outline',
    category: 'ledger',
    badge: 'Receivables',
  },
  {
    id: 'payables',
    title: 'Wholesale Payables',
    description: 'Pending payments owed to suppliers and wholesale vendors',
    icon: 'business-outline',
    category: 'ledger',
    badge: 'Payables',
  },
  {
    id: 'collection',
    title: 'Collection & Recoveries',
    description: 'Payment recovery trend chart and 14-day collection logs',
    icon: 'cash-outline',
    category: 'daily',
    badge: 'Charts',
  },
  {
    id: 'weekly',
    title: 'Weekly Performance Summary',
    description: 'Sales vs collections bar chart, growth % & top 5 debtors',
    icon: 'trending-up-outline',
    category: 'trends',
    badge: 'Weekly',
  },
  {
    id: 'monthly',
    title: 'Monthly Overview & MoM Trends',
    description: 'Month-to-date business trajectory and debtor analysis',
    icon: 'stats-chart-outline',
    category: 'trends',
    badge: 'Monthly',
  },
];

export default function ReportsScreen() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);

  const loadSummary = async () => {
    try {
      const data = await dataService.getDashboardSummary();
      setSummary(data);
    } catch {
      // Ignored
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    dataService.getDashboardSummary().then((res) => {
      if (isMounted) setSummary(res);
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSummary();
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Reports & Analytics"
        subtitle="Audited Statements & Financial Insights"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primaryGreen]}
            tintColor={colors.primaryGreen}
          />
        }
      >
        {/* Quick Snapshot Card */}
        <Card variant="default" style={styles.snapshotCard}>
          <Text style={styles.snapshotTitle}>Business Position Snapshot</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCol}>
              <Text style={styles.kpiLabel}>Total Receivables</Text>
              <AmountText
                amount={summary?.total_receivable || 0}
                kind="DR"
                size="md"
              />
            </View>

            <View style={styles.kpiDivider} />

            <View style={styles.kpiCol}>
              <Text style={styles.kpiLabel}>Total Payables</Text>
              <AmountText
                amount={summary?.total_payable || 0}
                kind="CR"
                size="md"
              />
            </View>
          </View>
        </Card>

        {/* Statements Section */}
        <Text style={styles.sectionTitle}>Financial Statements & Exports</Text>

        <View style={styles.reportList}>
          {REPORT_MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.reportRow}
              activeOpacity={0.7}
              onPress={() => setActiveReport(item.id)}
            >
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon} size={22} color={colors.primaryGreen} />
              </View>

              <View style={styles.reportDetails}>
                <View style={styles.titleRow}>
                  <Text style={styles.reportTitle}>{item.title}</Text>
                  {item.badge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.reportDesc}>{item.description}</Text>
              </View>

              <View style={styles.arrowBox}>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Report Detail Modal */}
      <ReportDetailModal
        visible={activeReport !== null}
        reportType={activeReport}
        onClose={() => setActiveReport(null)}
        onSelectParty={(partyId) => {
          setActiveReport(null);
          router.push(`/party/${partyId}` as any);
        }}
      />
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
  snapshotCard: {
    padding: 16,
    borderRadius: 18,
    marginBottom: 20,
  },
  snapshotTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kpiCol: {
    flex: 1,
  },
  kpiDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.borderLight,
    marginHorizontal: 16,
  },
  kpiLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  reportList: {
    gap: 10,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    elevation: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.creditLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  reportDetails: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  reportTitle: {
    fontSize: 15,
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
    color: colors.primaryGreen,
  },
  reportDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  arrowBox: {
    padding: 4,
  },
});
