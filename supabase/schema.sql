-- BillBook Database Schema
-- Supabase Postgres (Kickoff Contract)
-- All money amounts are stored as BIGINT in paise (1 INR = 100 paise)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Parties Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    type TEXT NOT NULL CHECK (type IN ('customer', 'supplier')),
    opening_balance BIGINT NOT NULL DEFAULT 0, -- in paise
    credit_limit BIGINT NOT NULL DEFAULT 0,    -- in paise (0 = no limit set)
    due_days INTEGER NOT NULL DEFAULT 30,      -- credit duration in days
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. Transactions Table
-- ============================================================================
-- DR = customer owes shop (credit sale)
-- CR = payment received (payment from customer)
-- Soft delete pattern using deleted_at
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('DR', 'CR')),
    amount BIGINT NOT NULL CHECK (amount > 0), -- in paise
    txn_date DATE NOT NULL DEFAULT CURRENT_DATE,
    particulars TEXT,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'photo', 'voice')),
    bill_image_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Index required by Section 3.2 for fast party ledger & date-range queries
CREATE INDEX IF NOT EXISTS idx_transactions_party_date ON transactions(party_id, txn_date);

-- Index for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON transactions(deleted_at);

-- ============================================================================
-- 3. Alerts Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    dedupe_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_party_id ON alerts(party_id);
CREATE INDEX IF NOT EXISTS idx_alerts_read_at ON alerts(read_at);

-- ============================================================================
-- 4. AI Messages Table (KhataAI chat history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_messages(created_at);

-- ============================================================================
-- 5. Party Balances View
-- ============================================================================
-- balance = opening_balance + sum(DR) - sum(CR), ignoring soft-deleted rows
-- Positive balance = receivable (red card / customer owes shop)
-- Negative balance = payable or advance (green card / shop owes party)
CREATE OR REPLACE VIEW party_balances AS
SELECT
    p.id,
    p.id AS party_id,
    p.name,
    p.phone,
    p.type,
    p.status,
    p.opening_balance,
    p.credit_limit,
    p.due_days,
    COALESCE(SUM(CASE WHEN t.kind = 'DR' THEN t.amount ELSE 0 END), 0)::BIGINT AS total_dr,
    COALESCE(SUM(CASE WHEN t.kind = 'CR' THEN t.amount ELSE 0 END), 0)::BIGINT AS total_cr,
    (
        p.opening_balance +
        COALESCE(SUM(CASE WHEN t.kind = 'DR' THEN t.amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.kind = 'CR' THEN t.amount ELSE 0 END), 0)
    )::BIGINT AS balance,
    p.created_at
FROM parties p
LEFT JOIN transactions t ON t.party_id = p.id AND t.deleted_at IS NULL
GROUP BY
    p.id,
    p.name,
    p.phone,
    p.type,
    p.status,
    p.opening_balance,
    p.credit_limit,
    p.due_days,
    p.created_at;
