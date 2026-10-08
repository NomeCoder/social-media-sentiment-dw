# Social Media Brand Sentiment Analytics

## 1. Project Overview

Build a full-stack **Social Media Sentiment Analysis and Brand Analytics platform**.

The system should ingest social-media datasets, store cleaned data in a relational SQL database, predict/classify sentiment, and provide OLAP-style analytical operations for studying how brands perform over time, across locations, and across sentiment categories.

The system should answer questions such as:

- Which brands receive the most negative sentiment?
- How does sentiment change over time?
- Which brands have the highest positive/negative ratio?
- What are the major reasons for negative sentiment?
- Which locations generate the most complaints?
- How does sentiment differ between brands?
- What happens when we drill down from year → month → day?
- Which brands are improving or deteriorating?
- What percentage of mentions are positive, neutral, or negative?

---

# 2. Provided Datasets

Two CSV datasets are provided.

## Dataset 1: `Dataset - Train.csv`

Approximate size: **8,589 records**

Columns:

```text
tweet_text
emotion_in_tweet_is_directed_at
is_there_an_emotion_directed_at_a_brand_or_product
date
location
```

This dataset contains tweets associated with products/brands and sentiment labels.

Example sentiment values:

```text
Positive emotion
Negative emotion
No emotion toward brand or product
I can't tell
```

Normalize these into:

```text
positive
neutral
negative
unknown
```

---

## Dataset 2: `Tweets.csv`

Approximate size: **14,640 records**

Columns:

```text
tweet_id
airline_sentiment
airline_sentiment_confidence
negativereason
negativereason_confidence
airline
airline_sentiment_gold
name
negativereason_gold
retweet_count
text
tweet_coord
tweet_created
tweet_location
user_timezone
```

Sentiment values:

```text
positive
neutral
negative
```

---

# 3. High-Level Architecture

```text
                    ┌──────────────────────┐
                    │      CSV DATASETS    │
                    │                      │
                    │ Dataset - Train.csv  │
                    │ Tweets.csv           │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   DATA INGESTION     │
                    │ Pandas / Python       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   DATA CLEANING      │
                    │ • Remove duplicates  │
                    │ • Handle nulls       │
                    │ • Normalize dates    │
                    │ • Normalize brands   │
                    │ • Clean text         │
                    └──────────┬───────────┘
                               │
                               ▼
              ┌─────────────────────────────────┐
              │       NLP / SENTIMENT           │
              │                                 │
              │ TF-IDF + ML baseline            │
              │ Optional advanced model         │
              └────────────────┬────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ TRANSFORMED DATA     │
                    │ sentiment            │
                    │ confidence           │
                    │ brand                │
                    │ date                 │
                    │ location             │
                    │ negative_reason      │
                    └──────────┬───────────┘
                               │
                               ▼
                ┌────────────────────────────┐
                │       SQL DATABASE         │
                │                            │
                │ Dimension Tables           │
                │ Fact Tables                │
                │ Star Schema                │
                └────────────┬───────────────┘
                             │
                             ▼
                 ┌────────────────────────┐
                 │      OLAP ENGINE       │
                 │ • Roll-up              │
                 │ • Drill-down           │
                 │ • Slice                │
                 │ • Dice                 │
                 │ • Pivot                │
                 │ • Custom operations     │
                 └───────────┬────────────┘
                             │
                             ▼
                 ┌────────────────────────┐
                 │       REST API         │
                 │        FastAPI         │
                 └───────────┬────────────┘
                             │
                             ▼
                 ┌────────────────────────┐
                 │       DASHBOARD        │
                 │ KPIs / Charts          │
                 │ Brand comparison       │
                 │ Sentiment trends       │
                 │ OLAP explorer          │
                 └────────────────────────┘
```

---

# 4. Technology Stack

## Backend

- Python
- FastAPI
- SQLAlchemy
- Pandas
- scikit-learn
- NLTK or spaCy

## Database

Primary:

- PostgreSQL

SQLite may be used for local prototyping, but PostgreSQL should be the primary database.

## Frontend

- React
- JavaScript
- CSS

Charts:

- Recharts or Plotly

## Machine Learning

Start with:

- TF-IDF
- Logistic Regression

Optionally compare:

- Multinomial Naive Bayes
- Linear SVM
- Random Forest

Do not unnecessarily use a large transformer model if a classical NLP model provides a strong baseline.

---

# 5. Data Pipeline

Implement:

```text
Raw CSV
   ↓
Load
   ↓
Schema validation
   ↓
Cleaning
   ↓
Normalization
   ↓
Sentiment label processing
   ↓
Brand extraction
   ↓
Location processing
   ↓
Feature engineering
   ↓
Sentiment prediction
   ↓
SQL insertion
   ↓
OLAP analytics
```

