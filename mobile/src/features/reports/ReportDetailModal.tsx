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
  const [loadedReportType, setLoadedReportType] = useState<ReportType | null>(null);
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
    setLoadedReportType(null);

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
      setLoadedReportType(reportType);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate report statement.');
    } finally {
      setIsLoading(false);
    }
  }, [reportType, dayBookDate]);

  useEffect(() => {
    let isCancelled = false;
    if (visible && reportType) {
      setIsLoading(true);
      setError(null);
      setReportData(null);
      setLoadedReportType(null);

      dataService
        .getReport({
          type: reportType,
          format: 'json',
          date: reportType === 'day-book' ? dayBookDate : undefined,
        })
        .then((data) => {
          if (!isCancelled) {
            setReportData(data);
            setLoadedReportType(reportType);
            setIsLoading(false);
          }
        })
        .catch((err: any) => {
          if (!isCancelled) {
            setError(err?.message || 'Failed to generate report statement.');
            setIsLoading(false);
          }
        });

      return () => {
        isCancelled = true;
      };
    } else {
      setReportData(null);
      setLoadedReportType(null);
      setError(null);
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
          ) : (reportData && loadedReportType === reportType) ? (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Day Book Report */}
              {reportType === 'day-book' ? (
                <RenderDayBook
                  data={reportData as DayBookReport}
                  selectedDate={dayBookDate}
                  onDateChange={(d) => setDayBookDate(d)}
                />
              ) : null}

              {/* Outstanding Report */}
              {reportType === 'outstanding' ? (
                <RenderOutstanding
                  data={reportData as OutstandingReport}
                  onSelectParty={onSelectParty}
                  onClose={onClose}
                />
              ) : null}

              {/* Payables Report */}
              {reportType === 'payables' ? (
                <RenderPayables
                  data={reportData as PayablesReport}
                  onSelectParty={onSelectParty}
                  onClose={onClose}
                />
              ) : null}

              {/* Collection Report */}
              {reportType === 'collection' ? (
                <RenderCollection
                  data={reportData as CollectionReport}
                  chartWidth={chartWidth}
                />
              ) : null}

              {/* Weekly Report */}
              {reportType === 'weekly' ? (
                <RenderWeekly
                  data={reportData as WeeklyReport}
                  chartWidth={chartWidth}
                  onSelectParty={onSelectParty}
                  onClose={onClose}
                />
              ) : null}

              {/* Monthly Report */}
              {reportType === 'monthly' ? (
                <RenderMonthly
                  data={reportData as MonthlyReport}
                  chartWidth={chartWidth}
                  onSelectParty={onSelectParty}
                  onClose={onClose}
                />
              ) : null}
            </ScrollView>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primaryGreen} />
              <Text style={styles.loadingText}>Generating statement...</Text>
            </View>
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
      {(() => {
        const entries = Array.isArray(data?.entries) ? data.entries : [];
        return (
          <>
            <Text style={styles.sectionHeading}>Daily Entries ({entries.length})</Text>
            {entries.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No transactions recorded on this date.</Text>
              </View>
            ) : (
              <View style={styles.table}>
                {entries.map((entry) => (
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
          </>
        );
      })()}
    </View>
  );
};

// 2. Outstanding Report View
const RenderOutstanding: React.FC<{
  data: OutstandingReport;
  onSelectParty?: (partyId: string) => void;
  onClose: () => void;
}> = ({ data, onSelectParty, onClose }) => {
  const partiesList = Array.isArray(data?.parties) ? data.parties : [];

  return (
    <View>
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { flex: 2, backgroundColor: colors.debitSubtle }]}>
          <Text style={styles.kpiLabel}>Total Outstanding Receivables</Text>
          <AmountText amount={data?.total_outstanding || 0} kind="DR" size="lg" />
        </View>

        <View style={[styles.kpiCard, { flex: 1 }]}>
          <Text style={styles.kpiLabel}>Parties</Text>
          <Text style={styles.kpiCount}>{data?.parties_count ?? partiesList.length}</Text>
        </View>
      </View>

      <Text style={styles.sectionHeading}>Debtor Accounts ({partiesList.length})</Text>
      {partiesList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No outstanding dues found.</Text>
        </View>
      ) : (
        <View style={styles.table}>
          {partiesList.map((p) => (
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
                  Due Days: {p.due_days} {p.overdue_days > 0 ? `• Overdue: ${p.overdue_days}d` : '• Safe'}
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
  const partiesList = Array.isArray(data?.parties) ? data.parties : [];

  return (
    <View>
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { flex: 2, backgroundColor: colors.creditSubtle }]}>
          <Text style={styles.kpiLabel}>Total Supplier Payables</Text>
          <AmountText amount={data?.total_payable || 0} kind="CR" size="lg" />
        </View>

        <View style={[styles.kpiCard, { flex: 1 }]}>
          <Text style={styles.kpiLabel}>Vendors</Text>
          <Text style={styles.kpiCount}>{data?.suppliers_count ?? partiesList.length}</Text>
        </View>
      </View>

      <Text style={styles.sectionHeading}>Wholesale Vendors ({partiesList.length})</Text>
      {partiesList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No pending payables recorded.</Text>
        </View>
      ) : (
        <View style={styles.table}>
          {partiesList.map((p) => (
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
                <Text style={styles.partyRowSub}>Credit Term: {p.due_days} days</Text>
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
  const dailyBreakdown = Array.isArray(data?.daily_breakdown) ? data.daily_breakdown : [];

  // Format data for GiftedCharts BarChart
  const barData = dailyBreakdown.slice(-7).map((b) => ({
    value: Math.round((b.amount || 0) / 100000), // in thousands
    label: (b.date || '').slice(5),
    frontColor: colors.primaryGreen,
    topLabelComponent: () => (
      <Text style={{ fontSize: 9, color: colors.textSecondary, marginBottom: 2 }}>
        ₹{Math.round((b.amount || 0) / 100000)}k
      </Text>
    ),
  }));

  return (
    <View>
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { flex: 2, backgroundColor: colors.creditSubtle }]}>
          <Text style={styles.kpiLabel}>Total Recoveries Collected</Text>
          <AmountText amount={data?.total_collected || 0} kind="CR" size="lg" />
        </View>
        <View style={[styles.kpiCard, { flex: 1 }]}>
          <Text style={styles.kpiLabel}>Receipts</Text>
          <Text style={styles.kpiCount}>{data?.collections_count ?? dailyBreakdown.length}</Text>
        </View>
      </View>

      {/* GiftedCharts Bar Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Daily Recovery Trend (₹ in Thousands)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {barData.length > 0 ? (
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
            />
          ) : (
            <Text style={[styles.emptyText, { padding: 16 }]}>No recent collection trend data.</Text>
          )}
        </ScrollView>
      </View>

      <Text style={styles.sectionHeading}>Daily Breakdown Table</Text>
      {dailyBreakdown.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No recovery logs found for this period.</Text>
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
  const comparisonData = [
    {
      value: Math.round((data?.sales_total || 0) / 100000),
      label: 'Sales (DR)',
      frontColor: colors.debit,
    },
    {
      value: Math.round((data?.collections_total || 0) / 100000),
      label: 'Recoveries (CR)',
      frontColor: colors.primaryGreen,
    },
  ];

  const topDebtors = Array.isArray(data?.top_debtors) ? data.top_debtors : [];

  return (
    <View>
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { flex: 1, borderColor: colors.debitBorder }]}>
          <Text style={styles.kpiLabel}>Weekly Sales (DR)</Text>
          <AmountText amount={data?.sales_total || 0} kind="DR" size="md" />
        </View>

        <View style={[styles.kpiCard, { flex: 1, borderColor: colors.borderLight }]}>
          <Text style={styles.kpiLabel}>Weekly Recoveries (CR)</Text>
          <AmountText amount={data?.collections_total || 0} kind="CR" size="md" />
        </View>
      </View>

      <View style={styles.growthBadge}>
        <Ionicons name="trending-up" size={16} color={colors.primaryGreen} />
        <Text style={styles.growthBadgeText}>
          Sales Growth: +{data?.sales_growth_percent || 0}% compared to previous week
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
          />
        </View>
      </View>

      <Text style={styles.sectionHeading}>Top 5 Debtors</Text>
      {topDebtors.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No debtor records found for this period.</Text>
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
  const comparisonData = [
    {
      value: Math.round((data?.sales_total || 0) / 100000),
      label: 'Monthly Sales',
      frontColor: colors.debit,
    },
    {
      value: Math.round((data?.collections_total || 0) / 100000),
      label: 'Collections',
      frontColor: colors.primaryGreen,
    },
  ];

  const topDebtors = Array.isArray(data?.top_debtors) ? data.top_debtors : [];
  const prevComparison = data?.previous_month_comparison || {
    sales_growth_percent: 0,
    collections_growth_percent: 0,
  };

  return (
    <View>
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { flex: 1, borderColor: colors.debitBorder }]}>
          <Text style={styles.kpiLabel}>Month Sales</Text>
          <AmountText amount={data?.sales_total || 0} kind="DR" size="md" />
        </View>

        <View style={[styles.kpiCard, { flex: 1, borderColor: colors.borderLight }]}>
          <Text style={styles.kpiLabel}>Month Recoveries</Text>
          <AmountText amount={data?.collections_total || 0} kind="CR" size="md" />
        </View>
      </View>

      <View style={styles.growthBadge}>
        <Ionicons name="stats-chart" size={16} color={colors.primaryGreen} />
        <Text style={styles.growthBadgeText}>
          MoM Sales Growth: +{prevComparison.sales_growth_percent}% • Collections: +{prevComparison.collections_growth_percent}%
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
          />
        </View>
      </View>

      <Text style={styles.sectionHeading}>Top Outstanding Debtors</Text>
      {topDebtors.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No debtor records found for this month.</Text>
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
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
