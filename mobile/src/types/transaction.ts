/**
 * Transaction Domain Types
 * All money amounts are integers in paise (1 INR = 100 paise)
 */

export type TransactionKind = 'DR' | 'CR';
export type TransactionSource = 'manual' | 'photo' | 'voice';

export interface Transaction {
  id: string;
  party_id: string;
  party_name?: string;
  kind: TransactionKind;
  amount: number; // in paise
  txn_date: string; // YYYY-MM-DD
  particulars: string | null;
  source: TransactionSource;
  bill_image_path: string | null;
  created_at: string;
  deleted_at: string | null; // null for active, ISO date if soft-deleted
}

export interface CreateTransactionInput {
  party_id: string;
  kind: TransactionKind;
  amount: number; // in paise
  txn_date: string; // YYYY-MM-DD
  particulars?: string | null;
  source?: TransactionSource;
  bill_image_path?: string | null;
}

export interface UpdateTransactionInput {
  party_id?: string;
  kind?: TransactionKind;
  amount?: number; // in paise
  txn_date?: string; // YYYY-MM-DD
  particulars?: string | null;
}

export interface TransactionFilter {
  party_id?: string;
  kind?: TransactionKind;
  start_date?: string; // YYYY-MM-DD
  end_date?: string;   // YYYY-MM-DD
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
}

export interface SoftDeleteTransactionResponse {
  success: boolean;
  message: string;
  deleted_at: string;
}
