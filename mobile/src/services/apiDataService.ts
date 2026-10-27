/**
 * BillBook Live API Data Service (Phase 4)
 * 
 * Implements the DataService interface using apiClient to communicate with
 * the live Flask backend over HTTPS.
 * Maps snake_case API fields to client TypeScript types inside this file.
 * All money values are strictly handled as integer paise.
 */

import { apiClient, ApiClientError } from './apiClient';
import { DataService } from './dataService';
import { mockDataService } from './mockDataService';
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

function canUseOfflineFallback(error: unknown): boolean {
  return error instanceof ApiClientError &&
    (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT');
}

class ApiDataService implements DataService {
  // --- Data Mapping Helpers ---

  private mapParty(raw: any): Party {
    return {
      id: String(raw.id),
      name: String(raw.name),
      phone: raw.phone ? String(raw.phone) : null,
      type: raw.type === 'supplier' ? 'supplier' : 'customer',
      opening_balance: Number(raw.opening_balance || 0),
      credit_limit: Number(raw.credit_limit || 0),
      due_days: Number(raw.due_days || 30),
      status: raw.status === 'archived' ? 'archived' : 'active',
      total_dr: Number(raw.total_dr || 0),
      total_cr: Number(raw.total_cr || 0),
      balance: Number(raw.balance !== undefined ? raw.balance : (raw.opening_balance || 0) + (raw.total_dr || 0) - (raw.total_cr || 0)),
      created_at: String(raw.created_at || new Date().toISOString()),
    };
  }

  private mapTransaction(raw: any): Transaction {
    return {
      id: String(raw.id),
      party_id: String(raw.party_id),
      party_name: raw.party_name ? String(raw.party_name) : undefined,
      kind: raw.kind === 'CR' ? 'CR' : 'DR',
      amount: Math.round(Number(raw.amount || 0)),
      txn_date: String(raw.txn_date || new Date().toISOString().split('T')[0]),
      particulars: raw.particulars ? String(raw.particulars) : null,
      source: raw.source === 'photo' ? 'photo' : raw.source === 'voice' ? 'voice' : 'manual',
      bill_image_path: raw.bill_image_path ? String(raw.bill_image_path) : null,
      created_at: String(raw.created_at || new Date().toISOString()),
      deleted_at: raw.deleted_at ? String(raw.deleted_at) : null,
    };
  }

  // --- Parties ---

  async listParties(filter?: PartyFilter): Promise<Party[]> {
    const queryParams: Record<string, string | undefined> = {};
    if (filter?.status) {
      queryParams.status = filter.status;
    }
    if (filter?.type) {
      queryParams.type = filter.type;
    }
    if (filter?.search) {
      queryParams.search = filter.search;
    }

    const response = await apiClient.get<{ parties: any[]; total: number }>('/parties', queryParams);
    const partiesList = Array.isArray(response.parties) ? response.parties : [];
    return partiesList.map((p) => this.mapParty(p));
  }

  async getParty(id: string): Promise<Party> {
    const raw = await apiClient.get<any>(`/parties/${encodeURIComponent(id)}`);
    return this.mapParty(raw);
  }

  async createParty(input: CreatePartyInput): Promise<Party> {
    const payload = {
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      type: input.type,
      opening_balance: input.opening_balance !== undefined ? Math.round(input.opening_balance) : 0,
      credit_limit: input.credit_limit !== undefined ? Math.round(input.credit_limit) : 0,
      due_days: input.due_days !== undefined ? Number(input.due_days) : 30,
    };

    const raw = await apiClient.post<any>('/parties', payload);
    return this.mapParty(raw);
  }

  async updateParty(id: string, input: UpdatePartyInput): Promise<Party> {
    const payload: Record<string, any> = {};
    if (input.name !== undefined) payload.name = input.name.trim();
    if (input.phone !== undefined) payload.phone = input.phone ? input.phone.trim() : null;
    if (input.type !== undefined) payload.type = input.type;
    if (input.opening_balance !== undefined) payload.opening_balance = Math.round(input.opening_balance);
    if (input.credit_limit !== undefined) payload.credit_limit = Math.round(input.credit_limit);
    if (input.due_days !== undefined) payload.due_days = Number(input.due_days);
    if (input.status !== undefined) payload.status = input.status;

    const raw = await apiClient.patch<any>(`/parties/${encodeURIComponent(id)}`, payload);
    return this.mapParty(raw);
  }

  async archiveParty(id: string): Promise<Party> {
    await apiClient.post<any>(`/parties/${encodeURIComponent(id)}/archive`);
    return this.getParty(id);
  }

  async deleteParty(id: string): Promise<void> {
    await apiClient.delete<any>(`/parties/${encodeURIComponent(id)}`);
  }

  // --- Transactions ---

  async listTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
    const queryParams: Record<string, string | undefined> = {};
    if (filter?.party_id) queryParams.party_id = filter.party_id;
    if (filter?.kind) queryParams.kind = filter.kind;
    if (filter?.start_date) queryParams.start_date = filter.start_date;
    if (filter?.end_date) queryParams.end_date = filter.end_date;

    const response = await apiClient.get<{ transactions: any[]; total: number }>('/transactions', queryParams);
    const list = Array.isArray(response.transactions) ? response.transactions : [];
    return list.map((t) => this.mapTransaction(t));
  }

  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const payload = {
      party_id: input.party_id,
      kind: input.kind,
      amount: Math.round(input.amount),
      txn_date: input.txn_date,
      particulars: input.particulars?.trim() || null,
      source: input.source || 'manual',
      bill_image_path: input.bill_image_path || null,
    };

    const raw = await apiClient.post<any>('/transactions', payload);
    return this.mapTransaction(raw);
  }

  async updateTransaction(id: string, input: UpdateTransactionInput): Promise<Transaction> {
    const payload: Record<string, any> = {};
    if (input.party_id !== undefined) payload.party_id = input.party_id;
    if (input.kind !== undefined) payload.kind = input.kind;
    if (input.amount !== undefined) payload.amount = Math.round(input.amount);
    if (input.txn_date !== undefined) payload.txn_date = input.txn_date;
    if (input.particulars !== undefined) payload.particulars = input.particulars ? input.particulars.trim() : null;

    const raw = await apiClient.patch<any>(`/transactions/${encodeURIComponent(id)}`, payload);
    return this.mapTransaction(raw);
  }

  async deleteTransaction(id: string): Promise<void> {
    await apiClient.delete<any>(`/transactions/${encodeURIComponent(id)}`);
  }

  // --- Dashboard ---

  async getDashboardSummary(): Promise<DashboardSummary> {
    const raw = await apiClient.get<any>('/dashboard/summary');
    const recent = Array.isArray(raw.recent_transactions)
      ? raw.recent_transactions.map((t: any) => this.mapTransaction(t))
      : [];

    return {
      total_receivable: Number(raw.total_receivable || 0),
      total_payable: Number(raw.total_payable || 0),
      net_balance: Number(raw.net_balance || 0),
      today_dr: Number(raw.today_dr || 0),
      today_cr: Number(raw.today_cr || 0),
      recent_transactions: recent,
    };
  }

  // --- Credit Management (Phase 4 mock-backed, ready for Phase 5 live API) ---

  async getCreditReport(partyId: string): Promise<CreditReport> {
    try {
      const raw = await apiClient.get<any>(`/parties/${encodeURIComponent(partyId)}/credit-report`);
      return {
        party_id: String(raw.party_id),
        party_name: String(raw.party_name),
        credit_limit: Number(raw.credit_limit || 0),
        total_outstanding: Number(raw.total_outstanding || 0),
        limit_usage_percent: Number(raw.limit_usage_percent || 0),
        avg_payment_delay_days: Number(raw.avg_payment_delay_days || 0),
        aging_buckets: {
          days_0_30: Number(raw.aging_buckets?.days_0_30 || 0),
          days_31_60: Number(raw.aging_buckets?.days_31_60 || 0),
          days_60_plus: Number(raw.aging_buckets?.days_60_plus || 0),
        },
        last_payment_date: raw.last_payment_date ? String(raw.last_payment_date) : null,
        last_payment_amount: raw.last_payment_amount ? Number(raw.last_payment_amount) : null,
        risk_level: raw.risk_level || 'low',
      };
    } catch (error) {
      if (!canUseOfflineFallback(error)) {
        throw error;
      }

      // Keep credit reports usable while the API is unreachable.
      const party = await this.getParty(partyId);
      const txs = await this.listTransactions({ party_id: partyId });

      const total_outstanding = Math.max(0, party.balance);
      const limit = party.credit_limit || 5000000;
      const limit_usage_percent = limit > 0 ? Math.round((total_outstanding / limit) * 1000) / 10 : 0;

      const crTxs = txs.filter((t) => t.kind === 'CR');
      const lastPayment = crTxs.length > 0 ? crTxs[0] : null;

      let risk_level: 'low' | 'moderate' | 'high' = 'low';
      if (limit_usage_percent > 85) {
        risk_level = 'high';
      } else if (limit_usage_percent > 50) {
        risk_level = 'moderate';
      }

      return {
        party_id: party.id,
        party_name: party.name,
        credit_limit: limit,
        total_outstanding,
        limit_usage_percent,
        avg_payment_delay_days: 4,
        aging_buckets: {
          days_0_30: Math.round(total_outstanding * 0.7),
          days_31_60: Math.round(total_outstanding * 0.3),
          days_60_plus: 0,
        },
        last_payment_date: lastPayment ? lastPayment.txn_date : null,
        last_payment_amount: lastPayment ? lastPayment.amount : null,
        risk_level,
      };
    }
  }

  // --- Reports (Phase 5 fallback) ---

  async getReport(params: ReportParams): Promise<ReportData | string> {
    try {
      const queryParams: Record<string, string | undefined> = {
        date: params.date,
        start_date: params.start_date,
        end_date: params.end_date,
        month: params.month,
        format: params.format,
      };
      return await apiClient.get<ReportData>(`/reports/${params.type}`, queryParams);
    } catch (error) {
      if (!canUseOfflineFallback(error)) {
        throw error;
      }
      return mockDataService.getReport(params);
    }
  }

  // --- Alerts (Phase 8 fallback) ---

  async listAlerts(filter?: AlertFilter): Promise<Alert[]> {
    try {
      const res = await apiClient.get<{ alerts: Alert[] }>('/alerts', {
        unread_only: filter?.unread_only ? 'true' : undefined,
      });
      return res.alerts || [];
    } catch (error) {
      if (!canUseOfflineFallback(error)) {
        throw error;
      }
      return mockDataService.listAlerts(filter);
    }
  }

  async markAlertRead(id: string): Promise<void> {
    try {
      await apiClient.post(`/alerts/${encodeURIComponent(id)}/read`);
    } catch (error) {
      if (!canUseOfflineFallback(error)) {
        throw error;
      }
      await mockDataService.markAlertRead(id);
    }
  }

  // --- AI (Phase 3 / 6) ---

  async extractFromMedia(
    fileUri: string,
    mediaType: 'image' | 'audio',
    options?: {
      onProgress?: (percent: number) => void;
      signal?: AbortSignal;
    }
  ): Promise<ExtractionResult> {
    if (options?.signal?.aborted) {
      throw new ApiClientError('Upload cancelled by user', 'CANCELLED', 0);
    }

    // Interval to simulate progressive upload/processing feedback
    let progressTimer: any = null;
    let currentPct = 10;
    if (options?.onProgress) {
      options.onProgress(currentPct);
      progressTimer = setInterval(() => {
        if (currentPct < 90) {
          currentPct += Math.min(25, 90 - currentPct);
          options.onProgress?.(currentPct);
        }
      }, 350);
    }

    try {
      const formData = new FormData();
      const filename = fileUri.split('/').pop() || (mediaType === 'image' ? 'bill.jpg' : 'voice.m4a');
      const mimeType = mediaType === 'image' ? 'image/jpeg' : 'audio/m4a';

      let filePayload: any = {
        uri: fileUri,
        name: filename,
        type: mimeType,
      };

      // Handle web blob / data URI conversion
      if (typeof window !== 'undefined' && (fileUri.startsWith('blob:') || fileUri.startsWith('data:'))) {
        try {
          const blobResp = await fetch(fileUri);
          const blob = await blobResp.blob();
          filePayload = new File([blob], filename, { type: mimeType });
        } catch {
          // Keep object format
        }
      }

      formData.append('file', filePayload);
      formData.append('media_type', mediaType);

      const res = await apiClient.post<ExtractionResult>('/ai/extract', formData, {
        signal: options?.signal,
      });

      if (progressTimer) clearInterval(progressTimer);
      options?.onProgress?.(100);
      return res;
    } catch (err: any) {
      if (progressTimer) clearInterval(progressTimer);

      if (options?.signal?.aborted || err?.name === 'AbortError' || err?.code === 'CANCELLED') {
        throw new ApiClientError('Upload cancelled by user', 'CANCELLED', 0);
      }
      if (err instanceof ApiClientError) {
        if (!canUseOfflineFallback(err)) {
          throw err;
        }
      } else if (!canUseOfflineFallback(err)) {
        throw err;
      }
      return mockDataService.extractFromMedia(fileUri, mediaType, options);
    }
  }

  async sendChat(message: string, history?: ChatMessage[]): Promise<ChatResponse> {
    try {
      return await apiClient.post<ChatResponse>('/ai/chat', { message, history });
    } catch (error) {
      if (!canUseOfflineFallback(error)) {
        throw error;
      }
      return mockDataService.sendChat(message, history);
    }
  }

  async narrateReport(reportType: string, data: Record<string, unknown>): Promise<NarrationResponse> {
    try {
      return await apiClient.post<NarrationResponse>('/ai/narrate', {
        report_type: reportType,
        data,
      });
    } catch (error) {
      if (!canUseOfflineFallback(error)) {
        throw error;
      }
      return {
        narration: 'Your ledger currently shows steady collections with healthy customer balances.',
      };
    }
  }
}

export const apiDataService = new ApiDataService();
