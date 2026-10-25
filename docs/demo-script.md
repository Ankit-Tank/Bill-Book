# BillBook 60-Second Mentor & Judge Demo Walkthrough

**Team:** Thunderbytes (Avnish Sharma, Krishna, Ankit Tank)  
**Target Audience:** Hackathon Judges & Mentors  
**Duration:** Exactly 60 Seconds  
**Web Demo:** [https://billbook.piehost.com](https://billbook.piehost.com) (Capped at 480px centered mobile layout)  
**Mobile Demo:** Expo Go on physical device connected to live Cloud API / Offline Mock fallback  

---

## Pre-Demo Preparation (10 Seconds)
1. Ensure the demo shop is seeded:
   ```bash
   python backend/scripts/seed_demo.py
   ```
2. Open [https://billbook.piehost.com](https://billbook.piehost.com) on your laptop browser, or open BillBook in Expo Go.
3. If running completely offline or without internet, verify `EXPO_PUBLIC_USE_MOCK=true` or tap **More $\rightarrow$ Reset to Initial Seed Data**.

---

## 60-Second Walkthrough Track

### 0:00 – 0:10 | Hook & Merchant Problem
- **Screen:** Dashboard
- **Visual:** Point to the dark green header (`#0A5C3E`), gold FAB (`+`), and the prominent **Receivable Red Card** showing total money owed by customers.
- **Pitch:**
  > *"Meet BillBook: the smart digital Khata app built for Indian merchants. Millions of local dukandaars lose thousands every month to forgotten credit notes in messy paper bahi-khatas. BillBook eliminates human error with strict integer paise money calculation and multimodal AI."*

---

### 0:10 – 0:25 | Core Ledger & Live Balance Updates
- **Screen:** Parties Tab $\rightarrow$ Select **Ramesh Kumar**
- **Action:**
  1. Show Ramesh Kumar’s live ledger: opening balance, recent debits, and current balance.
  2. Tap **"Gave Credit (DR)"** $\rightarrow$ Enter `₹500` for *"Mustard Oil & Rice"* $\rightarrow$ Tap **Save**.
  3. **Notice:** Balance immediately increases by ₹500 in red DR.
  4. Tap **"Received (CR)"** $\rightarrow$ Enter `₹200` for *"UPI Repayment"* $\rightarrow$ Tap **Save**.
  5. **Notice:** Balance drops instantly by ₹200. Return to Dashboard $\rightarrow$ Total receivable has updated live.
- **Pitch:**
  > *"Recording transactions is effortless. Every credit sale and repayment recalculates live balances in real time—with zero floating-point rounding errors."*

---

### 0:25 – 0:38 | Multimodal AI Bill & Voice Entry
- **Screen:** Tap Gold Center FAB (`+`)
- **Action:**
  1. Show the three quick entry options: **Manual**, **Scan Bill**, and **Voice Memo**.
  2. Select **Voice Memo** $\rightarrow$ Hold the mic button for 2 seconds and speak:
     > *"Rahul Sharma ko 1200 rupaye ka atta aur cheeni udhar diya"*
  3. The app uploads the audio to Google Gemini 2.5 Flash.
  4. The **AI Confirmation Screen** opens: party candidate `"Rahul Sharma"` is matched, amount `₹1,200` is prefilled, items are parsed, and confidence is 95%.
  5. Tap **Confirm & Save** $\rightarrow$ Transaction is saved directly into the ledger with source tagged as `voice`.
- **Pitch:**
  > *"A shopkeeper with flour on their hands doesn't have to type. They can snap a bill photo or speak in Hindi/Hinglish. Gemini parses the party, items, and amount with instant confirmation."*

---

### 0:38 – 0:48 | KhataAI Copilot & Business Reports
- **Screen:** Tap **KhataAI** (or navigate from More $\rightarrow$ KhataAI Copilot)
- **Action:**
  1. Tap the suggested question: *"Who owes me the most?"* (or ask *"Rahul ka balance kya hai?"*).
  2. KhataAI responds with natural language answers grounded strictly in the shop's database:
     > *"Based on your ledger records, Priya Verma owes you the most with an outstanding balance of ₹3,200, followed by Rahul Sharma (₹1,500)."*
  3. Switch to **Reports Tab**: Show the **Day Book**, **Outstanding Receivables**, and tap **Export CSV** $\rightarrow$ A structured CSV file with UTF-8 BOM is generated ready to share on WhatsApp or Excel.
- **Pitch:**
  > *"KhataAI is the merchant's financial copilot. Ask any question in Hindi or English, and it answers using function calling over real ledger numbers—never making up figures."*

---

### 0:48 – 0:58 | Proactive Radar Alerts & Shop Profile
- **Screen:** Tap Bell Icon / **Alerts** Screen
- **Action:**
  1. Point to the 5 proactive alert badges:
     - 🔴 **Critical:** Kavita Verma exceeded credit limit (₹8,500 > ₹5,000 limit).
     - 🟡 **Warning:** Ramesh Kumar has an overdue payment 18 days past terms.
     - 🟡 **Warning:** Duplicate bill detected (identical ₹2,500 bills recorded in 4 hours).
     - 🔵 **Info:** Unusual amount spike detected (>3x median).
     - 🟡 **Warning:** Repeat late payer warning.
  2. Tap an alert to mark it as read.
  3. Navigate to **More Tab** $\rightarrow$ Show the **Shop Profile** editor (`Gupta Kirana Store`) printed on receipts and exported statements.
- **Pitch:**
  > *"BillBook actively protects the shopkeeper’s working capital with radar alerts for overdue debt and credit limit breaches before losses occur."*

---

### 0:58 – 1:00 | Conclusion & Tag
- **Pitch:**
  > *"BillBook: Modern, multimodal, reliable, and ready for India’s 60 million retail merchants. Built by Team Thunderbytes."*

---

## 3x Consecutive Demo Verification Checklist

Verify that this exact path executes seamlessly 3 times in a row without crashing:

- [x] **Run 1**: Physical phone on Wi-Fi $\rightarrow$ Seed demo $\rightarrow$ Add DR/CR $\rightarrow$ Voice note $\rightarrow$ KhataAI query $\rightarrow$ Alerts check $\rightarrow$ Pass.
- [x] **Run 2**: Physical phone on Weak 3G/Offline $\rightarrow$ Repeat flow with offline fallback $\rightarrow$ Pass.
- [x] **Run 3**: Desktop browser at [https://billbook.piehost.com](https://billbook.piehost.com) $\rightarrow$ Desktop 480px framing $\rightarrow$ Complete flow $\rightarrow$ Pass.
