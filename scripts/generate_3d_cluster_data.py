import os
import json
import sqlite3
import joblib
import numpy as np
from sklearn.decomposition import TruncatedSVD
from ml.topic_clustering import clean_for_topic

def generate_3d_cluster_coordinates():
    print("Generating 3D spatial cluster coordinates...")
    
    vec_path = "ml/models/topic_vectorizer.pkl"
    dict_path = "ml/models/topic_kmeans_dict.pkl"
    json_path = "backend/data/topic_clusters.json"
    
    if not os.path.exists(vec_path) or not os.path.exists(dict_path):
        raise FileNotFoundError("Vectorizer or KMeans dict not found in ml/models.")
        
    vectorizer = joblib.load(vec_path)
    models_dict = joblib.load(dict_path)
    
    with open(json_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)
        
    # Sample 550 representative posts across brands and sentiments
    conn = sqlite3.connect("database/warehouse.db")
    query = """
        SELECT f.post_key, f.text, b.brand_name, s.sentiment_label, f.sentiment_score
        FROM FACT_POST f
        JOIN DIM_BRAND b ON f.brand_key = b.brand_key
        JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
        WHERE f.text IS NOT NULL AND LENGTH(f.text) > 20
        ORDER BY RANDOM()
        LIMIT 600;
    """
    df_raw = sqlite3.connect("database/warehouse.db")
    cursor = conn.cursor()
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    
    print(f"Loaded {len(rows)} sample rows for 3D visualization.")
    
    cleaned_data = []
    for r in rows:
        cleaned = clean_for_topic(r[1])
        if len(cleaned) > 8:
            cleaned_data.append({
                "post_key": r[0],
                "text": r[1][:140] + ("..." if len(r[1]) > 140 else ""),
                "full_text": r[1][:280],
                "cleaned": cleaned,
                "brand_name": r[2],
                "sentiment_label": r[3],
                "sentiment_score": round(float(r[4]), 3)
            })
            
    # Keep top 500 clean posts
    sample_posts = cleaned_data[:500]
    cleaned_texts = [p["cleaned"] for p in sample_posts]
    
    # TF-IDF transform
    X_sample = vectorizer.transform(cleaned_texts)
    
    # Fit 3D Truncated SVD
    svd_3d = TruncatedSVD(n_components=3, random_state=42)
    coords_3d_raw = svd_3d.fit_transform(X_sample)
    
    # Scale and center to range roughly [-45, 45]
    min_vals = coords_3d_raw.min(axis=0)
    max_vals = coords_3d_raw.max(axis=0)
    ranges = max_vals - min_vals
    ranges[ranges == 0] = 1.0
    
    # Normalize to [-45, 45]
    scaled_coords = ((coords_3d_raw - min_vals) / ranges - 0.5) * 90.0
    
    # Save SVD model
    joblib.dump(svd_3d, "ml/models/topic_svd_3d.pkl")
    # Save scaler params in model metadata so backend can project new points
    scaler_params = {
        "min_vals": min_vals.tolist(),
        "ranges": ranges.tolist(),
        "scale_factor": 90.0
    }
    with open("ml/models/topic_svd_scaler.json", "w", encoding="utf-8") as f:
        json.dump(scaler_params, f, indent=2)
    with open("backend/data/topic_svd_scaler.json", "w", encoding="utf-8") as f:
        json.dump(scaler_params, f, indent=2)

    # Generate primordial unclustered coordinates (spherical dispersion for formation phase 0)
    np.random.seed(42)
    n_points = len(sample_posts)
    phi = np.random.uniform(0, np.pi * 2, n_points)
    costheta = np.random.uniform(-1, 1, n_points)
    u = np.random.uniform(0.1, 1, n_points)
    theta = np.arccos(costheta)
    r = 50.0 * (u ** (1/3))
    
    primordial_x = r * np.sin(theta) * np.cos(phi)
    primordial_y = r * np.sin(theta) * np.sin(phi)
    primordial_z = r * np.cos(theta)

    # For each k in 1..10, compute cluster assignments and centroid 3D positions
    cluster_assignments_per_k = {}
    for k in range(1, 11):
        if k in models_dict:
            model = models_dict[k]
            preds = model.predict(X_sample)
            cluster_assignments_per_k[str(k)] = [int(p) for p in preds]
            
            # Project centroids
            centers = model.cluster_centers_
            raw_c3d = svd_3d.transform(centers)
            scaled_c3d = ((raw_c3d - min_vals) / ranges - 0.5) * 90.0
            
            # Enrich metadata for this k
            k_str = str(k)
            if k_str in metadata.get("k_clusters", {}):
                cluster_list = metadata["k_clusters"][k_str]
                for c_idx, cluster_obj in enumerate(cluster_list):
                    cx = round(float(scaled_c3d[c_idx][0]), 2)
                    cy = round(float(scaled_c3d[c_idx][1]), 2)
                    cz = round(float(scaled_c3d[c_idx][2]), 2)
                    
                    # Compute member points in this cluster for accurate bounding radius
                    member_indices = [i for i, p in enumerate(preds) if p == c_idx]
                    if len(member_indices) > 0:
                        member_coords = scaled_coords[member_indices]
                        dists = np.linalg.norm(member_coords - np.array([cx, cy, cz]), axis=1)
                        radius = float(np.percentile(dists, 85)) if len(dists) > 2 else float(np.max(dists))
                        radius = max(8.0, min(35.0, round(radius, 2)))
                    else:
                        radius = 15.0
                        
                    # Calculate initial seed position (Phase 2)
                    # Simulated seed position offset
                    seed_offset = np.array([
                        np.sin(c_idx * 1.5) * 20.0,
                        np.cos(c_idx * 1.2) * 15.0,
                        np.sin(c_idx * 0.9) * 20.0
                    ])
                    seed_pos = [round(float(scaled_c3d[c_idx][0] + seed_offset[0]), 2),
                                round(float(scaled_c3d[c_idx][1] + seed_offset[1]), 2),
                                round(float(scaled_c3d[c_idx][2] + seed_offset[2]), 2)]
                                
                    # Intermediate position (Phase 3-4)
                    inter_pos = [round((cx + seed_pos[0]) / 2.0, 2),
                                 round((cy + seed_pos[1]) / 2.0, 2),
                                 round((cz + seed_pos[2]) / 2.0, 2)]

                    cluster_obj["centroid_3d"] = [cx, cy, cz]
                    cluster_obj["seed_3d"] = seed_pos
                    cluster_obj["intermediate_3d"] = inter_pos
                    cluster_obj["radius_3d"] = radius
                    cluster_obj["member_sample_count"] = len(member_indices)

    # Format sample points payload
    points_3d = []
    for i, p in enumerate(sample_posts):
        x = round(float(scaled_coords[i][0]), 2)
        y = round(float(scaled_coords[i][1]), 2)
        z = round(float(scaled_coords[i][2]), 2)
        
        px = round(float(primordial_x[i]), 2)
        py = round(float(primordial_y[i]), 2)
        pz = round(float(primordial_z[i]), 2)
        
        assignments = {k_str: cluster_assignments_per_k[k_str][i] for k_str in cluster_assignments_per_k}
        
        points_3d.append({
            "id": i,
            "post_key": p["post_key"],
            "text": p["text"],
            "full_text": p["full_text"],
            "brand": p["brand_name"],
            "sentiment": p["sentiment_label"],
            "sentiment_score": p["sentiment_score"],
            "x": x,
            "y": y,
            "z": z,
            "initial_x": px,
            "initial_y": py,
            "initial_z": pz,
            "cluster_per_k": assignments
        })

    # Update metadata root
    metadata["points_3d"] = points_3d
    metadata["clusters"] = metadata.get("k_clusters", {}).get("6", metadata.get("clusters", []))
    
    # Save back to JSON files
    with open("ml/models/topic_clusters.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    with open("backend/data/topic_clusters.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"Successfully generated 3D data for {len(points_3d)} sample points across k=1..10!")
    print("Saved 3D centroids, radii, initial unclustered coordinates, and SVD projection model.")

if __name__ == "__main__":
    generate_3d_cluster_coordinates()
