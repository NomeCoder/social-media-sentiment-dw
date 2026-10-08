# Social Media Brand Sentiment & OLAP Analytics Platform

A full-stack, enterprise-grade **Social Media Sentiment Analysis and Brand Intelligence Platform** combining SQL Data Warehousing, dynamic OLAP cube operations, machine learning classification, FastAPI REST endpoints, and a **Next.js + Tailwind CSS v3 + shadcn/ui** frontend.

---

## 1. Overview & Architecture

The platform integrates **289,324 social media records** across three primary data sources:

1. **`Dataset - Train.csv`** (8,589 rows): SXSW technology product & brand sentiment (Apple, Google, iPad, iPhone, Android).
2. **`Tweets.csv`** (14,640 rows): US Airline customer sentiment and negative reason drivers (United, US Airways, American, Delta, Southwest, Virgin America).
3. **`Bigtech - 20-09-2020 till 13-10-2020.csv`** (266,095 rows): Big Tech polarity, follower engagement, and sentiment (Nvidia, Apple, Google, Microsoft, Amazon, Tesla, Twitch, Youtube, Netflix, AMD).

```
                      ┌───────────────────────────────────────────────┐
                      │              3 Raw CSV Datasets               │
                      │  Train (8.5k) | Tweets (14.6k) | Bigtech (266k)│
                      └───────────────────────┬───────────────────────┘
                                              │
                                              ▼
                      ┌───────────────────────────────────────────────┐
                      │           Ingestion & ETL Pipeline            │
                      │  scripts/populate_database.py                 │
                      └───────────────┬───────────────┬───────────────┘
                                      │               │
                 ┌────────────────────┘               └───────────────────┐
                 ▼                                                        ▼
┌─────────────────────────────────┐                    ┌──────────────────────────────────┐
│      SQL Data Warehouse         │                    │   NLP Machine Learning Engine    │
│  (Star Schema: 289,324 rows)    │                    │  TF-IDF + Logistic Regression    │
│  - DIM_DATE (43 dates)          │                    │  - Accuracy: 76.12%              │
│  - DIM_BRAND (24 entities)      │                    │  - Macro F1: 73.91%              │
│  - DIM_SENTIMENT (Pos/Neu/Neg)  │                    │  - Real-time inference meter     │
│  - DIM_LOCATION (28k locations) │                    └─────────────────┬────────────────┘
│  - DIM_NEGATIVE_REASON (11)     │                                      │
│  - FACT_POST (Indexed events)   │                                      │
└────────────────┬────────────────┘                                      │
                 │                                                       │
                 └────────────────────┬──────────────────────────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────────────────────┐
                      │            FastAPI Backend Engine             │
                      │  - OLAP Cube Service (Rollup, Drilldown, etc.)│
                      │  - Executive KPI Analytics                    │
                      │  - Live Tweet Classification Endpoint         │
                      └───────────────────────┬───────────────────────┘
                                              │
                                              ▼
                      ┌───────────────────────────────────────────────┐
                      │     Next.js + Tailwind CSS v3 + shadcn/ui     │
                      │  - Executive Overview (KPIs, Donut, Timeline) │
                      │  - Interactive OLAP Cube Explorer             │
                      │  - Brand Health Index Leaderboard             │
                      │  - Real-time ML Prediction Sandbox            │
                      └───────────────────────────────────────────────┘
```

---

## 2. Tech Stack

- **Frontend**: Next.js (App Router), Tailwind CSS v3, shadcn/ui (`<Card>`, `<Table>`, `<Badge>`, `<Button>`, `<Progress>`), Recharts, Lucide Icons.
- **Backend**: FastAPI, SQLAlchemy, Uvicorn, Pydantic.
- **Data Warehouse**: Relational Star Schema database with dimensional indexes over 289k records (`database/warehouse.db`).
- **Machine Learning**: scikit-learn (TF-IDF vectorizer + Logistic Regression with class-balanced weighting).

---

## 3. Dynamic OLAP Operations

The platform implements all classical and custom analytical OLAP operations:

1. **Roll-up**: Aggregates from Day $\rightarrow$ Month $\rightarrow$ Quarter $\rightarrow$ Year with positive/negative percentages and average sentiment.
2. **Drill-down**: Explores granular time slices (Year $\rightarrow$ Quarter $\rightarrow$ Month $\rightarrow$ Day).
3. **Slice**: Fixes a single dimension (e.g., `Brand = Apple` or `Industry = Airline`) and analyzes across time or sentiments.
4. **Dice**: Multi-dimensional subcube filtering (e.g., `Brands = [Apple, Google, United]`, `Sentiments = [Positive, Negative]`, `Years = [2015, 2020]`).
5. **Pivot**: Dynamic cross-tabulation matrix (Brands as rows, Sentiments as columns, counts as cells).
6. **Brand Health Index**: Custom metric defined as:
   $$\text{Brand Health Index} = \text{Positive } \% - \text{Negative } \%$$
7. **Engagement-Weighted Sentiment**: Retweet-adjusted sentiment metric:
   $$\text{Weighted Sentiment} = \frac{\sum (\text{sentiment\_score} \times (1 + \text{retweet\_count}))}{\sum (1 + \text{retweet\_count})}$$
8. **Sentiment Trend**: Period-over-period direction (`Improving`, `Stable`, `Declining`).

---

## 4. Quickstart & Running Locally

### Step 1: Run the Complete Platform
```bash
python run.py
```
This boots both the FastAPI backend and the Next.js frontend:
- 🌟 **Next.js + shadcn/ui Dashboard**: [http://localhost:3000](http://localhost:3000)
- ⚙️ **FastAPI REST API**: [http://localhost:8000](http://localhost:8000)
- 📖 **Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Step 2: Running Automated Tests
```bash
python -m pytest tests/test_pipeline.py -v
```
All 10 tests verify database integrity, row counts (289,324), OLAP operations, and ML inference.

---

## 5. API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/dashboard/overview` | `GET` | High-level executive KPIs (mentions, sentiment %, top brands) |
| `/api/brands` | `GET` | List of all 24 brands with health indices and volume |
| `/api/sentiment/distribution` | `GET` | Global sentiment distribution breakdown |
| `/api/sentiment/trend` | `GET` | Period-over-period sentiment time series |
| `/api/sentiment/negative-reasons` | `GET` | Primary complaint reasons (optional brand filter) |
| `/api/olap/rollup` | `GET` | Roll-up aggregation (`level=year\|quarter\|month\|day`) |
| `/api/olap/drilldown` | `GET` | Drill-down by year, quarter, month |
| `/api/olap/slice` | `GET` | Slice cube along brand, industry, sentiment, or year |
| `/api/olap/dice` | `POST` | Multi-dimensional sub-cube filter |
| `/api/olap/pivot` | `GET` | Cross-tabulation matrix |
| `/api/olap/brand-health` | `GET` | Complete Brand Health Index ranking |
| `/api/olap/weighted-sentiment` | `GET` | Retweet-weighted sentiment rankings |
| `/api/predict` | `POST` | Real-time tweet sentiment inference |
| `/api/model/metrics` | `GET` | Test accuracy, macro F1, and confusion matrix |
