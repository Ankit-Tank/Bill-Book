import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { dataService } from '../../services/dataService';
import { CreditReport } from '../../types';
import { AmountText } from '../../components/AmountText';
import { Card } from '../../components/Card';
import { formatDate } from '../../utils/format';
import { AiInsightCard } from '../assistant';

export interface CreditReportModalProps {
  partyId: string | null;
  visible: boolean;
  onClose: () => void;
}

export const CreditReportModal: React.FC<CreditReportModalProps> = ({
  partyId,
  visible,
  onClose,
}) => {
  const [report, setReport] = useState<CreditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!partyId || !visible) return;

    let isMounted = true;
    dataService
      .getCreditReport(partyId)
      .then((data) => {
        if (isMounted) {
          setReport(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Failed to load credit report.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [partyId, visible]);

  if (!visible) return null;

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'high':
        return { bg: colors.debitLight, text: colors.debit, icon: 'alert-circle' as const };
      case 'moderate':
        return { bg: colors.warningLight, text: colors.warningText, icon: 'warning' as const };
      case 'low':
      default:
        return { bg: colors.creditLight, text: colors.credit, icon: 'shield-checkmark' as const };
    }
  };

  const risk = report ? getRiskBadgeColor(report.risk_level) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Customer Credit Report</Text>
              <Text style={styles.headerSubtitle}>
                {report ? report.party_name : 'Risk & Aging Analysis'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primaryGreen} />
              <Text style={styles.loadingText}>Generating risk & aging profile...</Text>
            </View>
          ) : error || !report ? (
            <View style={styles.centerContainer}>
              <Ionicons name="alert-circle-outline" size={40} color={colors.debit} />
              <Text style={styles.errorText}>{error || 'Could not load credit report'}</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
              {/* Risk Level Badge Card */}
              <View style={[styles.riskBanner, { backgroundColor: risk?.bg }]}>
                <Ionicons name={risk?.icon} size={24} color={risk?.text} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.riskTitle, { color: risk?.text }]}>
                    {report.risk_level.toUpperCase()} RISK PROFILE
                  </Text>
                  <Text style={styles.riskDescription}>
                    {report.risk_level === 'high'
                      ? 'High outstanding balance nearing or exceeding credit threshold.'
                      : report.risk_level === 'moderate'
                      ? 'Moderate credit utilization. Monitor upcoming due dates.'
                      : 'Reliable customer with healthy repayment consistency.'}
                  </Text>
                </View>
              </View>

              {/* AI Insight Card (narrates customer risk profile; fails quietly) */}
              <AiInsightCard
                reportType="credit-report"
                title="KhataAI Risk Assessment"
                data={{
                  party_name: report.party_name,
                  credit_limit: report.credit_limit,
                  total_outstanding: report.total_outstanding,
                  limit_usage_percent: report.limit_usage_percent,
                  avg_payment_delay_days: report.avg_payment_delay_days,
                  risk_level: report.risk_level,
                }}
              />

              {/* Outstanding & Credit Limit Card */}
              <Card variant="default" style={styles.sectionCard}>
                <Text style={styles.cardSectionLabel}>CREDIT UTILIZATION</Text>

                <View style={styles.metricsRow}>
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Total Outstanding</Text>
                    <AmountText
                      amount={report.total_outstanding}
                      kind="DR"
                      size="lg"
                    />
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Assigned Credit Limit</Text>
                    <AmountText
                      amount={report.credit_limit}
                      kind="neutral"
                      size="lg"
                    />
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Limit Usage</Text>
                    <Text style={[styles.progressPercent, { color: (report.limit_usage_percent > 85 ? colors.debit : colors.primaryGreen) }]}>
                      {report.limit_usage_percent}%
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, Math.max(0, report.limit_usage_percent))}%`,
                          backgroundColor: report.limit_usage_percent > 85 ? colors.debit : colors.primaryGreen,
                        },
                      ]}
                    />
                  </View>
                </View>
              </Card>

              {/* Payment Delay & Recent History */}
              <Card variant="default" style={styles.sectionCard}>
                <Text style={styles.cardSectionLabel}>REPAYMENT BEHAVIOR</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={18} color={colors.primaryGreen} />
                  <Text style={styles.infoKey}>Average Payment Delay:</Text>
                  <Text style={styles.infoValue}>
                    {report.avg_payment_delay_days > 0
                      ? `${report.avg_payment_delay_days} days past terms`
                      : 'On-time settlements'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="cash-outline" size={18} color={colors.credit} />
                  <Text style={styles.infoKey}>Last Payment:</Text>
                  <Text style={styles.infoValue}>
                    {report.last_payment_amount
                      ? `${formatDate(report.last_payment_date || '')} • ₹${(report.last_payment_amount / 100).toLocaleString('en-IN')}`
                      : 'No payments recorded'}
                  </Text>
                </View>
              </Card>

              {/* Aging Buckets Card */}
              <Card variant="default" style={styles.sectionCard}>
                <Text style={styles.cardSectionLabel}>OUTSTANDING AGING BUCKETS</Text>
                <Text style={styles.agingSubtitle}>Distribution of unpaid credit sales:</Text>

                <View style={styles.bucketRow}>
                  <View style={styles.bucketBadgeGreen}>
                    <Text style={styles.bucketBadgeText}>0 - 30 Days (Current)</Text>
                  </View>
                  <AmountText
                    amount={report.aging_buckets.days_0_30}
                    kind="neutral"
                    size="sm"
                  />
                </View>

                <View style={styles.bucketRow}>
                  <View style={styles.bucketBadgeAmber}>
                    <Text style={styles.bucketBadgeText}>31 - 60 Days (Due)</Text>
                  </View>
                  <AmountText
                    amount={report.aging_buckets.days_31_60}
                    kind="neutral"
                    size="sm"
                  />
                </View>

                <View style={styles.bucketRow}>
                  <View style={styles.bucketBadgeRed}>
                    <Text style={styles.bucketBadgeText}>60+ Days (Critical)</Text>
                  </View>
                  <AmountText
                    amount={report.aging_buckets.days_60_plus}
                    kind={report.aging_buckets.days_60_plus > 0 ? 'DR' : 'neutral'}
                    size="sm"
                  />
                </View>
              </Card>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  centerContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.debit,
    textAlign: 'center',
  },
  scroll: {
    paddingBottom: 20,
  },
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  riskTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  riskDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  progressContainer: {
    marginTop: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoKey: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  agingSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 10,
  },
  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  bucketBadgeGreen: {
    backgroundColor: colors.creditLight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  bucketBadgeAmber: {
    backgroundColor: colors.warningLight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  bucketBadgeRed: {
    backgroundColor: colors.debitLight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  bucketBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
