/**
 * Reports Domain Types
 * All money amounts are integers in paise (1 INR = 100 paise)
 */

export type ReportType =
  | 'day-book'
  | 'outstanding'
  | 'payables'
  | 'collection'
  | 'weekly'
  | 'monthly';

export interface ReportParams {
  type: ReportType;
  date?: string;       // YYYY-MM-DD (for day-book)
  start_date?: string; // YYYY-MM-DD (for collection, weekly)
  end_date?: string;   // YYYY-MM-DD
  month?: string;      // YYYY-MM (for monthly)
  format?: 'json' | 'csv';
}

// 1. Day Book Report
export interface DayBookEntry {
  transaction_id: string;
  party_id: string;
  party_name: string;
  kind: 'DR' | 'CR';
  amount: number; // in paise
  particulars: string | null;
  created_at: string;
}

export interface DayBookReport {
  date: string;
  total_dr: number;    // in paise
  total_cr: number;    // in paise
  net_change: number;  // in paise (total_dr - total_cr)
  entries: DayBookEntry[];
}

// 2. Outstanding Report (Receivables)
export interface OutstandingParty {
  party_id: string;
  party_name: string;
  phone: string | null;
  balance: number;     // in paise (positive receivable)
  due_days: number;
  overdue_days: number;
}

export interface OutstandingReport {
  total_outstanding: number; // in paise
  parties_count: number;
  parties: OutstandingParty[];
}

// 3. Payables Report (Suppliers / Advances)
export interface PayableParty {
  party_id: string;
  party_name: string;
  phone: string | null;
  balance: number;     // in paise (negative indicates payable)
  due_days: number;
}

export interface PayablesReport {
  total_payable: number; // in paise (positive absolute sum of payables)
  suppliers_count: number;
  parties: PayableParty[];
}

// 4. Collection Report
export interface CollectionDailyBreakdown {
  date: string;
  amount: number; // in paise
  count: number;
}

export interface CollectionReport {
  start_date: string;
  end_date: string;
  total_collected: number; // in paise
  collections_count: number;
  daily_breakdown: CollectionDailyBreakdown[];
}

// 5. Weekly Summary Report
export interface TopDebtor {
  party_id: string;
  name: string;
  balance: number; // in paise
}

export interface WeeklyReport {
  week_start: string;
  week_end: string;
  sales_total: number;       // in paise
  collections_total: number; // in paise
  net_change: number;        // in paise
  sales_growth_percent: number;
  top_debtors: TopDebtor[];
}

// 6. Monthly Summary Report
export interface MonthlyReport {
  month: string;
  sales_total: number;       // in paise
  collections_total: number; // in paise
  net_change: number;        // in paise
  previous_month_comparison: {
    sales_growth_percent: number;
    collections_growth_percent: number;
  };
  top_debtors: TopDebtor[];
}

export type ReportData =
  | DayBookReport
  | OutstandingReport
  | PayablesReport
  | CollectionReport
  | WeeklyReport
  | MonthlyReport;
