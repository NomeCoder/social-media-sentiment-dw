import os
import re
import json
import sqlite3
import joblib
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import MiniBatchKMeans

COLOR_PALETTE = [
    "#8b5cf6", # purple
    "#0ea5e9", # sky blue
    "#f59e0b", # amber
    "#ec4899", # pink
    "#10b981", # emerald
    "#06b6d4", # cyan
    "#3b82f6", # blue
    "#f43f5e", # rose
    "#14b8a6", # teal
    "#a855f7", # violet
]

def clean_for_topic(text: str) -> str:
    """Enhanced cleaning for topic modeling, removing URLs, special chars, and low-signal tokens."""
    if not isinstance(text, str):
        return ""
    text = re.sub(r"https?://\S+|www\.\S+", "", text)
    text = re.sub(r"@\w+", "", text)
    text = re.sub(r"#", "", text)
    text = re.sub(r"[^a-zA-Z\s]", " ", text)
    tokens = text.lower().split()
    custom_stops = {
        "the", "and", "to", "a", "of", "in", "is", "for", "on", "that", "this", "it", "with",
        "as", "at", "by", "from", "be", "are", "have", "was", "will", "an", "my", "your", "we",
        "our", "you", "so", "me", "if", "or", "what", "can", "just", "get", "do", "all", "out",
        "like", "up", "about", "more", "now", "one", "no", "not", "he", "she", "they", "them",
        "rt", "amp", "co", "http", "https", "sxsw", "today", "new", "day", "time", "via",
        "has", "had", "been", "would", "could", "should", "their", "there", "when", "who", "which"
    }
    cleaned_tokens = [t for t in tokens if len(t) > 2 and t not in custom_stops]
    return " ".join(cleaned_tokens)

def get_cluster_metadata(cluster_id: int, top_terms: list, k: int):
    """Dynamically determine intuitive name, category, and color based on top centroid terms."""
    top_terms_joined = " ".join(top_terms).lower()
    top4_joined = " ".join(top_terms[:4]).lower()

    if k == 1:
        return "Overall Social Media Macro Discourse", "Macro Corpus", "#0ea5e9"

    if any(w in top4_joined for w in ["amazon", "deal", "deals", "kindle"]):
        return "E-Commerce, Prime & Retail Deals", "Retail & E-Commerce", "#f59e0b"
    elif any(w in top4_joined for w in ["twitch", "stream", "streamer", "gaming"]):
        return "Gaming & Live Stream Communities", "Gaming & Esports", "#8b5cf6"
    elif any(w in top4_joined for w in ["netflix", "movie", "watch", "season", "series"]):
        return "Entertainment & Video Streaming", "Digital Media & OTT", "#ec4899"
    elif any(w in top4_joined for w in ["google", "seo", "search", "pixel"]):
        return "Search, Digital Marketing & Android", "Search & AdTech", "#0ea5e9"
    elif any(w in top4_joined for w in ["microsoft", "azure", "cloud", "windows", "teams"]):
        return "Enterprise Cloud & Infrastructure", "Enterprise & Cloud", "#6366f1"
    elif any(w in top4_joined for w in ["flight", "cancelled", "delayed", "airline", "help"]):
        return "Customer Support & Flight Operations", "Customer Experience", "#f43f5e"
    elif any(w in top4_joined for w in ["apple", "iphone", "ipad", "ios", "app"]):
        return "Smartphones, iOS & Apple Devices", "Consumer Electronics", "#06b6d4"
    elif any(w in top4_joined for w in ["youtube", "channel", "video", "youtuber"]):
        return "Content Creators & Video Channels", "Creator Economy", "#3b82f6"
    elif any(w in top4_joined for w in ["tesla", "car", "model", "musk", "battery"]):
        return "Automotive & Electric Vehicles", "Mobility & Tech", "#14b8a6"
    elif any(w in top4_joined for w in ["dreamordie", "body check", "music", "spotify"]):
        return "Viral Music & Social Video Promos", "Music & Social Media", "#10b981"
    else:
        name = f"Topic Cluster #{cluster_id + 1} ({top_terms[0].title()} & {top_terms[1].title()})"
        category = "Specialized Discussion"
        color = COLOR_PALETTE[cluster_id % len(COLOR_PALETTE)]
        return name, category, color

