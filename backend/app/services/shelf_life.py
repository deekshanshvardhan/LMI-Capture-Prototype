import calendar
import math
from typing import Optional
from datetime import date
from dateutil.relativedelta import relativedelta


def normalize_to_days(value: int, uom: str, reference_date: Optional[date] = None) -> int:
    """Convert shelf life value to days using actual calendar computation."""
    if uom == "DAYS":
        return value

    ref = reference_date or date.today()

    if uom == "MONTHS":
        end_date = ref + relativedelta(months=value)
        return (end_date - ref).days

    if uom == "YEARS":
        end_date = ref + relativedelta(years=value)
        return (end_date - ref).days

    return value


def calculate_third_field(
    mfg_date: Optional[date],
    expiry_date: Optional[date],
    shelf_life_value: Optional[int],
    shelf_life_uom: Optional[str],
) -> dict:
    """
    Given any 2-of-3 fields, calculate the third.
    Returns dict with all three fields filled in.
    """
    fields_provided = sum([
        mfg_date is not None,
        expiry_date is not None,
        shelf_life_value is not None,
    ])

    if fields_provided != 2:
        raise ValueError(f"Exactly 2 of 3 fields required, got {fields_provided}")

    if mfg_date and expiry_date:
        delta_days = (expiry_date - mfg_date).days
        if delta_days <= 0:
            raise ValueError("Expiry Date must be after Manufacturing Date")
        return {
            "mfg_date": mfg_date,
            "expiry_date": expiry_date,
            "shelf_life_days": delta_days,
            "calculated_field": "shelf_life",
        }

    if mfg_date and shelf_life_value:
        uom = shelf_life_uom or "DAYS"
        if uom == "DAYS":
            computed_expiry = mfg_date + relativedelta(days=shelf_life_value)
        elif uom == "MONTHS":
            computed_expiry = mfg_date + relativedelta(months=shelf_life_value)
        else:
            computed_expiry = mfg_date + relativedelta(years=shelf_life_value)
        shelf_days = (computed_expiry - mfg_date).days
        return {
            "mfg_date": mfg_date,
            "expiry_date": computed_expiry,
            "shelf_life_days": shelf_days,
            "calculated_field": "expiry_date",
        }

    if expiry_date and shelf_life_value:
        uom = shelf_life_uom or "DAYS"
        if uom == "DAYS":
            computed_mfg = expiry_date - relativedelta(days=shelf_life_value)
        elif uom == "MONTHS":
            computed_mfg = expiry_date - relativedelta(months=shelf_life_value)
        else:
            computed_mfg = expiry_date - relativedelta(years=shelf_life_value)
        shelf_days = (expiry_date - computed_mfg).days
        return {
            "mfg_date": computed_mfg,
            "expiry_date": expiry_date,
            "shelf_life_days": shelf_days,
            "calculated_field": "mfg_date",
        }

    raise ValueError("Could not determine the third field")


def apply_month_year_mode(dt: date, field_type: str) -> date:
    """
    FR-4: When Month/Year mode is enabled:
    - Mfg Date: save as 1st of the month
    - Expiry Date: save as last day of the month
    """
    if field_type == "mfg":
        return dt.replace(day=1)
    elif field_type == "expiry":
        last_day = calendar.monthrange(dt.year, dt.month)[1]
        return dt.replace(day=last_day)
    return dt
