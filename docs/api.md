# BillBook REST API Specification

**Version:** 1.0.0  
**Base URL:** `/api/v1`  
**Authentication:** Header `X-API-Key: <internal_api_key>`  
**Data Format:** JSON (snake_case) for all JSON requests and responses  
**Money Units:** All monetary values are integers in **paise** (1 INR = 100 paise; e.g., ₹50.00 = `5000`).

---

## 1. Global Standards

### 1.1 Headers
All requests must include:
```http
X-API-Key: your_api_key_here
Content-Type: application/json
Accept: application/json
```
*(Note: `POST /api/v1/ai/extract` expects `Content-Type: multipart/form-data` instead).*

### 1.2 Error Response Format
All errors return the standard error envelope with an appropriate HTTP status code (`400`, `401`, `403`, `404`, `422`, `500`):

```json
{
  "error": {
    "code": "PARTY_NOT_FOUND",
    "message": "Party with ID f47ac10b-58cc-4372-a567-0e02b2c3d479 was not found."
  }
}
```

Common Error Codes:
- `UNAUTHORIZED`: Invalid or missing `X-API-Key`
- `INVALID_INPUT`: Request body failed validation
- `PARTY_NOT_FOUND`: Party ID does not exist
- `TRANSACTION_NOT_FOUND`: Transaction ID does not exist
- `ALERT_NOT_FOUND`: Alert ID does not exist
- `EXTRACTION_FAILED`: Media could not be parsed by AI
- `INTERNAL_ERROR`: Unexpected server error

---

## 2. Health Check

### `GET /health`
Returns the status of the service and database connectivity.

**Request:**
```http
GET /api/v1/health HTTP/1.1
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-10-25T12:00:00Z"
}
```

---

## 3. Parties

### `GET /parties`
List parties with their live balance calculated from the `party_balances` view.

**Query Parameters:**
- `type` (optional): `customer` | `supplier`
- `status` (optional): `active` | `archived` (default: `active`)
- `search` (optional): substring match on name or phone

**Request:**
```http
GET /api/v1/parties?status=active&type=customer HTTP/1.1
```

**Response (200 OK):**
```json
{
  "parties": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "Rahul Sharma",
      "phone": "+919876543210",
      "type": "customer",
      "opening_balance": 0,
      "credit_limit": 5000000,
      "due_days": 30,
      "status": "active",
      "total_dr": 250000,
      "total_cr": 100000,
      "balance": 150000,
      "created_at": "2026-10-20T09:00:00Z"
    }
  ],
  "total": 1
}
```

### `POST /parties`
Create a new customer or supplier party.

**Request:**
```http
POST /api/v1/parties HTTP/1.1
Content-Type: application/json

{
  "name": "Rahul Sharma",
  "phone": "+919876543210",
  "type": "customer",
  "opening_balance": 0,
  "credit_limit": 5000000,
  "due_days": 30
}
```

**Response (201 Created):**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Rahul Sharma",
  "phone": "+919876543210",
  "type": "customer",
  "opening_balance": 0,
  "credit_limit": 5000000,
  "due_days": 30,
  "status": "active",
  "total_dr": 0,
  "total_cr": 0,
  "balance": 0,
  "created_at": "2026-10-25T12:10:00Z"
}
```

### `GET /parties/:id`
Retrieve party profile and ledger summary by ID.

**Request:**
```http
GET /api/v1/parties/f47ac10b-58cc-4372-a567-0e02b2c3d479 HTTP/1.1
```

**Response (200 OK):**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Rahul Sharma",
  "phone": "+919876543210",
  "type": "customer",
  "opening_balance": 0,
  "credit_limit": 5000000,
  "due_days": 30,
  "status": "active",
  "total_dr": 250000,
  "total_cr": 100000,
  "balance": 150000,
  "created_at": "2026-10-20T09:00:00Z"
}
```

### `PATCH /parties/:id`
Update editable party fields.

**Request:**
```http
PATCH /api/v1/parties/f47ac10b-58cc-4372-a567-0e02b2c3d479 HTTP/1.1
Content-Type: application/json

{
  "credit_limit": 7500000,
  "due_days": 45
}
```

