-- ============================================================
-- SOCIAL MEDIA BRAND SENTIMENT ANALYTICS
-- STAR SCHEMA DATA WAREHOUSE DDL
-- Compatible with SQLite and PostgreSQL
-- ============================================================

DROP TABLE IF EXISTS FACT_POST;
DROP TABLE IF EXISTS DIM_DATE;
DROP TABLE IF EXISTS DIM_BRAND;
DROP TABLE IF EXISTS DIM_SENTIMENT;
DROP TABLE IF EXISTS DIM_LOCATION;
DROP TABLE IF EXISTS DIM_SOURCE;
DROP TABLE IF EXISTS DIM_NEGATIVE_REASON;

-- 1. Date Dimension
CREATE TABLE DIM_DATE (
    date_key INTEGER PRIMARY KEY,           -- Format: YYYYMMDD
    full_date TEXT NOT NULL,                -- Format: YYYY-MM-DD
    day INTEGER NOT NULL,
    month INTEGER NOT NULL,
    month_name TEXT NOT NULL,
    quarter INTEGER NOT NULL,
    year INTEGER NOT NULL,
    week INTEGER,
    day_of_week TEXT NOT NULL,
    is_weekend INTEGER NOT NULL DEFAULT 0
);

-- 2. Brand Dimension
CREATE TABLE DIM_BRAND (
    brand_key INTEGER PRIMARY KEY,
    brand_name TEXT NOT NULL,
    normalized_brand TEXT NOT NULL,
    parent_company TEXT,
    industry TEXT NOT NULL                  -- e.g., 'Technology', 'Airline'
);

-- 3. Sentiment Dimension
CREATE TABLE DIM_SENTIMENT (
    sentiment_key INTEGER PRIMARY KEY,
    sentiment_label TEXT NOT NULL,          -- 'Positive', 'Negative', 'Neutral', 'Unknown'
    sentiment_score_type TEXT NOT NULL,
    sentiment_score INTEGER                 -- 1 (Positive), 0 (Neutral), -1 (Negative), NULL (Unknown)
);

-- 4. Location Dimension
CREATE TABLE DIM_LOCATION (
    location_key INTEGER PRIMARY KEY,
    location_text TEXT NOT NULL,
    city TEXT,
    state TEXT,
    country TEXT,
    timezone TEXT
);

-- 5. Source Dimension
CREATE TABLE DIM_SOURCE (
    source_key INTEGER PRIMARY KEY,
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL
);

-- 6. Negative Reason Dimension
CREATE TABLE DIM_NEGATIVE_REASON (
    negative_reason_key INTEGER PRIMARY KEY,
    reason TEXT NOT NULL
);

-- 7. Fact Table: Social Media Posts & Sentiment Events
CREATE TABLE FACT_POST (
    post_key INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id TEXT,
    date_key INTEGER NOT NULL,
    brand_key INTEGER NOT NULL,
    sentiment_key INTEGER NOT NULL,
    predicted_sentiment_key INTEGER,
    location_key INTEGER NOT NULL,
    source_key INTEGER NOT NULL,
    negative_reason_key INTEGER NOT NULL,
    
    text TEXT,
    retweet_count INTEGER DEFAULT 0,
    confidence_score REAL DEFAULT 1.0,
    sentiment_score REAL DEFAULT 0.0,       -- Continuous polarity (-1.0 to +1.0)
    followers INTEGER DEFAULT 0,
    friends INTEGER DEFAULT 0,
    text_length INTEGER DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    
    FOREIGN KEY (date_key) REFERENCES DIM_DATE(date_key),
    FOREIGN KEY (brand_key) REFERENCES DIM_BRAND(brand_key),
    FOREIGN KEY (sentiment_key) REFERENCES DIM_SENTIMENT(sentiment_key),
    FOREIGN KEY (predicted_sentiment_key) REFERENCES DIM_SENTIMENT(sentiment_key),
    FOREIGN KEY (location_key) REFERENCES DIM_LOCATION(location_key),
    FOREIGN KEY (source_key) REFERENCES DIM_SOURCE(source_key),
    FOREIGN KEY (negative_reason_key) REFERENCES DIM_NEGATIVE_REASON(negative_reason_key)
);

-- Performance Indexes for OLAP Cube Queries
CREATE INDEX idx_fact_date ON FACT_POST(date_key);
CREATE INDEX idx_fact_brand ON FACT_POST(brand_key);
CREATE INDEX idx_fact_sentiment ON FACT_POST(sentiment_key);
CREATE INDEX idx_fact_pred_sentiment ON FACT_POST(predicted_sentiment_key);
CREATE INDEX idx_fact_location ON FACT_POST(location_key);
CREATE INDEX idx_fact_source ON FACT_POST(source_key);
CREATE INDEX idx_fact_negative_reason ON FACT_POST(negative_reason_key);
CREATE INDEX idx_dim_date_year_quarter ON DIM_DATE(year, quarter, month);
CREATE INDEX idx_dim_brand_name ON DIM_BRAND(brand_name);
