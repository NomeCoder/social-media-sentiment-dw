CREATE OR REPLACE DATABASE SOCIAL_MEDIA_DW;

CREATE OR REPLACE SCHEMA SOCIAL_MEDIA_DW.RAW;

CREATE OR REPLACE SCHEMA SOCIAL_MEDIA_DW.DW;

USE DATABASE SOCIAL_MEDIA_DW;

USE SCHEMA RAW;
CREATE OR REPLACE FILE FORMAT SOCIAL_MEDIA_DW.RAW.CSV_FORMAT
TYPE = CSV
SKIP_HEADER = 1
FIELD_OPTIONALLY_ENCLOSED_BY = '"'
NULL_IF = ('', 'NULL', 'null')
EMPTY_FIELD_AS_NULL = TRUE
ERROR_ON_COLUMN_COUNT_MISMATCH = FALSE;
CREATE OR REPLACE STAGE SOCIAL_MEDIA_DW.RAW.SOCIAL_MEDIA_STAGE
FILE_FORMAT = SOCIAL_MEDIA_DW.RAW.CSV_FORMAT;
LIST @SOCIAL_MEDIA_DW.RAW.SOCIAL_MEDIA_STAGE;
USE DATABASE SOCIAL_MEDIA_DW;
USE SCHEMA RAW;

CREATE OR REPLACE TABLE RAW_TRAIN (
    tweet_text VARCHAR,
    emotion_in_tweet_is_directed_at VARCHAR,
    is_there_an_emotion_directed_at_a_brand_or_product VARCHAR,
    date VARCHAR,
    location VARCHAR
);

CREATE OR REPLACE TABLE RAW_TWEETS (
    tweet_id VARCHAR,
    airline_sentiment VARCHAR,
    airline_sentiment_confidence FLOAT,
    negativereason VARCHAR,
    negativereason_confidence FLOAT,
    airline VARCHAR,
    airline_sentiment_gold VARCHAR,
    name VARCHAR,
    negativereason_gold VARCHAR,
    retweet_count NUMBER,
    text VARCHAR,
    tweet_coord VARCHAR,
    tweet_created VARCHAR,
    tweet_location VARCHAR,
    user_timezone VARCHAR
);

CREATE OR REPLACE TABLE RAW_BIGTECH (
    created_at VARCHAR,
    file_name VARCHAR,
    followers NUMBER,
    friends NUMBER,
    group_name VARCHAR,
    location VARCHAR,
    retweet_count NUMBER,
    screenname VARCHAR,
    search_query VARCHAR,
    text VARCHAR,
    twitter_id VARCHAR,
    username VARCHAR,
    polarity FLOAT,
    partition_0 VARCHAR,
    partition_1 VARCHAR
);

COPY INTO RAW_TRAIN
FROM @SOCIAL_MEDIA_STAGE
FILE_FORMAT = (FORMAT_NAME = CSV_FORMAT)
PATTERN = '.*Dataset - Train\.csv'
ON_ERROR = 'CONTINUE';

COPY INTO RAW_TWEETS
FROM @SOCIAL_MEDIA_STAGE
FILE_FORMAT = (FORMAT_NAME = CSV_FORMAT)
PATTERN = '.*Tweets\.csv'
ON_ERROR = 'CONTINUE';

COPY INTO RAW_BIGTECH
FROM @SOCIAL_MEDIA_STAGE
FILE_FORMAT = (FORMAT_NAME = CSV_FORMAT)
PATTERN = '.*Bigtech - 20-09-2020 till 13-10-2020\.csv'
ON_ERROR = 'CONTINUE';

SELECT 'RAW_TRAIN' AS TABLE_NAME, COUNT(*) AS ROW_COUNT
FROM RAW_TRAIN

UNION ALL

SELECT 'RAW_TWEETS', COUNT(*)
FROM RAW_TWEETS

UNION ALL

SELECT 'RAW_BIGTECH', COUNT(*)
FROM RAW_BIGTECH;

