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
  DayBookReport,
  OutstandingReport,
  PayablesReport,
  CollectionReport,
  CollectionDailyBreakdown,
  WeeklyReport,
  MonthlyReport,
  TopDebtor,
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

// Seed Alerts (5 realistic alert scenarios matching seed_demo.py)
const INITIAL_ALERTS: Alert[] = [
  {
    id: 'al-1',
    party_id: 'p-2',
    party_name: 'Priya Verma',
    kind: 'overdue',
    message: 'Priya Verma has an overdue balance of ₹3,200 past due days (15 days overdue).',
    severity: 'warning',
    dedupe_key: 'overdue_p2',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    read_at: null,
  },
  {
    id: 'al-2',
    party_id: 'p-3',
    party_name: 'Kavita Verma',
    kind: 'credit_limit_exceeded',
    message: 'Kavita Verma: Outstanding balance ₹8,500 exceeds credit limit of ₹5,000.',
    severity: 'critical',
    dedupe_key: 'limit_kavita',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    read_at: null,
  },
  {
    id: 'al-3',
    party_id: 'p-1',
    party_name: 'Suresh Traders',
    kind: 'duplicate_bill',
    message: 'Potential duplicate entry: Two identical ₹2,500 transactions recorded within 4 hours.',
    severity: 'warning',
    dedupe_key: 'dupe_suresh_2500',
    created_at: new Date(Date.now() - 14400000).toISOString(),
    read_at: null,
  },
  {
    id: 'al-4',
    party_id: 'p-5',
    party_name: 'Anand Dairy',
    kind: 'unusual_amount',
    message: 'Unusual amount detected: ₹3,000 transaction is 3.5x higher than 30-day median.',
    severity: 'info',
    dedupe_key: 'spike_anand_3000',
    created_at: new Date(Date.now() - 28800000).toISOString(),
    read_at: null,
  },
  {
    id: 'al-5',
    party_id: 'p-1',
    party_name: 'Rahul Sharma',
    kind: 'repeat_late_payer',
    message: 'Rahul Sharma: 3 consecutive payments settled 12+ days past agreed 7-day terms.',
    severity: 'warning',
    dedupe_key: 'late_rahul',
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

      const report: DayBookReport = {
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

      if (params.format === 'csv') {
        let csv = 'Transaction ID,Date,Party,Type,Amount (Paise),Particulars\n';
        report.entries.forEach((e) => {
          csv += `"${e.transaction_id}","${report.date}","${e.party_name}","${e.kind}",${e.amount},"${e.particulars || ''}"\n`;
        });
        return csv;
      }
      return report;
    }

    if (params.type === 'outstanding') {
      const receivables = parties.filter((p) => p.balance > 0);
      const total_outstanding = receivables.reduce((sum, p) => sum + p.balance, 0);
      const report: OutstandingReport = {
        total_outstanding,
        parties_count: receivables.length,
        parties: receivables.map((p) => ({
          party_id: p.id,
          party_name: p.name,
          phone: p.phone,
          balance: p.balance,
          due_days: p.due_days,
          overdue_days: Math.max(0, p.due_days - 30),
        })),
      };

      if (params.format === 'csv') {
        let csv = 'Party ID,Party Name,Phone,Balance (Paise),Due Days,Overdue Days\n';
        report.parties.forEach((p) => {
          csv += `"${p.party_id}","${p.party_name}","${p.phone || ''}",${p.balance},${p.due_days},${p.overdue_days}\n`;
        });
        return csv;
      }
      return report;
    }

    if (params.type === 'payables') {
      const payables = parties.filter((p) => p.balance < 0 || p.type === 'supplier');
      const total_payable = payables.reduce((sum, p) => sum + Math.abs(p.balance), 0);
      const report: PayablesReport = {
        total_payable,
        suppliers_count: payables.length,
        parties: payables.map((p) => ({
          party_id: p.id,
          party_name: p.name,
          phone: p.phone,
          balance: p.balance,
          due_days: p.due_days,
        })),
      };

      if (params.format === 'csv') {
        let csv = 'Party ID,Party Name,Phone,Payable Balance (Paise),Due Days\n';
        report.parties.forEach((p) => {
          csv += `"${p.party_id}","${p.party_name}","${p.phone || ''}",${Math.abs(p.balance)},${p.due_days}\n`;
        });
        return csv;
      }
      return report;
    }

    if (params.type === 'collection') {
      const startDate = params.start_date || getPastDate(14);
      const endDate = params.end_date || todayStr;
      const collections = txs.filter((t) => t.kind === 'CR');
      const total_collected = collections.reduce((sum, t) => sum + t.amount, 0);

      // Generate 14-day daily breakdown
      const daily_breakdown: CollectionDailyBreakdown[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = getPastDate(i);
        const dayTxs = collections.filter((t) => t.txn_date === d);
        const amt = dayTxs.reduce((sum, t) => sum + t.amount, 0);
        daily_breakdown.push({
          date: d,
          amount: amt || (i % 3 === 0 ? 80000 : i % 2 === 0 ? 120000 : 50000),
          count: dayTxs.length || 1,
        });
      }

      const report: CollectionReport = {
        start_date: startDate,
        end_date: endDate,
        total_collected: total_collected || 3500000,
        collections_count: collections.length || 28,
        daily_breakdown,
      };

      if (params.format === 'csv') {
        let csv = 'Date,Amount Collected (Paise),Transaction Count\n';
        report.daily_breakdown.forEach((b) => {
          csv += `"${b.date}",${b.amount},${b.count}\n`;
        });
        return csv;
      }
      return report;
    }

    if (params.type === 'weekly') {
      const weekStart = params.start_date || getPastDate(6);
      const weekEnd = params.end_date || todayStr;
      const top_debtors: TopDebtor[] = parties
        .filter((p) => p.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 5)
        .map((p) => ({ party_id: p.id, name: p.name, balance: p.balance }));

      const report: WeeklyReport = {
        week_start: weekStart,
        week_end: weekEnd,
        sales_total: 850000, // ₹8,500
        collections_total: 620000, // ₹6,200
        net_change: 230000, // ₹2,300
        sales_growth_percent: 8.5,
        top_debtors,
      };

      if (params.format === 'csv') {
        let csv = 'Metric,Value\n';
        csv += `"Week Start","${report.week_start}"\n`;
        csv += `"Week End","${report.week_end}"\n`;
        csv += `"Total Sales (Paise)",${report.sales_total}\n`;
        csv += `"Total Collections (Paise)",${report.collections_total}\n`;
        csv += `"Net Change (Paise)",${report.net_change}\n`;
        csv += `"Sales Growth (%)",${report.sales_growth_percent}\n\n`;
        csv += 'Top Debtor,Balance (Paise)\n';
        report.top_debtors.forEach((d) => {
          csv += `"${d.name}",${d.balance}\n`;
        });
        return csv;
      }
      return report;
    }

    // Default to monthly
    const targetMonth = params.month || todayStr.substring(0, 7);
    const top_debtors: TopDebtor[] = parties
      .filter((p) => p.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5)
      .map((p) => ({ party_id: p.id, name: p.name, balance: p.balance }));

    const report: MonthlyReport = {
      month: targetMonth,
      sales_total: 3500000, // ₹35,000
      collections_total: 2900000, // ₹29,000
      net_change: 600000, // ₹6,000
      previous_month_comparison: {
        sales_growth_percent: 12.0,
        collections_growth_percent: 5.4,
      },
      top_debtors,
    };

    if (params.format === 'csv') {
      let csv = 'Metric,Value\n';
      csv += `"Month","${report.month}"\n`;
      csv += `"Total Sales (Paise)",${report.sales_total}\n`;
      csv += `"Total Collections (Paise)",${report.collections_total}\n`;
      csv += `"Net Change (Paise)",${report.net_change}\n`;
      csv += `"Sales Growth vs Last Month (%)",${report.previous_month_comparison.sales_growth_percent}\n`;
      csv += `"Collections Growth vs Last Month (%)",${report.previous_month_comparison.collections_growth_percent}\n\n`;
      csv += 'Top Debtor,Balance (Paise)\n';
      report.top_debtors.forEach((d) => {
        csv += `"${d.name}",${d.balance}\n`;
      });
      return csv;
    }
    return report;
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

  // --- AI (5 Real Bills & 5 Voice Clips with Progress & Cancel) ---

  private billSampleIndex = 0;
  private voiceSampleIndex = 0;

  private SAMPLE_BILLS: ExtractionResult[] = [
    {
      party_name: 'Rahul Sharma',
      party_candidates: [
        { id: 'p-1', name: 'Rahul Sharma', phone: '+91 98765 43210', score: 0.96 },
      ],
      kind: 'DR',
      amount: 245000, // ₹2,450
      txn_date: getTodayDate(),
      particulars: 'Kiran Grocery: 2x Basmati rice 5kg, 5L Fortune mustard oil',
      items: [
        { name: 'Basmati Rice 5kg', quantity: 2, rate: 72500, amount: 145000 },
        { name: 'Fortune Mustard Oil 5L', quantity: 1, rate: 100000, amount: 100000 },
      ],
      confidence: 0.95,
      needs_review_fields: [],
    },
    {
      party_name: 'Amit Verma',
      party_candidates: [
        { id: 'p-3', name: 'Amit Verma', phone: '+91 98234 56789', score: 0.91 },
      ],
      kind: 'DR',
      amount: 480000, // ₹4,800
      txn_date: getTodayDate(),
      particulars: 'Wholesale consignment: 2x 25kg Fortune Atta, 10kg Sugar',
      items: [
        { name: 'Fortune Chakki Atta 25kg', quantity: 2, rate: 190000, amount: 380000 },
        { name: 'Refined Sugar 10kg', quantity: 1, rate: 100000, amount: 100000 },
      ],
      confidence: 0.88,
      needs_review_fields: ['particulars'],
    },
    {
      party_name: 'Priya Patel',
      party_candidates: [
        { id: 'p-2', name: 'Priya Patel', phone: '+91 98123 45678', score: 0.94 },
      ],
      kind: 'DR',
      amount: 185000, // ₹1,850
      txn_date: getTodayDate(),
      particulars: 'Laxmi Dairy: 15L fresh buffalo milk, 2kg desi paneer',
      items: [
        { name: 'Buffalo Milk 1L', quantity: 15, rate: 7000, amount: 105000 },
        { name: 'Fresh Paneer 1kg', quantity: 2, rate: 40000, amount: 80000 },
      ],
      confidence: 0.93,
      needs_review_fields: [],
    },
    {
      party_name: 'Suresh Gupta',
      party_candidates: [
        { id: 'p-4', name: 'Suresh Gupta', phone: '+91 98345 67890', score: 0.85 },
      ],
      kind: 'DR',
      amount: 320000, // ₹3,200
      txn_date: getTodayDate(),
      particulars: 'Bharat Spares: 5x LED battens 20W, 2x ceiling fan capacitors',
      items: [
        { name: 'LED Batten 20W', quantity: 5, rate: 40000, amount: 200000 },
        { name: 'Fan Capacitor', quantity: 2, rate: 60000, amount: 120000 },
      ],
      confidence: 0.79,
      needs_review_fields: ['amount', 'party_name'],
    },
    {
      party_name: 'Kisan Wholesale Traders',
      party_candidates: [
        { id: 'p-5', name: 'Kisan Wholesale Traders', phone: '+91 98456 78901', score: 0.98 },
      ],
      kind: 'CR',
      amount: 1500000, // ₹15,000
      txn_date: getTodayDate(),
      particulars: 'UPI payment to supplier against invoice #8091',
      items: [
        { name: 'Organic Fertilizer Bag', quantity: 10, rate: 100000, amount: 1000000 },
        { name: 'Hybrid Seeds Pack', quantity: 5, rate: 100000, amount: 500000 },
      ],
      confidence: 0.96,
      needs_review_fields: [],
    },
  ];

  private SAMPLE_VOICES: ExtractionResult[] = [
    {
      party_name: 'Rahul Sharma',
      party_candidates: [
        { id: 'p-1', name: 'Rahul Sharma', phone: '+91 98765 43210', score: 0.95 },
      ],
      kind: 'DR',
      amount: 250000, // ₹2,500
      txn_date: getTodayDate(),
      particulars: 'Voice: Rahul Sharma ko 2 bori chawal aur 5 litre tel diya',
      items: [
        { name: 'Chawal 10kg', quantity: 2, rate: 100000, amount: 200000 },
        { name: 'Tel 5L', quantity: 1, rate: 50000, amount: 50000 },
      ],
      confidence: 0.94,
      needs_review_fields: [],
    },
    {
      party_name: 'Priya Patel',
      party_candidates: [
        { id: 'p-2', name: 'Priya Patel', phone: '+91 98123 45678', score: 0.96 },
      ],
      kind: 'CR',
      amount: 100000, // ₹1,000
      txn_date: getTodayDate(),
      particulars: 'Voice: Priya Patel ne cash jama karwaya',
      items: [],
      confidence: 0.97,
      needs_review_fields: [],
    },
    {
      party_name: 'Suresh Gupta',
      party_candidates: [
        { id: 'p-4', name: 'Suresh Gupta', phone: '+91 98345 67890', score: 0.88 },
      ],
      kind: 'DR',
      amount: 450000, // ₹4,500
      txn_date: getTodayDate(),
      particulars: 'Voice: Suresh Gupta kal ka udhar 4500 add karo',
      items: [],
      confidence: 0.86,
      needs_review_fields: ['party_name'],
    },
    {
      party_name: 'Amit Verma',
      party_candidates: [
        { id: 'p-3', name: 'Amit Verma', phone: '+91 98234 56789', score: 0.93 },
      ],
      kind: 'CR',
      amount: 300000, // ₹3,000
      txn_date: getTodayDate(),
      particulars: 'Voice: Amit Verma Google Pay se 3000 prapt hua',
      items: [],
      confidence: 0.95,
      needs_review_fields: [],
    },
    {
      party_name: 'Kisan Wholesale Traders',
      party_candidates: [
        { id: 'p-5', name: 'Kisan Wholesale Traders', phone: '+91 98456 78901', score: 0.95 },
      ],
      kind: 'CR',
      amount: 1000000, // ₹10,000
      txn_date: getTodayDate(),
      particulars: 'Voice: Kisan Wholesale ko 10000 cheque payment kiya',
      items: [],
      confidence: 0.91,
      needs_review_fields: [],
    },
  ];

  async extractFromMedia(
    fileUri: string,
    mediaType: 'image' | 'audio',
    options?: {
      onProgress?: (percent: number) => void;
      signal?: AbortSignal;
    }
  ): Promise<ExtractionResult> {
    if (options?.signal?.aborted) {
      throw new Error('Upload cancelled by user');
    }

    // Step 1: 25%
    options?.onProgress?.(25);
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (options?.signal?.aborted) throw new Error('Upload cancelled by user');

    // Step 2: 50%
    options?.onProgress?.(50);
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (options?.signal?.aborted) throw new Error('Upload cancelled by user');

    // Step 3: 75%
    options?.onProgress?.(75);
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (options?.signal?.aborted) throw new Error('Upload cancelled by user');

    // Step 4: 100%
    options?.onProgress?.(100);

    if (mediaType === 'audio') {
      const result = this.SAMPLE_VOICES[this.voiceSampleIndex % this.SAMPLE_VOICES.length];
      this.voiceSampleIndex++;
      return { ...result, txn_date: getTodayDate() };
    }

    const result = this.SAMPLE_BILLS[this.billSampleIndex % this.SAMPLE_BILLS.length];
    this.billSampleIndex++;
    return { ...result, txn_date: getTodayDate() };
  }

  async sendChat(message: string, history?: ChatMessage[]): Promise<ChatResponse> {
    const q = message.toLowerCase().trim();

    // 1. Off-topic check
    if (
      q.includes('weather') ||
      q.includes('mausam') ||
      q.includes('recipe') ||
      q.includes('khana') ||
      q.includes('joke') ||
      q.includes('poem') ||
      q.includes('code') ||
      q.includes('cricket')
    ) {
      const isHindi = q.includes('mausam') || q.includes('khana');
      return {
        reply: isHindi
          ? 'मैं KhataAI हूँ और केवल आपकी दुकान के हिसाब-किताब, ग्राहकों के बकाए और वित्तीय रिपोर्ट में मदद कर सकता हूँ। कृपया दुकान से जुड़ा प्रश्न पूछें।'
          : 'I am KhataAI, your shop assistant. I can only help with customer accounts, balances, transactions, and store summaries. Please ask an accounting-related question.',
        tool_calls: [],
      };
    }

    // 2. Who owes me the most / Sabse zyada baki
    if (
      q.includes('who owes') ||
      q.includes('most') ||
      q.includes('sabse zyada') ||
      q.includes('sabse jyada') ||
      q.includes('top debtor') ||
      q.includes('debtor')
    ) {
      return {
        reply:
          'Based on your ledger records, Priya Verma owes you the most with an outstanding balance of ₹3,200, followed by Amit Patel (₹3,000) and Rahul Sharma (₹1,500).',
        tool_calls: [
          {
            name: 'list_top_debtors',
            arguments: { limit: 3 },
            result: [
              { name: 'Priya Verma', balance: 320000 },
              { name: 'Amit Patel', balance: 300000 },
              { name: 'Rahul Sharma', balance: 150000 },
            ],
          },
        ],
      };
    }

    // 3. Weekly / Sales performance
    if (
      q.includes('week') ||
      q.includes('sales') ||
      q.includes('hafte') ||
      q.includes('bikri') ||
      q.includes('kamai')
    ) {
      return {
        reply:
          "This week's sales stand at ₹8,400 with ₹4,500 collected from customers. Net change in store credit is +₹3,900 with healthy turnover across 6 active orders.",
        tool_calls: [
          {
            name: 'get_period_summary',
            arguments: { period: 'weekly' },
            result: { sales_total: 840000, collections_total: 450000, net_change: 390000 },
          },
        ],
      };
    }

    // 4. Overdue / Late payments
    if (
      q.includes('overdue') ||
      q.includes('late') ||
      q.includes('due') ||
      q.includes('baki') ||
      q.includes('tarikh')
    ) {
      return {
        reply:
          'You currently have 1 overdue customer: Priya Verma has an overdue balance of ₹3,200 that is 15 days past her agreed payment term. Rahul Sharma also has ₹1,500 pending.',
        tool_calls: [
          {
            name: 'list_overdue_parties',
            arguments: { min_days_overdue: 1 },
            result: [{ name: 'Priya Verma', balance: 320000, days_overdue: 15 }],
          },
        ],
      };
    }

    // 5. Party specific balance queries
    if (q.includes('rahul')) {
      return {
        reply:
          'Rahul Sharma has a current balance of ₹1,500 (receivable). Total credit taken: ₹3,500, payments settled: ₹2,000. Credit limit is ₹50,000.',
        tool_calls: [
          {
            name: 'get_party_balance',
            arguments: { party_name: 'Rahul Sharma' },
            result: { name: 'Rahul Sharma', balance: 150000, balance_type: 'receivable' },
          },
        ],
      };
    }

    if (q.includes('priya')) {
      return {
        reply:
          'Priya Verma has a balance of ₹3,200 (receivable). Her account is flagged for 15 days overdue past her 15-day credit period.',
        tool_calls: [
          {
            name: 'get_party_balance',
            arguments: { party_name: 'Priya Verma' },
            result: { name: 'Priya Verma', balance: 320000, balance_type: 'receivable' },
          },
        ],
      };
    }

    if (q.includes('amit')) {
      return {
        reply:
          'Amit Patel has an outstanding balance of ₹3,000 (receivable) with an opening balance of ₹500 and credit limit of ₹1,00,000.',
        tool_calls: [
          {
            name: 'get_party_balance',
            arguments: { party_name: 'Amit Patel' },
            result: { name: 'Amit Patel', balance: 300000, balance_type: 'receivable' },
          },
        ],
      };
    }

    if (q.includes('kisan')) {
      return {
        reply:
          'Kisan Wholesale Traders has a payable balance of ₹12,000 (supplier credit you owe to them).',
        tool_calls: [
          {
            name: 'get_party_balance',
            arguments: { party_name: 'Kisan Wholesale Traders' },
            result: { name: 'Kisan Wholesale Traders', balance: -1200000, balance_type: 'payable' },
          },
        ],
      };
    }

    if (q.includes('balaji')) {
      return {
        reply:
          'Balaji Provisions has a payable balance of ₹8,000 (supplier balance).',
        tool_calls: [
          {
            name: 'get_party_balance',
            arguments: { party_name: 'Balaji Provisions' },
            result: { name: 'Balaji Provisions', balance: -800000, balance_type: 'payable' },
          },
        ],
      };
    }

    if (q.includes('sunita')) {
      return {
        reply:
          'Sunita Gupta has ₹0 balance. All prior bills totaling ₹1,800 have been fully settled via PhonePe.',
        tool_calls: [
          {
            name: 'get_party_balance',
            arguments: { party_name: 'Sunita Gupta' },
            result: { name: 'Sunita Gupta', balance: 0, balance_type: 'settled' },
          },
        ],
      };
    }

    // Default: Overall Dashboard Summary
    return {
      reply:
        'Your shop summary: Total customer receivables are ₹7,700 across 3 active debtors. Total payable to suppliers is ₹20,000. Today you recorded ₹1,500 in new credit sales.',
      tool_calls: [
        {
          name: 'get_dashboard_summary',
          arguments: {},
          result: { total_receivable: 770000, total_payable: 2000000, today_dr: 150000 },
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
