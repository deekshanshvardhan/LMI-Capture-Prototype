import uuid
from typing import Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    ReceivingSession, QCTicket, ProductCorrection, Consignment, Product,
    ReceivingStatus, QCResult, ValidationResult, TicketStatus,
)
from app.services.shelf_life import calculate_third_field, apply_month_year_mode
from app.services.tolerance import validate_shelf_life

router = APIRouter(prefix="/api/receiving", tags=["Receiving"])


def _generate_wid() -> str:
    return f"WID-{uuid.uuid4().hex[:8].upper()}"


def _generate_grn() -> str:
    return f"GRN-{uuid.uuid4().hex[:6].upper()}"


class CreateReceivingRequest(BaseModel):
    document_id: str
    fsn: str
    ean: str
    quantity: int
    mrp: Optional[float] = None
    offer: Optional[str] = None
    mfg_date: Optional[date] = None
    expiry_date: Optional[date] = None
    shelf_life_value: Optional[int] = None
    shelf_life_uom: Optional[str] = None
    month_year_mode: bool = False
    operator_id: str = "OP-001"


class QCRequest(BaseModel):
    session_id: int
    qc_result: str  # PASS or FAIL
    qc_reasons: Optional[str] = None
    force_qc_fail: bool = False


class ProductCorrectionRequest(BaseModel):
    wid: str
    mfg_date: Optional[date] = None
    expiry_date: Optional[date] = None
    shelf_life_value: Optional[int] = None
    shelf_life_uom: Optional[str] = None
    month_year_mode: bool = False
    corrected_by: str = "OP-001"
    correction_reason: str = "OPERATOR_ERROR"