-- ============================================================
-- SOCIAL MEDIA DATA WAREHOUSE
-- COMPLETE DW BUILD
--
-- RAW tables already exist:
--   RAW.RAW_TRAIN
--   RAW.RAW_TWEETS
--   RAW.RAW_BIGTECH
--
-- Expected final FACT_POST:
--   8,589 + 14,640 + 266,095 = 289,324 rows
-- ============================================================


-- ============================================================
-- 1. USE DATABASE / DW SCHEMA
-- ============================================================

USE DATABASE SOCIAL_MEDIA_DW;
USE SCHEMA DW;


-- ============================================================
-- 2. REBUILD DIMENSION TABLES
-- ============================================================

CREATE OR REPLACE TABLE DIM_DATE (
    date_key NUMBER PRIMARY KEY,
    full_date DATE,
    day NUMBER,
    month NUMBER,
    month_name VARCHAR,
    quarter NUMBER,
    year NUMBER,
    day_of_week VARCHAR,
    is_weekend BOOLEAN
);


CREATE OR REPLACE TABLE DIM_BRAND (
    brand_key NUMBER PRIMARY KEY,
    brand_name VARCHAR,
    industry VARCHAR
);


CREATE OR REPLACE TABLE DIM_SENTIMENT (
    sentiment_key NUMBER PRIMARY KEY,
    sentiment_label VARCHAR,
    sentiment_score_type VARCHAR
);


CREATE OR REPLACE TABLE DIM_LOCATION (
    location_key NUMBER PRIMARY KEY,
    location_text VARCHAR
);


CREATE OR REPLACE TABLE DIM_SOURCE (
    source_key NUMBER PRIMARY KEY,
    dataset_name VARCHAR,
    dataset_type VARCHAR
);


-- ============================================================
-- 3. CREATE FACT TABLE
-- ============================================================

CREATE OR REPLACE TABLE FACT_POST (
    post_key NUMBER PRIMARY KEY,

    post_id VARCHAR,

    date_key NUMBER,
    brand_key NUMBER,
    sentiment_key NUMBER,
    location_key NUMBER,
    source_key NUMBER,

    text VARCHAR,

    retweet_count NUMBER,
    confidence_score FLOAT,
    sentiment_score FLOAT,

    followers NUMBER,
    friends NUMBER,

    negative_reason VARCHAR
);


-- ============================================================
-- 4. DIM_SOURCE
-- ============================================================

INSERT INTO DIM_SOURCE (
    source_key,
    dataset_name,
    dataset_type
)
VALUES
    (0, 'Unknown', 'Unknown'),
    (1, 'Dataset - Train', 'Technology/Product Emotion'),
    (2, 'Tweets', 'Airline Sentiment'),
    (3, 'Bigtech', 'Big Tech Polarity');


-- ============================================================
-- 5. DIM_SENTIMENT
-- ============================================================

INSERT INTO DIM_SENTIMENT (
    sentiment_key,
    sentiment_label,
    sentiment_score_type
)
VALUES
    (0, 'Unknown', 'Unknown'),
    (1, 'Positive', 'Categorical/Polarity'),
    (2, 'Negative', 'Categorical/Polarity'),
    (3, 'Neutral', 'Categorical/Polarity');


-- ============================================================
-- 6. DIM_BRAND
--
-- One normalized brand = one dimension row.
-- This prevents fact-table multiplication.
-- ============================================================

INSERT INTO DIM_BRAND (
    brand_key,
    brand_name,
    industry
)

SELECT
    ROW_NUMBER() OVER (ORDER BY brand_name) AS brand_key,
    brand_name,
    industry

FROM
(
    SELECT
        LOWER(TRIM(emotion_in_tweet_is_directed_at)) AS normalized_brand,
        MIN(TRIM(emotion_in_tweet_is_directed_at)) AS brand_name,
        'Technology' AS industry

    FROM SOCIAL_MEDIA_DW.RAW.RAW_TRAIN

    WHERE NULLIF(TRIM(emotion_in_tweet_is_directed_at), '') IS NOT NULL

    GROUP BY LOWER(TRIM(emotion_in_tweet_is_directed_at))


    UNION ALL


    SELECT
        LOWER(TRIM(airline)) AS normalized_brand,
        MIN(TRIM(airline)) AS brand_name,
        'Airline' AS industry

    FROM SOCIAL_MEDIA_DW.RAW.RAW_TWEETS

    WHERE NULLIF(TRIM(airline), '') IS NOT NULL

    GROUP BY LOWER(TRIM(airline))


    UNION ALL


    SELECT
        LOWER(TRIM(group_name)) AS normalized_brand,
        MIN(TRIM(group_name)) AS brand_name,
        'Technology' AS industry

    FROM SOCIAL_MEDIA_DW.RAW.RAW_BIGTECH

    WHERE NULLIF(TRIM(group_name), '') IS NOT NULL

    GROUP BY LOWER(TRIM(group_name))
);


