from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/api/brands", tags=["Brands"])

@router.get("")
def get_brands(db: Session = Depends(get_db)):
    service = AnalyticsService(db)
    return service.get_all_brands()

@router.get("/{brand_key}")
def get_brand_details(brand_key: int, db: Session = Depends(get_db)):
    service = AnalyticsService(db)
    brands = service.get_all_brands()
    for b in brands:
        if b["brand_key"] == brand_key:
            return b
    raise HTTPException(status_code=404, detail="Brand not found")
