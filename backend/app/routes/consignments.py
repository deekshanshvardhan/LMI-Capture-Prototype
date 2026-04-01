from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Consignment

router = APIRouter(prefix="/api/consignments", tags=["Consignments"])


@router.get("/")
def list_consignments(db: Session = Depends(get_db)):
    consignments = db.query(Consignment).all()
    return [
        {
            "id": c.id,
            "document_id": c.document_id,
            "vendor_name": c.vendor_name,
            "po_number": c.po_number,
            "warehouse_id": c.warehouse_id,
            "status": c.status,
        }
        for c in consignments
    ]


@router.get("/{document_id}")
def get_consignment(document_id: str, db: Session = Depends(get_db)):
    c = db.query(Consignment).filter(Consignment.document_id == document_id).first()
    if not c:
        raise HTTPException(404, "Consignment not found")
    return {
        "id": c.id,
        "document_id": c.document_id,
        "vendor_name": c.vendor_name,
        "po_number": c.po_number,
        "warehouse_id": c.warehouse_id,
        "status": c.status,
    }
