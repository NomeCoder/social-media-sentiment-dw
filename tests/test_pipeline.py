import os
import sqlite3
import pytest
from starlette.testclient import TestClient
from backend.main import app
from ml.predict import predict_sentiment

client = TestClient(app)

def test_database_record_count():
    assert os.path.exists("database/warehouse.db"), "Database file does not exist"
    conn = sqlite3.connect("database/warehouse.db")
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM FACT_POST")
    total_posts = cursor.fetchone()[0]
    assert total_posts == 289324, f"Expected 289,324 rows, found {total_posts}"
    
    cursor.execute("SELECT COUNT(*) FROM DIM_BRAND")
    brands_count = cursor.fetchone()[0]
    assert brands_count >= 20, f"Expected at least 20 brands, found {brands_count}"
    
    cursor.execute("SELECT COUNT(*) FROM DIM_DATE")
    dates_count = cursor.fetchone()[0]
    assert dates_count > 0, "DIM_DATE is empty"
    
    conn.close()

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_dashboard_overview():
    res = client.get("/api/dashboard/overview")
    assert res.status_code == 200
    data = res.json()
    assert data["total_mentions"] == 289324
    assert "positive_pct" in data
    assert "average_sentiment" in data
    assert "most_mentioned_brand" in data

def test_olap_rollup():
    res = client.get("/api/olap/rollup?level=quarter")
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    assert "time_bucket" in data[0]
    assert "positive_count" in data[0]

def test_olap_drilldown():
    res = client.get("/api/olap/drilldown?year=2020")
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    assert "drill_key" in data[0]

def test_olap_slice():
    res = client.get("/api/olap/slice?dimension=industry&value=Technology")
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0

def test_olap_dice():
    res = client.post("/api/olap/dice", json={
        "brands": ["Apple", "Google"],
        "sentiments": ["Positive"],
        "years": [2020]
    })
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    for row in data:
        assert row["sentiment_label"] == "Positive"

def test_olap_pivot():
    res = client.get("/api/olap/pivot?row_dim=brand&col_dim=sentiment")
    assert res.status_code == 200
    data = res.json()
    assert "data" in data
    assert len(data["data"]) > 0

def test_brand_health():
    res = client.get("/api/olap/brand-health")
    assert res.status_code == 200
    data = res.json()
    assert len(data) > 0
    assert "brand_health_index" in data[0]

def test_ml_prediction():
    res_pos = predict_sentiment("Delta customer service was amazing today, absolutely loved the prompt response!")
    assert res_pos["sentiment"] == "positive"
    assert res_pos["confidence"] > 0.6

    res_neg = predict_sentiment("Worst flight of my life, cancelled with zero notice and lost baggage!")
    assert res_neg["sentiment"] == "negative"
    assert res_neg["confidence"] > 0.6
