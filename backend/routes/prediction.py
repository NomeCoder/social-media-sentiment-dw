from fastapi import APIRouter
from backend.schemas import PredictRequest, PredictResponse
from ml.predict import predict_sentiment

router = APIRouter(prefix="/api", tags=["Prediction"])

@router.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    result = predict_sentiment(request.text)
    return result