def train_and_export_topic_clusters(db_path: str = "database/warehouse.db", min_k: int = 1, max_k: int = 10):
    os.makedirs("ml/models", exist_ok=True)
    os.makedirs("backend/data", exist_ok=True)
    print("Connecting to warehouse database to sample posts for multi-k topic clustering...")
    conn = sqlite3.connect(db_path)
    
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
    total_samples = len(df)
    print(f"Filtered to {total_samples} posts with rich tokens.")

    # Vectorize with sublinear TF-IDF
    vectorizer = TfidfVectorizer(
        max_features=8000,
        ngram_range=(1, 2),
        min_df=3,
        max_df=0.8,
        sublinear_tf=True
    )
    X = vectorizer.fit_transform(df["topic_text"])
    terms = vectorizer.get_feature_names_out()
    print(f"TF-IDF matrix shape: {X.shape}")

    models_dict = {}
    elbow_curve = []
    k_clusters_data = {}

    print(f"Training MiniBatchKMeans across k in [{min_k}, {max_k}]...")
    for k in range(min_k, max_k + 1):
        kmeans = MiniBatchKMeans(
            n_clusters=k,
            random_state=42,
            batch_size=2048,
            max_iter=250,
            n_init=5
        )
        kmeans.fit(X)
        labels = kmeans.labels_
        inertia = float(kmeans.inertia_)
        models_dict[k] = kmeans

        elbow_curve.append({
            "k": k,
            "inertia": round(inertia, 2),
            "pct_inertia_reduction": 0.0 if k == 1 else round(((elbow_curve[0]["inertia"] - inertia) / elbow_curve[0]["inertia"]) * 100, 1)
        })

        # Calculate cluster details
        order_centroids = kmeans.cluster_centers_.argsort()[:, ::-1]
        clusters_output = []

        for cluster_id in range(k):
            top_terms = [terms[ind] for ind in order_centroids[cluster_id, :12]]
            name, category, color = get_cluster_metadata(cluster_id, top_terms, k)

            mask = (labels == cluster_id)
            cluster_count = int(np.sum(mask))
            cluster_share = round((cluster_count / total_samples) * 100, 2)
            
            cluster_df = df[mask]
            
            # Sentiment breakdown
            if len(cluster_df) > 0:
                sent_counts = cluster_df["sentiment_label"].value_counts(normalize=True).to_dict()
                pos_pct = round(sent_counts.get("Positive", 0.0) * 100, 1)
                neu_pct = round(sent_counts.get("Neutral", 0.0) * 100, 1)
                neg_pct = round(sent_counts.get("Negative", 0.0) * 100, 1)
                avg_score = round(float(cluster_df["sentiment_score"].mean()), 3)
                top_brands = cluster_df["brand_name"].value_counts().head(4).to_dict()
                sample_posts = cluster_df.sort_values(by="sentiment_score", ascending=False).head(3)[["text", "sentiment_label", "brand_name"]].to_dict(orient="records")
            else:
                pos_pct, neu_pct, neg_pct, avg_score = 33.3, 33.3, 33.3, 0.0
                top_brands, sample_posts = {}, []

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

        k_clusters_data[str(k)] = clusters_output
        print(f"  -> k={k}: Inertia={inertia:.1f}, Clusters processed.")

    # Structure comprehensive multi-k payload
    full_payload = {
        "algorithm": "MiniBatchKMeans + Sublinear TF-IDF",
        "total_posts_sampled": total_samples,
        "available_k": list(range(min_k, max_k + 1)),
        "default_k": 6,
        "elbow_curve": elbow_curve,
        "clusters": k_clusters_data.get("6", k_clusters_data.get(str(max_k))),
        "k_clusters": k_clusters_data
    }

    # Save vectorizer & model dict
    joblib.dump(vectorizer, "ml/models/topic_vectorizer.pkl")
    joblib.dump(models_dict, "ml/models/topic_kmeans_dict.pkl")
    if 6 in models_dict:
        joblib.dump(models_dict[6], "ml/models/topic_kmeans.pkl")
    
    # Save JSON files
    with open("ml/models/topic_clusters.json", "w", encoding="utf-8") as f:
        json.dump(full_payload, f, indent=2)

    with open("backend/data/topic_clusters.json", "w", encoding="utf-8") as f:
        json.dump(full_payload, f, indent=2)

    print("Completed multi-k training (k=1 to 10)! Artifacts saved.")
    return full_payload

