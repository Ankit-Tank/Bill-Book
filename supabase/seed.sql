-- BillBook Seed Data
-- Demo Shop: "Gupta Kirana Store"
-- 6 Parties (4 Customers, 2 Suppliers) and 20 Active Transactions (+ 1 Soft-Deleted)
-- All money amounts are stored as BIGINT in paise (1 INR = 100 paise)

-- Clear existing data if re-seeding
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE alerts CASCADE;
TRUNCATE TABLE ai_messages CASCADE;
TRUNCATE TABLE parties CASCADE;

-- ============================================================================
-- 1. Parties (6 Parties)
-- ============================================================================
INSERT INTO parties (id, name, phone, type, opening_balance, credit_limit, due_days, status, created_at)
VALUES
    ('f47ac10b-58cc-4372-a567-0e02b2c3d471', 'Rahul Sharma', '+919876543210', 'customer', 0, 5000000, 30, 'active', now() - interval '30 days'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d472', 'Priya Patel', '+919811223344', 'customer', 50000, 3000000, 15, 'active', now() - interval '28 days'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d473', 'Amit Verma', '+919822334455', 'customer', 0, 2000000, 30, 'active', now() - interval '25 days'),
    ('f47ac10b-58cc-4372-a567-0e02b2c3d474', 'Sunita Devi', '+919833445566', 'customer', 100000, 1500000, 7, 'active', now() - interval '24 days'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567891', 'Kisan Wholesale Traders', '+919844556677', 'supplier', -500000, 0, 15, 'active', now() - interval '30 days'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567892', 'Balaji Provisions Distributor', '+919855667788', 'supplier', 0, 0, 21, 'active', now() - interval '20 days');

