import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';
import { colors } from '../../theme/colors';
import { AmountText, ErrorBanner } from '../../components';
import { dataService } from '../../services/dataService';
import {
  ReportType,
  DayBookReport,
  OutstandingReport,
  PayablesReport,
  CollectionReport,
  WeeklyReport,
  MonthlyReport,
} from '../../types';
import { exportAndShareCSV } from './csvExport';
import { AiInsightCard } from '../assistant';

const { width: screenWidth } = Dimensions.get('window');

export interface ReportDetailModalProps {
  visible: boolean;
  reportType: ReportType | null;
  onClose: () => void;
  onSelectParty?: (partyId: string) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  visible,
  reportType,
  onClose,
  onSelectParty,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Filters
  const todayStr = new Date().toISOString().slice(0, 10);
  const [dayBookDate, setDayBookDate] = useState<string>(todayStr);

  const fetchReport = useCallback(async () => {
    if (!reportType) return;
    setIsLoading(true);
    setError(null);
    setExportNotice(null);
    setReportData(null);

    try {
      let data: any = null;
      if (reportType === 'day-book') {
        data = await dataService.getReport({ type: 'day-book', date: dayBookDate });
      } else if (reportType === 'outstanding') {
        data = await dataService.getReport({ type: 'outstanding' });
      } else if (reportType === 'payables') {
        data = await dataService.getReport({ type: 'payables' });
      } else if (reportType === 'collection') {
        data = await dataService.getReport({ type: 'collection' });
      } else if (reportType === 'weekly') {
        data = await dataService.getReport({ type: 'weekly' });
      } else if (reportType === 'monthly') {
        data = await dataService.getReport({ type: 'monthly' });
      }
      setReportData(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate report statement.');
    } finally {
      setIsLoading(false);
    }
  }, [reportType, dayBookDate]);

  useEffect(() => {
    let isCancelled = false;
    if (visible && reportType) {
      const timer = setTimeout(() => {
        if (isCancelled) return;
        setIsLoading(true);
        setError(null);
        setReportData(null);
        dataService
          .getReport({
            type: reportType,
            format: 'json',
            date: reportType === 'day-book' ? dayBookDate : undefined,
          })
          .then((data) => {
            if (!isCancelled) {
              setReportData(data);
              setIsLoading(false);
            }
          })
          .catch((err: any) => {
            if (!isCancelled) {
              setError(err?.message || 'Failed to generate report statement.');
              setIsLoading(false);
            }
          });
      }, 0);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
      };
    }
  }, [visible, reportType, dayBookDate]);

