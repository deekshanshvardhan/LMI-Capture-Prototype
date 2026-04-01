from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Product

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("/search")
def search_product(
    ean: Optional[str] = Query(None),
    fsn: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    if not ean and not fsn and not q:
        raise HTTPException(400, "Provide ean, fsn, or q query parameter")

    product = None
    query = db.query(Product)

    if ean:
        product = query.filter(Product.ean == ean).first()
    elif fsn:
        product = query.filter(Product.fsn == fsn).first()
        if not product:
            product = query.filter(Product.fsn.ilike(f"%{fsn}%")).first()
    elif q:
        product = query.filter(Product.ean == q).first()
        if not product:
            product = query.filter(Product.fsn == q).first()
        if not product:
            product = query.filter(Product.fsn.ilike(f"%{q}%")).first()
        if not product:
            product = query.filter(Product.name.ilike(f"%{q}%")).first()

    if not product:
        raise HTTPException(404, "Product not found. Try one of: 8901058853100 (Maggi), 8901030793905 (Tata Salt), FSN002GROC02, or search by name like 'Maggi'")

    return {
        "id": product.id,
        "fsn": product.fsn,
        "ean": product.ean,
        "name": product.name,
        "brand": product.brand,
        "vertical": product.vertical,
        "catalog_shelf_life_days": product.catalog_shelf_life_days,
        "shelf_life_uom": product.shelf_life_uom.value if product.shelf_life_uom else None,
        "lmi_preference": product.lmi_preference.value if product.lmi_preference else None,
        "lmi_enabled": product.lmi_enabled,
        "image_url": product.image_url,
    }


@router.get("/")
def list_products(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    return [
        {
            "id": p.id,
            "fsn": p.fsn,
            "ean": p.ean,
            "name": p.name,
            "brand": p.brand,
            "vertical": p.vertical,
            "catalog_shelf_life_days": p.catalog_shelf_life_days,
            "shelf_life_uom": p.shelf_life_uom.value if p.shelf_life_uom else None,
            "lmi_preference": p.lmi_preference.value if p.lmi_preference else None,
            "lmi_enabled": p.lmi_enabled,
        }
        for p in products
    ]
