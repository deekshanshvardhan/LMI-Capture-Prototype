"""
Comprehensive test suite for LMI Capture API + Supabase storage.
Tests all edge cases before warehouse deployment.

Requires backend/.env with SUPABASE_URL and SUPABASE_SERVICE_KEY (see .env.example).
"""
import os
import requests
import json
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

BASE = "http://localhost:8000/api/lmi"
SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env (copy from .env.example).")
    sys.exit(1)

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}

passed = 0
failed = 0
errors = []

def test(name, fn):
    global passed, failed
    try:
        fn()
        passed += 1
        print(f"  PASS  {name}")
    except Exception as e:
        failed += 1
        errors.append((name, str(e)))
        print(f"  FAIL  {name} => {e}")

def post_capture(data):
    r = requests.post(f"{BASE}/capture", json=data)
    return r.status_code, r.json()

def get_from_supabase(record_id):
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/lmi_captures?id=eq.{record_id}&select=*",
        headers=SB_HEADERS,
    )
    data = r.json()
    return data[0] if data else None


# ──────────────────────────────────────────────
# TEST 1: Happy path — All fields filled (EAN scan, mfg + expiry)
# ──────────────────────────────────────────────
print("\n=== TEST 1: Happy path — All fields, EAN scan, mfg+expiry ===")

def t1():
    status, resp = post_capture({
        "bin_id": "BIN-A-01-03",
        "scan_value": "8901058853100",
        "scan_type": "EAN",
        "offer": "No Offer",
        "mfg_date": "2026-01-15",
        "expiry_date": "2027-01-15",
        "shelf_life_value": 12,
        "shelf_life_uom": "MONTHS",
        "mrp": 14.00,
        "month_year_mode": False,
        "operator_id": "WH-OP-101",
        "time_taken_ms": 8500,
    })
    assert status == 200, f"Expected 200, got {status}: {resp}"
    assert resp.get("id") is not None, "No ID returned"
    assert resp["bin_id"] == "BIN-A-01-03"
    assert resp["scan_value"] == "8901058853100"
    assert resp["shelf_life_days"] is not None and resp["shelf_life_days"] > 0
    
    db = get_from_supabase(resp["id"])
    assert db is not None, "Record not found in Supabase"
    assert db["bin_id"] == "BIN-A-01-03"
    assert db["scan_value"] == "8901058853100"
    assert db["scan_type"] == "EAN"
    assert db["offer"] == "No Offer"
    assert db["mfg_date"] == "2026-01-15"
    assert db["expiry_date"] == "2027-01-15"
    assert db["shelf_life_value"] == 12
    assert db["shelf_life_uom"] == "MONTHS"
    assert db["mrp"] == 14.00
    assert db["month_year_mode"] == False
    assert db["operator_id"] == "WH-OP-101"
    assert db["time_taken_ms"] == 8500
    assert db["created_at"] is not None

test("Happy path: full fields EAN scan + mfg+expiry", t1)


# ──────────────────────────────────────────────
# TEST 2: 2-of-3 — mfg_date + expiry_date only (shelf_life auto-calc)
# ──────────────────────────────────────────────
print("\n=== TEST 2: 2-of-3 rule — mfg + expiry, shelf_life auto-calculated ===")

def t2():
    status, resp = post_capture({
        "bin_id": "BIN-B-02-01",
        "scan_value": "8901030793905",
        "scan_type": "EAN",
        "mfg_date": "2026-03-01",
        "expiry_date": "2026-09-01",
        "operator_id": "WH-OP-102",
        "time_taken_ms": 6200,
    })
    assert status == 200, f"Expected 200, got {status}: {resp}"
    assert resp["shelf_life_days"] == 184, f"Expected 184 days, got {resp['shelf_life_days']}"

    db = get_from_supabase(resp["id"])
    assert db["shelf_life_days"] == 184
    assert db["shelf_life_value"] is None
    assert db["shelf_life_uom"] is None

test("2-of-3: mfg+expiry => shelf_life_days=184", t2)