-- Re-number brands globally in case the same brand occurs
-- across multiple datasets.

CREATE OR REPLACE TEMPORARY TABLE TEMP_BRANDS AS

SELECT
    ROW_NUMBER() OVER (
        ORDER BY normalized_brand
    ) AS new_brand_key,

    MIN(brand_name) AS brand_name,

    CASE
        WHEN MAX(CASE WHEN industry = 'Airline' THEN 1 ELSE 0 END) = 1
        THEN 'Airline'
        ELSE 'Technology'
    END AS industry,

    normalized_brand

FROM
(
    SELECT
        LOWER(TRIM(brand_name)) AS normalized_brand,
        brand_name,
        industry
    FROM DIM_BRAND
)

GROUP BY normalized_brand;


TRUNCATE TABLE DIM_BRAND;


INSERT INTO DIM_BRAND (
    brand_key,
    brand_name,
    industry
)

SELECT
    new_brand_key,
    brand_name,
    industry
FROM TEMP_BRANDS;


-- ============================================================
-- 7. DIM_LOCATION
--
-- IMPORTANT:
-- Normalize locations first.
-- This prevents the duplication problem we found earlier.
-- ============================================================

INSERT INTO DIM_LOCATION (
    location_key,
    location_text
)

SELECT
    0,
    'Unknown'

WHERE NOT EXISTS (
    SELECT 1
    FROM DIM_LOCATION
);


INSERT INTO DIM_LOCATION (
    location_key,
    location_text
)

SELECT
    ROW_NUMBER() OVER (
        ORDER BY normalized_location
    ) AS location_key,

    MIN(original_location) AS location_text

FROM
(
    SELECT
        LOWER(TRIM(location)) AS normalized_location,
        TRIM(location) AS original_location

    FROM SOCIAL_MEDIA_DW.RAW.RAW_TRAIN

    WHERE NULLIF(TRIM(location), '') IS NOT NULL


    UNION ALL


    SELECT
        LOWER(TRIM(tweet_location)) AS normalized_location,
        TRIM(tweet_location) AS original_location

    FROM SOCIAL_MEDIA_DW.RAW.RAW_TWEETS

    WHERE NULLIF(TRIM(tweet_location), '') IS NOT NULL


    UNION ALL


    SELECT
        LOWER(TRIM(location)) AS normalized_location,
        TRIM(location) AS original_location

    FROM SOCIAL_MEDIA_DW.RAW.RAW_BIGTECH

    WHERE NULLIF(TRIM(location), '') IS NOT NULL
)

GROUP BY normalized_location;


-- ============================================================
-- 8. DIM_DATE
--
-- Combine dates from all three datasets.
-- ============================================================

INSERT INTO DIM_DATE (
    date_key,
    full_date,
    day,
    month,
    month_name,
    quarter,
    year,
    day_of_week,
    is_weekend
)

SELECT
    0,
    NULL,
    NULL,
    NULL,
    'Unknown',
    NULL,
    NULL,
    'Unknown',
    FALSE

WHERE NOT EXISTS (
    SELECT 1
    FROM DIM_DATE
);


INSERT INTO DIM_DATE (
    date_key,
    full_date,
    day,
    month,
    month_name,
    quarter,
    year,
    day_of_week,
    is_weekend
)

SELECT DISTINCT

    TO_NUMBER(
        TO_CHAR(full_date, 'YYYYMMDD')
    ) AS date_key,

    full_date,

    DAY(full_date) AS day,

    MONTH(full_date) AS month,

    MONTHNAME(full_date) AS month_name,

    QUARTER(full_date) AS quarter,

    YEAR(full_date) AS year,

    DAYNAME(full_date) AS day_of_week,

    DAYOFWEEKISO(full_date) IN (6,7) AS is_weekend

