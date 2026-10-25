-- BillBook SQL Views & Functions
-- Phase 5: Credit Management and Reports
-- All monetary amounts are BIGINT in paise (1 INR = 100 paise)

-- ============================================================================
-- 1. Outstanding Parties View
-- ============================================================================
-- Returns all active parties with a net positive balance (receivables)
-- Calculates overdue_days using FIFO matching of payments against debit entries
CREATE OR REPLACE VIEW view_outstanding_parties AS
WITH unpaid_drs AS (
    SELECT
        t.party_id,
        t.txn_date,
        p.due_days,
        SUM(t.amount) OVER (PARTITION BY t.party_id ORDER BY t.txn_date ASC, t.created_at ASC) AS cum_dr,
        COALESCE(pb.total_cr + CASE WHEN pb.opening_balance < 0 THEN ABS(pb.opening_balance) ELSE 0 END, 0) AS total_cover
    FROM transactions t
    JOIN parties p ON t.party_id = p.id
    JOIN party_balances pb ON t.party_id = pb.party_id
    WHERE t.deleted_at IS NULL AND t.kind = 'DR'
),
oldest_unpaid AS (
    SELECT
        party_id,
        GREATEST(0, (CURRENT_DATE - (txn_date + due_days))) AS overdue_days,
        ROW_NUMBER() OVER (PARTITION BY party_id ORDER BY txn_date ASC) AS rn
    FROM unpaid_drs
    WHERE cum_dr > total_cover
)
SELECT
    pb.party_id,
    pb.name AS party_name,
    pb.phone,
    pb.balance,
    pb.due_days,
    COALESCE(ou.overdue_days, 0)::INTEGER AS overdue_days
FROM party_balances pb
LEFT JOIN oldest_unpaid ou ON pb.party_id = ou.party_id AND ou.rn = 1
WHERE pb.balance > 0 AND pb.status = 'active'
ORDER BY pb.balance DESC;

-- ============================================================================
-- 2. Payable Parties View
-- ============================================================================
-- Returns all active parties with a net negative balance (shop owes money)
CREATE OR REPLACE VIEW view_payable_parties AS
SELECT
    pb.party_id,
    pb.name AS party_name,
    pb.phone,
    pb.balance,
    pb.due_days
FROM party_balances pb
WHERE pb.balance < 0 AND pb.status = 'active'
ORDER BY pb.balance ASC;

-- ============================================================================
-- 3. Daily Collections View
-- ============================================================================
-- Aggregates credit payments grouped by transaction date
CREATE OR REPLACE VIEW view_daily_collections AS
SELECT
    t.txn_date AS date,
    SUM(t.amount)::BIGINT AS amount,
    COUNT(*)::INTEGER AS count
FROM transactions t
WHERE t.deleted_at IS NULL AND t.kind = 'CR'
GROUP BY t.txn_date
ORDER BY t.txn_date ASC;

-- ============================================================================
-- 4. Credit Report Stored Function (FIFO Payment Matching & Aging)
-- ============================================================================
-- Matches CRs against oldest DRs (First In, First Out) to compute:
-- - average payment delay in days past due_date
-- - aging buckets (0-30, 31-60, 60+ days) for remaining unpaid balance
-- - risk level (low, moderate, high)
CREATE OR REPLACE FUNCTION fn_party_credit_report(p_party_id UUID)
RETURNS TABLE (
    party_id UUID,
    party_name TEXT,
    credit_limit BIGINT,
    total_outstanding BIGINT,
    limit_usage_percent NUMERIC(5, 1),
    avg_payment_delay_days INTEGER,
    days_0_30 BIGINT,
    days_31_60 BIGINT,
    days_60_plus BIGINT,
    last_payment_date DATE,
    last_payment_amount BIGINT,
    risk_level TEXT
) LANGUAGE plpgsql AS $$
DECLARE
    v_party parties%ROWTYPE;
    v_balance BIGINT;
    v_total_outstanding BIGINT;
    v_limit_usage NUMERIC(5, 1);
    v_last_payment_date DATE;
    v_last_payment_amount BIGINT;
    
    v_dr_dates DATE[] := ARRAY[]::DATE[];
    v_dr_dues DATE[] := ARRAY[]::DATE[];
    v_dr_amounts BIGINT[] := ARRAY[]::BIGINT[];
    v_dr_count INT := 0;
    
    v_cr RECORD;
    v_rec RECORD;
    
    v_total_weighted_delay NUMERIC := 0;
    v_total_matched NUMERIC := 0;
    v_avg_delay INTEGER := 0;
    
    v_days_0_30 BIGINT := 0;
    v_days_31_60 BIGINT := 0;
    v_days_60_plus BIGINT := 0;
    v_risk TEXT := 'low';
    
    v_rem_pmt BIGINT;
    v_match BIGINT;
    v_delay INT;
    v_age INT;
    i INT;