---

# 6. Data Cleaning

Implement:

- Remove duplicate tweets where appropriate
- Handle null values
- Normalize dates
- Normalize whitespace
- Normalize URLs
- Normalize mentions
- Preserve useful hashtags
- Normalize repeated punctuation
- Handle emojis appropriately

Do not aggressively remove sentiment-bearing words such as:

```text
not
never
no
don't
can't
```

---

# 7. Sentiment Normalization

Canonical representation:

```text
positive
neutral
negative
unknown
```

For `Tweets.csv`:

```text
positive → positive
neutral  → neutral
negative → negative
```

For `Dataset - Train.csv`:

```text
Positive emotion → positive
Negative emotion → negative
No emotion toward brand or product → neutral
I can't tell → unknown
```

Keep the original label in the database as well.

---

# 8. Brand Normalization

Create a canonical brand table.

For `Tweets.csv`, the `airline` column should become the brand.

For `Dataset - Train.csv`, use:

```text
emotion_in_tweet_is_directed_at
```

to identify the referenced product/brand.

Do not invent brands when the dataset does not support the inference.

Optionally associate products with a parent brand when this mapping is reliable.

---

# 9. SQL Data Warehouse

Use a **star schema**.

## Fact Table

Create:

```sql
fact_sentiment
```

Suggested fields:

```text
sentiment_fact_id
source_id
tweet_id
brand_id
date_id
location_id
sentiment_id
negative_reason_id
actual_sentiment_id
predicted_sentiment_id
sentiment_confidence
retweet_count
text_length
word_count
```

The fact table represents individual social-media events.

---

# 10. Dimension Tables

## `dim_brand`

```text
brand_id
brand_name
parent_company
industry
```

---

## `dim_sentiment`

```text
sentiment_id
sentiment_name
sentiment_score
```

Example:

```text
1 | positive |  1
2 | neutral  |  0
3 | negative | -1
4 | unknown  | NULL
```

---

## `dim_date`

Create a proper date dimension:

```text
date_id
full_date
day
month
month_name
quarter
year
week
day_of_week
```

This dimension is required for meaningful OLAP operations.

---

## `dim_location`

```text
location_id
location
city
state
country
timezone
```

Do not invent geographic information if it cannot reliably be extracted.

---

## `dim_negative_reason`

```text
negative_reason_id
reason
```

Populate from:

```text
negativereason
```

where available.

---

## `dim_source`

Use this to distinguish datasets:

```text
source_id
source_name
```

Example:

```text
1 | Brand/Product Dataset
2 | Airline Tweets Dataset
```

---

# 11. Important Database Principle

Do NOT simply put the entire CSV into one giant SQL table.

The project must demonstrate:

```text
Data Warehouse
      ↓
Star Schema
      ↓
OLAP
```

Use fact and dimension tables.

---

# 12. Sentiment Prediction Model

Build a reproducible ML pipeline.

Baseline:

```text
Tweet
 ↓
Text preprocessing
 ↓
TF-IDF
 ↓
Logistic Regression
 ↓
positive / neutral / negative
```

Use:

```text
80% training
20% testing
```

with stratification.

Save:

```text
models/
    sentiment_model.pkl
    tfidf_vectorizer.pkl
```

using `joblib`.

---

# 13. Model Evaluation

Calculate:

- Accuracy
- Precision
- Recall
- F1-score
- Macro F1
- Weighted F1
- Confusion Matrix

The dashboard should display model performance.

---

# 14. Ground Truth vs Prediction

Do not overwrite original sentiment labels.

Maintain separate fields:

```text
actual_sentiment
predicted_sentiment
prediction_confidence
```

This allows model evaluation and independent analytics.

---

# 15. Feature Engineering

Create:

```text
text_length
word_count
hashtag_count
mention_count
url_count
exclamation_count
question_count
retweet_count
sentiment_score
```

Optional:

```text
emoji_count
uppercase_ratio
```

---

# 16. OLAP Operations

The system MUST implement real OLAP operations dynamically.

## 16.1 Roll-up

Aggregate from a lower level to a higher level.

Example:

```text
Day
 ↓
Month
 ↓
Quarter
 ↓
Year
```

Example:

```sql
SELECT
    d.year,
    d.quarter,
    COUNT(*) AS mentions,
    AVG(s.sentiment_score) AS avg_sentiment
FROM fact_sentiment f
JOIN dim_date d ON f.date_id = d.date_id
JOIN dim_sentiment s ON f.sentiment_id = s.sentiment_id
GROUP BY d.year, d.quarter
ORDER BY d.year, d.quarter;
```

---

# 17. Drill-down

Allow:

```text
Year
 ↓
Quarter
 ↓
Month
 ↓
Day
```