FROM
(
    -- Dataset - Train
    SELECT
        TO_DATE(
            TRY_TO_TIMESTAMP_NTZ(date)
        ) AS full_date

    FROM SOCIAL_MEDIA_DW.RAW.RAW_TRAIN


    UNION


    -- Tweets
    SELECT
        TO_DATE(
            TRY_TO_TIMESTAMP_TZ(tweet_created)
        ) AS full_date

    FROM SOCIAL_MEDIA_DW.RAW.RAW_TWEETS


    UNION


    -- Bigtech
    SELECT
        TO_DATE(
            TRY_TO_TIMESTAMP_NTZ(created_at)
        ) AS full_date

    FROM SOCIAL_MEDIA_DW.RAW.RAW_BIGTECH
)

WHERE full_date IS NOT NULL;


-- ============================================================
-- 9. CLEAR FACT TABLE
-- ============================================================

TRUNCATE TABLE FACT_POST;


-- ============================================================
-- 10. LOAD DATASET - TRAIN
-- ============================================================

INSERT INTO FACT_POST (
    post_key,
    post_id,
    date_key,
    brand_key,
    sentiment_key,
    location_key,
    source_key,
    text,
    retweet_count,
    confidence_score,
    sentiment_score,
    followers,
    friends,
    negative_reason
)

SELECT

    ROW_NUMBER() OVER (
        ORDER BY t.tweet_text, t.date
    ) AS post_key,

    NULL AS post_id,

    COALESCE(
        TO_NUMBER(
            TO_CHAR(
                TO_DATE(
                    TRY_TO_TIMESTAMP_NTZ(t.date)
                ),
                'YYYYMMDD'
            )
        ),
        0
    ) AS date_key,

    COALESCE(br.brand_key, 0) AS brand_key,

    CASE

        WHEN LOWER(
            COALESCE(
                t.is_there_an_emotion_directed_at_a_brand_or_product,
                ''
            )
        ) LIKE '%positive%'
        THEN 1

        WHEN LOWER(
            COALESCE(
                t.is_there_an_emotion_directed_at_a_brand_or_product,
                ''
            )
        ) LIKE '%negative%'
        THEN 2

        WHEN LOWER(
            COALESCE(
                t.is_there_an_emotion_directed_at_a_brand_or_product,
                ''
            )
        ) LIKE '%no emotion%'
        THEN 3

        ELSE 0

    END AS sentiment_key,

    COALESCE(loc.location_key, 0) AS location_key,

    1 AS source_key,

    t.tweet_text AS text,

    0 AS retweet_count,

    NULL AS confidence_score,

    NULL AS sentiment_score,

    NULL AS followers,

    NULL AS friends,

    NULL AS negative_reason

FROM SOCIAL_MEDIA_DW.RAW.RAW_TRAIN t


LEFT JOIN
(
    SELECT
        LOWER(TRIM(brand_name)) AS normalized_brand,
        MIN(brand_key) AS brand_key

    FROM SOCIAL_MEDIA_DW.DW.DIM_BRAND

    GROUP BY LOWER(TRIM(brand_name))

) br

ON LOWER(
       TRIM(t.emotion_in_tweet_is_directed_at)
   )
   = br.normalized_brand


LEFT JOIN
(
    SELECT
        LOWER(TRIM(location_text)) AS normalized_location,
        MIN(location_key) AS location_key

    FROM SOCIAL_MEDIA_DW.DW.DIM_LOCATION

    GROUP BY LOWER(TRIM(location_text))

) loc

ON LOWER(
       TRIM(t.location)
   )
   = loc.normalized_location;


-- ============================================================
-- 11. LOAD TWEETS
-- ============================================================

INSERT INTO FACT_POST (
    post_key,
    post_id,
    date_key,
    brand_key,
    sentiment_key,
    location_key,
    source_key,
    text,
    retweet_count,
    confidence_score,
    sentiment_score,
    followers,
    friends,
    negative_reason
)

