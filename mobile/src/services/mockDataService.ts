/**
 * BillBook Mock Data Service (Phase 1)
 * 
 * Implements the DataService interface with AsyncStorage persistence.
 * Contains ~6 parties and ~20 realistic transactions.
 * All money amounts are integers in paise.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataService } from './dataService';
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

const STORAGE_KEYS = {
  PARTIES: '@billbook_parties_v1',
  TRANSACTIONS: '@billbook_transactions_v1',
  ALERTS: '@billbook_alerts_v1',
};

// Today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const getPastDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

// Initial Seed Parties (6 parties)
const INITIAL_PARTIES: Party[] = [
  {
    id: 'p-1',
    name: 'Rahul Sharma',
    phone: '+91 98765 43210',
    type: 'customer',
    opening_balance: 0,
    credit_limit: 5000000, // ₹50,000
    due_days: 30,
    status: 'active',
    total_dr: 350000, // ₹3,500
    total_cr: 200000, // ₹2,000
    balance: 150000,  // ₹1,500 receivable
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'p-2',
    name: 'Priya Verma',
    phone: '+91 98123 45678',
    type: 'customer',
    opening_balance: 0,
    credit_limit: 3000000, // ₹30,000
    due_days: 15,
    status: 'active',
    total_dr: 420000, // ₹4,200
    total_cr: 100000, // ₹1,000
    balance: 320000,  // ₹3,200 receivable
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'p-3',
    name: 'Amit Patel',
    phone: '+91 97234 56789',
    type: 'customer',
    opening_balance: 50000, // ₹500 opening
    credit_limit: 10000000, // ₹1,00,000
    due_days: 45,
    status: 'active',
    total_dr: 650000, // ₹6,500
    total_cr: 400000, // ₹4,000
    balance: 300000,  // ₹3,000 receivable
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'p-4',
    name: 'Kisan Wholesale Traders',
    phone: '+91 98112 23344',
    type: 'supplier',
    opening_balance: 0,
    credit_limit: 20000000, // ₹2,00,000
    due_days: 15,
    status: 'active',
    total_dr: 0,
    total_cr: 1200000, // ₹12,000 payment received/balance owed to them
    balance: -1200000, // ₹12,000 payable
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'p-5',
    name: 'Sunita Gupta',
    phone: '+91 99887 76655',
    type: 'customer',
    opening_balance: 0,
    credit_limit: 4000000, // ₹40,000
    due_days: 30,
    status: 'active',
    total_dr: 180000, // ₹1,800
    total_cr: 180000, // ₹1,800
    balance: 0,       // Settled
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'p-6',
    name: 'Balaji Provisions',
    phone: '+91 94567 89012',
    type: 'supplier',
    opening_balance: 0,
    credit_limit: 15000000, // ₹1,50,000
    due_days: 20,
    status: 'active',
    total_dr: 0,
    total_cr: 800000, // ₹8,000
    balance: -800000, // ₹8,000 payable
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

// Initial Seed Transactions (20 transactions)
const today = getTodayDate();
const INITIAL_TRANSACTIONS: Transaction[] = [
  // Today's transactions
  {
    id: 'tx-1',
    party_id: 'p-1',
    party_name: 'Rahul Sharma',
    kind: 'DR',
    amount: 150000, // ₹1,500
    txn_date: today,
    particulars: '2 bags basmati rice, 5L mustard oil',
    source: 'manual',
    bill_image_path: null,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-2',
    party_id: 'p-2',
    party_name: 'Priya Verma',
    kind: 'DR',
    amount: 120000, // ₹1,200
    txn_date: today,
    particulars: 'Organic honey and dry fruits',
    source: 'photo',
    bill_image_path: 'bills/sample-bill-1.jpg',
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-3',
    party_id: 'p-1',
    party_name: 'Rahul Sharma',
    kind: 'CR',
    amount: 100000, // ₹1,000
    txn_date: today,
    particulars: 'Google Pay transfer',
    source: 'manual',
    bill_image_path: null,
    created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    deleted_at: null,
  },
  // Yesterday and recent transactions
  {
    id: 'tx-4',
    party_id: 'p-3',
    party_name: 'Amit Patel',
    kind: 'DR',
    amount: 250000, // ₹2,500
    txn_date: getPastDate(1),
    particulars: 'Assorted spices and flour 20kg',
    source: 'manual',
    bill_image_path: null,
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-5',
    party_id: 'p-2',
    party_name: 'Priya Verma',
    kind: 'DR',
    amount: 300000, // ₹3,000
    txn_date: getPastDate(2),
    particulars: 'Monthly grocery refill',
    source: 'voice',
    bill_image_path: null,
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-6',
    party_id: 'p-2',
    party_name: 'Priya Verma',
    kind: 'CR',
    amount: 100000, // ₹1,000
    txn_date: getPastDate(3),
    particulars: 'Cash installment payment',
    source: 'manual',
    bill_image_path: null,
    created_at: new Date(Date.now() - 72 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-7',
    party_id: 'p-1',
    party_name: 'Rahul Sharma',
    kind: 'DR',
    amount: 200000, // ₹2,000
    txn_date: getPastDate(4),
    particulars: 'Tea, sugar, dairy items',
    source: 'manual',
    bill_image_path: null,
    created_at: new Date(Date.now() - 96 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-8',
    party_id: 'p-1',
    party_name: 'Rahul Sharma',
    kind: 'CR',
    amount: 100000, // ₹1,000
    txn_date: getPastDate(5),
    particulars: 'Paytm payment received',
    source: 'manual',
    bill_image_path: null,
    created_at: new Date(Date.now() - 120 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-9',
    party_id: 'p-3',
    party_name: 'Amit Patel',
    kind: 'CR',
    amount: 200000, // ₹2,000
    txn_date: getPastDate(6),
    particulars: 'UPI payment from HDFC bank',
    source: 'manual',
    bill_image_path: null,
    created_at: new Date(Date.now() - 144 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-10',
    party_id: 'p-3',
    party_name: 'Amit Patel',
    kind: 'DR',
    amount: 400000, // ₹4,000
    txn_date: getPastDate(8),
    particulars: 'Bulk pulses and refined oil',
    source: 'manual',
    bill_image_path: null,
    created_at: new Date(Date.now() - 192 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-11',
    party_id: 'p-3',
    party_name: 'Amit Patel',
    kind: 'CR',
    amount: 200000, // ₹2,000
    txn_date: getPastDate(10),
    particulars: 'Cash payment on counter',
    source: 'manual',
    bill_image_path: null,
    created_at: new Date(Date.now() - 240 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-12',
    party_id: 'p-5',
    party_name: 'Sunita Gupta',
    kind: 'DR',
    amount: 180000, // ₹1,800
    txn_date: getPastDate(11),
    particulars: 'Spices and snacks pack',
    source: 'manual',
    bill_image_path: null,
    created_at: new Date(Date.now() - 264 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-13',
    party_id: 'p-5',
    party_name: 'Sunita Gupta',
    kind: 'CR',
    amount: 180000, // ₹1,800
    txn_date: getPastDate(9),
    particulars: 'Full bill clearance via PhonePe',
    source: 'manual',
    bill_image_path: null,
    created_at: new Date(Date.now() - 216 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-14',
    party_id: 'p-4',
    party_name: 'Kisan Wholesale Traders',
    kind: 'CR',
    amount: 800000, // ₹8,000
    txn_date: getPastDate(12),
    particulars: 'Stock consignment invoice #4092',
    source: 'photo',
    bill_image_path: 'bills/sample-supplier-1.jpg',
    created_at: new Date(Date.now() - 288 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-15',
    party_id: 'p-4',
    party_name: 'Kisan Wholesale Traders',
    kind: 'CR',
    amount: 400000, // ₹4,000
    txn_date: getPastDate(14),
    particulars: 'Additional delivery bags',
    source: 'manual',
    bill_image_path: null,
    created_at: new Date(Date.now() - 336 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-16',
    party_id: 'p-6',
    party_name: 'Balaji Provisions',
    kind: 'CR',
    amount: 500000, // ₹5,000
    txn_date: getPastDate(15),
    particulars: 'Wholesale grains batch A',
    source: 'manual',
    bill_image_path: null,
    created_at: new Date(Date.now() - 360 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-17',
    party_id: 'p-6',
    party_name: 'Balaji Provisions',
    kind: 'CR',
    amount: 300000, // ₹3,000
    txn_date: getPastDate(17),
    particulars: 'Soap and detergents carton',
    source: 'manual',
    bill_image_path: null,
    created_at: new Date(Date.now() - 408 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-18',
    party_id: 'p-1',
    party_name: 'Rahul Sharma',
    kind: 'DR',
    amount: 80000, // ₹800
    txn_date: getPastDate(19),
    particulars: 'Cooking gas & matches',
    source: 'manual',
    bill_image_path: null,
    created_at: new Date(Date.now() - 456 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-19',
    party_id: 'p-1',
    party_name: 'Rahul Sharma',
    kind: 'CR',
    amount: 80000, // ₹800
    txn_date: getPastDate(18),
    particulars: 'Cash payment',
    source: 'manual',
    bill_image_path: null,
    created_at: new Date(Date.now() - 432 * 3600000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'tx-20',
    party_id: 'p-3',
    party_name: 'Amit Patel',
    kind: 'DR',
    amount: 50000, // ₹500
    txn_date: getPastDate(20),
    particulars: 'Emergency sugar 5kg',
    source: 'manual',
    bill_image_path: null,
    created_at: new Date(Date.now() - 480 * 3600000).toISOString(),
    deleted_at: null,
  },
];

// Seed Alerts
const INITIAL_ALERTS: Alert[] = [
  {
    id: 'al-1',
    party_id: 'p-2',
    party_name: 'Priya Verma',
    kind: 'overdue',
    message: 'Priya Verma has an overdue balance of ₹3,200 past due days (15 days).',
    severity: 'warning',
    dedupe_key: 'overdue_p2',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    read_at: null,
  },
  {
    id: 'al-2',
    party_id: 'p-1',
    party_name: 'Rahul Sharma',
    kind: 'repeat_late_payer',
    message: 'Rahul Sharma usually clears invoices 4 days past agreed terms.',
    severity: 'info',
    dedupe_key: 'late_p1',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    read_at: null,
  },
];

class MockDataService implements DataService {
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    try {
      const partiesJson = await AsyncStorage.getItem(STORAGE_KEYS.PARTIES);
      const txsJson = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);

      if (!partiesJson) {
        await AsyncStorage.setItem(STORAGE_KEYS.PARTIES, JSON.stringify(INITIAL_PARTIES));
      }
      if (!txsJson) {
        await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
      }
      const alertsJson = await AsyncStorage.getItem(STORAGE_KEYS.ALERTS);
      if (!alertsJson) {
        await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(INITIAL_ALERTS));
      }
      this.initialized = true;
    } catch (e) {
      console.warn('Failed to initialize mock data store:', e);
    }
  }

  private async getStoredParties(): Promise<Party[]> {
    await this.ensureInitialized();
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PARTIES);
    return raw ? JSON.parse(raw) : INITIAL_PARTIES;
  }

  private async saveStoredParties(parties: Party[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.PARTIES, JSON.stringify(parties));
  }

  private async getStoredTransactions(): Promise<Transaction[]> {
    await this.ensureInitialized();
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return raw ? JSON.parse(raw) : INITIAL_TRANSACTIONS;
  }

  private async saveStoredTransactions(txs: Transaction[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
  }

  /**
   * Recalculate party total_dr, total_cr, and balance from active transactions
   */
  private recalculatePartyBalance(party: Party, transactions: Transaction[]): Party {
    const activeTxs = transactions.filter(
      (t) => t.party_id === party.id && !t.deleted_at
    );
    const total_dr = activeTxs
      .filter((t) => t.kind === 'DR')
      .reduce((sum, t) => sum + t.amount, 0);
    const total_cr = activeTxs
      .filter((t) => t.kind === 'CR')
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = (party.opening_balance || 0) + total_dr - total_cr;

    return {
      ...party,
      total_dr,
      total_cr,
      balance,
    };
  }

  // --- Parties ---

  async listParties(filter?: PartyFilter): Promise<Party[]> {
    const parties = await this.getStoredParties();
    const txs = await this.getStoredTransactions();

    let computed = parties.map((p) => this.recalculatePartyBalance(p, txs));

    if (filter) {
      if (filter.status) {
        computed = computed.filter((p) => p.status === filter.status);
      } else {
        // default to active
        computed = computed.filter((p) => p.status === 'active');
      }
      if (filter.type) {
        computed = computed.filter((p) => p.type === filter.type);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase().trim();
        computed = computed.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.phone && p.phone.toLowerCase().includes(q))
        );
      }
    }

    // Sort by name
    return computed.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getParty(id: string): Promise<Party> {
    const parties = await this.getStoredParties();
    const party = parties.find((p) => p.id === id);
    if (!party) {
      throw new Error(`Party with ID ${id} was not found.`);
    }
    const txs = await this.getStoredTransactions();
    return this.recalculatePartyBalance(party, txs);
  }

  async createParty(input: CreatePartyInput): Promise<Party> {
    const parties = await this.getStoredParties();
    const opening = input.opening_balance || 0;
    const newParty: Party = {
      id: `party-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      type: input.type,
      opening_balance: opening,
      credit_limit: input.credit_limit || 0,
      due_days: input.due_days || 30,
      status: 'active',
      total_dr: 0,
      total_cr: 0,
      balance: opening,
      created_at: new Date().toISOString(),
    };

    parties.push(newParty);
    await this.saveStoredParties(parties);
    return newParty;
  }

  async updateParty(id: string, input: UpdatePartyInput): Promise<Party> {
    const parties = await this.getStoredParties();
    const index = parties.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Party with ID ${id} was not found.`);
    }

    const current = parties[index];
    const updated: Party = {
      ...current,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.phone !== undefined && { phone: input.phone ? input.phone.trim() : null }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.opening_balance !== undefined && { opening_balance: input.opening_balance }),
      ...(input.credit_limit !== undefined && { credit_limit: input.credit_limit }),
      ...(input.due_days !== undefined && { due_days: input.due_days }),
      ...(input.status !== undefined && { status: input.status }),
    };

    parties[index] = updated;
    await this.saveStoredParties(parties);

    const txs = await this.getStoredTransactions();
    return this.recalculatePartyBalance(updated, txs);
  }

  async archiveParty(id: string): Promise<Party> {
    return this.updateParty(id, { status: 'archived' });
  }

  async deleteParty(id: string): Promise<void> {
    const parties = await this.getStoredParties();
    const filtered = parties.filter((p) => p.id !== id);
    await this.saveStoredParties(filtered);
  }

  // --- Transactions ---

  async listTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
    const txs = await this.getStoredTransactions();
    let active = txs.filter((t) => !t.deleted_at);

    if (filter) {
      if (filter.party_id) {
        active = active.filter((t) => t.party_id === filter.party_id);
      }
      if (filter.kind) {
        active = active.filter((t) => t.kind === filter.kind);
      }
      if (filter.start_date) {
        active = active.filter((t) => t.txn_date >= filter.start_date!);
      }
      if (filter.end_date) {
        active = active.filter((t) => t.txn_date <= filter.end_date!);
      }
    }

    // Sort by created_at / txn_date descending (newest first)
    return active.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const parties = await this.getStoredParties();
    const party = parties.find((p) => p.id === input.party_id);
    const partyName = party ? party.name : 'Unknown Party';

    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      party_id: input.party_id,
      party_name: partyName,
      kind: input.kind,
      amount: Math.round(input.amount),
      txn_date: input.txn_date || getTodayDate(),
      particulars: input.particulars?.trim() || null,
      source: input.source || 'manual',
      bill_image_path: input.bill_image_path || null,
      created_at: new Date().toISOString(),
      deleted_at: null,
    };

    const txs = await this.getStoredTransactions();
    txs.unshift(newTx);
    await this.saveStoredTransactions(txs);

    // Update party balance snapshot if needed
    if (party) {
      const updatedParty = this.recalculatePartyBalance(party, txs);
      const partyIdx = parties.findIndex((p) => p.id === party.id);
      if (partyIdx !== -1) {
        parties[partyIdx] = updatedParty;
        await this.saveStoredParties(parties);
      }
    }

    return newTx;
  }

  async updateTransaction(id: string, input: UpdateTransactionInput): Promise<Transaction> {
    const txs = await this.getStoredTransactions();
    const index = txs.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Transaction with ID ${id} was not found.`);
    }

    const current = txs[index];
    const updated: Transaction = {
      ...current,
      ...(input.party_id && { party_id: input.party_id }),
      ...(input.kind && { kind: input.kind }),
      ...(input.amount !== undefined && { amount: Math.round(input.amount) }),
      ...(input.txn_date && { txn_date: input.txn_date }),
      ...(input.particulars !== undefined && { particulars: input.particulars ? input.particulars.trim() : null }),
    };

    txs[index] = updated;
    await this.saveStoredTransactions(txs);
    return updated;
  }

  async deleteTransaction(id: string): Promise<void> {
    const txs = await this.getStoredTransactions();
    const index = txs.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Transaction with ID ${id} was not found.`);
    }

    // Soft delete
    txs[index].deleted_at = new Date().toISOString();
    await this.saveStoredTransactions(txs);

    // Recalculate party balance
    const partyId = txs[index].party_id;
    const parties = await this.getStoredParties();
    const partyIdx = parties.findIndex((p) => p.id === partyId);
    if (partyIdx !== -1) {
      parties[partyIdx] = this.recalculatePartyBalance(parties[partyIdx], txs);
      await this.saveStoredParties(parties);
    }
  }

  // --- Dashboard ---

  async getDashboardSummary(): Promise<DashboardSummary> {
    const parties = await this.listParties({ status: 'active' });
    const txs = await this.getStoredTransactions();
    const activeTxs = txs.filter((t) => !t.deleted_at);

    // Sum receivable (parties with positive balance) and payable (parties with negative balance)
    let total_receivable = 0;
    let total_payable = 0;

    parties.forEach((p) => {
      if (p.balance > 0) {
        total_receivable += p.balance;
      } else if (p.balance < 0) {
        total_payable += Math.abs(p.balance);
      }
    });

    const net_balance = total_receivable - total_payable;

    // Today's DR and CR
    const todayStr = getTodayDate();
    const todayTxs = activeTxs.filter((t) => t.txn_date === todayStr);
    const today_dr = todayTxs
      .filter((t) => t.kind === 'DR')
      .reduce((sum, t) => sum + t.amount, 0);
    const today_cr = todayTxs
      .filter((t) => t.kind === 'CR')
      .reduce((sum, t) => sum + t.amount, 0);

    // Recent 10 transactions
    const recent_transactions = [...activeTxs]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    return {
      total_receivable,
      total_payable,
      net_balance,
      today_dr,
      today_cr,
      recent_transactions,
    };
  }

  // --- Credit Management ---

  async getCreditReport(partyId: string): Promise<CreditReport> {
    const party = await this.getParty(partyId);
    const txs = await this.listTransactions({ party_id: partyId });

    const total_outstanding = Math.max(0, party.balance);
    const limit = party.credit_limit || 5000000;
    const limit_usage_percent = limit > 0 ? Math.round((total_outstanding / limit) * 1000) / 10 : 0;

    // Find last payment (CR)
    const crTxs = txs.filter((t) => t.kind === 'CR');
    const lastPayment = crTxs[0] || null;

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

  // --- Reports (Mock fallback) ---

  async getReport(params: ReportParams): Promise<ReportData | string> {
    const parties = await this.listParties();
    const todayStr = getTodayDate();
    const txs = await this.listTransactions();

    if (params.type === 'day-book') {
      const targetDate = params.date || todayStr;
      const dayTxs = txs.filter((t) => t.txn_date === targetDate);
      const total_dr = dayTxs.filter((t) => t.kind === 'DR').reduce((sum, t) => sum + t.amount, 0);
      const total_cr = dayTxs.filter((t) => t.kind === 'CR').reduce((sum, t) => sum + t.amount, 0);

      return {
        date: targetDate,
        total_dr,
        total_cr,
        net_change: total_dr - total_cr,
        entries: dayTxs.map((t) => ({
          transaction_id: t.id,
          party_id: t.party_id,
          party_name: t.party_name || 'Customer',
          kind: t.kind,
          amount: t.amount,
          particulars: t.particulars,
          created_at: t.created_at,
        })),
      };
    }

    // Default to outstanding
    const receivables = parties.filter((p) => p.balance > 0);
    return {
      total_outstanding: receivables.reduce((sum, p) => sum + p.balance, 0),
      parties_count: receivables.length,
      parties: receivables.map((p) => ({
        party_id: p.id,
        party_name: p.name,
        phone: p.phone,
        balance: p.balance,
        due_days: p.due_days,
        overdue_days: 0,
      })),
    };
  }

  // --- Alerts ---

  async listAlerts(filter?: AlertFilter): Promise<Alert[]> {
    await this.ensureInitialized();
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.ALERTS);
    let alerts: Alert[] = raw ? JSON.parse(raw) : INITIAL_ALERTS;

    if (filter?.unread_only) {
      alerts = alerts.filter((a) => !a.read_at);
    }
    return alerts;
  }

  async markAlertRead(id: string): Promise<void> {
    const alerts = await this.listAlerts();
    const idx = alerts.findIndex((a) => a.id === id);
    if (idx !== -1) {
      alerts[idx].read_at = new Date().toISOString();
      await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
    }
  }

  // --- AI (Mock responses) ---

  async extractFromMedia(fileUri: string, mediaType: 'image' | 'audio'): Promise<ExtractionResult> {
    return {
      party_name: 'Rahul Sharma',
      party_candidates: [
        {
          id: 'p-1',
          name: 'Rahul Sharma',
          phone: '+91 98765 43210',
          score: 0.95,
        },
      ],
      kind: 'DR',
      amount: 250000, // ₹2,500
      txn_date: getTodayDate(),
      particulars: 'Extracted: 2 bags basmati rice, 5L mustard oil',
      items: [
        { name: 'Basmati Rice 10kg', quantity: 2, rate: 100000, amount: 200000 },
        { name: 'Mustard Oil 5L', quantity: 1, rate: 50000, amount: 50000 },
      ],
      confidence: 0.94,
      needs_review_fields: [],
    };
  }

  async sendChat(message: string, history?: ChatMessage[]): Promise<ChatResponse> {
    return {
      reply: `Based on your Khata ledger records: Your current total receivable is ₹7,700 and total payable is ₹20,000. Rahul Sharma has ₹1,500 outstanding.`,
      tool_calls: [
        {
          name: 'get_dashboard_summary',
          arguments: {},
          result: { total_receivable: 770000, total_payable: 2000000 },
        },
      ],
    };
  }

  async narrateReport(reportType: string, data: Record<string, unknown>): Promise<NarrationResponse> {
    return {
      narration: `Your ledger currently shows steady collections. Total customer receivables stand within safe limits with 0 critical overdue accounts today.`,
    };
  }

  /**
   * Helper to reset storage to default seed data for demos
   */
  async resetToSeedData(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.PARTIES, JSON.stringify(INITIAL_PARTIES));
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
    await AsyncStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(INITIAL_ALERTS));
  }
}

export const mockDataService = new MockDataService();