The frontend must allow users to drill from aggregate results into more granular results.

---

# 18. Slice

Fix one dimension.

Example:

```text
Brand = United
```

Then analyze sentiment across:

- Time
- Location
- Negative reason

---

# 19. Dice

Filter multiple dimensions simultaneously.

Example:

```text
Brands:
United, Delta

Sentiments:
negative

Year:
2015
```

Return the corresponding subset of the analytical cube.

---

# 20. Pivot

Allow users to change analytical perspective.

Example:

```text
Rows    → Brand
Columns → Sentiment
Values  → Tweet Count
```

Example output:

```text
             Positive  Neutral  Negative
United          500      300      700
Delta           600      250      400
Virgin          450      200      150
```

Values must come dynamically from SQL.

---

# 21. Custom OLAP Operations

Implement additional analytics.

## Brand Sentiment Score

```text
(Positive - Negative) / Total Mentions
```

Range:

```text
-1 → very negative
 0 → neutral
+1 → very positive
```

---

## Brand Health Index

```text
Positive Percentage - Negative Percentage
```

Rank brands using this metric.

---

## Sentiment Trend

```text
Current Period Sentiment
-
Previous Period Sentiment
```

Classify:

```text
Improving
Stable
Declining
```

---

## Negative Complaint Rate

```text
Negative Tweets
----------------
Total Tweets
```

---

## Engagement-weighted Sentiment

Use retweets:

```text
Σ(sentiment_score × (1 + retweet_count))
-----------------------------------------
Σ(1 + retweet_count)
```

This gives highly shared tweets greater analytical weight.

---

# 22. Backend API

Use FastAPI.

## Dashboard

```http
GET /api/dashboard/overview
```

Return dynamically calculated:

```json
{
  "total_mentions": 0,
  "positive": 0,
  "neutral": 0,
  "negative": 0,
  "average_sentiment": 0
}
```

Do not hardcode these values.

---

## Brands

```http
GET /api/brands
GET /api/brands/{brand_id}
GET /api/brands/{brand_id}/sentiment
```

---

## Sentiment

```http
GET /api/sentiment/distribution
GET /api/sentiment/trend
```

---

## OLAP

```http
GET /api/olap/rollup
GET /api/olap/drilldown
GET /api/olap/slice
GET /api/olap/dice
GET /api/olap/pivot
```

Parameters should dynamically control dimensions and filters.

---

## Prediction

```http
POST /api/predict
```

Example:

```json
{
  "text": "The service was terrible and I will never use this company again"
}
```

Response:

```json
{
  "sentiment": "negative",
  "confidence": 0.94
}
```

---

# 23. Dashboard

Create a professional analytics dashboard.

## KPI Cards

Display:

```text
Total Mentions
Positive %
Neutral %
Negative %
Average Sentiment
Most Mentioned Brand
Most Negative Brand
```

---

# 24. Dashboard Charts

Implement:

### Sentiment Distribution

Donut/pie chart:

```text
Positive
Neutral
Negative
```

### Sentiment Over Time

Line chart:

```text
Date → Sentiment
```

### Brand Comparison

Bar chart:

```text
Brand → Positive / Neutral / Negative
```

### Negative Reasons

Bar chart:

```text
Reason → Number of Negative Tweets
```

### Brand Health

Rank brands by:

```text
Brand Health Index
```

### Location Analysis

Analyze sentiment by location when supported by the data.

---

# 25. OLAP Explorer

Create a dedicated page:

```text
┌────────────────────────────────────────────┐
│              OLAP ANALYZER                 │
├────────────────────────────────────────────┤
│ Dimension: [Brand ▼]                      │
│                                            │
│ Operation: [Roll-up ▼]                    │
│                                            │
│ Filters:                                   │
│ Brand      [All ▼]                        │
│ Sentiment  [All ▼]                        │
│ Year       [All ▼]                        │
│                                            │
│             [RUN ANALYSIS]                │
├────────────────────────────────────────────┤
│                                            │
│              Results Table                │
│                                            │
└────────────────────────────────────────────┘
```

Operations:

```text
Roll-up
Drill-down
Slice
Dice
Pivot
Brand Health
Sentiment Trend
Engagement-weighted Sentiment
```

---

# 26. Project Structure

Use:

```text
social-sentiment-analytics/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── routes/
│   │   ├── dashboard.py
│   │   ├── sentiment.py
│   │   ├── brands.py
│   │   ├── prediction.py
│   │   └── olap.py
│   ├── services/
│   │   ├── sentiment_service.py
│   │   ├── olap_service.py
│   │   └── analytics_service.py
│   └── requirements.txt
│
├── ml/
│   ├── preprocessing.py
│   ├── train.py
│   ├── evaluate.py
│   ├── predict.py
│   └── models/
│       ├── sentiment_model.pkl
│       └── tfidf_vectorizer.pkl
│
├── data/
│   ├── Dataset - Train.csv
│   └── Tweets.csv
│
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── queries.sql
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx
│   └── package.json
│
├── notebooks/
│   ├── exploratory_analysis.ipynb
│   └── model_experimentation.ipynb
│
├── scripts/
│   ├── ingest.py
│   ├── preprocess.py
│   └── populate_database.py
│
├── .env.example
├── docker-compose.yml
└── README.md
```

