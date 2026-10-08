from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.services.analytics_service import AnalyticsService
from backend.services.olap_service import OLAPService

router = APIRouter(prefix="/api/sentiment", tags=["Sentiment"])

@router.get("/distribution")
def get_sentiment_distribution(db: Session = Depends(get_db)):
    service = AnalyticsService(db)
    return service.get_sentiment_distribution()

@router.get("/trend")
def get_sentiment_trend(db: Session = Depends(get_db)):
    service = OLAPService(db)
    return service.sentiment_trend()

@router.get("/negative-reasons")
def get_negative_reasons(brand: Optional[str] = Query(None), db: Session = Depends(get_db)):
    service = AnalyticsService(db)
    return service.get_negative_reasons(brand=brand)