BEGIN
    -- 1. Fetch party record
    SELECT * INTO v_party FROM parties WHERE id = p_party_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- 2. Fetch balance from party_balances view
    SELECT pb.balance INTO v_balance FROM party_balances pb WHERE pb.party_id = p_party_id;
    IF v_balance IS NULL THEN
        v_balance := v_party.opening_balance;
    END IF;
    
    v_total_outstanding := GREATEST(0, v_balance);
    
    -- 3. Calculate limit usage percentage
    IF v_party.credit_limit > 0 THEN
        v_limit_usage := ROUND((v_total_outstanding::numeric / v_party.credit_limit::numeric) * 100.0, 1);
    ELSE
        v_limit_usage := 0.0;
    END IF;

    -- 4. Find most recent payment (CR)
    SELECT t.txn_date, t.amount INTO v_last_payment_date, v_last_payment_amount
    FROM transactions t
    WHERE t.party_id = p_party_id AND t.kind = 'CR' AND t.deleted_at IS NULL
    ORDER BY t.txn_date DESC, t.created_at DESC
    LIMIT 1;

    -- 5. Queue opening balance if debit (opening_balance > 0)
    IF v_party.opening_balance > 0 THEN
        v_dr_dates := array_append(v_dr_dates, v_party.created_at::date);
        v_dr_dues := array_append(v_dr_dues, (v_party.created_at::date + v_party.due_days)::date);
        v_dr_amounts := array_append(v_dr_amounts, v_party.opening_balance);
        v_dr_count := v_dr_count + 1;
    END IF;

    -- 6. Queue all DR transactions in chronological order
    FOR v_rec IN 
        SELECT t.txn_date, t.amount
        FROM transactions t
        WHERE t.party_id = p_party_id AND t.kind = 'DR' AND t.deleted_at IS NULL
        ORDER BY t.txn_date ASC, t.created_at ASC
    LOOP
        v_dr_dates := array_append(v_dr_dates, v_rec.txn_date);
        v_dr_dues := array_append(v_dr_dues, (v_rec.txn_date + v_party.due_days)::date);
        v_dr_amounts := array_append(v_dr_amounts, v_rec.amount);
        v_dr_count := v_dr_count + 1;
    END LOOP;

    -- 7. Match CR payments against DR queue FIFO
    FOR v_cr IN 
        SELECT t.txn_date, t.amount
        FROM transactions t
        WHERE t.party_id = p_party_id AND t.kind = 'CR' AND t.deleted_at IS NULL
        ORDER BY t.txn_date ASC, t.created_at ASC
    LOOP
        v_rem_pmt := v_cr.amount;
        IF v_dr_count > 0 THEN
            FOR i IN 1..v_dr_count LOOP
                EXIT WHEN v_rem_pmt <= 0;
                IF v_dr_amounts[i] > 0 THEN
                    v_match := LEAST(v_rem_pmt, v_dr_amounts[i]);
                    v_delay := GREATEST(0, (v_cr.txn_date - v_dr_dues[i]));
                    v_total_weighted_delay := v_total_weighted_delay + (v_match * v_delay);
                    v_total_matched := v_total_matched + v_match;
                    v_dr_amounts[i] := v_dr_amounts[i] - v_match;
                    v_rem_pmt := v_rem_pmt - v_match;
                END IF;
            END LOOP;
        END IF;
    END LOOP;

    -- 8. Compute average payment delay
    IF v_total_matched > 0 THEN
        v_avg_delay := ROUND(v_total_weighted_delay / v_total_matched)::INTEGER;
    ELSE
        v_avg_delay := 0;
    END IF;

    -- 9. Aging buckets for remaining unpaid DR debt
    IF v_total_outstanding > 0 AND v_dr_count > 0 THEN
        FOR i IN 1..v_dr_count LOOP
            IF v_dr_amounts[i] > 0 THEN
                v_age := CURRENT_DATE - v_dr_dates[i];
                IF v_age <= 30 THEN
                    v_days_0_30 := v_days_0_30 + v_dr_amounts[i];
                ELSIF v_age <= 60 THEN
                    v_days_31_60 := v_days_31_60 + v_dr_amounts[i];
                ELSE
                    v_days_60_plus := v_days_60_plus + v_dr_amounts[i];
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- 10. Rule-based risk level assessment
    IF v_limit_usage > 85.0 OR v_days_60_plus > 0 OR v_avg_delay > 30 THEN
        v_risk := 'high';
    ELSIF v_limit_usage > 50.0 OR v_days_31_60 > 0 OR v_avg_delay > 15 THEN
        v_risk := 'moderate';
    ELSE
        v_risk := 'low';
    END IF;

    RETURN QUERY SELECT
        v_party.id,
        v_party.name,
        v_party.credit_limit,
        v_total_outstanding,
        v_limit_usage,
        v_avg_delay,
        v_days_0_30,
        v_days_31_60,
        v_days_60_plus,
        v_last_payment_date,
        v_last_payment_amount,
        v_risk;
END;
$$;
