import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_topic_clusters_endpoint():
    response = client.get("/api/topics/clusters")
    assert response.status_code == 200
    data = response.json()
    assert "clusters" in data
    assert len(data["clusters"]) >= 5
    first_cluster = data["clusters"][0]
    assert "name" in first_cluster
    assert "top_terms" in first_cluster
    assert "sentiment_distribution" in first_cluster
    assert len(first_cluster["top_terms"]) > 0

def test_topic_clusters_with_k_param():
    for k_val in [1, 3, 6, 10]:
        response = client.get(f"/api/topics/clusters?k={k_val}")
        assert response.status_code == 200
        data = response.json()
        assert data["selected_k"] == k_val
        assert len(data["clusters"]) == k_val

def test_topic_elbow_endpoint():
    response = client.get("/api/topics/elbow")
    assert response.status_code == 200
    data = response.json()
    assert "elbow_curve" in data
    assert len(data["elbow_curve"]) == 10
    assert data["elbow_curve"][0]["k"] == 1
    assert data["elbow_curve"][-1]["k"] == 10

def test_topic_prediction_endpoint():
    # Test Netflix content prediction with k=4
    response = client.post("/api/topics/predict?k=4", json={
        "text": "Watching the brand new season of Stranger Things on Netflix, so good!"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["k"] == 4
    assert "predicted_cluster_id" in data
    assert 0 <= data["predicted_cluster_id"] < 4
    assert "topic_name" in data
    assert data["similarity_score"] > 0

def test_association_rules_endpoint():
    response = client.get("/api/association-rules?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "rules" in data
    assert "summary" in data
    assert data["summary"]["total_rules"] == 170
    assert data["summary"]["max_lift"] > 40.0
    assert len(data["rules"]) <= 10

def test_association_rules_filter_and_search():
    # Test search for "cloud" or "aws"
    response = client.get("/api/association-rules?search=cloud&min_lift=5.0")
    assert response.status_code == 200
    data = response.json()
    assert len(data["rules"]) > 0
    for rule in data["rules"]:
        assert rule["lift"] >= 5.0

def test_sentiment_trend_forecast_endpoint():
    response = client.get("/api/prediction/trend-forecast?horizon=14")
    assert response.status_code == 200
    data = response.json()
    assert "forecast" in data
    assert len(data["forecast"]) == 14
    assert "trend_summary" in data
    assert "direction" in data["trend_summary"]
    assert "model_fit_metrics" in data
    assert data["model_fit_metrics"]["r2_score"] > 0