# ──────────────────────────────────────────────
# TEST 3: 2-of-3 — mfg_date + shelf_life (no expiry)
# ──────────────────────────────────────────────
print("\n=== TEST 3: 2-of-3 rule — mfg + shelf_life, no expiry ===")

def t3():
    status, resp = post_capture({
        "bin_id": "BIN-C-01-05",
        "scan_value": "8901234567890",
        "scan_type": "EAN",
        "mfg_date": "2026-01-01",
        "shelf_life_value": 6,
        "shelf_life_uom": "MONTHS",
        "operator_id": "WH-OP-103",
        "time_taken_ms": 7000,
    })
    assert status == 200, f"Expected 200, got {status}: {resp}"
    assert resp["shelf_life_days"] is not None and resp["shelf_life_days"] > 0
    
    db = get_from_supabase(resp["id"])
    assert db["mfg_date"] == "2026-01-01"
    assert db["expiry_date"] is None
    assert db["shelf_life_value"] == 6
    assert db["shelf_life_uom"] == "MONTHS"
    assert db["shelf_life_days"] > 0, f"shelf_life_days should be positive, got {db['shelf_life_days']}"

test("2-of-3: mfg + shelf_life(6M) => days calculated", t3)


# ──────────────────────────────────────────────
# TEST 4: 2-of-3 — expiry_date + shelf_life (no mfg)
# ──────────────────────────────────────────────
print("\n=== TEST 4: 2-of-3 rule — expiry + shelf_life, no mfg ===")

def t4():
    status, resp = post_capture({
        "bin_id": "BIN-D-03-02",
        "scan_value": "8905678901234",
        "scan_type": "EAN",
        "expiry_date": "2027-06-15",
        "shelf_life_value": 18,
        "shelf_life_uom": "MONTHS",
        "operator_id": "WH-OP-104",
        "time_taken_ms": 5800,
    })
    assert status == 200, f"Expected 200, got {status}: {resp}"
    assert resp["shelf_life_days"] is not None and resp["shelf_life_days"] > 0

    db = get_from_supabase(resp["id"])
    assert db["mfg_date"] is None
    assert db["expiry_date"] == "2027-06-15"
    assert db["shelf_life_value"] == 18
    assert db["shelf_life_uom"] == "MONTHS"

test("2-of-3: expiry + shelf_life(18M) => days calculated", t4)


# ──────────────────────────────────────────────
# TEST 5: Month/Year mode (YYYY-MM format)
# ──────────────────────────────────────────────
print("\n=== TEST 5: Month/Year mode — YYYY-MM date format ===")

def t5():
    status, resp = post_capture({
        "bin_id": "BIN-E-01-01",
        "scan_value": "8901111222333",
        "scan_type": "EAN",
        "mfg_date": "2026-03",
        "expiry_date": "2027-03",
        "month_year_mode": True,
        "operator_id": "WH-OP-105",
        "time_taken_ms": 4500,
    })
    assert status == 200, f"Expected 200, got {status}: {resp}"
    assert resp["shelf_life_days"] is not None

    db = get_from_supabase(resp["id"])
    assert db["mfg_date"] == "2026-03-01", f"Expected 2026-03-01, got {db['mfg_date']}"
    assert db["expiry_date"] == "2027-03-01", f"Expected 2027-03-01, got {db['expiry_date']}"
    assert db["month_year_mode"] == True

test("Month/Year mode: YYYY-MM => stored as YYYY-MM-01", t5)


# ──────────────────────────────────────────────
# TEST 6: Minimal fields — only required (bin_id, scan_value, scan_type)
# ──────────────────────────────────────────────
print("\n=== TEST 6: Minimal fields — only required fields ===")

