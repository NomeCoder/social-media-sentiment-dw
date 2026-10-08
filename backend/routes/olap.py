from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.orm import Session
from typing import Optional, List
from backend.database import get_db
from backend.services.olap_service import OLAPService
from backend.schemas import OLAPDiceRequest

router = APIRouter(prefix="/api/olap", tags=["OLAP"])

@router.get("/rollup")
def olap_rollup(
    level: str = Query("quarter", description="Time aggregation level: year, quarter, month, day"),
    brand: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    service = OLAPService(db)
    return service.rollup(time_level=level, brand=brand, industry=industry)

@router.get("/drilldown")
def olap_drilldown(
    year: Optional[int] = Query(None),
    quarter: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    service = OLAPService(db)
    return service.drilldown(year=year, quarter=quarter, month=month)

@router.get("/slice")
def olap_slice(
    dimension: str = Query(..., description="Dimension to slice by: brand, industry, sentiment, year"),
    value: str = Query(..., description="Value of the dimension to fix"),
    db: Session = Depends(get_db)
):
    service = OLAPService(db)
    return service.slice_cube(dimension=dimension, value=value)

@router.post("/dice")
def olap_dice(
    request: OLAPDiceRequest,
    db: Session = Depends(get_db)
):
    service = OLAPService(db)
    return service.dice_cube(
        brands=request.brands,
        sentiments=request.sentiments,
        years=request.years,
        industries=request.industries
    )

@router.get("/pivot")
def olap_pivot(
    row_dim: str = Query("brand", description="Row dimension: brand, industry, year"),
    col_dim: str = Query("sentiment", description="Column dimension: sentiment"),
    db: Session = Depends(get_db)
):
    service = OLAPService(db)
    return service.pivot_cube(row_dim=row_dim, col_dim=col_dim)

@router.get("/brand-health")
def olap_brand_health(db: Session = Depends(get_db)):
    service = OLAPService(db)
    return service.brand_health_index()

@router.get("/weighted-sentiment")
def olap_weighted_sentiment(db: Session = Depends(get_db)):
    service = OLAPService(db)
    return service.engagement_weighted_sentiment()
