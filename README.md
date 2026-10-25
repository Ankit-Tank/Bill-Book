# BillBook 📖

> **Smart Khata for Indian Shopkeepers**  
> Built by **Team Thunderbytes** with React Native (Expo) + Flask + Supabase Postgres + Google Gemini API.

---

## 1. Project Overview

BillBook is a mobile-first digital khata (ledger) application designed for local Indian merchants to track credit sales (**DR**) and customer repayments (**CR**). The application features:

- **Multimodal AI Bill & Voice Parsing**: Instantly parse printed/handwritten receipts and Hindi/Hinglish voice notes into structured transactions via Google Gemini.
- **Strict Money Calculation**: Zero rounding errors—all monetary calculations are stored and processed strictly as integer **paise** (1 INR = 100 paise).
- **KhataAI Conversational Assistant**: Query ledger balances, overdue accounts, and customer payment habits in natural English or Hinglish.
- **Automated Risk & Credit Reports**: Instant aging analysis (0-30, 31-60, 60+ days) and payment reliability metrics.
- **Proactive Alerts Engine**: Immediate notifications for credit limit breaches, overdue accounts, and duplicate bills.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Mobile App** | React Native, Expo, TypeScript, Expo Router |
| **State & Storage** | Zustand, `@react-native-async-storage/async-storage` |
| **Backend** | Python Flask REST API in Docker |
| **Database & Auth** | Supabase (Managed PostgreSQL) with `party_balances` view |
| **AI Engine** | Google Gemini API (`google-genai` SDK on backend only) |
| **File Storage** | Supabase Storage (bill photos) |

---

## 3. Monorepo Architecture

```
Bill-Book/
├── mobile/                   # Expo React Native mobile application
│   ├── app/                  # Expo Router navigation (Phase 1)
│   ├── src/
│   │   ├── components/       # Shared reusable UI components
│   │   ├── features/         # Self-contained feature modules
│   │   ├── services/         # dataService.ts, mockDataService, apiDataService
│   │   ├── store/            # Zustand state stores
│   │   ├── theme/            # Design tokens (colors.ts)
│   │   ├── types/            # Domain TypeScript types matching API contract
│   │   └── utils/            # formatINR, date formatting helpers
│   └── .env.example
├── backend/                  # Flask REST API backend
│   ├── app/
│   │   ├── routes/           # Blueprint route handlers
│   │   ├── services/         # Business logic, Gemini client, alerts
│   │   └── prompts/          # Gemini prompt templates
│   ├── tests/                # Pytest suites
│   └── .env.example
├── supabase/
│   └── schema.sql            # Postgres DDL: tables, indexes, and party_balances view
└── docs/
    ├── ROADMAP.md            # 10-phase roadmap and shared team rules
    └── api.md                # Canonical REST API contract with snake_case JSON
```

---

## 4. Fundamental Rules

### 4.1 Money Handling Rule
- **All money is an integer in paise** (e.g., ₹50.00 = `5000`) in the database, API payloads, and frontend state.
- **Never use floating-point numbers** for monetary values.
- Only UI formatting utilities (`formatINR`) convert paise to human-readable rupees.

### 4.2 Accounting Logic
- **DR (Debit)** = Customer owes the shop (Credit sale).
- **CR (Credit)** = Payment received from customer.
- **Balance formula**:
  $$\text{Balance} = \text{Opening Balance} + \sum \text{DR} - \sum \text{CR}$$
- **Positive balance** = Shop is owed money (Receivable → Red card).
- **Negative balance** = Shop owes money or received advance payment (Payable → Green card).

---

## 5. Git Workflow & Rules (Section 3.6)

### 5.1 Branches
- `main`: Always demo-ready, protected.
- `develop`: Integration branch. All phase work merges here first.
- `phase-N/short-name`: Individual feature branches (e.g., `phase-1/prototype`, `phase-2/backend-init`).

**Workflow**:
1. Branch off `develop`.
2. Open a Pull Request into `develop`.
3. Peer review and squash merge.
4. Once an integration round passes smoke tests, merge `develop` into `main` and tag the release (e.g., `v0.1-prototype`).

### 5.2 Commit Conventions
Use conventional commits with phase references:
- `chore(kickoff): initial contract, types, schema and docs`
- `feat(phase-1): add party detail and ledger screen`
- `fix(phase-2): resolve balance sign calculation in view`

### 5.3 Code Ownership
To prevent merge conflicts during parallel work:
- **Avnish**: `mobile/src/theme`, `mobile/src/components`, `mobile/app/(tabs)/_layout.tsx`, `supabase/schema.sql`.
- **Krishna**: `backend/app/__init__.py`, `config.py`, `db.py`, `requirements.txt`, `Dockerfile`.
- **Ankit**: `backend/app/services/gemini_client.py`, `backend/app/prompts/`, `mobile/src/features/assistant`.
- Other modules belong to whichever phase creates them.

### 5.4 Conflict Hotspots
- `package.json` / lockfile: Add dependencies via small, dedicated PRs merged immediately.
- `routes/__init__.py`: One registration line per blueprint route file.
- `mobile/src/types/`: Strict domain separation (one file per domain). Never edit another domain without coordination.
- **Secrets Policy**: Never commit `.env` or API keys. Backend holds the Gemini key; frontend never communicates directly with Gemini.

---

## 6. Definition of Done (Section 3.7)

A phase is considered complete only when:
1. It runs successfully on a real physical device via Expo Go.
2. TypeScript strict typecheck and linting pass with zero errors.
3. Automated unit/integration tests pass.
4. Peer review is completed.
5. A 60-second walkthrough script is updated in `docs/demo-script.md`.
6. Previous phase functionality remains non-broken (zero regressions).

---

## 7. Environment Setup

### Mobile App Setup (`mobile/`)
```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

### Backend Setup (`backend/`)
```bash
cd backend
cp .env.example .env
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m flask run
```
