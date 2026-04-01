from datetime import date
from sqlalchemy.orm import Session
from app.models import (
    Product, SlabConfig, Consignment,
    LmiPreference, ShelfLifeUoM,
)


def seed_database(db: Session):
    if db.query(Product).count() > 0:
        return

    products = [
        Product(
            fsn="FSN001GROC01", ean="8901030793905", name="Tata Salt 1kg",
            brand="Tata", vertical="Grocery",
            catalog_shelf_life_days=730, shelf_life_uom=ShelfLifeUoM.YEARS,
            lmi_preference=LmiPreference.MFG_DATE, lmi_enabled=True,
        ),
        Product(
            fsn="FSN002GROC02", ean="8901058853100", name="Maggi 2-Minute Noodles 280g",
            brand="Nestle", vertical="Grocery",
            catalog_shelf_life_days=270, shelf_life_uom=ShelfLifeUoM.MONTHS,
            lmi_preference=LmiPreference.MFG_DATE, lmi_enabled=True,
        ),
        Product(
            fsn="FSN003GROC03", ean="8901725181338", name="Fortune Sunflower Oil 1L",
            brand="Fortune", vertical="Grocery",
            catalog_shelf_life_days=365, shelf_life_uom=ShelfLifeUoM.MONTHS,
            lmi_preference=LmiPreference.MFG_DATE, lmi_enabled=True,
        ),
        Product(
            fsn="FSN004DAIRY01", ean="8901030311260", name="Amul Butter 500g",
            brand="Amul", vertical="Dairy",
            catalog_shelf_life_days=180, shelf_life_uom=ShelfLifeUoM.MONTHS,
            lmi_preference=LmiPreference.EXPIRY_DATE, lmi_enabled=True,
        ),
        Product(
            fsn="FSN005DAIRY02", ean="8901262150309", name="Mother Dairy Curd 400g",
            brand="Mother Dairy", vertical="Dairy",
            catalog_shelf_life_days=15, shelf_life_uom=ShelfLifeUoM.DAYS,
            lmi_preference=LmiPreference.EXPIRY_DATE, lmi_enabled=True,
        ),
        Product(
            fsn="FSN006BVRG01", ean="8901764011218", name="Tropicana Orange Juice 1L",
            brand="Tropicana", vertical="Beverages",
            catalog_shelf_life_days=120, shelf_life_uom=ShelfLifeUoM.MONTHS,
            lmi_preference=LmiPreference.MFG_DATE, lmi_enabled=True,
        ),
        Product(
            fsn="FSN007SNCK01", ean="8901491101707", name="Lays Classic Salted 52g",
            brand="Lays", vertical="Snacks",
            catalog_shelf_life_days=90, shelf_life_uom=ShelfLifeUoM.DAYS,
            lmi_preference=LmiPreference.MFG_DATE, lmi_enabled=True,
        ),
        Product(
            fsn="FSN008PHAR01", ean="8901059602011", name="Crocin Advance 500mg 20 Tabs",
            brand="GSK", vertical="Pharma",
            catalog_shelf_life_days=730, shelf_life_uom=ShelfLifeUoM.YEARS,
            lmi_preference=LmiPreference.EXPIRY_DATE, lmi_enabled=True,
        ),
        Product(
            fsn="FSN009GROC04", ean="8902080702015", name="Aashirvaad Atta 5kg",
            brand="Aashirvaad", vertical="Grocery",
            catalog_shelf_life_days=180, shelf_life_uom=ShelfLifeUoM.MONTHS,
            lmi_preference=LmiPreference.MFG_DATE, lmi_enabled=True,
        ),
        Product(
            fsn="FSN010GROC05", ean="8904114611307",
            name="Dabur Honey 500g",
            brand="Dabur", vertical="Grocery",
            catalog_shelf_life_days=None, shelf_life_uom=ShelfLifeUoM.MONTHS,
            lmi_preference=LmiPreference.MFG_DATE, lmi_enabled=True,
        ),
    ]

    slabs = [
        SlabConfig(min_days=0, max_days=90, tolerance_percentage=0.0,
                   is_default=False, effective_from=date(2026, 1, 1), created_by="Category-QA"),
        SlabConfig(min_days=91, max_days=180, tolerance_percentage=5.0,
                   is_default=False, effective_from=date(2026, 1, 1), created_by="Category-QA"),
        SlabConfig(min_days=181, max_days=365, tolerance_percentage=5.0,
                   is_default=False, effective_from=date(2026, 1, 1), created_by="Category-QA"),
        SlabConfig(min_days=366, max_days=99999, tolerance_percentage=5.0,
                   is_default=False, effective_from=date(2026, 1, 1), created_by="Category-QA"),
        SlabConfig(min_days=0, max_days=99999, tolerance_percentage=5.0,
                   is_default=True, effective_from=date(2026, 1, 1), created_by="Category-QA"),
    ]

    consignments = [
        Consignment(document_id="IRN-2026-00101", vendor_name="Tata Consumer Products",
                    po_number="PO-2026-5001", warehouse_id="WH-BLR-01"),
        Consignment(document_id="IRN-2026-00102", vendor_name="Nestle India Ltd",
                    po_number="PO-2026-5002", warehouse_id="WH-BLR-01"),
        Consignment(document_id="IRN-2026-00103", vendor_name="Adani Wilmar",
                    po_number="PO-2026-5003", warehouse_id="WH-BLR-01"),
        Consignment(document_id="IRN-2026-00104", vendor_name="Amul",
                    po_number="PO-2026-5004", warehouse_id="WH-DEL-02"),
        Consignment(document_id="IRN-2026-00105", vendor_name="Multi-Vendor Mixed",
                    po_number="PO-2026-5005", warehouse_id="WH-BLR-01"),
    ]

    db.add_all(products)
    db.add_all(slabs)
    db.add_all(consignments)
    db.commit()
