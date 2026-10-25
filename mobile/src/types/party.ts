/**
 * Party Domain Types
 * All money amounts are integers in paise (1 INR = 100 paise)
 */

export type PartyType = 'customer' | 'supplier';
export type PartyStatus = 'active' | 'archived';

export interface Party {
  id: string;
  name: string;
  phone: string | null;
  type: PartyType;
  opening_balance: number; // in paise
  credit_limit: number;    // in paise
  due_days: number;        // credit term in days
  status: PartyStatus;
  total_dr: number;        // in paise (sum of DR transactions)
  total_cr: number;        // in paise (sum of CR transactions)
  balance: number;         // in paise (opening_balance + total_dr - total_cr)
  created_at: string;
}

export interface CreatePartyInput {
  name: string;
  phone?: string | null;
  type: PartyType;
  opening_balance?: number; // in paise (default: 0)
  credit_limit?: number;    // in paise (default: 0)
  due_days?: number;        // days (default: 30)
}

export interface UpdatePartyInput {
  name?: string;
  phone?: string | null;
  type?: PartyType;
  opening_balance?: number;
  credit_limit?: number;
  due_days?: number;
  status?: PartyStatus;
}

export interface PartyFilter {
  type?: PartyType;
  status?: PartyStatus;
  search?: string;
}

export interface PartyListResponse {
  parties: Party[];
  total: number;
}

export interface ArchivePartyResponse {
  id: string;
  status: 'archived';
  message: string;
}
