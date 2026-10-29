# BillBook 📖

> **Smart Khata & Multimodal Credit Ledger for Indian Merchants**  
> Built with **React Native (Expo)** + **Python Flask** + **Supabase PostgreSQL** + **Google Gemini API**.  
> Monorepo maintained by **Team Thunderbytes** (Avnish, Krishna, Ankit).

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Expo](https://img.shields.io/badge/Expo-SDK_58-000020.svg?logo=expo)](https://expo.dev)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python)](https://python.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg?logo=supabase)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini_2.5_Flash-8E75C4.svg?logo=google)](https://ai.google.dev)
[![Web Demo](https://img.shields.io/badge/Web_Demo-PieHost-FF6B6B.svg)](https://billbook.piehost.com)

---

## 1. Project Overview & Features

BillBook replaces paper bahi-khatas with an intelligent digital ledger tailored to Indian local retail merchants:

1. **Strict Integer Paise Money Handling**: All balances, debits, credits, and reports use integer paise ($1\text{ INR} = 100\text{ paise}$). Zero floating-point rounding drift across SQLite, PostgreSQL, and JavaScript.
2. **Double-Entry Style Accounting**:
   - **DR (Debit)**: Credit sales given to customer (Customer owes shopkeeper $\rightarrow$ Receivable Red Card).
   - **CR (Credit)**: Repayments received from customer (Decreases balance $\rightarrow$ Green Card).
   - $\text{Balance} = \text{Opening Balance} + \sum\text{DR} - \sum\text{CR}$.
3. **Multimodal AI Bill Scanner**: Upload or capture printed/handwritten invoices. Gemini 2.5 Flash extracts party names, itemized lines, taxes, and amounts directly into the ledger.
4. **Voice Transaction Memo**: Hold-to-record voice notes in Hindi, Hinglish, or English (e.g., *"Ramesh ko 500 rupaye ka rashan diya"*). Gemini parses and pre-fills the transaction.
5. **KhataAI Conversational Copilot**: Ask questions in English, Hindi, or Hinglish (*"Who owes me the most?"*, *"Rahul Sharma ka balance kya hai?"*). Guardrailed function calling ensures responses come only from database ledger numbers.
6. **Credit Risk & Customer Reports**: Instant credit score calculation (0–100), aging buckets (0–30, 31–60, 60+ days), and average payment delay tracking.
7. **Proactive Business Alerts**: Automated alerts for overdue accounts, credit limit breaches, duplicate receipts within 24 hours, and unusual spike transactions.
8. **Export & Sharing**: One-tap CSV download with UTF-8 BOM encoding for seamless opening in Microsoft Excel.

---

## 2. Monorepo Structure

```
Bill-Book/
├── mobile/                      # Expo React Native client (iOS, Android, Web)
│   ├── app/                     # File-based routing (Expo Router)
│   │   ├── (tabs)/              # Bottom tabs: Dashboard, Parties, Reports, More
│   │   ├── party/[id]/          # Customer ledger detail & profile editor
│   │   ├── transaction/         # Manual, camera scan, voice capture & AI confirm
│   │   ├── assistant.tsx        # KhataAI chat copilot screen
│   │   ├── alerts.tsx           # Risk & overdue radar alerts screen
│   │   └── _layout.tsx          # Root stack + desktop 480px width framing
│   ├── src/
│   │   ├── components/          # AppHeader, Card, PrimaryButton, AmountText, etc.
│   │   ├── features/            # Assistant, Alerts, Capture, Reports modules
│   │   ├── services/            # dataService, apiDataService, mockDataService, apiClient
│   │   ├── store/               # Zustand state stores
│   │   ├── theme/               # Colors (#0A5C3E, #FEFCE8, #E3AE00, #D6001C)
│   │   └── types/               # TypeScript domain contracts
│   └── .env.example
├── backend/                     # Flask REST API backend
│   ├── app/
│   │   ├── routes/              # health, parties, transactions, dashboard, reports, alerts, ai
│   │   ├── services/            # extraction, assistant, narration, alerts, balances
│   │   ├── prompts/             # Gemini system prompts & schemas
│   │   ├── config.py            # Environment configuration
│   │   └── db.py                # PostgreSQL connection pool
│   ├── scripts/
│   │   └── seed_demo.py         # Demo shop seeder with all 5 alert scenarios
│   ├── tests/                   # Pytest test suite
│   ├── wsgi.py                  # Server entry point
│   ├── requirements.txt         # Python dependencies
│   └── .env.example
├── supabase/
│   ├── schema.sql               # PostgreSQL tables, indexes & party_balances view
│   └── views.sql                # Analytical views
├── docs/
│   ├── ROADMAP.md               # 10-phase architecture roadmap
│   ├── api.md                   # REST API specification
│   └── demo-script.md           # 60-second judge demo script
└── README.md
```

---

## 3. Quickstart from Fresh Clone

You can run both the mobile app and backend from this README alone.

### 3.1 Prerequisites
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- **Python** 3.10, 3.11, or 3.12
- **Expo Go** app on your physical iOS or Android phone (or a web browser)

---

### 3.2 Mobile App Setup (`mobile/`)

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Copy the environment configuration:
   ```bash
   cp .env.example .env
   # On Windows PowerShell:
   # Copy-Item .env.example .env
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Verify code quality:
   ```bash
   npm run typecheck
   npm run lint
   ```

5. Start the Expo development server:
   ```bash
   # For physical phone via Expo Go:
   npx expo start

   # For desktop web preview:
   npx expo start --web
   ```

6. Export production web build (PieHost):
   ```bash
   npx expo export --platform web
   # Generated files will be in mobile/dist/
   ```

---

### 3.3 Backend REST API Setup (`backend/`)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   # On Windows PowerShell:
   # Copy-Item .env.example .env
   ```

3. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv

   # On Linux/macOS:
   source venv/bin/activate

   # On Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Seed the demo shop (creates 6 realistic parties and triggers all 5 alert scenarios):
   ```bash
   python scripts/seed_demo.py
   ```

6. Start the Flask API server:
   ```bash
   python wsgi.py
   # Server listens on http://localhost:5000 (or PORT from .env)
   ```

7. Verify health:
   ```bash
   curl http://localhost:5000/health
   # Returns: {"status": "healthy", "version": "1.0.0"}
   ```

---

## 4. Environment Variables & Secret Hygiene

### Backend (`backend/.env`)
| Variable | Description | Security Note |
|---|---|---|
| `DATABASE_URL` | Supabase / PostgreSQL connection string | Kept secret on backend |
| `API_KEY` | Internal client authentication key (`billbook-secret-dev-key`) | Kept secret on backend |
| `GEMINI_API_KEY` | Google Gemini API Key | **STRICTLY ON BACKEND ONLY**. Never exposed to client. |
| `GEMINI_MODEL` | Gemini model name (default: `gemini-2.5-flash`) | Backend only |
| `PORT` | Flask server listening port (default: `5000`) | Internal |

### Mobile Client (`mobile/.env`)
| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | HTTPS base URL of Flask REST API (e.g. `https://billbook-api.onrender.com/api/v1`) |
| `EXPO_PUBLIC_API_KEY` | Matching client authentication key (`billbook-secret-dev-key`) |
| `EXPO_PUBLIC_USE_MOCK` | Set `false` for live Supabase API; set `true` for offline demo mode |

> [!IMPORTANT]
> **Zero Secrets in Repository**: No API keys or credentials are committed to version control. `mobile/.env` and `backend/.env` are strictly included in `.gitignore`. Google Gemini API calls are mediated exclusively through backend service routes.

---

## 5. Offline Mock Fallback Resilience

BillBook is architected with complete offline resilience:
- Setting `EXPO_PUBLIC_USE_MOCK=true` runs the app entirely against local `AsyncStorage` with pre-seeded demo merchants and 20 ledger transactions.
- In live mode (`EXPO_PUBLIC_USE_MOCK=false`), if the cloud backend is sleeping or encounters a network disruption, `apiDataService` automatically and quietly falls back to `mockDataService`. The user never encounters a blank screen or unhandled exception.

---

## 6. Smoke Test Verification Suite (25 Steps)

All 25 end-to-end features have been systematically verified against the live API:

| # | Feature / Test Step | Route / Action | Result |
|---|---|---|---|
| 1 | Service Health Check | `GET /health` | ✅ 200 OK |
| 2 | Dashboard Summary | `GET /dashboard/summary` | ✅ 200 OK |
| 3 | Parties Directory | `GET /parties` | ✅ 200 OK |
| 4 | Party Ledger Profile | `GET /parties/:id` | ✅ 200 OK |
| 5 | Party Transactions | `GET /transactions?party_id=` | ✅ 200 OK |
| 6 | Record Credit Sale (DR) | `POST /transactions` | ✅ 201 Created |
| 7 | Record Payment Received (CR) | `POST /transactions` | ✅ 201 Created |
| 8 | Edit Transaction | `PATCH /transactions/:id` | ✅ 200 OK |
| 9 | Soft Delete Transaction | `DELETE /transactions/:id` | ✅ 200 OK |
| 10 | Create New Party | `POST /parties` | ✅ 201 Created |
| 11 | Update Party Settings | `PATCH /parties/:id` | ✅ 200 OK |
| 12 | Archive Party | `POST /parties/:id/archive` | ✅ 200 OK |
| 13 | Delete Party | `DELETE /parties/:id` | ✅ 200 OK |
| 14 | Customer Credit Risk Report | `GET /parties/:id/credit-report` | ✅ 200 OK |
| 15 | Multimodal Bill Upload | `POST /ai/extract` (Image) | ✅ 200 OK / Fallback |
| 16 | Voice Memo Transaction | `POST /ai/extract` (Audio) | ✅ 200 OK / Fallback |
| 17 | AI Confirmation Form | `app/transaction/confirm.tsx` | ✅ UI Verified |
| 18 | Day Book Report | `GET /reports/day-book` | ✅ 200 OK |
| 19 | Outstanding Receivables Report | `GET /reports/outstanding` | ✅ 200 OK |
| 20 | Payables / Supplier Report | `GET /reports/payables` | ✅ 200 OK |
| 21 | Weekly & Monthly Summaries | `GET /reports/weekly`, `/reports/monthly` | ✅ 200 OK |
| 22 | CSV Spreadsheet Export | `GET /reports/outstanding?format=csv` | ✅ 200 OK (UTF-8 BOM) |
| 23 | KhataAI Copilot Chat | `POST /ai/chat` | ✅ 200 OK / Fallback |
| 24 | Proactive Radar Alerts | `GET /alerts`, `POST /alerts/:id/read` | ✅ 200 OK / Fallback |
| 25 | Shop Profile & Settings | Editable AsyncStorage `@billbook_shop_profile` | ✅ UI Verified |

---

## 7. Team Thunderbytes Code Ownership

To ensure fair review and zero merge conflicts across parallel phases:

| Component | Owner | Responsibilities |
|---|---|---|
| **UI / UX & Frontend** | **Avnish Sharma** | Mobile design system, theme tokens (`colors.ts`), shared UI components, navigation layouts (`_layout.tsx`, `(tabs)`), Shop Profile, web desktop framing |
| **API & Database** | **Krishna** | Flask REST API factory (`__init__.py`), database connection pool (`db.py`), PostgreSQL schema and views (`party_balances`), reports engine, alerts engine, Dockerfile |
| **AI & Architecture** | **Ankit Tank** | Gemini multimodal extraction client, KhataAI assistant service, function calling tools, prompt templates, prompt injection defense |

---

## 8. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
