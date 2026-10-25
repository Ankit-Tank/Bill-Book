import os
import json
from pathlib import Path

SAMPLES_DIR = Path(__file__).resolve().parent / "samples"
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

GROUND_TRUTH = {
    "bills": [
        {
            "filename": "bill_01_grocery.jpg",
            "media_type": "image",
            "content_hint": "INVOICE #101\nCustomer: Rahul Sharma (+919876543210)\nDate: 2026-10-24\nItems:\n- Basmati Rice 2 bags: Rs 2000.00\n- Mustard Oil 5L: Rs 500.00\nTotal Amount: Rs 2,500.00\nTerms: Credit Sale (Debit / DR)",
            "expected": {
                "party_name": "Rahul Sharma",
                "kind": "DR",
                "amount": 250000,
                "txn_date": "2026-10-24",
                "particulars": "Basmati rice, mustard oil credit sale"
            }
        },
        {
            "filename": "bill_02_pulses.jpg",
            "media_type": "image",
            "content_hint": "KIRANA STORE BILL\nParty: Priya Patel\nDate: 2026-10-22\nToor dal 5kg, Moong dal 2kg\nTotal: Rs 1,200.00\nDebit Note (Udhaar)",
            "expected": {
                "party_name": "Priya Patel",
                "kind": "DR",
                "amount": 120000,
                "txn_date": "2026-10-22",
                "particulars": "Toor dal, moong dal"
            }
        },
        {
            "filename": "bill_03_spices.png",
            "media_type": "image",
            "content_hint": "RETAIL INVOICE\nCustomer: Amit Verma\nDate: 2026-10-23\nSpices & masalas packet\nNet Total: Rs 650.00\nCredit Sale DR",
            "expected": {
                "party_name": "Amit Verma",
                "kind": "DR",
                "amount": 65000,
                "txn_date": "2026-10-23",
                "particulars": "Spices and masala"
            }
        },
        {
            "filename": "bill_04_wheat.jpg",
            "media_type": "image",
            "content_hint": "GRAIN MERCHANT MEMO\nParty: Sunita Devi\nDate: 2026-10-20\nWheat Flour 50kg bag: Rs 2,100.00\nDebit Entry",
            "expected": {
                "party_name": "Sunita Devi",
                "kind": "DR",
                "amount": 210000,
                "txn_date": "2026-10-20",
                "particulars": "Wheat flour 50kg"
            }
        },
        {
            "filename": "bill_05_oil_tin.png",
            "media_type": "image",
            "content_hint": "CASH / CREDIT BILL\nCustomer: Rahul Sharma\nDate: 2026-10-19\n15L Cooking Oil Tin: Rs 1,950.00\nCredit DR",
            "expected": {
                "party_name": "Rahul Sharma",
                "kind": "DR",
                "amount": 195000,
                "txn_date": "2026-10-19",
                "particulars": "Cooking oil tin"
            }
        },
        {
            "filename": "bill_06_cleaning.jpg",
            "media_type": "image",
            "content_hint": "INVOICE #208\nBuyer: Sunita Devi\nDate: 2026-10-21\nDetergent powder & cleaning bar: Rs 750.00\nCredit / DR",
            "expected": {
                "party_name": "Sunita Devi",
                "kind": "DR",
                "amount": 75000,
                "txn_date": "2026-10-21",
                "particulars": "Cleaning items"
            }
        },
        {
            "filename": "bill_07_tea_sugar.png",
            "media_type": "image",
            "content_hint": "ESTIMATE SLIP\nName: Priya Patel\nDate: 2026-10-23\nTea powder 1kg + Sugar 5kg\nTotal: Rs 850.00\nDR Udhaar Khata",
            "expected": {
                "party_name": "Priya Patel",
                "kind": "DR",
                "amount": 85000,
                "txn_date": "2026-10-23",
                "particulars": "Tea and sugar"
            }
        },
        {
            "filename": "bill_08_wholesale_pulses.jpg",
            "media_type": "image",
            "content_hint": "TAX INVOICE #KW-9021\nSupplier: Kisan Wholesale Traders (+919844556677)\nDate: 2026-10-15\nWholesale pulses 10 bags\nTotal Billed: Rs 7,000.00\nCredit Bill / Payment Due (CR to supplier)",
            "expected": {
                "party_name": "Kisan Wholesale Traders",
                "kind": "CR",
                "amount": 700000,
                "txn_date": "2026-10-15",
                "particulars": "Wholesale pulses restock"
            }
        },
        {
            "filename": "bill_09_provisions.png",
            "media_type": "image",
            "content_hint": "DELIVERY CHALLAN & INVOICE #BP-442\nSupplier: Balaji Provisions Distributor\nDate: 2026-10-16\nProvisions bulk stock: Rs 4,500.00\nPayment due CR",
            "expected": {
                "party_name": "Balaji Provisions Distributor",
                "kind": "CR",
                "amount": 450000,
                "txn_date": "2026-10-16",
                "particulars": "Provisions bulk stock"
            }
        },
        {
            "filename": "bill_10_dairy.jpg",
            "media_type": "image",
            "content_hint": "DAIRY RECEIPT\nCustomer: Amit Verma\nDate: 2026-10-18\nPure cow ghee 2kg, butter: Rs 1,400.00\nDebit sale",
            "expected": {
                "party_name": "Amit Verma",
                "kind": "DR",
                "amount": 140000,
                "txn_date": "2026-10-18",
                "particulars": "Ghee and dairy products"
            }
        },
        {
            "filename": "bill_11_dry_fruits.png",
            "media_type": "image",
            "content_hint": "DRY FRUITS BILL\nParty: Amit Verma\nDate: 2026-10-17\nAlmonds 1kg, Cashew 1kg: Rs 1,800.00\nUdhaar DR",
            "expected": {
                "party_name": "Amit Verma",
                "kind": "DR",
                "amount": 180000,
                "txn_date": "2026-10-17",
                "particulars": "Almonds and cashews"
            }
        },
        {
            "filename": "bill_12_snacks.jpg",
            "media_type": "image",
            "content_hint": "INVOICE #314\nBuyer: Rahul Sharma\nDate: 2026-10-18\nBiscuits & snacks carton: Rs 950.00\nDebit Sale",
            "expected": {
                "party_name": "Rahul Sharma",
                "kind": "DR",
                "amount": 95000,
                "txn_date": "2026-10-18",
                "particulars": "Biscuits and snacks"
            }
        },
        {
            "filename": "bill_13_soap_bulk.png",
            "media_type": "image",
            "content_hint": "SALES SLIP\nCustomer: Sunita Devi\nDate: 2026-10-14\nSoap packs and toiletries: Rs 900.00\nCredit entry DR",
            "expected": {
                "party_name": "Sunita Devi",
                "kind": "DR",
                "amount": 90000,
                "txn_date": "2026-10-14",
                "particulars": "Soap and toiletries"
            }
        },
        {
            "filename": "bill_14_payment_receipt.jpg",
            "media_type": "image",
            "content_hint": "PAYMENT RECEIPT VOUCHER #PR-88\nReceived from: Priya Patel\nDate: 2026-10-20\nCash Payment Received: Rs 500.00\nPayment Settlement CR",
            "expected": {
                "party_name": "Priya Patel",
                "kind": "CR",
                "amount": 50000,
                "txn_date": "2026-10-20",
                "particulars": "Cash payment receipt"
            }
        },
        {
            "filename": "bill_15_handwritten_rough.jpg",
            "media_type": "image",
            "content_hint": "ROUGH SLIP\nRahul Sharma\nDate: 2026-10-25\nSalt, matches, spices: Rs 150.00\nUdhaar",
            "expected": {
                "party_name": "Rahul Sharma",
                "kind": "DR",
                "amount": 15000,
                "txn_date": "2026-10-25",
                "particulars": "Daily spices"
            }
        }
    ],
    "voice": [
        {
            "filename": "voice_01_sharma_udhaar.m4a",
            "media_type": "audio",
            "content_hint": "Sharma ji ko 2000 ka maal udhaar diya",
            "expected": {
                "party_name": "Rahul Sharma",
                "kind": "DR",
                "amount": 200000,
                "particulars": "Maal udhaar diya"
            }
        },
        {
            "filename": "voice_02_priya_cash.m4a",
            "media_type": "audio",
            "content_hint": "Priya Patel se 800 rupaye cash mila",
            "expected": {
                "party_name": "Priya Patel",
                "kind": "CR",
                "amount": 80000,
                "particulars": "Cash payment mila"
            }
        },
        {
            "filename": "voice_03_amit_tel.m4a",
            "media_type": "audio",
            "content_hint": "Amit Verma ko 650 ka tel aur masala diya",
            "expected": {
                "party_name": "Amit Verma",
                "kind": "DR",
                "amount": 65000,
                "particulars": "Tel aur masala diya"
            }
        },
        {
            "filename": "voice_04_sunita_jama.m4a",
            "media_type": "audio",
            "content_hint": "Sunita didi ne 400 rupaye jama kiye",
            "expected": {
                "party_name": "Sunita Devi",
                "kind": "CR",
                "amount": 40000,
                "particulars": "Jama kiye"
            }
        },
        {
            "filename": "voice_05_kisan_neft.m4a",
            "media_type": "audio",
            "content_hint": "Kisan Traders ko 2000 bank se transfer kiye payment",
            "expected": {
                "party_name": "Kisan Wholesale Traders",
                "kind": "DR",
                "amount": 200000,
                "particulars": "Bank payment"
            }
        },
        {
            "filename": "voice_06_balaji_maal.m4a",
            "media_type": "audio",
            "content_hint": "Balaji provisions se 4500 ka maal aaya payment credit likh lo",
            "expected": {
                "party_name": "Balaji Provisions Distributor",
                "kind": "CR",
                "amount": 450000,
                "particulars": "Maal aaya credit"
            }
        },
        {
            "filename": "voice_07_rahul_gpay.m4a",
            "media_type": "audio",
            "content_hint": "Rahul Sharma ne 1000 rupaye Google Pay kiya payment mila",
            "expected": {
                "party_name": "Rahul Sharma",
                "kind": "CR",
                "amount": 100000,
                "particulars": "Google Pay payment"
            }
        },
        {
            "filename": "voice_08_priya_dal.m4a",
            "media_type": "audio",
            "content_hint": "Priya ko 1200 ki toor dal aur moong dal udhaar bechi",
            "expected": {
                "party_name": "Priya Patel",
                "kind": "DR",
                "amount": 120000,
                "particulars": "Dal udhaar bechi"
            }
        },
        {
            "filename": "voice_09_amit_dryfruit.m4a",
            "media_type": "audio",
            "content_hint": "Amit ji ke khate me 1800 ka dry fruit likh lo udhaar",
            "expected": {
                "party_name": "Amit Verma",
                "kind": "DR",
                "amount": 180000,
                "particulars": "Dry fruit khata"
            }
        },
        {
            "filename": "voice_10_sunita_cleaning.m4a",
            "media_type": "audio",
            "content_hint": "Sunita ji 750 rupaye ka detergent le gayi udhaar",
            "expected": {
                "party_name": "Sunita Devi",
                "kind": "DR",
                "amount": 75000,
                "particulars": "Detergent udhaar"
            }
        }
    ]
}


def create_files():
    # Save ground_truth.json
    gt_file = SAMPLES_DIR / "ground_truth.json"
    gt_file.write_text(json.dumps(GROUND_TRUTH, indent=2))

    # Create dummy bill files and voice files with textual metadata inside
    for item in GROUND_TRUTH["bills"]:
        file_path = SAMPLES_DIR / item["filename"]
        # Format payload containing header and textual content
        content = f"# BILL IMAGE METADATA\n{item['content_hint']}".encode("utf-8")
        file_path.write_bytes(content)

    for item in GROUND_TRUTH["voice"]:
        file_path = SAMPLES_DIR / item["filename"]
        # Standard m4a header simulation with embedded transcript
        content = f"# AUDIO VOICE NOTE METADATA\n{item['content_hint']}".encode("utf-8")
        file_path.write_bytes(content)

    print(f"Created {len(GROUND_TRUTH['bills'])} bill samples and {len(GROUND_TRUTH['voice'])} voice samples in {SAMPLES_DIR}")


if __name__ == "__main__":
    create_files()