@router.post("/create")
def create_receiving_session(req: CreateReceivingRequest, db: Session = Depends(get_db)):
    consignment = db.query(Consignment).filter(
        Consignment.document_id == req.document_id
    ).first()
    if not consignment:
        raise HTTPException(404, "Consignment/IRN not found")

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

    try:
        calc_result = calculate_third_field(
            mfg_date=mfg,
            expiry_date=exp,
            shelf_life_value=req.shelf_life_value,
            shelf_life_uom=req.shelf_life_uom or (
                product.shelf_life_uom.value if product.shelf_life_uom else "DAYS"
            ),
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    shelf_life_days = calc_result["shelf_life_days"]
    validation = validate_shelf_life(
        db=db,
        entered_shelf_life_days=shelf_life_days,
        catalog_shelf_life_days=product.catalog_shelf_life_days,
    )

    val_result = ValidationResult.PASS
    if validation["result"] == "FAIL":
        val_result = ValidationResult.FAIL
    elif validation["result"] == "SKIPPED":
        val_result = ValidationResult.SKIPPED

    session = ReceivingSession(
        consignment_id=consignment.id,
        document_id=req.document_id,
        fsn=req.fsn,
        ean=req.ean,
        product_name=product.name,
        quantity=req.quantity,
        mrp=req.mrp,
        offer=req.offer,
        mfg_date=calc_result["mfg_date"],
        expiry_date=calc_result["expiry_date"],
        shelf_life_days=shelf_life_days,
        shelf_life_uom=req.shelf_life_uom or (
            product.shelf_life_uom.value if product.shelf_life_uom else "DAYS"
        ),
        catalog_shelf_life_days=product.catalog_shelf_life_days,
        validation_result=val_result,
        tolerance_applied_pct=validation.get("tolerance_pct"),
        deviation_days=validation.get("actual_deviation_days"),
        operator_id=req.operator_id,
        status=ReceivingStatus.IN_PROGRESS,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "session_id": session.id,
        "mfg_date": calc_result["mfg_date"].isoformat(),
        "expiry_date": calc_result["expiry_date"].isoformat(),
        "shelf_life_days": shelf_life_days,
        "calculated_field": calc_result["calculated_field"],
        "validation": validation,
        "product": {
            "fsn": product.fsn,
            "name": product.name,
            "catalog_shelf_life_days": product.catalog_shelf_life_days,
        },
    }


@router.post("/qc")
def perform_qc(req: QCRequest, db: Session = Depends(get_db)):
    session = db.query(ReceivingSession).filter(
        ReceivingSession.id == req.session_id
    ).first()
    if not session:
        raise HTTPException(404, "Receiving session not found")

    consignment = db.query(Consignment).filter(
        Consignment.id == session.consignment_id
    ).first()

    wid = _generate_wid()
    grn_id = _generate_grn()
    session.wid = wid
    session.grn_id = grn_id

    is_shelf_life_fail = session.validation_result == ValidationResult.FAIL
    is_explicit_fail = req.qc_result == "FAIL" or req.force_qc_fail

    if is_shelf_life_fail or is_explicit_fail:
        session.qc_result = QCResult.FAIL
        session.status = ReceivingStatus.QC_FAIL
        session.qc_reasons = req.qc_reasons or (
            "SHELF_LIFE_MISMATCH" if is_shelf_life_fail else "MANUAL_QC_FAIL"
        )

        ticket = QCTicket(
            receiving_session_id=session.id,
            wid=wid,
            fsn=session.fsn,
            document_id=session.document_id,
            po_number=consignment.po_number if consignment else None,
            operator_id=session.operator_id,
            entered_mfg_date=session.mfg_date,
            entered_expiry_date=session.expiry_date,
            entered_shelf_life_days=session.shelf_life_days,
            catalog_shelf_life_days=session.catalog_shelf_life_days,
            tolerance_applied_pct=session.tolerance_applied_pct,
            deviation_days=session.deviation_days,
            mismatch_reason=session.qc_reasons,
        )
        db.add(ticket)
    else:
        session.qc_result = QCResult.PASS
        session.status = ReceivingStatus.QC_PASS

    db.commit()
    db.refresh(session)

    result = {
        "session_id": session.id,
        "wid": wid,
        "grn_id": grn_id,
        "qc_result": session.qc_result.value,
        "status": session.status.value,
        "product_name": session.product_name,
        "fsn": session.fsn,
        "mfg_date": session.mfg_date.isoformat() if session.mfg_date else None,
        "expiry_date": session.expiry_date.isoformat() if session.expiry_date else None,
        "shelf_life_days": session.shelf_life_days,
        "instructions": (
            "Move item to QC Fail tote. QC ticket has been generated."
            if session.qc_result == QCResult.FAIL
            else "Move item to receiving tote for putaway."
        ),
    }

    if session.qc_result == QCResult.FAIL:
        ticket_obj = db.query(QCTicket).filter(
            QCTicket.receiving_session_id == session.id
        ).first()
        if ticket_obj:
            result["ticket_id"] = ticket_obj.id

    return result


@router.get("/sessions")
def list_sessions(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(ReceivingSession).order_by(ReceivingSession.created_at.desc())
    if status:
        query = query.filter(ReceivingSession.status == status)
    sessions = query.limit(50).all()
    return [
        {
            "id": s.id,
            "document_id": s.document_id,
            "fsn": s.fsn,
            "product_name": s.product_name,
            "quantity": s.quantity,
            "wid": s.wid,
            "grn_id": s.grn_id,
            "qc_result": s.qc_result.value if s.qc_result else None,
            "status": s.status.value if s.status else None,
            "mfg_date": s.mfg_date.isoformat() if s.mfg_date else None,
            "expiry_date": s.expiry_date.isoformat() if s.expiry_date else None,
            "shelf_life_days": s.shelf_life_days,
            "validation_result": s.validation_result.value if s.validation_result else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in sessions
    ]


@router.post("/product-correction")
def product_correction(req: ProductCorrectionRequest, db: Session = Depends(get_db)):
    original_session = db.query(ReceivingSession).filter(
        ReceivingSession.wid == req.wid,
        ReceivingSession.status == ReceivingStatus.QC_FAIL,
    ).first()
    if not original_session:
        raise HTTPException(404, "No QC Failed item found with this WID")

    product = db.query(Product).filter(Product.fsn == original_session.fsn).first()
    if not product:
        raise HTTPException(404, "Product not found")

    mfg = req.mfg_date
    exp = req.expiry_date
    if req.month_year_mode:
        if mfg:
            mfg = apply_month_year_mode(mfg, "mfg")
        if exp:
            exp = apply_month_year_mode(exp, "expiry")

    try:
        calc_result = calculate_third_field(
            mfg_date=mfg,
            expiry_date=exp,
            shelf_life_value=req.shelf_life_value,
            shelf_life_uom=req.shelf_life_uom or (
                product.shelf_life_uom.value if product.shelf_life_uom else "DAYS"
            ),
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    shelf_life_days = calc_result["shelf_life_days"]
    validation = validate_shelf_life(
        db=db,
        entered_shelf_life_days=shelf_life_days,
        catalog_shelf_life_days=product.catalog_shelf_life_days,
    )

    if validation["result"] == "FAIL":
        return {
            "success": False,
            "message": "Validation failed again. Item remains in QC Fail — likely a catalog issue.",
            "validation": validation,
        }

    new_wid = _generate_wid()

    original_session.status = ReceivingStatus.VOIDED
    db.flush()

    new_session = ReceivingSession(
        consignment_id=original_session.consignment_id,
        document_id=original_session.document_id,
        fsn=original_session.fsn,
        ean=original_session.ean,
        product_name=original_session.product_name,
        quantity=original_session.quantity,
        mrp=original_session.mrp,
        offer=original_session.offer,
        mfg_date=calc_result["mfg_date"],
        expiry_date=calc_result["expiry_date"],
        shelf_life_days=shelf_life_days,
        shelf_life_uom=req.shelf_life_uom,
        catalog_shelf_life_days=product.catalog_shelf_life_days,
        validation_result=ValidationResult.PASS,
        qc_result=QCResult.PASS,
        wid=new_wid,
        grn_id=original_session.grn_id,
        status=ReceivingStatus.CORRECTED,
        operator_id=req.corrected_by,
    )
    db.add(new_session)

    correction = ProductCorrection(
        original_wid=original_session.wid,
        new_wid=new_wid,
        grn_id=original_session.grn_id,
        consignment_id=str(original_session.consignment_id),
        fsn=original_session.fsn,
        original_mfg_date=original_session.mfg_date,
        corrected_mfg_date=calc_result["mfg_date"],
        original_expiry_date=original_session.expiry_date,
        corrected_expiry_date=calc_result["expiry_date"],
        original_shelf_life_days=original_session.shelf_life_days,
        corrected_shelf_life_days=shelf_life_days,
        correction_reason=req.correction_reason,
        corrected_by=req.corrected_by,
    )
    db.add(correction)

    ticket = db.query(QCTicket).filter(
        QCTicket.receiving_session_id == original_session.id,
        QCTicket.ticket_status == TicketStatus.OPEN,
    ).first()
    if ticket:
        ticket.ticket_status = TicketStatus.AUTO_CLOSED
        ticket.resolved_at = datetime.utcnow()
        correction.qc_ticket_id = ticket.id

    db.commit()

    return {
        "success": True,
        "message": "Product correction successful. Old WID voided, new WID generated.",
        "original_wid": original_session.wid,
        "new_wid": new_wid,
        "grn_id": original_session.grn_id,
        "mfg_date": calc_result["mfg_date"].isoformat(),
        "expiry_date": calc_result["expiry_date"].isoformat(),
        "shelf_life_days": shelf_life_days,
        "validation": validation,
    }


@router.get("/qc-failed")
def list_qc_failed(db: Session = Depends(get_db)):
    sessions = (
        db.query(ReceivingSession)
        .filter(ReceivingSession.status == ReceivingStatus.QC_FAIL)
        .order_by(ReceivingSession.created_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "wid": s.wid,
            "fsn": s.fsn,
            "product_name": s.product_name,
            "document_id": s.document_id,
            "mfg_date": s.mfg_date.isoformat() if s.mfg_date else None,
            "expiry_date": s.expiry_date.isoformat() if s.expiry_date else None,
            "shelf_life_days": s.shelf_life_days,
            "catalog_shelf_life_days": s.catalog_shelf_life_days,
            "deviation_days": s.deviation_days,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in sessions
    ]
