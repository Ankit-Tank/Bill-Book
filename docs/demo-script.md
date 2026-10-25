# BillBook Prototype Demo Script (60 Seconds)

**Target Audience:** Mentors & Hackathon Judges  
**Duration:** 60 seconds  
**Demo Mode:** Offline Mock (AsyncStorage persistence, zero backend dependency)  
**Test Devices:** Expo Go on iOS / Android or Web

---

## Timeline & Talk Track

### 0:00 – 0:10 | The Problem & Brand Hook
- **Visual:** Open app in Expo Go. The Dashboard displays deep green headers, clean cream background, and the prominent **Receivable Red Card** showing total money owed by customers.
- **Narrative:**
  > *"Meet BillBook: the digital Khata app built for Indian shopkeepers. Instead of messy red paper bahi-khatas, every credit sale and payment is tracked cleanly with integer-precision paise handling."*

---

### 0:10 – 0:25 | Dashboard & Live Financial Health
- **Visual:** Point to the Dashboard cards:
  - **Total Receivable (DR):** Red card showing ₹7,700 (money customer owes).
  - **Total Payable (CR):** Green card showing ₹20,000.
  - **Today's Activity:** Credit sales (DR) vs. Payments received (CR).
  - **Recent Transactions:** Real-time ledger stream.
- **Narrative:**
  > *"At a single glance, the shopkeeper sees what customers owe them in red, what they owe suppliers in green, and today’s live credit flow."*

---

### 0:25 – 0:45 | The Core Workflow: Add Party & Live Ledger Update
- **Step 1:** Tap **Parties** tab → Tap **"+ Add Party"**.
- **Step 2:** Enter Name: `"Deepak General Store"`, Phone: `"+91 98989 89898"`, Type: `Customer`, tap **Save Party**.
- **Step 3:** Tap **"+ Gave Credit (DR)"** → Enter Amount: `₹5,000` (500,000 paise), Particulars: `"10 bags sugar"`, tap **Save Credit Sale**.
  - **Verify:** Party balance instantly updates to **₹5,000 DR**.
- **Step 4:** Return to **Dashboard**: Total Receivable increased by exactly **₹5,000**.
- **Step 5:** Return to Deepak's ledger → Tap **"+ Received (CR)"** → Enter Amount: `₹2,000`, Particulars: `"UPI advance"`, tap **Save**.
  - **Verify:** Deepak's balance instantly recalculates to **₹3,000 DR**!

---

### 0:45 – 0:55 | Offline Persistence & Resilience
- **Visual:** Fully reload/restart the Expo app (press `r` in Expo CLI or reopen Expo Go).
- **Verify:** Deepak General Store and the ₹3,000 balance remain intact from local `AsyncStorage`.
- **Narrative:**
  > *"Everything persists locally in AsyncStorage. When Phase 4 connects the Flask REST backend, changing a single environment flag switches the app to live Supabase Postgres seamlessly with zero UI refactor."*

---

### 0:55 – 1:00 | Wrap-up & Q&A
- **Narrative:**
  > *"BillBook gives small merchants complete financial clarity in under 3 taps. Ready for Phase 2 backend integration."*

---

## Smoke Test Verification Checklist
- [x] Add party creates a new contact
- [x] Add DR ₹5,000 shows ₹5,000 receivable on party ledger and dashboard
- [x] Add CR ₹2,000 recalculates live balance to ₹3,000
- [x] App reload maintains state via AsyncStorage
- [x] Typecheck (`npm run typecheck`) and Lint (`npm run lint`) pass with 0 errors
- [x] Center gold FAB (`+`) launches quick transaction entry