def t6():
    status, resp = post_capture({
        "bin_id": "BIN-F-02-04",
        "scan_value": "9999888877776",
        "scan_type": "EAN",
    })
    assert status == 200, f"Expected 200, got {status}: {resp}"

    db = get_from_supabase(resp["id"])
    assert db["bin_id"] == "BIN-F-02-04"
    assert db["scan_value"] == "9999888877776"
    assert db["fsn"] is None
    assert db["product_name"] is None
    assert db["offer"] is None
    assert db["mfg_date"] is None
    assert db["expiry_date"] is None
    assert db["shelf_life_value"] is None
    assert db["shelf_life_uom"] is None
    assert db["shelf_life_days"] is None
    assert db["mrp"] is None
    assert db["time_taken_ms"] is None
    assert db["operator_id"] == "OP-001"  # default

test("Minimal fields: only required, rest null/default", t6)


# ──────────────────────────────────────────────
# TEST 7: WID scan type
# ──────────────────────────────────────────────
print("\n=== TEST 7: WID scan type ===")

def t7():
    status, resp = post_capture({
        "bin_id": "BIN-G-01-01",
        "scan_value": "WID-FK-2026-00012345",
        "scan_type": "WID",
        "mfg_date": "2025-12-01",
        "expiry_date": "2026-12-01",
        "mrp": 250.00,
        "operator_id": "WH-OP-106",
        "time_taken_ms": 9200,
    })
    assert status == 200, f"Expected 200, got {status}: {resp}"

    db = get_from_supabase(resp["id"])
    assert db["scan_type"] == "WID"
    assert db["scan_value"] == "WID-FK-2026-00012345"
    assert db["shelf_life_days"] == 365, f"Expected 365, got {db['shelf_life_days']}"

test("WID scan type stored correctly", t7)


# ──────────────────────────────────────────────
# TEST 8: Shelf life UoM — Days
# ──────────────────────────────────────────────
print("\n=== TEST 8: Shelf life UoM — Days ===")

def t8a():
    status, resp = post_capture({
        "bin_id": "BIN-H-01-01",
        "scan_value": "1111222233334",
        "scan_type": "EAN",
        "mfg_date": "2026-04-01",
        "shelf_life_value": 90,
        "shelf_life_uom": "DAYS",
        "operator_id": "WH-OP-107",
        "time_taken_ms": 3200,
    })
    assert status == 200, f"Expected 200, got {status}: {resp}"
    assert resp["shelf_life_days"] == 90, f"Expected 90, got {resp['shelf_life_days']}"

test("Shelf life UoM=DAYS: 90 days => 90 days", t8a)


# ──────────────────────────────────────────────
# TEST 9: Shelf life UoM — Years
# ──────────────────────────────────────────────
print("\n=== TEST 9: Shelf life UoM — Years ===")

def t9():
    status, resp = post_capture({
        "bin_id": "BIN-I-01-01",
        "scan_value": "5555666677778",
        "scan_type": "EAN",
        "mfg_date": "2026-01-01",
        "shelf_life_value": 2,
        "shelf_life_uom": "YEARS",
        "operator_id": "WH-OP-108",
        "time_taken_ms": 4100,
    })
    assert status == 200, f"Expected 200, got {status}: {resp}"
    assert resp["shelf_life_days"] == 730 or resp["shelf_life_days"] == 731, \
        f"Expected ~730 days for 2 years, got {resp['shelf_life_days']}"

test("Shelf life UoM=YEARS: 2 years => ~730 days", t9)


# ──────────────────────────────────────────────
# TEST 10: MRP edge cases
# ──────────────────────────────────────────────
print("\n=== TEST 10: MRP edge cases ===")

def t10a():
    status, resp = post_capture({
        "bin_id": "BIN-J-01-01",
        "scan_value": "7777888899990",
        "scan_type": "EAN",
        "mfg_date": "2026-01-01",
        "expiry_date": "2026-07-01",
        "mrp": 1299.99,
        "time_taken_ms": 3000,
    })
    assert status == 200
    db = get_from_supabase(resp["id"])
    assert db["mrp"] == 1299.99, f"Expected 1299.99, got {db['mrp']}"

test("MRP decimal: 1299.99 stored correctly", t10a)

