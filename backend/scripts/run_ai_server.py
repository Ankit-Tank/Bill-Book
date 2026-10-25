import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.routes.ai import create_ai_app

app = create_ai_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"Starting BillBook AI Extraction service on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=False)
