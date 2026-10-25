/**
 * BillBook Data Service Interface
 * 
 * Strict contract defining all data operations required by the mobile UI.
 * Screens interact exclusively with this interface.
 * Implemented by:
 * - mockDataService (Phase 1 - AsyncStorage local mock)
 * - apiDataService  (Phase 4 - Live Flask REST API)
 * Selected dynamically via EXPO_PUBLIC_USE_MOCK environment flag.
 * 
 * All money amounts are integers in paise.
 */

import {
  Party,
  CreatePartyInput,
  UpdatePartyInput,
  PartyFilter,
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilter,
  DashboardSummary,
  CreditReport,
  ReportParams,
  ReportData,
  Alert,
  AlertFilter,
  ExtractionResult,
  ChatMessage,
  ChatResponse,
  NarrationResponse,
} from '../types';

export interface DataService {
  // --- Parties ---
  listParties(filter?: PartyFilter): Promise<Party[]>;
  getParty(id: string): Promise<Party>;
  createParty(input: CreatePartyInput): Promise<Party>;
  updateParty(id: string, input: UpdatePartyInput): Promise<Party>;
  archiveParty(id: string): Promise<Party>;
  deleteParty(id: string): Promise<void>;

  // --- Transactions ---
  listTransactions(filter?: TransactionFilter): Promise<Transaction[]>;
  createTransaction(input: CreateTransactionInput): Promise<Transaction>;
  updateTransaction(id: string, input: UpdateTransactionInput): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;

  // --- Dashboard ---
  getDashboardSummary(): Promise<DashboardSummary>;

  // --- Credit Management ---
  getCreditReport(partyId: string): Promise<CreditReport>;

  // --- Reports ---
  getReport(params: ReportParams): Promise<ReportData | string>;

  // --- Alerts ---
  listAlerts(filter?: AlertFilter): Promise<Alert[]>;
  markAlertRead(id: string): Promise<void>;

  // --- AI ---
  extractFromMedia(fileUri: string, mediaType: 'image' | 'audio'): Promise<ExtractionResult>;
  sendChat(message: string, history?: ChatMessage[]): Promise<ChatResponse>;

  // Optional AI narration helper for insight cards (Phase 6 / 9)
  narrateReport?(reportType: string, data: Record<string, unknown>): Promise<NarrationResponse>;
}