def t10b():
    status, resp = post_capture({
        "bin_id": "BIN-J-01-02",
        "scan_value": "7777888899991",
        "scan_type": "EAN",
        "mfg_date": "2026-01-01",
        "expiry_date": "2026-07-01",
        "mrp": 0.50,
        "time_taken_ms": 2800,
    })
    assert status == 200
    db = get_from_supabase(resp["id"])
    assert db["mrp"] == 0.50, f"Expected 0.50, got {db['mrp']}"

test("MRP small decimal: 0.50 stored correctly", t10b)

def t10c():
    status, resp = post_capture({
        "bin_id": "BIN-J-01-03",
        "scan_value": "7777888899992",
        "scan_type": "EAN",
        "mfg_date": "2026-01-01",
        "expiry_date": "2026-07-01",
        "mrp": 99999.00,
        "time_taken_ms": 2500,
    })
    assert status == 200
    db = get_from_supabase(resp["id"])
    assert db["mrp"] == 99999.00, f"Expected 99999.00, got {db['mrp']}"

test("MRP large value: 99999.00 stored correctly", t10c)


# ──────────────────────────────────────────────
# TEST 11: Offer field variations
# ──────────────────────────────────────────────
print("\n=== TEST 11: Offer field variations ===")

def t11a():
    status, resp = post_capture({
        "bin_id": "BIN-K-01-01",
        "scan_value": "3333444455556",
        "scan_type": "EAN",
        "offer": "Buy 2 Get 1",
        "mfg_date": "2026-02-01",
        "expiry_date": "2026-08-01",
        "time_taken_ms": 5500,
    })
    assert status == 200
    db = get_from_supabase(resp["id"])
    assert db["offer"] == "Buy 2 Get 1"

test("Offer: 'Buy 2 Get 1' stored correctly", t11a)

def t11b():
    status, resp = post_capture({
        "bin_id": "BIN-K-01-02",
        "scan_value": "3333444455557",
        "scan_type": "EAN",
        "offer": "",
        "mfg_date": "2026-02-01",
        "expiry_date": "2026-08-01",
    })
    assert status == 200
    db = get_from_supabase(resp["id"])
    assert db["offer"] is None or db["offer"] == ""

test("Offer: empty string handled", t11b)


# ──────────────────────────────────────────────
# TEST 12: Non-EAN scan (OTHER — matches UI for alphanumeric codes)
# ──────────────────────────────────────────────
print("\n=== TEST 12: OTHER scan type ===")

def t12():
    status, resp = post_capture({
        "bin_id": "BIN-L-01-01",
        "scan_value": "FSN002GROC02",
        "scan_type": "OTHER",
        "mfg_date": "2026-01-01",
        "expiry_date": "2028-01-01",
        "mrp": 28.00,
        "time_taken_ms": 6800,
    })
    assert status == 200
    db = get_from_supabase(resp["id"])
    assert db["scan_type"] == "OTHER"
    assert db["scan_value"] == "FSN002GROC02"

test("OTHER scan type stored correctly", t12)


# ──────────────────────────────────────────────
# TEST 13: time_taken_ms = null (no timing data)
# ──────────────────────────────────────────────
print("\n=== TEST 13: No time_taken_ms ===")

def t13():
    status, resp = post_capture({
        "bin_id": "BIN-M-01-01",
        "scan_value": "4444555566667",
        "scan_type": "EAN",
        "mfg_date": "2026-01-01",
        "expiry_date": "2026-12-01",
    })
    assert status == 200
    db = get_from_supabase(resp["id"])
    assert db["time_taken_ms"] is None

test("No time_taken_ms: stored as null", t13)


# ──────────────────────────────────────────────
# TEST 14: Validation — missing required field bin_id
# ──────────────────────────────────────────────
print("\n=== TEST 14: Validation — missing required fields ===")

def t14a():
    r = requests.post(f"{BASE}/capture", json={
        "scan_value": "8901058853100",
        "scan_type": "EAN",
    })
    assert r.status_code == 422, f"Expected 422, got {r.status_code}"