**Response (200 OK):**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "name": "Rahul Sharma",
  "phone": "+919876543210",
  "type": "customer",
  "opening_balance": 0,
  "credit_limit": 7500000,
  "due_days": 45,
  "status": "active",
  "total_dr": 250000,
  "total_cr": 100000,
  "balance": 150000,
  "created_at": "2026-10-20T09:00:00Z"
}
```

### `DELETE /parties/:id`
Delete a party if eligible.

**Request:**
```http
DELETE /api/v1/parties/f47ac10b-58cc-4372-a567-0e02b2c3d479 HTTP/1.1
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Party deleted successfully"
}
```

### `POST /parties/:id/archive`
Archive an active party without deleting historical ledger records.

**Request:**
```http
POST /api/v1/parties/f47ac10b-58cc-4372-a567-0e02b2c3d479/archive HTTP/1.1
```

**Response (200 OK):**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "archived",
  "message": "Party archived successfully"
}
```

---

## 4. Transactions

### `GET /transactions`
List active transactions. Soft-deleted transactions (`deleted_at IS NOT NULL`) are omitted.

**Query Parameters:**
- `party_id` (optional): Filter by specific party UUID
- `kind` (optional): `DR` | `CR`
- `start_date` (optional): `YYYY-MM-DD`
- `end_date` (optional): `YYYY-MM-DD`

**Request:**
```http
GET /api/v1/transactions?party_id=f47ac10b-58cc-4372-a567-0e02b2c3d479 HTTP/1.1
```

**Response (200 OK):**
```json
{
  "transactions": [
    {
      "id": "e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e456",
      "party_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "party_name": "Rahul Sharma",
      "kind": "DR",
      "amount": 250000,
      "txn_date": "2026-10-24",
      "particulars": "2 bags basmati rice, 5L mustard oil",
      "source": "manual",
      "bill_image_path": null,
      "created_at": "2026-10-24T14:30:00Z",
      "deleted_at": null
    }
  ],
  "total": 1
}
```

### `POST /transactions`
Create a new transaction (`DR` for credit sale or `CR` for payment received).

**Request:**
```http
POST /api/v1/transactions HTTP/1.1
Content-Type: application/json

{
  "party_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "kind": "DR",
  "amount": 250000,
  "txn_date": "2026-10-24",
  "particulars": "2 bags basmati rice, 5L mustard oil",
  "source": "manual",
  "bill_image_path": null
}
```

**Response (201 Created):**
```json
{
  "id": "e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e456",
  "party_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "party_name": "Rahul Sharma",
  "kind": "DR",
  "amount": 250000,
  "txn_date": "2026-10-24",
  "particulars": "2 bags basmati rice, 5L mustard oil",
  "source": "manual",
  "bill_image_path": null,
  "created_at": "2026-10-24T14:30:00Z",
  "deleted_at": null
}
```

### `PATCH /transactions/:id`
Update an existing transaction.

**Request:**
```http
PATCH /api/v1/transactions/e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e456 HTTP/1.1
Content-Type: application/json

{
  "amount": 260000,
  "particulars": "2 bags basmati rice + 1 packet salt"
}
```

**Response (200 OK):**
```json
{
  "id": "e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e456",
  "party_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "party_name": "Rahul Sharma",
  "kind": "DR",
  "amount": 260000,
  "txn_date": "2026-10-24",
  "particulars": "2 bags basmati rice + 1 packet salt",
  "source": "manual",
  "bill_image_path": null,
  "created_at": "2026-10-24T14:30:00Z",
  "deleted_at": null
}
```

### `DELETE /transactions/:id`
Soft-delete a transaction (sets `deleted_at = now()`).

**Request:**
```http
DELETE /api/v1/transactions/e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e456 HTTP/1.1
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Transaction soft-deleted successfully",
  "deleted_at": "2026-10-25T12:15:00Z"
}
```

---

## 5. Dashboard Summary

### `GET /dashboard/summary`
Get high-level business health metrics (total receivable, payable, net, today DR/CR, recent transactions).

**Request:**
```http
GET /api/v1/dashboard/summary HTTP/1.1
```

**Response (200 OK):**
```json
{
  "total_receivable": 4500000,
  "total_payable": 1200000,
  "net_balance": 3300000,
  "today_dr": 150000,
  "today_cr": 80000,
  "recent_transactions": [
    {
      "id": "e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e456",
      "party_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "party_name": "Rahul Sharma",
      "kind": "DR",
      "amount": 250000,
      "txn_date": "2026-10-25",
      "particulars": "2 bags basmati rice",
      "source": "photo",
      "bill_image_path": "bills/2026-10/bill_01.jpg",
      "created_at": "2026-10-25T10:15:00Z"
    }
  ]
}
```

---

## 6. AI Extraction

### `POST /ai/extract`
Send an uploaded bill photo or voice audio clip to extract structured transaction data.

