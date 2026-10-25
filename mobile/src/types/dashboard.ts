/**
 * Dashboard Domain Types
 * All money amounts are integers in paise (1 INR = 100 paise)
 */

import { Transaction } from './transaction';

export interface DashboardSummary {
  total_receivable: number;    // in paise (shown on Red Card)
  total_payable: number;       // in paise (shown on Green Card)
  net_balance: number;         // in paise (total_receivable - total_payable)
  today_dr: number;            // in paise (sales on credit today)
  today_cr: number;            // in paise (payments received today)
  recent_transactions: Transaction[];
}
