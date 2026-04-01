from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import SlabConfig

router = APIRouter(prefix="/api/config", tags=["Configuration"])


class SlabConfigRequest(BaseModel):
    min_days: int
    max_days: int
    tolerance_percentage: float
    is_default: bool = False
    effective_from: Optional[date] = None


@router.get("/slabs")
def list_slabs(db: Session = Depends(get_db)):
    slabs = db.query(SlabConfig).order_by(SlabConfig.min_days).all()
    return [
        {
            "id": s.id,
            "min_days": s.min_days,
            "max_days": s.max_days,
            "tolerance_percentage": s.tolerance_percentage,
            "is_default": s.is_default,
            "effective_from": s.effective_from.isoformat() if s.effective_from else None,
            "created_by": s.created_by,
            "updated_by": s.updated_by,
        }
        for s in slabs
    ]


@router.post("/slabs")
def create_slab(req: SlabConfigRequest, db: Session = Depends(get_db)):
    slab = SlabConfig(
        min_days=req.min_days,
        max_days=req.max_days,
        tolerance_percentage=req.tolerance_percentage,
        is_default=req.is_default,
        effective_from=req.effective_from or date.today(),
        created_by="admin",
        updated_by="admin",
    )
    db.add(slab)
    db.commit()
    db.refresh(slab)
    return {"id": slab.id, "message": "Slab configuration created"}


@router.put("/slabs/{slab_id}")
def update_slab(slab_id: int, req: SlabConfigRequest, db: Session = Depends(get_db)):
    slab = db.query(SlabConfig).filter(SlabConfig.id == slab_id).first()
    if not slab:
        raise HTTPException(404, "Slab not found")
    slab.min_days = req.min_days
    slab.max_days = req.max_days
    slab.tolerance_percentage = req.tolerance_percentage
    slab.is_default = req.is_default
    slab.effective_from = req.effective_from or slab.effective_from
    slab.updated_by = "admin"
    db.commit()
    return {"message": "Slab updated"}


@router.delete("/slabs/{slab_id}")
def delete_slab(slab_id: int, db: Session = Depends(get_db)):
    slab = db.query(SlabConfig).filter(SlabConfig.id == slab_id).first()
    if not slab:
        raise HTTPException(404, "Slab not found")
    db.delete(slab)
    db.commit()
    return {"message": "Slab deleted"}