> [!NOTE]
> **Audio Format Compatibility:** The Expo mobile app records voice notes in `.m4a` format (AAC in MP4 container). Google Gemini multimodal API accepts `audio/mp4` and `audio/aac`. On the backend, uploaded `.m4a` files are automatically normalized to `audio/mp4` (or transcoded to 16kHz mono WAV via `ffmpeg` if installed) ensuring seamless end-to-end compatibility.

**Request:**
```http
POST /api/v1/ai/extract HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="bill_photo.jpg"
Content-Type: image/jpeg

<binary image or audio data>
------WebKitFormBoundary
Content-Disposition: form-data; name="media_type"

image
------WebKitFormBoundary--
```

**Response (200 OK - Exact Section 3.3 Shape):**
```json
{
  "party_name": "Rahul Sharma",
  "party_candidates": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "Rahul Sharma",
      "phone": "+919876543210",
      "score": 0.95
    }
  ],
  "kind": "DR",
  "amount": 250000,
  "txn_date": "2026-10-25",
  "particulars": "2 bags basmati rice, 5L mustard oil",
  "items": [
    {
      "name": "Basmati Rice",
      "quantity": 2,
      "rate": 100000,
      "amount": 200000
    },
    {
      "name": "Mustard Oil 5L",
      "quantity": 1,
      "rate": 50000,
      "amount": 50000
    }
  ],
  "confidence": 0.92,
  "needs_review_fields": []
}
```

---

## 7. Credit Management

### `GET /parties/:id/credit-report`
Detailed risk profile, aging buckets, and payment behavior for a party.

**Request:**
```http
GET /api/v1/parties/f47ac10b-58cc-4372-a567-0e02b2c3d479/credit-report HTTP/1.1
```

**Response (200 OK):**
```json
{
  "party_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "party_name": "Rahul Sharma",
  "credit_limit": 5000000,
  "total_outstanding": 150000,
  "limit_usage_percent": 3.0,
  "avg_payment_delay_days": 4,
  "aging_buckets": {
    "days_0_30": 100000,
    "days_31_60": 50000,
    "days_60_plus": 0
  },
  "last_payment_date": "2026-10-22",
  "last_payment_amount": 50000,
  "risk_level": "low"
}
```

---

## 8. Reports

All report endpoints support JSON or CSV export via query parameter `?format=csv`.

### `GET /reports/day-book`
Day-by-day log of all debit sales and credit collections.

**Query Parameters:**
- `date` (optional, default: current date): `YYYY-MM-DD`
- `format` (optional): `json` | `csv`

**Response (200 OK):**
```json
{
  "date": "2026-10-25",
  "total_dr": 150000,
  "total_cr": 80000,
  "net_change": 70000,
  "entries": [
    {
      "transaction_id": "e7b0e1a8-8b9a-4e2a-bb34-8c01d9f8e456",
      "party_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "party_name": "Rahul Sharma",
      "kind": "DR",
      "amount": 150000,
      "particulars": "2 bags basmati rice",
      "created_at": "2026-10-25T10:15:00Z"
    }
  ]
}
```

### `GET /reports/outstanding`
All parties who currently owe money (receivables).

**Query Parameters:**
- `format` (optional): `json` | `csv`

**Response (200 OK):**
```json
{
  "total_outstanding": 4500000,
  "parties_count": 12,
  "parties": [
    {
      "party_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "party_name": "Rahul Sharma",
      "phone": "+919876543210",
      "balance": 150000,
      "due_days": 30,
      "overdue_days": 0
    }
  ]
}
```

### `GET /reports/payables`
All parties the shop currently owes money to (suppliers or advance credit).

**Query Parameters:**
- `format` (optional): `json` | `csv`

**Response (200 OK):**
```json
{
  "total_payable": 1200000,
  "suppliers_count": 3,
  "parties": [
    {
      "party_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "party_name": "Kisan Wholesale Traders",
      "phone": "+919811223344",
      "balance": -1200000,
      "due_days": 15
    }
  ]
}
```

### `GET /reports/collection`
Summary of payment recoveries (CR) across a date window.

**Query Parameters:**
- `start_date` (optional, default: 30 days ago): `YYYY-MM-DD`
- `end_date` (optional, default: current date): `YYYY-MM-DD`
- `format` (optional): `json` | `csv`

