from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class OverviewKPIs(BaseModel):
    total_mentions: int
    positive_count: int
    neutral_count: int
    negative_count: int
    positive_pct: float
    neutral_pct: float
    negative_pct: float
    average_sentiment: float
    most_mentioned_brand: str
    most_positive_brand: str
    most_negative_brand: str

class BrandSummary(BaseModel):
    brand_key: int
    brand_name: str
    industry: str
    parent_company: Optional[str]
    total_mentions: int
    positive_pct: float
    neutral_pct: float
    negative_pct: float
    brand_health_index: float
    avg_sentiment: float
    engagement_weighted_sentiment: float

class NegativeReasonItem(BaseModel):
    reason: str
    count: int
    percentage: float

class SentimentDistributionItem(BaseModel):
    sentiment: str
    count: int
    percentage: float

class SentimentTrendPoint(BaseModel):
    date: str
    year: int
    month: int
    positive: int
    neutral: int
    negative: int
    avg_sentiment: float
    total: int

class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Tweet or social media text to analyze")

class PredictResponse(BaseModel):
    text: str
    cleaned_text: str
    sentiment: str
    confidence: float
    sentiment_score: float
    probabilities: Dict[str, float]

class ModelMetricsResponse(BaseModel):
    accuracy: float
    macro_f1: float
    macro_precision: float
    macro_recall: float
    weighted_f1: float
    weighted_precision: float
    weighted_recall: float
    confusion_matrix: Dict[str, Any]
    classification_report: Dict[str, Any]
    sample_counts: Dict[str, int]

class OLAPRollupRequest(BaseModel):
    group_by: str = "quarter" # "year", "quarter", "month", "day"
    brand: Optional[str] = None
    industry: Optional[str] = None

class OLAPSliceRequest(BaseModel):
    dimension: str # "brand", "industry", "sentiment", "year"
    value: str

class OLAPDiceRequest(BaseModel):
    brands: Optional[List[str]] = None
    sentiments: Optional[List[str]] = None
    years: Optional[List[int]] = None
    industries: Optional[List[str]] = None

class OLAPPivotRequest(BaseModel):
    row_dimension: str = "brand"       # "brand", "industry", "year"
    col_dimension: str = "sentiment"   # "sentiment", "industry", "year"
