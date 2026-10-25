# BillBook: 10-Phase Development Roadmap

**Team Thunderbytes** | React Native (Expo) + Flask + Supabase + Gemini | Built in Antigravity

---

## 1. How to use this roadmap

Everyone reads sections 2 to 4 together. They are the shared rules. After that, each person works only from their own phase blocks in section 5.

In Antigravity: open the shared repo, give your agent sections 2 to 4 plus your phase block, and tell it to edit only the files listed under **Files and Modules**.

**Suggested owners (swap if you prefer):**

- Person 1 = Avnish (UI/UX, database) does Phases 1, 4, 7, 10.
- Person 2 = Krishna (backend) does Phases 2, 5, 8.
- Person 3 = Ankit (lead, AI, architecture) does Phases 3, 6, 9.

Phases 1, 2, 3 start at the same time, right after a 30 to 45 minute kickoff. Phases 4 to 6 run together next, then 7 to 9. Phase 10 closes the project.

**Design direction:** the reference screens set the mood (deep green headers, cream background, gold center + button, red receivable card, DR/CR wording, bottom tabs: Dashboard, Parties, +, Reports, More). Use them for structure and feel, not as a copy: use your own icons, copy and layout details.

---

## 2. Final tech stack (use exactly this)

| Layer | Technology |
|---|---|
| Mobile app | React Native with Expo, TypeScript, Expo Router |
| Camera and voice | expo-camera or expo-image-picker for bills, expo-audio for voice notes |
| Charts | react-native-gifted-charts (or similar) |
| Backend | Flask (Python) REST API in Docker |
| AI | Google Gemini API, called from the backend only: multimodal extraction, function calling for KhataAI, narrated summaries |
| Database | Supabase (managed PostgreSQL) |
| File storage | Supabase Storage (bill images) |
| Hosting | Render or Railway for the backend; fallback: laptop + ngrok |
| Demo delivery | Expo Go on a real phone, connected to the deployed backend |

**Supporting libraries** (fixed at kickoff so nobody adds alternatives): Zustand (state), @react-native-async-storage/async-storage (local persistence), react-native-svg, expo-file-system and expo-sharing (CSV export), @expo/vector-icons.