test("Missing bin_id => 422 validation error", t14a)

def t14b():
    r = requests.post(f"{BASE}/capture", json={
        "bin_id": "BIN-X-01-01",
        "scan_type": "EAN",
    })
    assert r.status_code == 422, f"Expected 422, got {r.status_code}"

test("Missing scan_value => 422 validation error", t14b)

def t14c():
    r = requests.post(f"{BASE}/capture", json={
        "bin_id": "BIN-X-01-01",
        "scan_value": "8901058853100",
    })
    assert r.status_code == 422, f"Expected 422, got {r.status_code}"

test("Missing scan_type => 422 validation error", t14c)


# ──────────────────────────────────────────────
# TEST 15: GET /history returns all test records
# ──────────────────────────────────────────────
print("\n=== TEST 15: GET /history ===")

def t15():
    r = requests.get(f"{BASE}/history?limit=50")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 10, f"Expected at least 10 records from tests, got {len(data)}"
    first = data[0]
    assert "id" in first
    assert "bin_id" in first
    assert "scan_value" in first
    assert "created_at" in first
    ids = [rec["id"] for rec in data]
    assert ids == sorted(ids, reverse=True), "History should be sorted by id desc"

test("GET /history: returns records, sorted desc", t15)


# ──────────────────────────────────────────────
# TEST 16: GET /stats
# ──────────────────────────────────────────────
print("\n=== TEST 16: GET /stats ===")

def t16():
    r = requests.get(f"{BASE}/stats")
    assert r.status_code == 200
    data = r.json()
    assert "total_captures" in data
    assert "avg_time_ms" in data
    assert data["total_captures"] >= 10, f"Expected >= 10, got {data['total_captures']}"
    assert data["avg_time_ms"] is not None and data["avg_time_ms"] > 0, \
        f"avg_time_ms should be positive, got {data['avg_time_ms']}"

test("GET /stats: total & avg_time correct", t16)


# ──────────────────────────────────────────────
# TEST 17: Verify record count in Supabase matches
# ──────────────────────────────────────────────
print("\n=== TEST 17: Supabase direct count verification ===")

def t17():
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/lmi_captures?select=id",
        headers={**SB_HEADERS, "Prefer": "count=exact"},
    )
    count = int(r.headers.get("content-range", "0/0").split("/")[1])
    
    api_r = requests.get(f"{BASE}/stats")
    api_total = api_r.json()["total_captures"]
    
    assert count == api_total, f"Supabase count ({count}) != API count ({api_total})"

test("Supabase count matches API stats count", t17)


# ──────────────────────────────────────────────
# TEST 18: Rapid-fire captures (simulating warehouse usage)
# ──────────────────────────────────────────────
print("\n=== TEST 18: Rapid-fire 5 captures ===")

def t18():
    ids = []
    for i in range(5):
        status, resp = post_capture({
            "bin_id": f"BIN-RAPID-{i+1:02d}",
            "scan_value": f"880000000{i:04d}",
            "scan_type": "EAN",
            "mfg_date": "2026-01-01",
            "expiry_date": "2027-01-01",
            "mrp": 10.0 + i,
            "operator_id": f"WH-OP-RAPID",
            "time_taken_ms": 3000 + (i * 500),
        })
        assert status == 200, f"Rapid capture {i+1} failed: {resp}"
        ids.append(resp["id"])
    
    assert len(set(ids)) == 5, "All rapid captures should have unique IDs"
    
    for rid in ids:
        db = get_from_supabase(rid)
        assert db is not None, f"Rapid capture {rid} not found in Supabase"

test("Rapid-fire 5 captures: all saved with unique IDs", t18)


# ──────────────────────────────────────────────
# RESULTS
# ──────────────────────────────────────────────
print("\n" + "=" * 55)
print(f"  RESULTS: {passed} passed, {failed} failed")
print("=" * 55)

if errors:
    print("\nFailed tests:")
    for name, err in errors:
        print(f"  - {name}: {err}")
    print()

sys.exit(1 if failed > 0 else 0)
