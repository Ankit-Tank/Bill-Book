import { create } from 'zustand';
import {
  Party,
  CreatePartyInput,
  PartyFilter,
  Transaction,
  CreateTransactionInput,
  DashboardSummary,
} from '../types';
import { dataService } from '../services/dataService';

export interface KhataState {
  parties: Party[];
  summary: DashboardSummary | null;
  selectedParty: Party | null;
  selectedPartyTransactions: Transaction[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchDashboard: () => Promise<void>;
  fetchParties: (filter?: PartyFilter) => Promise<void>;
  fetchPartyDetails: (partyId: string) => Promise<void>;
  createParty: (input: CreatePartyInput) => Promise<Party>;
  createTransaction: (input: CreateTransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string, partyId?: string) => Promise<void>;
  clearError: () => void;
}

export const useKhataStore = create<KhataState>((set, get) => ({
  parties: [],
  summary: null,
  selectedParty: null,
  selectedPartyTransactions: [],
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const summary = await dataService.getDashboardSummary();
      set({ summary, isLoading: false });
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to fetch dashboard summary',
        isLoading: false,
      });
    }
  },

  fetchParties: async (filter?: PartyFilter) => {
    set({ isLoading: true, error: null });
    try {
      const parties = await dataService.listParties(filter);
      set({ parties, isLoading: false });
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to fetch parties',
        isLoading: false,
      });
    }
  },

  fetchPartyDetails: async (partyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const [party, transactions] = await Promise.all([
        dataService.getParty(partyId),
        dataService.listTransactions({ party_id: partyId }),
      ]);
      set({
        selectedParty: party,
        selectedPartyTransactions: transactions,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to load party details',
        isLoading: false,
      });
    }
  },

  createParty: async (input: CreatePartyInput) => {
    set({ isLoading: true, error: null });
    try {
      const newParty = await dataService.createParty(input);
      // Refresh list & dashboard
      await Promise.all([get().fetchParties(), get().fetchDashboard()]);
      set({ isLoading: false });
      return newParty;
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to create party',
        isLoading: false,
      });
      throw err;
    }
  },

  createTransaction: async (input: CreateTransactionInput) => {
    set({ isLoading: true, error: null });
    try {
      const newTx = await dataService.createTransaction(input);
      // Refresh dashboard, parties list, and if current party is open, reload it
      const promises: Promise<void>[] = [get().fetchDashboard(), get().fetchParties()];
      if (get().selectedParty?.id === input.party_id) {
        promises.push(get().fetchPartyDetails(input.party_id));
      }
      await Promise.all(promises);
      set({ isLoading: false });
      return newTx;
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to create transaction',
        isLoading: false,
      });
      throw err;
    }
  },

  deleteTransaction: async (id: string, partyId?: string) => {
    set({ isLoading: true, error: null });
    try {
      await dataService.deleteTransaction(id);
      const targetPartyId = partyId || get().selectedParty?.id;
      const promises: Promise<void>[] = [get().fetchDashboard(), get().fetchParties()];
      if (targetPartyId) {
        promises.push(get().fetchPartyDetails(targetPartyId));
      }
      await Promise.all(promises);
      set({ isLoading: false });
    } catch (err: any) {
      set({
        error: err?.message || 'Failed to delete transaction',
        isLoading: false,
      });
      throw err;
    }
  },
}));
