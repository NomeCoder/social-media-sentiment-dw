import os
import re
import json
import sqlite3
import joblib
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import MiniBatchKMeans, KMeans
from ml.preprocessing import clean_text

CLUSTER_LABELS_MAP = {
    0: "Gaming & Live Streaming",
    1: "Cloud & Enterprise Tech",
    2: "Smartphones & Mobile Ecosystem",
    3: "Digital Entertainment & Media",
    4: "E-Commerce Deals & Retail",
    5: "Customer Experience & Travel",
}

def clean_for_topic(text: str) -> str:
    """Enhanced cleaning for topic modeling, removing URLs, special chars, and low-signal tokens."""
    if not isinstance(text, str):
        return ""
    text = re.sub(r"https?://\S+|www\.\S+", "", text)
    text = re.sub(r"@\w+", "", text)
    text = re.sub(r"#", "", text)
    text = re.sub(r"[^a-zA-Z\s]", " ", text)
    tokens = text.lower().split()
    # Remove single characters and common stop noise
    custom_stops = {
        "the", "and", "to", "a", "of", "in", "is", "for", "on", "that", "this", "it", "with",
        "as", "at", "by", "from", "be", "are", "have", "was", "will", "an", "my", "your", "we",
        "our", "you", "so", "me", "if", "or", "what", "can", "just", "get", "do", "all", "out",
        "like", "up", "about", "more", "now", "one", "no", "not", "he", "she", "they", "them",
        "rt", "amp", "co", "http", "https", "sxsw", "today", "new", "day", "time", "via"
    }
    cleaned_tokens = [t for t in tokens if len(t) > 2 and t not in custom_stops]
    return " ".join(cleaned_tokens)