**Backend:** Flask, flask-cors, pydantic, APScheduler, pytest, the Gemini Python SDK (google-genai; confirm the install name in Google's docs), and the Supabase client or psycopg.

Set the Gemini model in `.env` as `GEMINI_MODEL` (check Google AI Studio for the current Flash model) so it can be changed without code edits. Use the Expo SDK version that matches the Expo Go app installed on your phones.

---

## 3. Kickoff contract (all three, before any phase starts)

One person commits this to `main`, the other two review it. After that these decisions do not change without telling the team.

### 3.1 Repo layout

```
smart-khata/
  mobile/                 # Expo app
    app/                  # Expo Router routes
      _layout.tsx
      (tabs)/_layout.tsx, index.tsx (Dashboard), parties.tsx, reports.tsx, more.tsx
      party/[id].tsx
      transaction/new.tsx
    src/
      theme/              # colors, spacing, typography
      components/         # shared UI only
      services/           # dataService.ts, mockDataService.ts, apiDataService.ts, apiClient.ts
      store/              # Zustand stores
      types/              # one file per domain
      features/<name>/    # self-contained feature code
      utils/              # format.ts (formatINR), dates.ts
  backend/
    app/                  # __init__.py, config.py, db.py
      routes/             # one file per area, registered in routes/__init__.py
      services/           # business logic, Gemini, reports, alerts
      prompts/
    tests/
    Dockerfile
    requirements.txt
    .env.example
  supabase/               # schema.sql, views.sql, seed.sql
  docs/                   # api.md, demo-script.md
```

### 3.2 Data model and money rules

All money is an **integer in paise** (Rs 50.00 = 5000) in the database, the API and the app. Only `formatINR()` turns it into text. This avoids rounding bugs.

**DR** = customer owes the shop (credit sale). **CR** = payment received.

`balance = opening_balance + sum(DR) - sum(CR)`

Positive balance = receivable (red card, shown as DR). Negative = payable or advance (shown as CR).

**Tables:**

- `parties` (id, name, phone, type customer|supplier, opening_balance, credit_limit, due_days, status active|archived, created_at)
- `transactions` (id, party_id, kind DR|CR, amount, txn_date, particulars, source manual|photo|voice, bill_image_path, created_at, deleted_at)
- `alerts` (id, party_id, kind, message, severity, dedupe_key, created_at, read_at)
- `ai_messages` (id, role, content, created_at)

Index `transactions(party_id, txn_date)`.

One demo shop. No login: every request carries an `X-API-Key` header. Soft delete for transactions.

### 3.3 API contract (base path `/api/v1`, JSON snake_case)

| Endpoint | Built in |
|---|---|
| `GET /health` | Phase 2 |
| `GET, POST /parties`; `GET, PATCH, DELETE /parties/:id`; `POST /parties/:id/archive` | Phase 2 |
| `GET, POST /transactions?party_id=`; `PATCH, DELETE /transactions/:id` | Phase 2 |
| `GET /dashboard/summary` (total receivable, payable, net, today DR/CR, recent) | Phase 2 |
| `POST /ai/extract` (multipart image or audio) | Phase 3 |
| `GET /parties/:id/credit-report` | Phase 5 |
| `GET /reports/day-book, outstanding, payables, collection, weekly, monthly` (+ `?format=csv`) | Phase 5 |
| `POST /ai/chat`, `POST /ai/narrate` | Phase 6 |
| `GET /alerts`, `POST /alerts/:id/read`, `POST /alerts/run` | Phase 8 |

**Errors** always look like:

```json
{ "error": { "code": "...", "message": "..." } }
```

**Extraction result:**

```json
{
  "party_name": "",
  "party_candidates": [],
  "kind": "",
  "amount": 0,
  "txn_date": "",
  "particulars": "",
  "items": [],
  "confidence": 0,
  "needs_review_fields": []
}
```

### 3.4 The dataService rule (what makes parallel work possible)

`src/services/dataService.ts` is a TypeScript interface with every call the UI needs:

`listParties`, `getParty`, `createParty`, `updateParty`, `archiveParty`, `deleteParty`, `listTransactions`, `createTransaction`, `updateTransaction`, `deleteTransaction`, `getDashboardSummary`, `getCreditReport`, `getReport`, `listAlerts`, `markAlertRead`, `extractFromMedia`, `sendChat`.

There are two implementations, `mockDataService` (Phase 1) and `apiDataService` (Phase 4), chosen by `EXPO_PUBLIC_USE_MOCK=true|false`. Screens call only the interface, never a mock or fetch directly. `EXPO_PUBLIC_API_URL` holds the backend address.

### 3.5 Theme tokens (approximate, sampled by eye from the screenshots; fine-tune in code)

| Token | Value |
|---|---|
| Primary green (headers, primary buttons) | about `#0A5C3E` |
| Cream background | about `#FEFCE8` |
| Gold FAB | about `#E3AE00` |
| Receivable red | about `#D6001C` |
| Onboarding dark green | about `#03231B` |
| Teal accent | about `#26D9B5` |
| Dark green text | about `#0B3D2E` |

Put them in `src/theme/colors.ts`. No hard-coded colors in screens.

### 3.6 Git workflow and file ownership

**Branches:** `main` (always demo-ready), `develop` (integration), `phase-N/short-name` for work. Open a PR into `develop`, someone else reviews, squash merge. Rebase on `develop` before opening the PR. After each round passes the smoke test, merge `develop` into `main` and tag it.

**Commits:** `feat(phase-4): edit transaction`, `fix(phase-2): balance sign`. Small and often.

**Ownership:**

- **Avnish** owns `mobile/src/theme`, `mobile/src/components`, `mobile/app/(tabs)/_layout.tsx` and `supabase/schema.sql`.
- **Krishna** owns `backend/app/__init__.py`, `config.py`, `db.py`, `requirements.txt`, `Dockerfile`.
- **Ankit** owns `backend/app/services/gemini_client.py`, `prompts/` and `mobile/src/features/assistant`.
- Anything else belongs to whoever's phase creates it.

**Conflict hot spots:**

- `package.json` and lockfile: add dependencies in a tiny separate PR and merge it right away.
- `routes/__init__.py`: one registration line per route file.
- `src/types`: one file per domain, never edit another person's file, ask for a small PR instead.

Never commit keys. `.env.example` lists every variable. The Gemini key lives only on the backend.

### 3.7 Standards and Definition of Done

TypeScript strict, ESLint + Prettier; Python formatted with ruff or black.

A phase is done only when:

- it runs on a real phone in Expo Go,
- typecheck and lint pass,
- its Testing Requirements pass,
- the reviewer ran it,
- a 60 second demo script is in `docs/demo-script.md`,
- and previous phases still work.

---

## 4. Schedule and demo checkpoints

| Round | Phases (in parallel) | Merge and demo |
|---|---|---|
| Kickoff | Shared contract | Repo, schema and contract on `main` |
| 1 (first 2 to 3 hours) | 1 Prototype, 2 Backend, 3 Extraction | Mentor demo 1: clickable prototype on mock data, plus a curl or script showing a bill turned into JSON |
| 2 | 4 Live data + ledger, 5 Credit + Reports API, 6 KhataAI backend | Demo 2: real data on phone, credit report, assistant answering over the API |
| 3 | 7 Photo/voice + Reports UI, 8 Alerts + hardening, 9 KhataAI UI + Alerts UI | Demo 3: full feature set |
| Final | 10 Integration and polish | Tag `v1.0`, rehearsal |

---

## 5. The 10 phases

### Phase 1: Working Prototype (Person 1, Avnish)

**Objective:** A stable, showable app within 2 to 3 hours that proves the core idea: record credit sales and payments and watch balances update.

**Features:** Dashboard (total receivable, payable, net, today's DR and CR, recent transactions). Parties list and add party. Add Transaction (party, date, amount, particulars, DR or CR). Party detail with ledger and live balance. Bottom tabs with the center + button; Reports and More are simple placeholders. Mock data saved in AsyncStorage so it survives a reload.

**Tasks:** Scaffold Expo + TypeScript + Expo Router. Build theme tokens and shared components (AppHeader, Card, PrimaryButton, AmountText, FAB tab bar). Write mockDataService with seed data (about 6 parties, 20 transactions) and a Zustand store. Build the screens. Run on a real phone. Write the demo script.

**Dependencies:** Kickoff contract only. No backend.

**Files and Modules:** `mobile/app/**`, `src/theme/*`, `src/components/*`, `src/services/dataService.ts`, `mockDataService.ts`, `src/store/*`, `src/utils/format.ts`.

**Integration Requirements:** Every screen uses dataService only. Route names match section 3.1 so later phases attach cleanly.

**Testing Requirements:** Add party, add DR 5,000, dashboard shows 5,000 receivable; add CR 2,000, balance shows 3,000. Restart app: data is still there. No red error screens. Typecheck passes.

**Expected Outcome:** Mentors can tap through a working ledger app. Tag `v0.1-prototype`.

---

### Phase 2: Backend and Database Foundation (Person 2, Krishna)

**Objective:** A hosted API on Supabase Postgres, ready to replace the mock.

**Features:** Supabase project and schema, Flask API for parties, transactions, dashboard summary and health, API key check, Docker, deployment, seed data.

**Tasks:** Apply `supabase/schema.sql` (Avnish drafts it at kickoff). Flask app factory with blueprints and the shared error format. Balance logic in a SQL view `party_balances`. Dockerfile and local compose. Deploy to Render or Railway. Postman collection. `.env.example`.

**Dependencies:** Kickoff contract.

**Files and Modules:** `backend/app/{__init__,config,db}.py`, `routes/{health,parties,transactions,dashboard}.py`, `services/balances.py`, `tests/`, `Dockerfile`, `requirements.txt`, `supabase/{schema,seed}.sql`.

**Integration Requirements:** Responses match section 3.3 exactly, in snake_case. The app maps names inside apiDataService.

**Testing Requirements:** pytest plus Postman: create party, add transactions, summary equals a hand calculation. `/health` opens from a phone browser on the deployed URL.

**Expected Outcome:** Live API URL and Postman collection shared with the team.

---

### Phase 3: Gemini Extraction Service (Person 3, Ankit)

**Objective:** Turn bill photos and Hindi or Hinglish voice notes into structured transactions. Done early because it is the riskiest part.

**Features:** `POST /ai/extract` for image or audio; schema-constrained JSON; `confidence` and `needs_review_fields`; fuzzy match to existing parties; a test set of about 15 bills and 10 voice clips with an evaluation script.

**Tasks:** `gemini_client.py` (key and model from env, timeout, retries). Prompts in `prompts/`. Pydantic validation. Party matching. Check that the audio format the app records is accepted by the Gemini API; if not, convert with ffmpeg on the backend. Accuracy report.

**Dependencies:** Kickoff contract. Use a static party list until Phase 2 is merged.

**Files and Modules:** `backend/app/services/{gemini_client,extraction,party_match}.py`, `routes/ai.py` (extract only), `prompts/*`, `scripts/eval_extraction.py`, `tests/ai/*`.

**Integration Requirements:** Output matches the extraction result shape in section 3.3. Register the route with one line in `routes/__init__.py`.

**Testing Requirements:** Evaluation script prints per-field accuracy; aim for 80 percent or better on amount and kind for clean bills. Bad file returns the standard error.

**Expected Outcome:** Send a bill photo with curl and get clean JSON back.

---

### Phase 4: Live Data, Ledger and Credit Report Screen (Person 1)

**Objective:** Replace mock data with the real API and finish transaction and party management.

**Features:** apiDataService and the env switch. Loading, empty and error states. Edit and delete transaction. Edit, archive and delete party. Search. Date-range ledger and on-screen statement. Opening balance. Customer Credit Report screen (built against the contract, using mock first). Optional welcome screens.

**Tasks:** Write `apiClient.ts` with the API key header and error mapping. Implement the interface against the real API. Build shared EmptyState, ErrorBanner and Skeleton components. Build ledger and party management screens and the credit report screen.

**Dependencies:** Phases 1 and 2. Credit report data goes live when Phase 5 merges.

**Files and Modules:** `src/services/{apiDataService,apiClient}.ts`, `src/features/{ledger,parties,credit}/*`, `app/party/[id]/edit.tsx`, `src/components/{EmptyState,ErrorBanner,Skeleton}.tsx`.

**Integration Requirements:** Keep the mock available as the offline demo fallback. Do not change the dataService interface without telling the team.

**Testing Requirements:** Repeat the Phase 1 checklist with the flag set to real API. Turn off Wi-Fi: an error banner shows, no crash. Deleting a transaction recalculates the balance.

**Expected Outcome:** The full ledger works end to end on a phone.

---

### Phase 5: Credit Management and Reports API (Person 2)

**Objective:** All credit and report numbers available from the backend.

**Features:** `credit_limit` and `due_days` per party. Credit report: outstanding, limit usage, average payment delay, aging buckets (0 to 30, 31 to 60, 60+ days), last payment, rule-based risk level. Reports: day book, outstanding, payables, collection, weekly and monthly summaries (sales, collections, net change, top 5 debtors, change versus the previous period). CSV export.

**Tasks:** SQL views and functions. Payment delay by matching each CR against the oldest unpaid DR (first in, first out), with each DR due on `txn_date + due_days`. Endpoints, CSV streaming, tests on a hand-calculated seed scenario. Document response shapes in `docs/api.md` in the same PR.

**Dependencies:** Phase 2.

**Files and Modules:** `routes/{credit,reports}.py`, `services/{credit,reports}.py`, `supabase/views.sql`, `tests/`.

**Integration Requirements:** Phases 4, 6, 7 and 9 read these exact shapes. Do not rename fields after merging.

**Testing Requirements:** Numbers match the hand-calculated scenario. CSV opens in Excel. Responses are fast on the seed data.

**Expected Outcome:** Every number needed by the credit and report screens is available through the API.

---

### Phase 6: KhataAI Assistant Backend (Person 3, Ankit)

**Objective:** An assistant that answers questions about the shop using real data only.

**Features:** `POST /ai/chat` with function calling over allow-listed tools: `get_party_balance`, `list_top_debtors`, `get_period_summary`, `list_overdue_parties`, `get_party_history`. English, Hindi and Hinglish replies. Short chat history in `ai_messages`. `POST /ai/narrate` turns a report or credit report into 3 to 4 plain sentences. Guardrails: the model never writes SQL, numbers come only from tool results, off-topic requests are declined politely.

**Tasks:** Tool definitions that call the same service functions as the REST endpoints. Assistant and narration prompts. History handling. Tests.

**Dependencies:** Phase 2 data and Phase 3 client. Use stubs for report tools until Phase 5 merges.

**Files and Modules:** `services/{assistant,tools,narration}.py`, `routes/ai.py` (adds chat, narrate), `prompts/assistant_*.md`, `tests/ai/test_tools.py`.

**Integration Requirements:** No duplicated SQL: tools reuse existing services. Cache narration so repeated views do not call Gemini again.

**Testing Requirements:** 20 scripted questions in English and Hinglish, answers checked against the database. Unknown party name triggers a clarifying question. Text like "ignore your rules" inside a transaction's particulars has no effect.

**Expected Outcome:** Ask a question with curl and get a correct, grounded answer.

---

### Phase 7: Photo and Voice Entry plus Reports Screens (Person 1)

**Objective:** Let shopkeepers add transactions by camera or voice, and see reports. This is the heaviest UI phase: if time is short, ship reports as simple lists and add charts last.

**Features:** Center + menu: Manual, Scan Bill, Voice. Camera and gallery picker. Hold-to-record mic with timer and upload progress. Confirm screen with editable fields, review-needed fields highlighted, party picker or create-new. Save creates a transaction with its source and bill image. Reports tab: Day Book, Outstanding, Payables, Collection, Weekly, Monthly, charts, CSV export and share.

**Tasks:** Capture flow screens. Implement `extractFromMedia`. Confirm form. Reports list and detail screens using gifted-charts. Export via expo-file-system and expo-sharing.

**Dependencies:** Phases 3, 4 and 5.

**Files and Modules:** `src/features/capture/*`, `src/features/reports/*`, `app/(tabs)/reports.tsx`, `app/transaction/capture.tsx`.

**Integration Requirements:** Saving goes through the same `createTransaction` as manual entry. Permissions for camera and microphone are requested with clear messages.

**Testing Requirements:** Five real bills and five voice clips end to end. Denied permission shows a helpful message. Slow network shows progress and can be cancelled. Export file opens correctly.

**Expected Outcome:** Click a bill or speak, confirm, and the ledger updates. Reports are viewable and exportable.

---

### Phase 8: Alerts Engine and Backend Hardening (Person 2, Krishna)

**Objective:** Useful, non-spammy alerts and a backend that survives demo day.

**Features:** Rules: overdue (unpaid DR past `due_days`), credit limit exceeded, duplicate bill (same party and amount within 24 hours, or same image hash), unusual amount (more than 3 times the party's median, with at least 5 transactions), repeat late payer. `GET /alerts`, mark read, `POST /alerts/run`. Runs when a transaction is created and daily with APScheduler. Hardening: rate limit on `/ai`, upload size limits, structured logging, error-shape audit, `scripts/seed_demo.py` that triggers every alert type.

**Tasks:** Rule functions with a `dedupe_key` so each alert appears once. Scheduler. Hook after transaction creation. Seed script. Warm-up note for sleeping free-tier hosts.

**Dependencies:** Phases 2 and 5.

**Files and Modules:** `routes/alerts.py`, `services/alerts.py`, `scripts/seed_demo.py`, `tests/test_alerts.py`.

**Integration Requirements:** Alert shape fixed in `docs/api.md` before Phase 9 builds the screen.

**Testing Requirements:** Each rule fires exactly once on seed data and not on clean data. Running the job twice creates no duplicates.

**Expected Outcome:** Running the seed script gives a demo shop with realistic alerts.

---

### Phase 9: KhataAI Chat, Insights and Alerts UI (Person 3, Ankit)

**Objective:** Bring the AI and alerts into the app.

**Features:** KhataAI chat screen (bubbles, suggested questions, Hindi and English, typing state). AI insight cards on Dashboard, Reports and the Credit Report using `/ai/narrate`. Alerts screen with unread badge and mark-read. Optional voice question input.

**Tasks:** Build `src/features/assistant/*` and `src/features/alerts/*` as self-contained folders. Add the entry points with minimal edits to the dashboard and tab layout, requested from Avnish as small PRs if needed.

**Dependencies:** Phases 4, 6 and 8.

**Files and Modules:** `src/features/{assistant,alerts}/*`, `app/assistant.tsx`, `app/alerts.tsx`.

**Integration Requirements:** Use `dataService.sendChat`, `listAlerts`, `markAlertRead`. Insight cards fail quietly if narration is unavailable.

**Testing Requirements:** The scripted Phase 6 questions work from the UI. Chat shows an error state when offline. Alerts match the seed data. No crash on empty chat history.

**Expected Outcome:** A working KhataAI and alerts experience inside the app.

---

### Phase 10: Integration, QA, Polish and Demo (Person 1 leads, all three)

**Objective:** One stable project that demos without surprises.

**Features:** Merge `develop` into `main`. Full regression. Consistent empty, loading and error states. More tab basics (Shop Profile with name and address, About). App icon and splash. Seed demo shop. Demo script, fallback plan, and README with setup steps.

**Tasks:** Run the full smoke checklist (about 25 steps across all features). Test on two real phones and on a weak connection. Fix bugs by owner (UI Avnish, API Krishna, AI Ankit). Freeze features at the agreed time. Rehearse the demo twice.

**Dependencies:** Phases 1 to 9.

**Files and Modules:** `README.md`, `docs/demo-script.md`, `app/(tabs)/more.tsx`, assets, small fixes anywhere through PRs.

**Integration Requirements:** No new features after freeze. Every fix is a small PR reviewed by someone else.

**Testing Requirements:** Fresh clone, install, run: works from the README alone. Demo path works three times in a row. Mock mode works if the backend is down.

**Expected Outcome:** Tag `v1.0`. Everyone can run the demo.

---

## 6. Risks and fallbacks

- **Extraction accuracy on messy bills:** the confirm screen is the safety net; keep a few clean sample bills for the demo.
- **Gemini quota or slow responses:** cache narrations, set timeouts, and keep the manual entry path always working.
- **Free-tier hosting sleeps:** send a warm-up request before every demo. Fallback is a laptop backend through ngrok, and mock mode in the app.
- **Expo Go version mismatch:** make sure the project's Expo SDK matches the Expo Go app on every demo phone.
- **Merge conflicts:** follow the ownership table in 3.6, merge small and often, and never push to main directly.
- **Scope:** if time runs out, cut in this order: charts, voice questions, welcome screens, duplicate-bill rule. Never cut the confirm screen or the ledger.