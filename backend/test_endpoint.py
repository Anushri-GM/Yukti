import sys
import os

# Adjust paths to import backend modules correctly
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
sys.path.append(os.path.join(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
try:
    print("Testing citizen submit endpoint...")
    res = client.post("/api/v1/citizens/submit", data={
        "text": "Verification test pothole request",
        "ward": "Ward C (Subhash Nagar)"
    })
    print("STATUS:", res.status_code)
    print("BODY:", res.text)
    # Save log
    with open("../verification_log.txt", "w") as f:
        f.write(f"Status: {res.status_code}\nBody: {res.text}\n")
except Exception as e:
    import traceback
    print("ERROR:", traceback.format_exc())