def train_and_export_topic_clusters(db_path: str = "database/warehouse.db", n_clusters: int = 6):
    os.makedirs("ml/models", exist_ok=True)
    print("Connecting to warehouse database to sample posts for topic clustering...")
    conn = sqlite3.connect(db_path)
    
    # Stratified-like sample across brands to ensure balanced, distinct topic representation
    query = """
        SELECT f.post_key, f.text, b.brand_name, s.sentiment_label, f.sentiment_score
        FROM FACT_POST f
        JOIN DIM_BRAND b ON f.brand_key = b.brand_key
        JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
        WHERE f.text IS NOT NULL AND LENGTH(f.text) > 15
        ORDER BY RANDOM()
        LIMIT 25000;
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    
    print(f"Loaded {len(df)} sample posts. Preprocessing texts...")
    df["topic_text"] = df["text"].apply(clean_for_topic)
    df = df[df["topic_text"].str.len() > 5].reset_index(drop=True)
    print(f"Filtered to {len(df)} posts with rich tokens.")

    # Vectorize with sublinear TF-IDF
    vectorizer = TfidfVectorizer(
        max_features=8000,
        ngram_range=(1, 2),
        min_df=3,
        max_df=0.8,
        sublinear_tf=True
    )
    X = vectorizer.fit_transform(df["topic_text"])
    print(f"TF-IDF matrix shape: {X.shape}")

    print(f"Training KMeans model with k={n_clusters}...")
    kmeans = MiniBatchKMeans(
        n_clusters=n_clusters,
        random_state=42,
        batch_size=1024,
        max_iter=300,
        n_init=10
    )
    kmeans.fit(X)
    df["cluster"] = kmeans.labels_

    # Get top terms per cluster
    order_centroids = kmeans.cluster_centers_.argsort()[:, ::-1]
    terms = vectorizer.get_feature_names_out()

    clusters_output = []
    total_samples = len(df)

    for cluster_id in range(n_clusters):
        top_terms = [terms[ind] for ind in order_centroids[cluster_id, :12]]
        cluster_df = df[df["cluster"] == cluster_id]
        cluster_count = len(cluster_df)
        cluster_share = round((cluster_count / total_samples) * 100, 2)
        
        # Calculate sentiment breakdown
        sent_counts = cluster_df["sentiment_label"].value_counts(normalize=True).to_dict()
        pos_pct = round(sent_counts.get("Positive", 0.0) * 100, 1)
        neu_pct = round(sent_counts.get("Neutral", 0.0) * 100, 1)
        neg_pct = round(sent_counts.get("Negative", 0.0) * 100, 1)
        avg_score = round(float(cluster_df["sentiment_score"].mean()), 3)

        # Get top brands for this cluster
        top_brands = cluster_df["brand_name"].value_counts().head(4).to_dict()

        # Sample representative posts (posts with longest relevant cleaned text)
        sample_posts = cluster_df.sort_values(by="sentiment_score", ascending=False).head(3)[["text", "sentiment_label", "brand_name"]].to_dict(orient="records")

        # Dynamic intuitive name identification based on top keywords
        top_terms_joined = " ".join(top_terms).lower()
        top3_joined = " ".join(top_terms[:4]).lower()
        if "amazon" in top3_joined or "deal" in top3_joined or "deals" in top3_joined:
            name = "E-Commerce, Prime & Retail Deals"
            category = "Retail & E-Commerce"
            color = "#f59e0b" # amber
        elif "twitch" in top3_joined or "stream" in top3_joined or "streamer" in top3_joined:
            name = "Gaming & Live Stream Communities"
            category = "Gaming & Esports"
            color = "#8b5cf6" # purple
        elif "netflix" in top3_joined or "movie" in top3_joined or "watch" in top3_joined:
            name = "Entertainment & Video Streaming"
            category = "Digital Media & OTT"
            color = "#ec4899" # pink
        elif "google" in top3_joined or "seo" in top3_joined or "search" in top3_joined:
            name = "Search, Digital Marketing & Android"
            category = "Search & AdTech"
            color = "#0ea5e9" # sky blue
        elif "microsoft" in top3_joined or "azure" in top3_joined or "cloud" in top3_joined:
            name = "Enterprise Cloud & Infrastructure"
            category = "Enterprise & Cloud"
            color = "#6366f1" # indigo
        elif "flight" in top3_joined or "cancelled" in top3_joined or "delayed" in top3_joined:
            name = "Customer Support & Flight Operations"
            category = "Customer Experience"
            color = "#f43f5e" # rose
        elif "apple" in top3_joined or "iphone" in top3_joined or "ipad" in top3_joined:
            name = "Smartphones, iOS & Apple Devices"
            category = "Consumer Electronics"
            color = "#06b6d4" # cyan
        elif "youtube" in top3_joined or "channel" in top3_joined:
            name = "Content Creators & Video Channels"
            category = "Creator Economy"
            color = "#3b82f6" # blue
        else:
            name = f"Topic Cluster #{cluster_id + 1} ({top_terms[0].title()} & {top_terms[1].title()})"
            category = "General Social"
            color = "#10b981"

        clusters_output.append({
            "cluster_id": cluster_id,
            "name": name,
            "category": category,
            "color": color,
            "count": cluster_count,
            "share_pct": cluster_share,
            "top_terms": top_terms,
            "avg_sentiment_score": avg_score,
            "sentiment_distribution": {
                "positive": pos_pct,
                "neutral": neu_pct,
                "negative": neg_pct
            },
            "top_brands": top_brands,
            "sample_posts": sample_posts
        })

    # Save artifacts
    joblib.dump(kmeans, "ml/models/topic_kmeans.pkl")
    joblib.dump(vectorizer, "ml/models/topic_vectorizer.pkl")
    
    with open("ml/models/topic_clusters.json", "w") as f:
        json.dump({
            "algorithm": "MiniBatchKMeans + Sublinear TF-IDF (k=6)",
            "total_posts_sampled": len(df),
            "clusters": clusters_output
        }, f, indent=2)

    print("Topic clustering complete! Saved model and json to ml/models/")
    return clusters_output

class TopicPredictor:
    _instance = None

    def __init__(self):
        self.vectorizer_path = "ml/models/topic_vectorizer.pkl"
        self.kmeans_path = "ml/models/topic_kmeans.pkl"
        self.json_path = "ml/models/topic_clusters.json"
        self.vectorizer = None
        self.kmeans = None
        self.metadata = None
        self._load()

    def _load(self):
        if os.path.exists(self.vectorizer_path) and os.path.exists(self.kmeans_path):
            self.vectorizer = joblib.load(self.vectorizer_path)
            self.kmeans = joblib.load(self.kmeans_path)
        if os.path.exists(self.json_path):
            with open(self.json_path, "r") as f:
                self.metadata = json.load(f)

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = TopicPredictor()
        return cls._instance

    def predict_topic(self, text: str) -> dict:
        if self.vectorizer is None or self.kmeans is None or self.metadata is None:
            self._load()
            if self.vectorizer is None:
                return {"error": "Topic model not loaded."}

        cleaned = clean_for_topic(text)
        if not cleaned:
            return {
                "text": text,
                "predicted_cluster_id": 0,
                "topic_name": self.metadata["clusters"][0]["name"],
                "confidence": 0.5,
                "top_terms": self.metadata["clusters"][0]["top_terms"]
            }

        vec = self.vectorizer.transform([cleaned])
        cluster_id = int(self.kmeans.predict(vec)[0])
        # Calculate distance to cluster center
        center = self.kmeans.cluster_centers_[cluster_id]
        dense_vec = vec.toarray()[0]
        # Cosine similarity
        norm_v = np.linalg.norm(dense_vec)
        norm_c = np.linalg.norm(center)
        sim = float(np.dot(dense_vec, center) / (norm_v * norm_c + 1e-9)) if norm_v > 0 else 0.5
        sim = max(0.2, min(0.99, sim))

        cluster_info = next((c for c in self.metadata["clusters"] if c["cluster_id"] == cluster_id), None)

        return {
            "text": text,
            "cleaned_text": cleaned,
            "predicted_cluster_id": cluster_id,
            "topic_name": cluster_info["name"] if cluster_info else f"Cluster {cluster_id}",
            "category": cluster_info["category"] if cluster_info else "Social Media",
            "color": cluster_info["color"] if cluster_info else "#38bdf8",
            "similarity_score": round(sim, 3),
            "top_terms": cluster_info["top_terms"] if cluster_info else []
        }

if __name__ == "__main__":
    train_and_export_topic_clusters()
