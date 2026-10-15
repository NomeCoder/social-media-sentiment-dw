from fastapi import APIRouter, Query
from typing import Optional
from backend.schemas import PredictRequest, PredictResponse
from ml.predict import predict_sentiment
from backend.services.forecasting_service import SentimentForecastingService

router = APIRouter(prefix="/api", tags=["Prediction & Forecasting"])

@router.post("/predict", response_model=PredictResponse)
@router.post("/prediction/sentiment", response_model=PredictResponse)
def predict(request: PredictRequest):
    """
    Classifies input post into positive, negative, or neutral sentiment
    with probability distribution and confidence score.
    """
    result = predict_sentiment(request.text)
    return result

@router.get("/prediction/trend-forecast")
def get_trend_forecast(
    brand: Optional[str] = Query(None, description="Optional brand name to forecast sentiment for"),
    horizon: int = Query(14, ge=3, le=60, description="Forecast horizon in days")
):
    """
    Predicts and forecasts sentiment trends forward into the future using
    Holt's Linear Exponential Smoothing with 95% Confidence Intervals.
    """
    forecaster = SentimentForecastingService()
    result = forecaster.forecast_sentiment_trend(brand=brand, horizon_days=horizon)
    return result
