from typing import Optional
from datetime import date
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.supabase_client import get_supabase
from app.services.shelf_life import normalize_to_days

router = APIRouter(prefix="/api/lmi", tags=["LMI Capture"])

TABLE_NAME = "lmi_captures"


def parse_date(val: str) -> Optional[str]:
    if not val:
        return None
    if len(val) == 7 and '-' in val:
        return val + "-01"
    return val


class LMICaptureRequest(BaseModel):
    bin_id: str
    scan_value: str
    scan_type: str
    offer: Optional[str] = None
    mfg_date: Optional[str] = None
    expiry_date: Optional[str] = None
    shelf_life_value: Optional[int] = None
    shelf_life_uom: Optional[str] = None
    mrp: Optional[float] = None
    month_year_mode: bool = False
    capture_mode: str = "full"
    operator_id: str = "OP-001"
    time_taken_ms: Optional[int] = None


@router.post("/capture")
def capture_lmi(req: LMICaptureRequest):
    supabase = get_supabase()

    mfg_str = parse_date(req.mfg_date)
    exp_str = parse_date(req.expiry_date)

    mfg = date.fromisoformat(mfg_str) if mfg_str else None
    exp = date.fromisoformat(exp_str) if exp_str else None

    shelf_life_days = None
    if req.shelf_life_value and req.shelf_life_uom:
        shelf_life_days = normalize_to_days(req.shelf_life_value, req.shelf_life_uom, mfg or exp)
    elif mfg and exp:
        shelf_life_days = (exp - mfg).days

    record = {
        "bin_id": req.bin_id,
        "scan_value": req.scan_value,
        "scan_type": req.scan_type,
        "offer": req.offer,
        "mfg_date": mfg_str,
        "expiry_date": exp_str,
        "shelf_life_value": req.shelf_life_value,
        "shelf_life_uom": req.shelf_life_uom,
        "shelf_life_days": shelf_life_days,
        "mrp": req.mrp,
        "month_year_mode": req.month_year_mode,
        "capture_mode": req.capture_mode,
        "operator_id": req.operator_id,
        "time_taken_ms": req.time_taken_ms,
    }

    result = supabase.table(TABLE_NAME).insert(record).execute()

    if result.data and len(result.data) > 0:
        inserted = result.data[0]
        return {
            "id": inserted.get("id"),
            "bin_id": inserted.get("bin_id"),
            "scan_value": inserted.get("scan_value"),
            "shelf_life_days": shelf_life_days,
            "created_at": inserted.get("created_at"),
        }
    raise HTTPException(status_code=500, detail="Failed to save capture")


@router.get("/history")
def list_captures(limit: int = 50):
    supabase = get_supabase()
    result = supabase.table(TABLE_NAME).select("*").order("id", desc=True).limit(limit).execute()
    return result.data


@router.get("/stats")
def capture_stats():
    supabase = get_supabase()

    count_result = supabase.table(TABLE_NAME).select("id", count="exact").execute()
    total = count_result.count if count_result.count else 0

    time_result = (
        supabase.table(TABLE_NAME)
        .select("time_taken_ms, capture_mode")
        .not_.is_("time_taken_ms", "null")
        .execute()
    )

    avg_time = None
    mode_stats = {}
    if time_result.data:
        times = [r["time_taken_ms"] for r in time_result.data if r.get("time_taken_ms")]
        if times:
            avg_time = round(sum(times) / len(times))

        for mode in ("full", "mfg_only"):
            mode_times = [
                r["time_taken_ms"]
                for r in time_result.data
                if r.get("time_taken_ms") and r.get("capture_mode") == mode
            ]
            mode_stats[mode] = {
                "count": len(mode_times),
                "avg_time_ms": round(sum(mode_times) / len(mode_times)) if mode_times else None,
            }

    return {
        "total_captures": total,
        "avg_time_ms": avg_time,
        "by_mode": mode_stats,
    }
