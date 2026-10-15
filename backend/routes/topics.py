import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from ml.topic_clustering import TopicPredictor

router = APIRouter(prefix="/api/topics", tags=["Topic Clustering"])

class TopicPredictRequest(BaseModel):
    text: str

class TopicPredictResponse(BaseModel):
    text: str
    cleaned_text: Optional[str] = None
    predicted_cluster_id: int
    topic_name: str
    category: str
    color: str
    similarity_score: float
    top_terms: List[str]

@router.get("/clusters")
def get_topic_clusters():
    """
    Returns precomputed unsupervised topic clusters derived from
    TF-IDF Vectorization and MiniBatchKMeans clustering (k=6)
    across warehouse social media posts.
    """
    json_path = os.path.join("ml", "models", "topic_clusters.json")
    if not os.path.exists(json_path):
        raise HTTPException(status_code=404, detail="Topic clusters not found. Please train topic model first.")
    
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data

@router.post("/predict", response_model=TopicPredictResponse)
def predict_topic(request: TopicPredictRequest):
    """
    Infers the closest topic cluster for any social media post,
    tweet, or customer feedback text using cosine distance to cluster centroids.
    """
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    
    predictor = TopicPredictor.get_instance()
    result = predictor.predict_topic(request.text)
    return result