class TopicPredictor:
    _instance = None

    def __init__(self):
        self.vectorizer_path = "ml/models/topic_vectorizer.pkl"
        self.models_dict_path = "ml/models/topic_kmeans_dict.pkl"
        self.kmeans_path = "ml/models/topic_kmeans.pkl"
        self.json_path = "ml/models/topic_clusters.json"
        self.vectorizer = None
        self.models_dict = None
        self.kmeans_default = None
        self.metadata = None
        self.svd_3d = None
        self.scaler_params = None
        self._load()

    def _load(self):
        candidate_dirs = [
            os.path.join(os.path.dirname(__file__), "models"),
            "ml/models",
            os.path.join(os.getcwd(), "ml", "models"),
            os.path.join(os.path.dirname(__file__), "..", "backend", "data"),
            "backend/data",
            "/app/ml/models",
            "/app/backend/data"
        ]
        
        for d in candidate_dirs:
            vec_p = os.path.join(d, "topic_vectorizer.pkl")
            if not self.vectorizer and os.path.exists(vec_p):
                try:
                    self.vectorizer = joblib.load(vec_p)
                except Exception:
                    pass
            
            dict_p = os.path.join(d, "topic_kmeans_dict.pkl")
            if not self.models_dict and os.path.exists(dict_p):
                try:
                    self.models_dict = joblib.load(dict_p)
                except Exception:
                    pass

            k_p = os.path.join(d, "topic_kmeans.pkl")
            if not self.kmeans_default and os.path.exists(k_p):
                try:
                    self.kmeans_default = joblib.load(k_p)
                except Exception:
                    pass

            svd_p = os.path.join(d, "topic_svd_3d.pkl")
            if not self.svd_3d and os.path.exists(svd_p):
                try:
                    self.svd_3d = joblib.load(svd_p)
                except Exception:
                    pass

            scaler_p = os.path.join(d, "topic_svd_scaler.json")
            if not self.scaler_params and os.path.exists(scaler_p):
                try:
                    with open(scaler_p, "r", encoding="utf-8") as f:
                        self.scaler_params = json.load(f)
                except Exception:
                    pass

            json_p = os.path.join(d, "topic_clusters.json")
            if not self.metadata and os.path.exists(json_p):
                try:
                    with open(json_p, "r", encoding="utf-8") as f:
                        self.metadata = json.load(f)
                except Exception:
                    pass

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = TopicPredictor()
        return cls._instance

    def predict_topic(self, text: str, k: int = 6) -> dict:
        if self.vectorizer is None or self.metadata is None:
            self._load()
            if self.vectorizer is None or self.metadata is None:
                return {"error": "Topic model not loaded."}

        # Select model for requested k
        k = max(1, min(10, k))
        model = None
        if self.models_dict and k in self.models_dict:
            model = self.models_dict[k]
        elif self.kmeans_default:
            model = self.kmeans_default

        if model is None:
            return {"error": f"Model for k={k} not available."}

        cleaned = clean_for_topic(text)
        k_str = str(k)
        clusters_list = self.metadata.get("k_clusters", {}).get(k_str, self.metadata.get("clusters", []))

        if not cleaned:
            c0 = clusters_list[0] if clusters_list else {"name": "General Topic", "category": "General", "color": "#0ea5e9", "top_terms": []}
            return {
                "text": text,
                "k": k,
                "predicted_cluster_id": 0,
                "topic_name": c0.get("name"),
                "category": c0.get("category"),
                "color": c0.get("color"),
                "similarity_score": 0.5,
                "top_terms": c0.get("top_terms", []),
                "coords_3d": [0.0, 0.0, 0.0],
                "target_centroid_3d": c0.get("centroid_3d", [0.0, 0.0, 0.0])
            }

        vec = self.vectorizer.transform([cleaned])
        cluster_id = int(model.predict(vec)[0])
        
        center = model.cluster_centers_[cluster_id]
        dense_vec = vec.toarray()[0]
        norm_v = np.linalg.norm(dense_vec)
        norm_c = np.linalg.norm(center)
        sim = float(np.dot(dense_vec, center) / (norm_v * norm_c + 1e-9)) if norm_v > 0 else 0.5
        sim = max(0.2, min(0.99, sim))

        cluster_info = next((c for c in clusters_list if c["cluster_id"] == cluster_id), None)

        # 3D spatial projection of the query post
        coords_3d = None
        if self.svd_3d is not None and self.scaler_params is not None:
            try:
                raw_3d = self.svd_3d.transform(vec)[0]
                min_vals = np.array(self.scaler_params["min_vals"])
                ranges = np.array(self.scaler_params["ranges"])
                scale_factor = float(self.scaler_params.get("scale_factor", 90.0))
                scaled = ((raw_3d - min_vals) / ranges - 0.5) * scale_factor
                coords_3d = [round(float(scaled[0]), 2), round(float(scaled[1]), 2), round(float(scaled[2]), 2)]
            except Exception:
                coords_3d = None

        target_centroid_3d = cluster_info.get("centroid_3d") if cluster_info else None

        return {
            "text": text,
            "cleaned_text": cleaned,
            "k": k,
            "predicted_cluster_id": cluster_id,
            "topic_name": cluster_info["name"] if cluster_info else f"Topic #{cluster_id + 1}",
            "category": cluster_info["category"] if cluster_info else "Social Media",
            "color": cluster_info["color"] if cluster_info else "#38bdf8",
            "similarity_score": round(sim, 3),
            "top_terms": cluster_info["top_terms"] if cluster_info else [],
            "coords_3d": coords_3d,
            "target_centroid_3d": target_centroid_3d
        }

if __name__ == "__main__":
    train_and_export_topic_clusters()
