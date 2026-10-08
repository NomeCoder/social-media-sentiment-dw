import os
import json
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/model", tags=["Model"])

@router.get("/metrics")
def get_model_metrics():
    metrics_path = "ml/model_evaluation.json"
    if not os.path.exists(metrics_path):
        raise HTTPException(status_code=404, detail="Model evaluation metrics not found. Train the model first.")
    
    with open(metrics_path, "r", encoding="utf-8") as f:
        metrics = json.load(f)
        
    return metrics
