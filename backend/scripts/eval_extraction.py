import sys
import json
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.extraction import ExtractionService

SAMPLES_DIR = Path(__file__).resolve().parent / "samples"
GROUND_TRUTH_PATH = SAMPLES_DIR / "ground_truth.json"


def evaluate():
    if not GROUND_TRUTH_PATH.exists():
        print(f"Ground truth file not found at {GROUND_TRUTH_PATH}")
        sys.exit(1)

    gt_data = json.loads(GROUND_TRUTH_PATH.read_text())
    service = ExtractionService()

    categories = [
        ("Bills (Images)", gt_data.get("bills", []), "image"),
        ("Voice Notes (Audio)", gt_data.get("voice", []), "audio"),
    ]

    total_samples = 0
    total_correct_amount = 0
    total_correct_kind = 0
    total_correct_party = 0
    total_correct_date = 0

    print("=" * 80)
    print(" " * 25 + "BillBook AI Extraction Evaluation")
    print("=" * 80)

    for cat_name, items, media_type in categories:
        cat_count = len(items)
        cat_amount = 0
        cat_kind = 0
        cat_party = 0
        cat_date = 0

        print(f"\nEvaluating {cat_name} ({cat_count} samples)...")
        print("-" * 80)
        print(f"{'Filename':<30} | {'Field':<10} | {'Expected':<20} | {'Extracted':<20} | Status")
        print("-" * 80)

        for item in items:
            filename = item["filename"]
            file_path = SAMPLES_DIR / filename
            expected = item["expected"]

            file_bytes = file_path.read_bytes()
            extracted = service.extract_from_file(
                file_bytes=file_bytes,
                filename=filename,
                media_type=media_type,
            )

            # 1. Kind check
            match_kind = extracted["kind"] == expected["kind"]
            if match_kind:
                cat_kind += 1

            # 2. Amount check
            match_amount = extracted["amount"] == expected["amount"]
            if match_amount:
                cat_amount += 1

            # 3. Party check (either party_name matches or top party_candidate matches)
            cand_name = extracted["party_candidates"][0]["name"] if extracted["party_candidates"] else ""
            match_party = (
                extracted["party_name"].lower() == expected["party_name"].lower() or
                cand_name.lower() == expected["party_name"].lower() or
                expected["party_name"].lower() in extracted["party_name"].lower()
            )
            if match_party:
                cat_party += 1

            # 4. Date check
            match_date = True
            if "txn_date" in expected:
                match_date = extracted["txn_date"] == expected["txn_date"]
                if match_date:
                    cat_date += 1

            status_str = "PASS" if (match_kind and match_amount and match_party) else "REVIEW"
            print(f"{filename:<30} | {'KIND':<10} | {expected['kind']:<20} | {extracted['kind']:<20} | {'OK' if match_kind else 'FAIL'}")
            print(f"{'':<30} | {'AMOUNT':<10} | {str(expected['amount']) + ' paise':<20} | {str(extracted['amount']) + ' paise':<20} | {'OK' if match_amount else 'FAIL'}")
            print(f"{'':<30} | {'PARTY':<10} | {expected['party_name']:<20} | {extracted['party_name']:<20} | {'OK' if match_party else 'FAIL'}")
            print("-" * 80)

        total_samples += cat_count
        total_correct_amount += cat_amount
        total_correct_kind += cat_kind
        total_correct_party += cat_party
        total_correct_date += cat_date

        print(f"\nSummary for {cat_name}:")
        print(f"  - Amount Accuracy: {cat_amount}/{cat_count} ({cat_amount / cat_count * 100:.1f}%)")
        print(f"  - Kind Accuracy:   {cat_kind}/{cat_count} ({cat_kind / cat_count * 100:.1f}%)")
        print(f"  - Party Accuracy:  {cat_party}/{cat_count} ({cat_party / cat_count * 100:.1f}%)")
        if cat_name.startswith("Bills"):
            print(f"  - Date Accuracy:   {cat_date}/{cat_count} ({cat_date / cat_count * 100:.1f}%)")

    bill_count = len(gt_data.get("bills", []))
    overall_amount_acc = total_correct_amount / total_samples * 100
    overall_kind_acc = total_correct_kind / total_samples * 100
    overall_party_acc = total_correct_party / total_samples * 100

    print("\n" + "=" * 80)
    print("FINAL EVALUATION REPORT across all 25 samples:")
    print("=" * 80)
    print(f"Total Test Set Samples:      {total_samples} (15 Bills + 10 Voice Clips)")
    print(f"Total Amount Accuracy:       {total_correct_amount}/{total_samples} ({overall_amount_acc:.1f}%)")
    print(f"Total Kind (DR/CR) Accuracy: {total_correct_kind}/{total_samples} ({overall_kind_acc:.1f}%)")
    print(f"Total Party Match Accuracy:  {total_correct_party}/{total_samples} ({overall_party_acc:.1f}%)")
    print("=" * 80)

    # Testing Requirement: Aim for 80% or better on amount and kind for clean bills
    if overall_amount_acc >= 80.0 and overall_kind_acc >= 80.0:
        print("\nSUCCESS: Target threshold (>=80% on amount and kind) ACHIEVED!")
        return 0
    else:
        print("\nFAILURE: Did not meet 80% accuracy threshold.")
        return 1


if __name__ == "__main__":
    sys.exit(evaluate())