---

# 27. Database Initialization

A new developer should be able to run:

```bash
python scripts/ingest.py
python scripts/preprocess.py
python scripts/populate_database.py
```

to populate the complete database.

Make database population deterministic and idempotent where practical.

---

# 28. Environment Variables

Use:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/sentiment_db
MODEL_PATH=ml/models/sentiment_model.pkl
VECTORIZER_PATH=ml/models/tfidf_vectorizer.pkl
```

Never hardcode credentials.

---

# 29. Implementation Rules

1. Do not hardcode dashboard numbers.
2. All dashboard data must come from SQL/API queries.
3. Do not overwrite original sentiment labels.
4. OLAP operations must execute dynamically.
5. Frontend communicates with PostgreSQL only through FastAPI.
6. Use parameterized SQL / SQLAlchemy.
7. Handle missing values explicitly.
8. Preserve dataset provenance using `source_id`.
9. Keep raw and processed data logically separated.
10. Keep ML training reproducible.
11. Add validation/error handling to API endpoints.
12. Do not fabricate location or brand information.
13. The system must work with both supplied datasets.
14. Make the application runnable locally with documented commands.

---

# 30. Development Order

## Phase 1 — Data

```text
Dataset inspection
        ↓
Data cleaning
        ↓
EDA
```

## Phase 2 — ML

```text
Sentiment preprocessing
        ↓
Train/test split
        ↓
TF-IDF
        ↓
Logistic Regression
        ↓
Evaluation
        ↓
Save model
```

## Phase 3 — Database

```text
PostgreSQL
        ↓
Star schema
        ↓
Create dimensions
        ↓
Create fact table
        ↓
Populate database
```

## Phase 4 — OLAP

```text
Roll-up
        ↓
Drill-down
        ↓
Slice
        ↓
Dice
        ↓
Pivot
        ↓
Custom analytics
```

## Phase 5 — Backend

```text
FastAPI
        ↓
Dashboard APIs
        ↓
Brand APIs
        ↓
Sentiment APIs
        ↓
OLAP APIs
        ↓
Prediction API
```

## Phase 6 — Frontend

```text
Dashboard
        ↓
Brand analytics
        ↓
Sentiment analytics
        ↓
OLAP explorer
        ↓
Prediction interface
```

## Phase 7 — Testing

```text
Unit tests
        ↓
Database tests
        ↓
API tests
        ↓
ML pipeline tests
        ↓
Frontend/API integration
        ↓
End-to-end test
```

---

# 31. Minimum Deliverables

The completed project must contain:

- Cleaned datasets
- EDA notebook
- Trained sentiment model
- Model evaluation report
- PostgreSQL database
- Star schema
- Fact table
- Dimension tables
- SQL analytical queries
- OLAP operations
- Custom brand analytics
- FastAPI backend
- REST APIs
- Interactive frontend
- Dashboard
- OLAP explorer
- Prediction interface
- README
- `.env.example`
- Tests

---

# 32. Final User Workflow

The final user workflow should be:

```text
Open Dashboard
      ↓
See overall sentiment
      ↓
Select a brand
      ↓
View sentiment trend
      ↓
Inspect negative reasons
      ↓
Filter by date/location
      ↓
Perform OLAP operation
      ↓
Compare brands
      ↓
Enter a new tweet
      ↓
Receive predicted sentiment
```

The finished application should function as a **mini social-media business-intelligence platform**, combining NLP, machine learning, SQL data warehousing, OLAP analytics, APIs, and an interactive dashboard.

---

# 33. Antigravity Execution Requirement

Implement the project end-to-end rather than creating only a prototype UI.

Before writing application code:

1. Inspect both CSV files programmatically.
2. Detect actual column types, null counts, duplicates, and label distributions.
3. Build the database schema based on the actual datasets.
4. Build and evaluate the sentiment pipeline.
5. Populate the SQL database.
6. Verify OLAP queries directly against the database.
7. Implement FastAPI endpoints.
8. Connect the frontend to the APIs.
9. Run the complete application.
10. Fix integration errors.
11. Add a setup section to this README with exact commands discovered during implementation.

Do not invent dataset columns or hardcode assumptions when the actual CSV files can be inspected.

The final implementation should be runnable from a clean environment using the documented setup commands.
