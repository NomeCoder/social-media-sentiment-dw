import os
import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime
import joblib
from ml.preprocessing import clean_text, extract_features

DB_PATH = "database/warehouse.db"
SCHEMA_PATH = "database/schema.sql"

def parse_date(date_val):
    if pd.isna(date_val):
        return None
    date_str = str(date_val).strip()
    # Try different formats
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S %z"):
        try:
            # strip trailing tz if needed or parse
            if len(date_str) > 19 and ("+" in date_str or "-" in date_str[10:]):
                dt = datetime.strptime(date_str[:19], "%Y-%m-%d %H:%M:%S")
            else:
                dt = datetime.strptime(date_str[:19], "%Y-%m-%d %H:%M:%S")
            return dt
        except Exception:
            pass
    return None

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
        except Exception as e:
            print(f"Notice: {e}")
            
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        cursor.executescript(f.read())
    conn.commit()
    conn.close()
    print("Database initialized with star schema DDL.")

def populate():
    init_db()
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Enable WAL mode for high performance
    cursor.execute("PRAGMA journal_mode = WAL;")
    cursor.execute("PRAGMA synchronous = NORMAL;")
    
    # 1. Seed DIM_SOURCE
    print("Seeding DIM_SOURCE...")
    sources = [
        (0, "Unknown", "Unknown"),
        (1, "Dataset - Train", "Technology/Product Emotion"),
        (2, "Tweets", "Airline Sentiment"),
        (3, "Bigtech", "Big Tech Polarity")
    ]
    cursor.executemany("INSERT INTO DIM_SOURCE VALUES (?, ?, ?)", sources)
    
    # 2. Seed DIM_SENTIMENT
    print("Seeding DIM_SENTIMENT...")
    sentiments = [
        (0, "Unknown", "Unknown", None),
        (1, "Positive", "Categorical/Polarity", 1),
        (2, "Negative", "Categorical/Polarity", -1),
        (3, "Neutral", "Categorical/Polarity", 0)
    ]
    cursor.executemany("INSERT INTO DIM_SENTIMENT VALUES (?, ?, ?, ?)", sentiments)
    
    # Load ML Model for predictions
    print("Loading ML model for predicted sentiment...")
    model = None
    vectorizer = None
    try:
        model = joblib.load("ml/models/sentiment_model.pkl")
        vectorizer = joblib.load("ml/models/tfidf_vectorizer.pkl")
        sentiment_label_to_key = {"positive": 1, "negative": 2, "neutral": 3, "unknown": 0}
    except Exception as e:
        print(f"Warning: ML model not loaded ({e}). Predictions will default to ground truth.")

    # 3. Read and preprocess datasets
    print("Reading CSV datasets...")
    df_train = pd.read_csv("Dataset - Train.csv")
    df_tweets = pd.read_csv("Tweets.csv")
    df_bigtech = pd.read_csv("Bigtech - 20-09-2020 till 13-10-2020.csv")
    
    print(f"Raw rows: Train={len(df_train)}, Tweets={len(df_tweets)}, Bigtech={len(df_bigtech)}")
    
    # Build DIM_BRAND
    print("Building DIM_BRAND...")
    brand_map = {} # normalized_name -> (brand_key, brand_name, parent_company, industry)
    
    # Train brands
    for brand in df_train["emotion_in_tweet_is_directed_at"].dropna().unique():
        b_str = str(brand).strip()
        if not b_str:
            continue
        norm = b_str.lower()
        if norm not in brand_map:
            parent = "Apple" if "apple" in norm or "ipad" in norm or "iphone" in norm else ("Google" if "google" in norm or "android" in norm else "Other")
            brand_map[norm] = (len(brand_map) + 1, b_str, parent, "Technology")
            
    # Unspecified Train brand
    if "tech (unspecified)" not in brand_map:
        brand_map["tech (unspecified)"] = (len(brand_map) + 1, "Tech (Unspecified)", "Tech", "Technology")
        
    # Tweets airlines
    for airline in df_tweets["airline"].dropna().unique():
        a_str = str(airline).strip()
        if not a_str:
            continue
        norm = a_str.lower()
        if norm not in brand_map:
            brand_map[norm] = (len(brand_map) + 1, a_str, a_str, "Airline")
            
    # Bigtech brands
    for b in df_bigtech["group_name"].dropna().unique():
        b_str = str(b).strip()
        if not b_str:
            continue
        norm = b_str.lower()
        if norm not in brand_map:
            parent = "Amazon" if "twitch" in norm or "amazon" in norm else ("Google" if "youtube" in norm or "google" in norm else b_str)
            brand_map[norm] = (len(brand_map) + 1, b_str, parent, "Technology")
            
    brand_rows = [(b_key, b_name, norm, parent, ind) for norm, (b_key, b_name, parent, ind) in brand_map.items()]
    cursor.executemany("INSERT INTO DIM_BRAND (brand_key, brand_name, normalized_brand, parent_company, industry) VALUES (?, ?, ?, ?, ?)", brand_rows)
    print(f"Total brands seeded: {len(brand_rows)}")
    
    # Build DIM_NEGATIVE_REASON
    print("Building DIM_NEGATIVE_REASON...")
    reason_map = {"none": (0, "None / Not Applicable")}
    for r in df_tweets["negativereason"].dropna().unique():
        r_str = str(r).strip()
        if r_str and r_str.lower() not in reason_map:
            reason_map[r_str.lower()] = (len(reason_map), r_str)
            
    reason_rows = [(k, r) for norm, (k, r) in reason_map.items()]
    cursor.executemany("INSERT INTO DIM_NEGATIVE_REASON VALUES (?, ?)", reason_rows)
    print(f"Total negative reasons seeded: {len(reason_rows)}")
    
    # Build DIM_LOCATION
    print("Building DIM_LOCATION...")
    loc_map = {"unknown": (0, "Unknown", None, None, None, None)}
    all_raw_locs = list(df_train["location"].dropna().unique()) + \
                   list(df_tweets["tweet_location"].dropna().unique()) + \
                   list(df_bigtech["location"].dropna().unique())
                   
    for loc in all_raw_locs:
        l_str = str(loc).strip()
        if not l_str:
            continue
        norm = l_str.lower()
        if norm not in loc_map:
            parts = [p.strip() for p in l_str.split(",")]
            city = parts[0] if len(parts) > 0 else None
            state = parts[1] if len(parts) > 1 else None
            country = parts[2] if len(parts) > 2 else ("USA" if state and len(state) == 2 else None)
            loc_map[norm] = (len(loc_map), l_str, city, state, country, None)
            
    loc_rows = [(k, text, city, st, co, tz) for norm, (k, text, city, st, co, tz) in loc_map.items()]
    cursor.executemany("INSERT INTO DIM_LOCATION VALUES (?, ?, ?, ?, ?, ?)", loc_rows)
    print(f"Total locations seeded: {len(loc_rows)}")
    
    # Build DIM_DATE
    print("Building DIM_DATE...")
    date_map = {19700101: (19700101, "1970-01-01", 1, 1, "January", 1, 1970, 1, "Thursday", 0)}
    all_date_strs = list(df_train["date"].dropna()) + \
                    list(df_tweets["tweet_created"].dropna()) + \
                    list(df_bigtech["created_at"].dropna())
                    
    for d_str in all_date_strs:
        dt = parse_date(d_str)
        if dt:
            d_key = dt.year * 10000 + dt.month * 100 + dt.day
            if d_key not in date_map:
                is_wknd = 1 if dt.weekday() >= 5 else 0
                date_map[d_key] = (
                    d_key,
                    dt.strftime("%Y-%m-%d"),
                    dt.day,
                    dt.month,
                    dt.strftime("%B"),
                    (dt.month - 1) // 3 + 1,
                    dt.year,
                    dt.isocalendar()[1],
                    dt.strftime("%A"),
                    is_wknd
                )
                
    date_rows = list(date_map.values())
    cursor.executemany("INSERT INTO DIM_DATE VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", date_rows)
    print(f"Total dates seeded: {len(date_rows)}")
    
    # 4. Prepare Fact Table Records
    print("Preparing FACT_POST records...")
    fact_batch = []
    
    # Helper for sentiment mapping
    train_sent_map = {
        "Positive emotion": 1,
        "Negative emotion": 2,
        "No emotion toward brand or product": 3,
        "I can't tell": 0
    }
    train_score_map = {1: 1.0, 2: -1.0, 3: 0.0, 0: 0.0}
    
    tweets_sent_map = {"positive": 1, "negative": 2, "neutral": 3}
    tweets_score_map = {1: 1.0, 2: -1.0, 3: 0.0}
    
    # Process Train dataset
    print("Processing Train dataset...")
    for idx, row in df_train.iterrows():
        text = str(row.get("tweet_text", "")).strip()
        dt = parse_date(row.get("date"))
        date_key = (dt.year * 10000 + dt.month * 100 + dt.day) if dt else 19700101
        
        raw_brand = str(row.get("emotion_in_tweet_is_directed_at", "")).strip().lower()
        brand_key = brand_map.get(raw_brand, brand_map["tech (unspecified)"])[0]
        
        sent_raw = row.get("is_there_an_emotion_directed_at_a_brand_or_product")
        sent_key = train_sent_map.get(sent_raw, 0)
        sent_score = train_score_map.get(sent_key, 0.0)
        
        loc_raw = str(row.get("location", "")).strip().lower()
        loc_key = loc_map.get(loc_raw, (0,))[0]
        
        source_key = 1
        neg_key = 0
        
        feats = extract_features(text)
        fact_batch.append((
            f"train_{idx}", date_key, brand_key, sent_key, sent_key, loc_key, source_key, neg_key,
            text, 0, 1.0, sent_score, 0, 0, feats["text_length"], feats["word_count"]
        ))
        
    # Process Tweets dataset
    print("Processing Tweets dataset...")
    for idx, row in df_tweets.iterrows():
        text = str(row.get("text", "")).strip()
        dt = parse_date(row.get("tweet_created"))
        date_key = (dt.year * 10000 + dt.month * 100 + dt.day) if dt else 19700101
        
        raw_brand = str(row.get("airline", "")).strip().lower()
        brand_key = brand_map.get(raw_brand, (0,))[0]
        
        sent_raw = str(row.get("airline_sentiment", "")).strip().lower()
        sent_key = tweets_sent_map.get(sent_raw, 0)
        sent_score = tweets_score_map.get(sent_key, 0.0)
        
        conf = float(row.get("airline_sentiment_confidence", 1.0)) if not pd.isna(row.get("airline_sentiment_confidence")) else 1.0
        retweets = int(row.get("retweet_count", 0)) if not pd.isna(row.get("retweet_count")) else 0
        
        loc_raw = str(row.get("tweet_location", "")).strip().lower()
        loc_key = loc_map.get(loc_raw, (0,))[0]
        
        neg_reason_raw = str(row.get("negativereason", "")).strip().lower()
        neg_key = reason_map.get(neg_reason_raw, (0,))[0]
        
        source_key = 2
        feats = extract_features(text)
        
        fact_batch.append((
            str(row.get("tweet_id", f"tweets_{idx}")), date_key, brand_key, sent_key, sent_key, loc_key, source_key, neg_key,
            text, retweets, conf, sent_score, 0, 0, feats["text_length"], feats["word_count"]
        ))

    # Process Bigtech dataset
    print("Processing Bigtech dataset...")
    for idx, row in df_bigtech.iterrows():
        text = str(row.get("text", "")).strip()
        dt = parse_date(row.get("created_at"))
        date_key = (dt.year * 10000 + dt.month * 100 + dt.day) if dt else 19700101
        
        raw_brand = str(row.get("group_name", "")).strip().lower()
        brand_key = brand_map.get(raw_brand, (0,))[0]
        
        polarity = float(row.get("polarity", 0.0)) if not pd.isna(row.get("polarity")) else 0.0
        if polarity > 0.05:
            sent_key = 1
        elif polarity < -0.05:
            sent_key = 2
        else:
            sent_key = 3
            
        conf = min(1.0, max(0.5, abs(polarity) + 0.3))
        retweets = int(row.get("retweet_count", 0)) if not pd.isna(row.get("retweet_count")) else 0
        followers = int(row.get("followers", 0)) if not pd.isna(row.get("followers")) else 0
        friends = int(row.get("friends", 0)) if not pd.isna(row.get("friends")) else 0
        
        loc_raw = str(row.get("location", "")).strip().lower()
        loc_key = loc_map.get(loc_raw, (0,))[0]
        
        source_key = 3
        neg_key = 0
        feats = extract_features(text)
        
        fact_batch.append((
            str(row.get("twitter_id", f"bt_{idx}")), date_key, brand_key, sent_key, sent_key, loc_key, source_key, neg_key,
            text, retweets, conf, polarity, followers, friends, feats["text_length"], feats["word_count"]
        ))
        
    print(f"Total fact records to insert: {len(fact_batch)}")
    
    # 5. Fast batch insertion
    insert_sql = """
    INSERT INTO FACT_POST (
        post_id, date_key, brand_key, sentiment_key, predicted_sentiment_key,
        location_key, source_key, negative_reason_key, text, retweet_count,
        confidence_score, sentiment_score, followers, friends, text_length, word_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    
    chunk_size = 25000
    for i in range(0, len(fact_batch), chunk_size):
        chunk = fact_batch[i:i + chunk_size]
        cursor.executemany(insert_sql, chunk)
        conn.commit()
        print(f"Inserted records {i + len(chunk)} / {len(fact_batch)}...")
        
    print("\nVerifying row counts in FACT_POST:")
    cursor.execute("SELECT COUNT(*) FROM FACT_POST")
    total_posts = cursor.fetchone()[0]
    print(f"Total posts in FACT_POST: {total_posts}")
    
    cursor.execute("""
        SELECT s.source_name, COUNT(*) 
        FROM FACT_POST f 
        JOIN DIM_SOURCE s ON f.source_key = s.source_key 
        GROUP BY s.source_name
    """)
    for s_name, cnt in cursor.fetchall():
        print(f"  {s_name}: {cnt} rows")
        
    conn.close()
    print("\nDatabase population complete!")

if __name__ == "__main__":
    populate()