**Response (200 OK):**
```json
{
  "start_date": "2026-10-01",
  "end_date": "2026-10-25",
  "total_collected": 3500000,
  "collections_count": 28,
  "daily_breakdown": [
    {
      "date": "2026-10-25",
      "amount": 80000,
      "count": 2
    }
  ]
}
```

### `GET /reports/weekly`
Weekly comparison: sales, collections, net balance change, top debtors.

**Query Parameters:**
- `start_date` (optional, default: 6 days ago): `YYYY-MM-DD`
- `end_date` (optional, default: current date): `YYYY-MM-DD`
- `format` (optional): `json` | `csv`

**Response (200 OK):**
```json
{
  "week_start": "2026-10-19",
  "week_end": "2026-10-25",
  "sales_total": 850000,
  "collections_total": 620000,
  "net_change": 230000,
  "sales_growth_percent": 8.5,
  "top_debtors": [
    {
      "party_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "Rahul Sharma",
      "balance": 150000
    }
  ]
}
```

### `GET /reports/monthly`
Monthly overview and trends.

**Query Parameters:**
- `month` (optional, default: current month `YYYY-MM`): `YYYY-MM`
- `format` (optional): `json` | `csv`

**Response (200 OK):**
```json
{
  "month": "2026-10",
  "sales_total": 3500000,
  "collections_total": 2900000,
  "net_change": 600000,
  "previous_month_comparison": {
    "sales_growth_percent": 12.0,
    "collections_growth_percent": 5.4
  },
  "top_debtors": [
    {
      "party_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "Rahul Sharma",
      "balance": 150000
    }
  ]
}
```

---

## 9. KhataAI Assistant

### `POST /ai/chat`
Ask questions in English, Hindi, or Hinglish regarding customer balances, sales, and overdue accounts.

**Request:**
```http
POST /api/v1/ai/chat HTTP/1.1
Content-Type: application/json

{
  "message": "Who owes the most money right now?",
  "history": [
    {
      "role": "user",
      "content": "Namaste"
    },
    {
      "role": "assistant",
      "content": "Namaste! How can I assist you with your shop accounts today?"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "reply": "Rahul Sharma currently has the highest outstanding balance of ₹1,500 due for payment.",
  "tool_calls": [
    {
      "name": "list_top_debtors",
      "arguments": {
        "limit": 5
      },
      "result": [
        {
          "party_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
          "name": "Rahul Sharma",
          "balance": 150000
        }
      ]
    }
  ]
}
```

### `POST /ai/narrate`
Generate a 3-4 sentence plain language voice/text summary for reports or credit reports.

**Request:**
```http
POST /api/v1/ai/narrate HTTP/1.1
Content-Type: application/json

{
  "report_type": "credit-report",
  "data": {
    "party_name": "Rahul Sharma",
    "credit_limit": 5000000,
    "total_outstanding": 150000,
    "avg_payment_delay_days": 4,
    "risk_level": "low"
  }
}
```

**Response (200 OK):**
```json
{
  "narration": "Rahul Sharma has a reliable payment record with an average delay of only 4 days. His total outstanding balance is ₹1,500, which is well within his ₹50,000 credit limit. He remains in the low risk category."
}
```

---

## 10. Alerts Engine

### `GET /alerts`
List business alerts (overdue payments, credit limit exceeded, duplicate bills, unusual amounts).

**Query Parameters:**
- `unread_only` (optional, default: `false`): `true` | `false`

**Request:**
```http
GET /api/v1/alerts?unread_only=true HTTP/1.1
```

**Response (200 OK):**
```json
{
  "alerts": [
    {
      "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "party_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "party_name": "Rahul Sharma",
      "kind": "credit_limit_exceeded",
      "message": "Rahul Sharma has exceeded their credit limit of ₹50,000.",
      "severity": "warning",
      "dedupe_key": "limit_exceeded_f47ac10b_20261025",
      "created_at": "2026-10-25T08:00:00Z",
      "read_at": null
    }
  ],
  "unread_count": 1
}
```

### `POST /alerts/:id/read`
Mark a single alert as read.

**Request:**
```http
POST /api/v1/alerts/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/read HTTP/1.1
```

**Response (200 OK):**
```json
{
  "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "read_at": "2026-10-25T12:20:00Z"
}
```

### `POST /alerts/run`
Trigger manual background evaluation of alert rules across parties and transactions.

**Request:**
```http
POST /api/v1/alerts/run HTTP/1.1
```

**Response (200 OK):**
```json
{
  "triggered_count": 1,
  "evaluated_rules": 5,
  "timestamp": "2026-10-25T12:21:00Z"
}
```