  const handleExportCSV = async () => {
    if (!reportType) return;
    setIsExporting(true);
    setExportNotice(null);

    try {
      const csvContent = await dataService.getReport({
        type: reportType,
        format: 'csv',
        date: reportType === 'day-book' ? dayBookDate : undefined,
      });

      if (typeof csvContent === 'string') {
        const exportedName = await exportAndShareCSV(csvContent, reportType);
        setExportNotice(`Exported ${exportedName}`);
      } else {
        setExportNotice('CSV generated successfully.');
      }
    } catch (err: any) {
      Alert.alert('Export Failed', err?.message || 'Could not export CSV file.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!visible || !reportType) return null;

  const getReportTitle = () => {
    switch (reportType) {
      case 'day-book':
        return 'Day Book Statement';
      case 'outstanding':
        return 'Outstanding Receivables';
      case 'payables':
        return 'Wholesale Payables';
      case 'collection':
        return 'Collection & Recoveries';
      case 'weekly':
        return 'Weekly Business Summary';
      case 'monthly':
        return 'Monthly Trend Analysis';
      default:
        return 'Report Statement';
    }
  };

  const getReportSubtitle = () => {
    switch (reportType) {
      case 'day-book':
        return `Transactions on ${dayBookDate}`;
      case 'outstanding':
        return 'Customers who currently owe you money';
      case 'payables':
        return 'Pending liabilities owed to wholesale vendors';
      case 'collection':
        return 'Cash and online recoveries over the last 14 days';
      case 'weekly':
        return '7-day sales, collections & net balance trajectory';
      case 'monthly':
        return 'Month-over-month business growth comparison';
      default:
        return '';
    }
  };

  const chartWidth = Math.min(screenWidth - 72, 500);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{getReportTitle()}</Text>
              <Text style={styles.headerSubtitle}>{getReportSubtitle()}</Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.exportBtn}
                onPress={handleExportCSV}
                disabled={isExporting || isLoading}
                activeOpacity={0.7}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color={colors.primaryGreen} />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={16} color={colors.primaryGreen} style={{ marginRight: 4 }} />
                    <Text style={styles.exportBtnText}>CSV</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {exportNotice ? (
            <View style={styles.exportNoticeBanner}>
              <Ionicons name="checkmark-circle" size={16} color={colors.credit} />
              <Text style={styles.exportNoticeText}>{exportNotice}</Text>
            </View>
          ) : null}

          {/* Body Content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primaryGreen} />
              <Text style={styles.loadingText}>Generating statement...</Text>
            </View>
          ) : error ? (
            <View style={{ padding: 16 }}>
              <ErrorBanner message={error} onRetry={fetchReport} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* AI Insight Card (narrates report metrics; fails quietly) */}
              {reportData && (
                <AiInsightCard
                  reportType={reportType}
                  title="KhataAI Report Summary"
                  data={reportData as Record<string, unknown>}
                />
              )}

              {/* Day Book Report */}
              {reportType === 'day-book' && reportData && 'transactions' in reportData ? (
                <RenderDayBook
                  data={reportData as DayBookReport}
                  selectedDate={dayBookDate}
                  onDateChange={(d) => setDayBookDate(d)}
                />
              ) : null}

              {/* Outstanding Report */}
              {reportType === 'outstanding' && reportData && 'total_outstanding' in reportData ? (
                <RenderOutstanding
                  data={reportData as OutstandingReport}
                  onSelectParty={onSelectParty}
                  onClose={onClose}
                />
              ) : null}

              {/* Payables Report */}
              {reportType === 'payables' && reportData && 'total_payable' in reportData ? (
                <RenderPayables
                  data={reportData as PayablesReport}
                  onSelectParty={onSelectParty}
                  onClose={onClose}
                />
              ) : null}

              {/* Collection Report */}
              {reportType === 'collection' && reportData && 'daily_breakdown' in reportData ? (
                <RenderCollection
                  data={reportData as CollectionReport}
                  chartWidth={chartWidth}
                />
              ) : null}

              {/* Weekly Report */}
              {reportType === 'weekly' && reportData && 'week_start' in reportData ? (
                <RenderWeekly
                  data={reportData as WeeklyReport}
                  chartWidth={chartWidth}
                  onSelectParty={onSelectParty}
                  onClose={onClose}
                />
              ) : null}

              {/* Monthly Report */}
              {reportType === 'monthly' && reportData && 'month' in reportData ? (
                <RenderMonthly
                  data={reportData as MonthlyReport}
                  chartWidth={chartWidth}
                  onSelectParty={onSelectParty}
                  onClose={onClose}
                />
              ) : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

// 1. Day Book View
const RenderDayBook: React.FC<{
  data: DayBookReport;
  selectedDate: string;
  onDateChange: (date: string) => void;
}> = ({ data, selectedDate, onDateChange }) => {
  const [dates] = useState(() => {
    const now = new Date();
    return {
      today: now.toISOString().slice(0, 10),
      yesterday: new Date(now.getTime() - 86400000).toISOString().slice(0, 10),
    };
  });
  const { today, yesterday } = dates;

  return (
    <View>
      {/* Date Filter Chips */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, selectedDate === today && styles.filterChipActive]}
          onPress={() => onDateChange(today)}
        >
          <Text style={[styles.filterChipText, selectedDate === today && styles.filterChipTextActive]}>
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedDate === yesterday && styles.filterChipActive]}
          onPress={() => onDateChange(yesterday)}
        >
          <Text style={[styles.filterChipText, selectedDate === yesterday && styles.filterChipTextActive]}>
            Yesterday
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary KPI Cards */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { borderColor: colors.debitBorder }]}>
          <Text style={styles.kpiLabel}>Total Debit (Sales)</Text>
          <AmountText amount={data.total_dr} kind="DR" size="md" />
        </View>