SELECT

    8589
    +
    ROW_NUMBER() OVER (
        ORDER BY t.tweet_id
    ) AS post_key,

    t.tweet_id AS post_id,

    COALESCE(
        TO_NUMBER(
            TO_CHAR(
                TO_DATE(
                    TRY_TO_TIMESTAMP_TZ(t.tweet_created)
                ),
                'YYYYMMDD'
            )
        ),
        0
    ) AS date_key,

    COALESCE(br.brand_key, 0) AS brand_key,

    CASE LOWER(TRIM(t.airline_sentiment))

        WHEN 'positive' THEN 1

        WHEN 'negative' THEN 2

        WHEN 'neutral' THEN 3

        ELSE 0

    END AS sentiment_key,

    COALESCE(loc.location_key, 0) AS location_key,

    2 AS source_key,

    t.text,

    COALESCE(t.retweet_count, 0),

    t.airline_sentiment_confidence,

    CASE LOWER(TRIM(t.airline_sentiment))

        WHEN 'positive' THEN 1

        WHEN 'negative' THEN -1

        WHEN 'neutral' THEN 0

        ELSE NULL

    END,

    NULL AS followers,

    NULL AS friends,

    t.negativereason

FROM SOCIAL_MEDIA_DW.RAW.RAW_TWEETS t


LEFT JOIN
(
    SELECT
        LOWER(TRIM(brand_name)) AS normalized_brand,
        MIN(brand_key) AS brand_key

    FROM SOCIAL_MEDIA_DW.DW.DIM_BRAND

    GROUP BY LOWER(TRIM(brand_name))

) br

ON LOWER(TRIM(t.airline))
   = br.normalized_brand


LEFT JOIN
(
    SELECT
        LOWER(TRIM(location_text)) AS normalized_location,
        MIN(location_key) AS location_key

    FROM SOCIAL_MEDIA_DW.DW.DIM_LOCATION

    GROUP BY LOWER(TRIM(location_text))

) loc

ON LOWER(TRIM(t.tweet_location))
   = loc.normalized_location;


-- ============================================================
-- 12. LOAD BIGTECH
-- ============================================================

INSERT INTO FACT_POST (
    post_key,
    post_id,
    date_key,
    brand_key,
    sentiment_key,
    location_key,
    source_key,
    text,
    retweet_count,
    confidence_score,
    sentiment_score,
    followers,
    friends,
    negative_reason
)

SELECT

    8589
    + 14640
    +
    ROW_NUMBER() OVER (
        ORDER BY b.twitter_id
    ) AS post_key,

    b.twitter_id AS post_id,

    COALESCE(
        TO_NUMBER(
            TO_CHAR(
                TO_DATE(
                    TRY_TO_TIMESTAMP_NTZ(b.created_at)
                ),
                'YYYYMMDD'
            )
        ),
        0
    ) AS date_key,

    COALESCE(br.brand_key, 0) AS brand_key,

    CASE

        WHEN b.polarity > 0 THEN 1

        WHEN b.polarity < 0 THEN 2

        WHEN b.polarity = 0 THEN 3

        ELSE 0

    END AS sentiment_key,

    COALESCE(loc.location_key, 0) AS location_key,

    3 AS source_key,

    b.text,

    COALESCE(b.retweet_count, 0),

    NULL AS confidence_score,

    b.polarity AS sentiment_score,

    b.followers,

    b.friends,

    NULL AS negative_reason

FROM SOCIAL_MEDIA_DW.RAW.RAW_BIGTECH b


LEFT JOIN
(
    SELECT
        LOWER(TRIM(brand_name)) AS normalized_brand,
        MIN(brand_key) AS brand_key

    FROM SOCIAL_MEDIA_DW.DW.DIM_BRAND

    GROUP BY LOWER(TRIM(brand_name))

) br

ON LOWER(TRIM(b.group_name))
   = br.normalized_brand


LEFT JOIN
(
    SELECT
        LOWER(TRIM(location_text)) AS normalized_location,
        MIN(location_key) AS location_key

    FROM SOCIAL_MEDIA_DW.DW.DIM_LOCATION

    GROUP BY LOWER(TRIM(location_text))

) loc

