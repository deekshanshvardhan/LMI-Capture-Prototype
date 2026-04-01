from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product
from app.services.shelf_life import calculate_third_field, apply_month_year_mode
from app.services.tolerance import validate_shelf_life

router = APIRouter(prefix="/api/validation", tags=["Validation"])


class LotDetailRequest(BaseModel):
    fsn: str
    mfg_date: Optional[date] = None
    expiry_date: Optional[date] = None
    shelf_life_value: Optional[int] = None
    shelf_life_uom: Optional[str] = None
    month_year_mode: bool = False


class LotDetailResponse(BaseModel):
    mfg_date: date
    expiry_date: date
    shelf_life_days: int
    calculated_field: str
    validation: dict


@router.post("/lot-details")
def validate_lot_details(
    req: LotDetailRequest,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.fsn == req.fsn).first()
    if not product:
        raise HTTPException(404, "Product not found")

    mfg = req.mfg_date
    exp = req.expiry_date

    if req.month_year_mode:
        if mfg:
            mfg = apply_month_year_mode(mfg, "mfg")
        if exp:
            exp = apply_month_year_mode(exp, "expiry")

    if mfg and mfg > date.today():
        raise HTTPException(400, "Manufacturing Date must be in the past or today (VR-2)")
    if exp and exp <= date.today() and req.shelf_life_value is None:
        pass  # allow expired items — they'll go to QC Fail

    try:
        result = calculate_third_field(
            mfg_date=mfg,
            expiry_date=exp,
            shelf_life_value=req.shelf_life_value,
            shelf_life_uom=req.shelf_life_uom or (
                product.shelf_life_uom.value if product.shelf_life_uom else "DAYS"
            ),
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    shelf_life_days = result["shelf_life_days"]
    if shelf_life_days <= 0:
        raise HTTPException(400, "Shelf Life must be positive (VR-4/VR-5)")

    validation = validate_shelf_life(
        db=db,
        entered_shelf_life_days=shelf_life_days,
        catalog_shelf_life_days=product.catalog_shelf_life_days,
    )

    return {
        "mfg_date": result["mfg_date"].isoformat(),
        "expiry_date": result["expiry_date"].isoformat(),
        "shelf_life_days": shelf_life_days,
        "calculated_field": result["calculated_field"],
        "catalog_shelf_life_days": product.catalog_shelf_life_days,
        "catalog_shelf_life_uom": product.shelf_life_uom.value if product.shelf_life_uom else None,
        "validation": validation,
    }
