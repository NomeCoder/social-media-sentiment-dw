import os
import json
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from ml.topic_clustering import TopicPredictor

router = APIRouter(prefix="/api/topics", tags=["Topic Clustering"])

CANDIDATE_JSON_PATHS = [
    os.path.join(os.path.dirname(__file__), "..", "data", "topic_clusters.json"),
    os.path.join("ml", "models", "topic_clusters.json"),
    os.path.join(os.getcwd(), "ml", "models", "topic_clusters.json"),
    "/app/backend/data/topic_clusters.json",
    "/app/ml/models/topic_clusters.json"
]

def load_topic_metadata() -> dict:
    for p in CANDIDATE_JSON_PATHS:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                continue
    raise HTTPException(status_code=404, detail="Topic clusters metadata not found. Please train model first.")

class TopicPredictRequest(BaseModel):
    text: str
    k: Optional[int] = 6

class TopicPredictResponse(BaseModel):
    text: str
    cleaned_text: Optional[str] = None
    k: int
    predicted_cluster_id: int
    topic_name: str
    category: str
    color: str
    similarity_score: float
    top_terms: List[str]
    coords_3d: Optional[List[float]] = None
    target_centroid_3d: Optional[List[float]] = None

@router.get("/clusters")
def get_topic_clusters(
    k: Optional[int] = Query(None, ge=1, le=10, description="KMeans cluster count k (1 to 10)")
):
    """
    Returns unsupervised topic clusters for any selected k value (1 to 10),
    along with the Elbow method inertia curve, 3D point cloud, and multi-k cluster profiles.
    """
    data = load_topic_metadata()
    
    # If a specific k is requested, return clusters for that k
    if k is not None:
        k_str = str(k)
        clusters_for_k = data.get("k_clusters", {}).get(k_str, data.get("clusters", []))
        return {
            "selected_k": k,
            "algorithm": data.get("algorithm", "MiniBatchKMeans + Sublinear TF-IDF"),
            "total_posts_sampled": data.get("total_posts_sampled", 24985),
            "available_k": data.get("available_k", list(range(1, 11))),
            "elbow_curve": data.get("elbow_curve", []),
            "clusters": clusters_for_k,
            "k_clusters": data.get("k_clusters", {}),
            "points_3d": data.get("points_3d", [])
        }
    
    return data

@router.get("/elbow")
def get_elbow_curve():
    """
    Returns the KMeans Within-Cluster Sum of Squares (Inertia / Elbow Curve)
    across k = 1 to 10 for cluster count optimization analysis.
    """
    data = load_topic_metadata()
    return {
        "elbow_curve": data.get("elbow_curve", []),
        "available_k": data.get("available_k", list(range(1, 11))),
        "default_k": data.get("default_k", 6)
    }

@router.post("/predict", response_model=TopicPredictResponse)
def predict_topic(
    request: TopicPredictRequest,
    k: Optional[int] = Query(None, ge=1, le=10)
):
    """
    Infers the closest topic cluster for any social media post or tweet
    against KMeans centroids with the user-selected k value (1 to 10).
    """
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    
    target_k = k if isinstance(k, int) else (request.k or 6)
    predictor = TopicPredictor.get_instance()
    result = predictor.predict_topic(request.text, k=target_k)
    return result