-- ============================================================================
-- 2. Transactions (20 Active Transactions + 1 Soft-Deleted)
-- ============================================================================
INSERT INTO transactions (id, party_id, kind, amount, txn_date, particulars, source, bill_image_path, created_at, deleted_at)
VALUES
    -- Today's Transactions (Current Date)
    -- Txn 1: Rahul Sharma (DR 150000)
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e401', 'f47ac10b-58cc-4372-a567-0e02b2c3d471', 'DR', 150000, CURRENT_DATE, '2 bags basmati rice, 5L mustard oil', 'photo', 'bills/2026-10/bill_01.jpg', now() - interval '2 hours', NULL),
    -- Txn 2: Priya Patel (CR 80000)
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e402', 'f47ac10b-58cc-4372-a567-0e02b2c3d472', 'CR', 80000, CURRENT_DATE, 'PhonePe UPI payment', 'manual', NULL, now() - interval '3 hours', NULL),
    -- Txn 3: Amit Verma (DR 65000)
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e403', 'f47ac10b-58cc-4372-a567-0e02b2c3d473', 'DR', 65000, CURRENT_DATE, 'Spices and refined sunflower oil', 'voice', NULL, now() - interval '4 hours', NULL),
    -- Txn 4: Sunita Devi (CR 40000)
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e404', 'f47ac10b-58cc-4372-a567-0e02b2c3d474', 'CR', 40000, CURRENT_DATE, 'Cash payment part settlement', 'manual', NULL, now() - interval '5 hours', NULL),

    -- Rahul Sharma History
    -- Txn 5: Rahul Sharma DR 250000
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e405', 'f47ac10b-58cc-4372-a567-0e02b2c3d471', 'DR', 250000, CURRENT_DATE - 5, 'Wheat flour 50kg, sugar 10kg', 'manual', NULL, now() - interval '5 days', NULL),
    -- Txn 6: Rahul Sharma CR 100000
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e406', 'f47ac10b-58cc-4372-a567-0e02b2c3d471', 'CR', 100000, CURRENT_DATE - 3, 'Google Pay payment', 'manual', NULL, now() - interval '3 days', NULL),

    -- Priya Patel History
    -- Txn 7: Priya Patel DR 120000
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e407', 'f47ac10b-58cc-4372-a567-0e02b2c3d472', 'DR', 120000, CURRENT_DATE - 12, 'Toor dal 5kg, moong dal 2kg', 'photo', 'bills/2026-10/bill_02.jpg', now() - interval '12 days', NULL),
    -- Txn 8: Priya Patel CR 50000
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e408', 'f47ac10b-58cc-4372-a567-0e02b2c3d472', 'CR', 50000, CURRENT_DATE - 10, 'Cash deposit', 'manual', NULL, now() - interval '10 days', NULL),
    -- Txn 9: Priya Patel DR 85000
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e409', 'f47ac10b-58cc-4372-a567-0e02b2c3d472', 'DR', 85000, CURRENT_DATE - 2, 'Dairy products and tea powder', 'manual', NULL, now() - interval '2 days', NULL),

    -- Amit Verma History
    -- Txn 10: Amit Verma DR 180000
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e410', 'f47ac10b-58cc-4372-a567-0e02b2c3d473', 'DR', 180000, CURRENT_DATE - 18, 'Dry fruits and cow ghee 2kg', 'manual', NULL, now() - interval '18 days', NULL),
    -- Txn 11: Amit Verma CR 100000
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e411', 'f47ac10b-58cc-4372-a567-0e02b2c3d473', 'CR', 100000, CURRENT_DATE - 14, 'Paytm transfer', 'manual', NULL, now() - interval '14 days', NULL),
    -- Txn 12: Amit Verma DR 95000
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e412', 'f47ac10b-58cc-4372-a567-0e02b2c3d473', 'DR', 95000, CURRENT_DATE - 7, 'Snacks and packaged goods', 'voice', NULL, now() - interval '7 days', NULL),

    -- Sunita Devi History
    -- Txn 13: Sunita Devi DR 90000
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e413', 'f47ac10b-58cc-4372-a567-0e02b2c3d474', 'DR', 90000, CURRENT_DATE - 22, 'Cosmetics and soap bulk pack', 'manual', NULL, now() - interval '22 days', NULL),
    -- Txn 14: Sunita Devi CR 60000
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e414', 'f47ac10b-58cc-4372-a567-0e02b2c3d474', 'CR', 60000, CURRENT_DATE - 15, 'UPI transfer', 'manual', NULL, now() - interval '15 days', NULL),
    -- Txn 15: Sunita Devi DR 75000
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e415', 'f47ac10b-58cc-4372-a567-0e02b2c3d474', 'DR', 75000, CURRENT_DATE - 4, 'Household cleaning items', 'manual', NULL, now() - interval '4 days', NULL),

    -- Kisan Wholesale Traders (Supplier) History
    -- Txn 16: Kisan CR 700000
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e416', 'a1b2c3d4-e5f6-7890-abcd-ef1234567891', 'CR', 700000, CURRENT_DATE - 25, 'Invoice #KW-9021 wholesale pulses', 'manual', NULL, now() - interval '25 days', NULL),
    -- Txn 17: Kisan DR 200000
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e417', 'a1b2c3d4-e5f6-7890-abcd-ef1234567891', 'DR', 200000, CURRENT_DATE - 20, 'Bank NEFT payment to supplier', 'manual', NULL, now() - interval '20 days', NULL),
    -- Txn 18: Kisan CR 200000
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e418', 'a1b2c3d4-e5f6-7890-abcd-ef1234567891', 'CR', 200000, CURRENT_DATE - 10, 'Invoice #KW-9114 spices restock', 'manual', NULL, now() - interval '10 days', NULL),

    -- Balaji Provisions Distributor (Supplier) History
    -- Txn 19: Balaji CR 450000
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e419', 'a1b2c3d4-e5f6-7890-abcd-ef1234567892', 'CR', 450000, CURRENT_DATE - 16, 'Invoice #BP-442 edible oil containers', 'manual', NULL, now() - interval '16 days', NULL),
    -- Txn 20: Balaji DR 150000
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e420', 'a1b2c3d4-e5f6-7890-abcd-ef1234567892', 'DR', 150000, CURRENT_DATE - 8, 'Cheque payment clearance', 'manual', NULL, now() - interval '8 days', NULL),

    -- Soft-Deleted Transaction (Must be excluded by API)
    ('e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e499', 'f47ac10b-58cc-4372-a567-0e02b2c3d471', 'DR', 50000, CURRENT_DATE - 1, 'Erroneous duplicate entry', 'manual', NULL, now() - interval '1 day', now() - interval '12 hours');
