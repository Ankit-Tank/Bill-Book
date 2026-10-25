/**
 * Credit Report Domain Types
 * All money amounts are integers in paise (1 INR = 100 paise)
 */

export type RiskLevel = 'low' | 'moderate' | 'high';

export interface AgingBuckets {
  days_0_30: number;    // in paise
  days_31_60: number;   // in paise
  days_60_plus: number; // in paise
}

export interface CreditReport {
  party_id: string;
  party_name: string;
  credit_limit: number;            // in paise
  total_outstanding: number;       // in paise
  limit_usage_percent: number;     // e.g. 75.5%
  avg_payment_delay_days: number;  // average delay past due_days
  aging_buckets: AgingBuckets;
  last_payment_date: string | null;// YYYY-MM-DD or null if no payments
  last_payment_amount: number | null; // in paise
  risk_level: RiskLevel;
}