        <View style={[styles.kpiCard, { borderColor: colors.borderLight }]}>
          <Text style={styles.kpiLabel}>Total Credit (Receipts)</Text>
          <AmountText amount={data.total_cr} kind="CR" size="md" />
        </View>
      </View>

      <View style={styles.netCard}>
        <Text style={styles.netLabel}>Net Daily Change</Text>
        <AmountText
          amount={Math.abs(data.net_change)}
          kind={data.net_change >= 0 ? 'DR' : 'CR'}
          size="lg"
        />
        <Text style={styles.netSub}>
          {data.net_change >= 0 ? '(Receivables increased today)' : '(Recovered more than sales)'}
        </Text>
      </View>

      {/* Entries List */}
      <Text style={styles.sectionHeading}>Daily Entries ({data.entries.length})</Text>
      {data.entries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No transactions recorded on this date.</Text>
        </View>
      ) : (
        <View style={styles.table}>
          {data.entries.map((entry) => (
            <View key={entry.transaction_id} style={styles.entryRow}>
              <View
                style={[
                  styles.entryBadge,
                  { backgroundColor: entry.kind === 'DR' ? colors.debitLight : colors.creditLight },
                ]}
              >
                <Text
                  style={[
                    styles.entryBadgeText,
                    { color: entry.kind === 'DR' ? colors.debit : colors.credit },
                  ]}
                >
                  {entry.kind}
                </Text>
              </View>

              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <Text style={styles.entryParty}>{entry.party_name}</Text>
                <Text style={styles.entryParticulars} numberOfLines={1}>
                  {entry.particulars || 'No particulars'}
                </Text>
              </View>

              <AmountText
                amount={entry.amount}
                kind={entry.kind}
                size="sm"
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// 2. Outstanding Report View
const RenderOutstanding: React.FC<{
  data: OutstandingReport;
  onSelectParty?: (partyId: string) => void;
  onClose: () => void;
}> = ({ data, onSelectParty, onClose }) => {
  const parties = data?.parties || [];
  const totalOutstanding = data?.total_outstanding ?? 0;
  const partiesCount = data?.parties_count ?? parties.length;

  return (
    <View>
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { flex: 2, backgroundColor: colors.debitSubtle }]}>
          <Text style={styles.kpiLabel}>Total Outstanding Receivables</Text>
          <AmountText amount={totalOutstanding} kind="DR" size="lg" />
        </View>

        <View style={[styles.kpiCard, { flex: 1 }]}>
          <Text style={styles.kpiLabel}>Parties</Text>
          <Text style={styles.kpiCount}>{partiesCount}</Text>
        </View>
      </View>

      <Text style={styles.sectionHeading}>Debtor Accounts ({parties.length})</Text>
      {parties.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="shield-checkmark-outline" size={44} color={colors.primaryGreen} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyCardTitle}>No Outstanding Debtors</Text>
          <Text style={styles.emptyCardText}>
            All customers have cleared their balances. No outstanding receivables pending.
          </Text>
        </View>
      ) : (
        <View style={styles.table}>
          {parties.map((p) => (
            <TouchableOpacity
              key={p.party_id}
              style={styles.partyRow}
              activeOpacity={0.7}
              onPress={() => {
                if (onSelectParty) {
                  onClose();
                  onSelectParty(p.party_id);
                }
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.partyRowName}>{p.party_name}</Text>
                <Text style={styles.partyRowSub}>
                  Due Days: {p.due_days ?? 0} {(p.overdue_days ?? 0) > 0 ? `• Overdue: ${p.overdue_days}d` : '• Safe'}
                </Text>
              </View>
              <AmountText amount={p.balance} kind="DR" size="sm" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// 3. Payables Report View
const RenderPayables: React.FC<{
  data: PayablesReport;
  onSelectParty?: (partyId: string) => void;
  onClose: () => void;
}> = ({ data, onSelectParty, onClose }) => {
  const parties = data?.parties || [];
  const totalPayable = data?.total_payable ?? 0;
  const suppliersCount = data?.suppliers_count ?? parties.length;

  return (
    <View>
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { flex: 2, backgroundColor: colors.creditSubtle }]}>
          <Text style={styles.kpiLabel}>Total Supplier Payables</Text>
          <AmountText amount={totalPayable} kind="CR" size="lg" />
        </View>

        <View style={[styles.kpiCard, { flex: 1 }]}>
          <Text style={styles.kpiLabel}>Vendors</Text>
          <Text style={styles.kpiCount}>{suppliersCount}</Text>
        </View>
      </View>

      <Text style={styles.sectionHeading}>Wholesale Vendors ({parties.length})</Text>
      {parties.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={44} color={colors.primaryGreen} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyCardTitle}>No Wholesale Payables</Text>
          <Text style={styles.emptyCardText}>
            You do not owe any money to wholesale suppliers or vendors at this time.
          </Text>
        </View>
      ) : (
        <View style={styles.table}>
          {parties.map((p) => (
            <TouchableOpacity
              key={p.party_id}
              style={styles.partyRow}
              activeOpacity={0.7}
              onPress={() => {
                if (onSelectParty) {
                  onClose();
                  onSelectParty(p.party_id);
                }
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.partyRowName}>{p.party_name}</Text>
                <Text style={styles.partyRowSub}>Credit Term: {p.due_days ?? 0} days</Text>
              </View>
              <AmountText amount={Math.abs(p.balance)} kind="CR" size="sm" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// 4. Collection Report View (with GiftedCharts)
const RenderCollection: React.FC<{
  data: CollectionReport;
  chartWidth: number;
}> = ({ data, chartWidth }) => {
  const dailyBreakdown = data?.daily_breakdown || [];
  const totalCollected = data?.total_collected ?? 0;
  const collectionsCount = data?.collections_count ?? 0;

  // Format data for GiftedCharts BarChart
  const barData = dailyBreakdown.slice(-7).map((b) => ({
    value: Math.round((b.amount || 0) / 100000), // in thousands
    label: (b.date || '').slice(5),
    frontColor: colors.primaryGreen,
  }));

  const maxVal = Math.max(10, ...barData.map((d) => d.value));

  return (
    <View>
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { flex: 2, backgroundColor: colors.creditSubtle }]}>
          <Text style={styles.kpiLabel}>Total Recoveries Collected</Text>
          <AmountText amount={totalCollected} kind="CR" size="lg" />
        </View>
        <View style={[styles.kpiCard, { flex: 1 }]}>
          <Text style={styles.kpiLabel}>Receipts</Text>
          <Text style={styles.kpiCount}>{collectionsCount}</Text>
        </View>
      </View>

      {/* GiftedCharts Bar Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Daily Recovery Trend (₹ in Thousands)</Text>
        {barData.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>No recovery data recorded for the chart.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChart
              data={barData}
              width={chartWidth}
              height={160}
              barWidth={26}
              spacing={18}
              roundedTop
              roundedBottom
              hideRules
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={colors.border}
              yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              noOfSections={4}
              maxValue={maxVal}
            />
          </ScrollView>
        )}
      </View>

      <Text style={styles.sectionHeading}>Daily Breakdown Table</Text>
      {dailyBreakdown.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="wallet-outline" size={44} color={colors.textMuted} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyCardTitle}>No Collections Recorded</Text>
          <Text style={styles.emptyCardText}>No payment recoveries have been recorded in the selected period.</Text>
        </View>
      ) : (
        <View style={styles.table}>
          {dailyBreakdown.map((row) => (
            <View key={row.date} style={styles.breakdownRow}>
              <Text style={styles.breakdownDate}>{row.date}</Text>
              <Text style={styles.breakdownCount}>{row.count} payments</Text>
              <AmountText amount={row.amount} kind="CR" size="sm" />
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// 5. Weekly Report View (with GiftedCharts)
const RenderWeekly: React.FC<{
  data: WeeklyReport;
  chartWidth: number;
  onSelectParty?: (partyId: string) => void;
  onClose: () => void;
}> = ({ data, chartWidth, onSelectParty, onClose }) => {
  const salesTotal = data?.sales_total ?? 0;
  const collectionsTotal = data?.collections_total ?? 0;
  const salesGrowth = data?.sales_growth_percent ?? 0;
  const topDebtors = data?.top_debtors || [];

  const comparisonData = [
    {
      value: Math.round(salesTotal / 100000),
      label: 'Sales (DR)',
      frontColor: colors.debit,
    },
    {
      value: Math.round(collectionsTotal / 100000),
      label: 'Recoveries (CR)',
      frontColor: colors.primaryGreen,
    },
  ];

  const maxVal = Math.max(10, Math.round(salesTotal / 100000), Math.round(collectionsTotal / 100000));

  return (
    <View>
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { flex: 1, borderColor: colors.debitBorder }]}>
          <Text style={styles.kpiLabel}>Weekly Sales (DR)</Text>
          <AmountText amount={salesTotal} kind="DR" size="md" />
        </View>

        <View style={[styles.kpiCard, { flex: 1, borderColor: colors.borderLight }]}>
          <Text style={styles.kpiLabel}>Weekly Recoveries (CR)</Text>
          <AmountText amount={collectionsTotal} kind="CR" size="md" />
        </View>
      </View>

      <View style={styles.growthBadge}>
        <Ionicons name="trending-up" size={16} color={colors.primaryGreen} />
        <Text style={styles.growthBadgeText}>
          Sales Growth: {salesGrowth >= 0 ? `+${salesGrowth}%` : `${salesGrowth}%`} compared to previous week
        </Text>
      </View>

      {/* Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Weekly Volume Comparison (₹ in Thousands)</Text>
        <View style={{ alignItems: 'center' }}>
          <BarChart
            data={comparisonData}
            width={chartWidth}
            height={150}
            barWidth={42}
            spacing={40}
            roundedTop
            hideRules
            xAxisThickness={1}
            xAxisColor={colors.border}
            yAxisThickness={0}
            xAxisLabelTextStyle={{ color: colors.textPrimary, fontSize: 11, fontWeight: '700' }}
            maxValue={maxVal}
          />
        </View>
      </View>

      <Text style={styles.sectionHeading}>Top 5 Debtors</Text>
      {topDebtors.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="shield-checkmark-outline" size={40} color={colors.primaryGreen} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyCardTitle}>No Outstanding Debtors</Text>
          <Text style={styles.emptyCardText}>All customer accounts have cleared balances.</Text>
        </View>
      ) : (
        <View style={styles.table}>
          {topDebtors.map((d, index) => (
            <TouchableOpacity
              key={d.party_id}
              style={styles.partyRow}
              activeOpacity={0.7}
              onPress={() => {
                if (onSelectParty) {
                  onClose();
                  onSelectParty(d.party_id);
                }
              }}
            >
              <Text style={styles.rankNum}>{index + 1}.</Text>
              <Text style={[styles.partyRowName, { flex: 1 }]}>{d.name}</Text>
              <AmountText amount={d.balance} kind="DR" size="sm" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// 6. Monthly Report View (with GiftedCharts)
const RenderMonthly: React.FC<{
  data: MonthlyReport;
  chartWidth: number;
  onSelectParty?: (partyId: string) => void;
  onClose: () => void;
}> = ({ data, chartWidth, onSelectParty, onClose }) => {
  const salesTotal = data?.sales_total ?? 0;
  const collectionsTotal = data?.collections_total ?? 0;
  const salesGrowth = data?.previous_month_comparison?.sales_growth_percent ?? 0;
  const collectionsGrowth = data?.previous_month_comparison?.collections_growth_percent ?? 0;
  const topDebtors = data?.top_debtors || [];

  const comparisonData = [
    {
      value: Math.round(salesTotal / 100000),
      label: 'Monthly Sales',
      frontColor: colors.debit,
    },
    {
      value: Math.round(collectionsTotal / 100000),
      label: 'Collections',
      frontColor: colors.primaryGreen,
    },
  ];

  const maxVal = Math.max(10, Math.round(salesTotal / 100000), Math.round(collectionsTotal / 100000));

  return (
    <View>
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { flex: 1, borderColor: colors.debitBorder }]}>
          <Text style={styles.kpiLabel}>Month Sales</Text>
          <AmountText amount={salesTotal} kind="DR" size="md" />
        </View>

        <View style={[styles.kpiCard, { flex: 1, borderColor: colors.borderLight }]}>
          <Text style={styles.kpiLabel}>Month Recoveries</Text>
          <AmountText amount={collectionsTotal} kind="CR" size="md" />
        </View>
      </View>

      <View style={styles.growthBadge}>
        <Ionicons name="stats-chart" size={16} color={colors.primaryGreen} />
        <Text style={styles.growthBadgeText}>
          MoM Sales: {salesGrowth >= 0 ? `+${salesGrowth}%` : `${salesGrowth}%`} • Collections: {collectionsGrowth >= 0 ? `+${collectionsGrowth}%` : `${collectionsGrowth}%`}
        </Text>
      </View>

      {/* Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Month-to-Date Volume (₹ in Thousands)</Text>
        <View style={{ alignItems: 'center' }}>
          <BarChart
            data={comparisonData}
            width={chartWidth}
            height={150}
            barWidth={42}
            spacing={40}
            roundedTop
            hideRules
            xAxisThickness={1}
            xAxisColor={colors.border}
            yAxisThickness={0}
            xAxisLabelTextStyle={{ color: colors.textPrimary, fontSize: 11, fontWeight: '700' }}
            maxValue={maxVal}
          />
        </View>
      </View>

      <Text style={styles.sectionHeading}>Top Outstanding Debtors</Text>
      {topDebtors.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="shield-checkmark-outline" size={40} color={colors.primaryGreen} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyCardTitle}>No Outstanding Debtors</Text>
          <Text style={styles.emptyCardText}>All customer accounts have cleared balances.</Text>
        </View>
      ) : (
        <View style={styles.table}>
          {topDebtors.map((d, index) => (
            <TouchableOpacity
              key={d.party_id}
              style={styles.partyRow}
              activeOpacity={0.7}
              onPress={() => {
                if (onSelectParty) {
                  onClose();
                  onSelectParty(d.party_id);
                }
              }}
            >
              <Text style={styles.rankNum}>{index + 1}.</Text>
              <Text style={[styles.partyRowName, { flex: 1 }]}>{d.name}</Text>
              <AmountText amount={d.balance} kind="DR" size="sm" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.creditSubtle,
    borderWidth: 1,
    borderColor: colors.primaryGreen,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryGreen,
  },
  closeBtn: {
    padding: 4,
  },
  exportNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.creditLight,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  exportNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryGreen,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.surfaceNeutral,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.creditSubtle,
    borderColor: colors.primaryGreen,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primaryGreen,
    fontWeight: '700',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 14,
    padding: 12,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  kpiCount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  netCard: {
    backgroundColor: colors.creamBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 18,
  },
  netLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  netSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.creditLight,
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  growthBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryGreen,
    flex: 1,
  },
  chartCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 18,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  table: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: 20,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  entryBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  entryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  entryParty: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  entryParticulars: {
    fontSize: 11,
    color: colors.textMuted,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  partyRowName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  partyRowSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  rankNum: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    marginRight: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  breakdownDate: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  breakdownCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: 8,
  },
  emptyCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyCardText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
