import math
from sqlalchemy.orm import Session
from datetime import date
from app.models import SlabConfig


DEFAULT_TOLERANCE_PCT = 5.0


def get_tolerance_percentage(db: Session, catalog_shelf_life_days: int) -> float:
    """
    FR-8/FR-9: Look up slab-based tolerance percentage.
    Universal — based on shelf life range, not vertical/category.
    """
    slabs = (
        db.query(SlabConfig)
        .filter(SlabConfig.effective_from <= date.today())
        .filter(SlabConfig.is_default == False)
        .order_by(SlabConfig.min_days)
        .all()
    )

    for slab in slabs:
        if slab.min_days <= catalog_shelf_life_days <= slab.max_days:
            return slab.tolerance_percentage

    default_slab = (
        db.query(SlabConfig)
        .filter(SlabConfig.is_default == True)
        .filter(SlabConfig.effective_from <= date.today())
        .first()
    )
    if default_slab:
        return default_slab.tolerance_percentage

    return DEFAULT_TOLERANCE_PCT


from typing import Optional


def validate_shelf_life(
    db: Session,
    entered_shelf_life_days: int,
    catalog_shelf_life_days: Optional[int],
) -> dict:
    """
    FR-8: Validate entered shelf life against catalog using slab tolerance.
    Returns validation result with details.
    """
    if catalog_shelf_life_days is None or catalog_shelf_life_days == 0:
        return {
            "result": "SKIPPED",
            "message": "Catalog shelf life missing — validation skipped. Value sent for catalog population.",
            "entered_shelf_life_days": entered_shelf_life_days,
            "catalog_shelf_life_days": None,
            "tolerance_pct": None,
            "allowed_deviation_days": None,
            "actual_deviation_days": None,
        }

    tolerance_pct = get_tolerance_percentage(db, catalog_shelf_life_days)
    allowed_deviation = math.ceil(catalog_shelf_life_days * tolerance_pct / 100.0)
    actual_deviation = abs(entered_shelf_life_days - catalog_shelf_life_days)

    if actual_deviation <= allowed_deviation:
        return {
            "result": "PASS",
            "message": "Shelf life within tolerance.",
            "entered_shelf_life_days": entered_shelf_life_days,
            "catalog_shelf_life_days": catalog_shelf_life_days,
            "tolerance_pct": tolerance_pct,
            "allowed_deviation_days": allowed_deviation,
            "actual_deviation_days": actual_deviation,
        }

    return {
        "result": "FAIL",
        "message": (
            f"Shelf Life Mismatch: You entered {entered_shelf_life_days} days, "
            f"catalog expects ~{catalog_shelf_life_days} days. "
            f"Allowed deviation: ±{allowed_deviation} days ({tolerance_pct}%). "
            f"Please verify the dates on the physical product."
        ),
        "entered_shelf_life_days": entered_shelf_life_days,
        "catalog_shelf_life_days": catalog_shelf_life_days,
        "tolerance_pct": tolerance_pct,
        "allowed_deviation_days": allowed_deviation,
        "actual_deviation_days": actual_deviation,
    }
