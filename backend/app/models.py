import enum
from datetime import date, datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, DateTime, Enum as SAEnum, Text
)
from app.database import Base


class LmiPreference(str, enum.Enum):
    MFG_DATE = "MFG_DATE"
    EXPIRY_DATE = "EXPIRY_DATE"


class ShelfLifeUoM(str, enum.Enum):
    DAYS = "DAYS"
    MONTHS = "MONTHS"
    YEARS = "YEARS"


class ValidationResult(str, enum.Enum):
    PASS = "PASS"
    WARNING = "WARNING"
    FAIL = "FAIL"
    SKIPPED = "SKIPPED"


class QCResult(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"


class ReceivingStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    QC_PASS = "QC_PASS"
    QC_FAIL = "QC_FAIL"
    CORRECTED = "CORRECTED"
    VOIDED = "VOIDED"


class TicketStatus(str, enum.Enum):
    OPEN = "OPEN"
    RESOLVED = "RESOLVED"
    AUTO_CLOSED = "AUTO_CLOSED"


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    fsn = Column(String(50), unique=True, nullable=False, index=True)
    ean = Column(String(50), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    brand = Column(String(100))
    vertical = Column(String(50))
    catalog_shelf_life_days = Column(Integer, nullable=True)
    shelf_life_uom = Column(SAEnum(ShelfLifeUoM), default=ShelfLifeUoM.DAYS)
    lmi_preference = Column(SAEnum(LmiPreference), default=LmiPreference.MFG_DATE)
    lmi_enabled = Column(Boolean, default=True)
    image_url = Column(String(500), nullable=True)


class SlabConfig(Base):
    __tablename__ = "slab_configs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    min_days = Column(Integer, nullable=False)
    max_days = Column(Integer, nullable=False)
    tolerance_percentage = Column(Float, nullable=False)
    is_default = Column(Boolean, default=False)
    effective_from = Column(Date, default=date.today)
    created_by = Column(String(100), default="system")
    updated_by = Column(String(100), default="system")


class Consignment(Base):
    __tablename__ = "consignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(String(50), unique=True, nullable=False)
    vendor_name = Column(String(255))
    po_number = Column(String(50))
    warehouse_id = Column(String(20), default="WH-BLR-01")
    status = Column(String(20), default="OPEN")
    created_at = Column(DateTime, default=datetime.utcnow)


class ReceivingSession(Base):
    __tablename__ = "receiving_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    consignment_id = Column(Integer, nullable=False)
    document_id = Column(String(50), nullable=False)
    fsn = Column(String(50), nullable=False)
    ean = Column(String(50), nullable=False)
    product_name = Column(String(255))
    quantity = Column(Integer, nullable=False)
    mrp = Column(Float, nullable=True)
    offer = Column(String(100), nullable=True)
    mfg_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    shelf_life_days = Column(Integer, nullable=True)
    shelf_life_uom = Column(SAEnum(ShelfLifeUoM), nullable=True)
    catalog_shelf_life_days = Column(Integer, nullable=True)
    validation_result = Column(SAEnum(ValidationResult), nullable=True)
    tolerance_applied_pct = Column(Float, nullable=True)
    deviation_days = Column(Integer, nullable=True)
    qc_result = Column(SAEnum(QCResult), nullable=True)
    qc_reasons = Column(Text, nullable=True)
    wid = Column(String(50), nullable=True)
    grn_id = Column(String(50), nullable=True)
    status = Column(SAEnum(ReceivingStatus), default=ReceivingStatus.IN_PROGRESS)
    operator_id = Column(String(50), default="OP-001")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QCTicket(Base):
    __tablename__ = "qc_tickets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    receiving_session_id = Column(Integer, nullable=False)
    wid = Column(String(50), nullable=False)
    fsn = Column(String(50), nullable=False)
    document_id = Column(String(50))
    po_number = Column(String(50))
    operator_id = Column(String(50))
    entered_mfg_date = Column(Date, nullable=True)
    entered_expiry_date = Column(Date, nullable=True)
    entered_shelf_life_days = Column(Integer)
    catalog_shelf_life_days = Column(Integer)
    tolerance_applied_pct = Column(Float)
    deviation_days = Column(Integer)
    mismatch_reason = Column(String(50), default="SHELF_LIFE_MISMATCH")
    ticket_status = Column(SAEnum(TicketStatus), default=TicketStatus.OPEN)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)


class ProductCorrection(Base):
    __tablename__ = "product_corrections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    original_wid = Column(String(50), nullable=False)
    new_wid = Column(String(50), nullable=True)
    grn_id = Column(String(50))
    consignment_id = Column(String(50))
    fsn = Column(String(50), nullable=False)
    original_mfg_date = Column(Date, nullable=True)
    corrected_mfg_date = Column(Date, nullable=True)
    original_expiry_date = Column(Date, nullable=True)
    corrected_expiry_date = Column(Date, nullable=True)
    original_shelf_life_days = Column(Integer, nullable=True)
    corrected_shelf_life_days = Column(Integer, nullable=True)
    correction_reason = Column(String(50))
    corrected_by = Column(String(50))
    corrected_at = Column(DateTime, default=datetime.utcnow)
    qc_ticket_id = Column(Integer, nullable=True)


class LMICapture(Base):
    __tablename__ = "lmi_captures"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bin_id = Column(String(50), nullable=False)
    scan_value = Column(String(100), nullable=False)
    scan_type = Column(String(10), nullable=False)
    fsn = Column(String(50), nullable=True)
    product_name = Column(String(255), nullable=True)
    offer = Column(String(100), nullable=True)
    mfg_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    shelf_life_value = Column(Integer, nullable=True)
    shelf_life_uom = Column(SAEnum(ShelfLifeUoM), nullable=True)
    shelf_life_days = Column(Integer, nullable=True)
    mrp = Column(Float, nullable=True)
    month_year_mode = Column(Boolean, default=False)
    operator_id = Column(String(50), default="OP-001")
    time_taken_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