ON LOWER(TRIM(b.location))
   = loc.normalized_location;


-- ============================================================
-- 13. FINAL VALIDATION
-- ============================================================

SELECT
    COUNT(*) AS TOTAL_FACT_POST_ROWS
FROM FACT_POST;


-- ============================================================
-- 14. VERIFY EACH DATASET
-- ============================================================

SELECT
    s.dataset_name,
    COUNT(*) AS post_count

FROM FACT_POST f

JOIN DIM_SOURCE s
    ON f.source_key = s.source_key

GROUP BY s.dataset_name

ORDER BY s.dataset_name;


-- ============================================================
-- 15. VERIFY DIMENSIONS
-- ============================================================

SELECT
    'DIM_DATE' AS table_name,
    COUNT(*) AS row_count
FROM DIM_DATE

UNION ALL

SELECT
    'DIM_BRAND',
    COUNT(*)
FROM DIM_BRAND

UNION ALL

SELECT
    'DIM_SENTIMENT',
    COUNT(*)
FROM DIM_SENTIMENT

UNION ALL

SELECT
    'DIM_LOCATION',
    COUNT(*)
FROM DIM_LOCATION

UNION ALL

SELECT
    'DIM_SOURCE',
    COUNT(*)
FROM DIM_SOURCE;


-- ============================================================
-- 16. SENTIMENT DISTRIBUTION
-- ============================================================

SELECT
    s.sentiment_label,
    COUNT(*) AS post_count

FROM FACT_POST f

JOIN DIM_SENTIMENT s
    ON f.sentiment_key = s.sentiment_key

GROUP BY s.sentiment_label

ORDER BY post_count DESC;


-- ============================================================
-- 17. BRAND-WISE SENTIMENT
-- ============================================================

SELECT
    b.brand_name,
    b.industry,
    s.sentiment_label,
    COUNT(*) AS post_count

FROM FACT_POST f

JOIN DIM_BRAND b
    ON f.brand_key = b.brand_key

JOIN DIM_SENTIMENT s
    ON f.sentiment_key = s.sentiment_key

GROUP BY
    b.brand_name,
    b.industry,
    s.sentiment_label

ORDER BY post_count DESC;


-- ============================================================
-- 18. SOURCE-WISE ANALYSIS
-- ============================================================

SELECT
    src.dataset_name,
    src.dataset_type,
    COUNT(*) AS total_posts,
    SUM(f.retweet_count) AS total_retweets,
    AVG(f.confidence_score) AS avg_confidence,
    AVG(f.sentiment_score) AS avg_sentiment

FROM FACT_POST f

JOIN DIM_SOURCE src
    ON f.source_key = src.source_key

GROUP BY
    src.dataset_name,
    src.dataset_type

ORDER BY total_posts DESC;


-- ============================================================
-- 19. MONTHLY SENTIMENT TREND
-- ============================================================

SELECT
    d.year,
    d.month,
    d.month_name,
    s.sentiment_label,
    COUNT(*) AS post_count

FROM FACT_POST f

JOIN DIM_DATE d
    ON f.date_key = d.date_key

JOIN DIM_SENTIMENT s
    ON f.sentiment_key = s.sentiment_key

WHERE d.date_key <> 0

GROUP BY
    d.year,
    d.month,
    d.month_name,
    s.sentiment_label

ORDER BY
    d.year,
    d.month,
    s.sentiment_label;


-- ============================================================
-- 20. TOP BRANDS BY POST COUNT
-- ============================================================

SELECT
    b.brand_name,
    b.industry,
    COUNT(*) AS total_posts

FROM FACT_POST f

JOIN DIM_BRAND b
    ON f.brand_key = b.brand_key

GROUP BY
    b.brand_name,
    b.industry

ORDER BY total_posts DESC

LIMIT 10;

SELECT COUNT(*) AS TOTAL_FACT_POST_ROWS
FROM FACT_POST;

SELECT
    s.dataset_name,
    COUNT(*) AS post_count
FROM FACT_POST f
JOIN DIM_SOURCE s
    ON f.source_key = s.source_key
GROUP BY s.dataset_name
ORDER BY s.dataset_name;