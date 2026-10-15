# Phase 2 Presentation Generator Prompt (Topic Clusters, Association Rules & Trend Prediction)

> **Instructions for User:**  
> Copy and paste the entire prompt below directly into Claude (Claude 3.5 Sonnet or Claude 3 Opus) or use it with python-pptx / Marp / Gamma to generate a slide deck presentation.

---

```markdown
You are an expert Data Science and Data Warehousing presenter and executive communications specialist. 

I need you to create a comprehensive, highly technical, yet executive-ready presentation (Slide Deck / PowerPoint content) for Phase 2 of our Enterprise Social Media Brand Sentiment & Data Warehouse Project.

IMPORTANT SCOPE REQUIREMENT:
The presentation must focus EXCLUSIVELY on the following THREE advanced machine learning and data mining modules:
1. Unsupervised Topic Clustering (MiniBatchKMeans + Sublinear TF-IDF)
2. Hashtag & Keyword Association Rule Mining (Apriori Analysis on BigTech Corpus)
3. Time-Series Sentiment Trend Prediction & Forecasting (Holt's Linear Exponential Smoothing with 95% Confidence Intervals)

Do NOT include general data warehouse introduction or basic sentiment classification slides. Focus entirely on the methodology, mathematical foundations, findings, empirical metrics, architectural integration, and business value of these 3 components.

---

### PROJECT CONTEXT & REAL METRICS TO EMBED IN THE SLIDES:

#### Module 1: Unsupervised Topic Clustering
- Corpus & Sampling: 25,000 stratified post samples drawn from a 289,324 post star schema warehouse (BigTech + Airline datasets).
- Vectorization: Sublinear TF-IDF with 8,000 max features, unigrams and bigrams (1-2 n-grams), custom negation-preserving stopwords.
- Model: MiniBatchKMeans (k=6 optimal clusters, batch_size=1024, random_state=42).
- The 6 Discovered Topic Clusters:
  1. E-Commerce, Prime & Retail Deals (#amazon, #deals, #kindle, #ganga): 9.25% volume share, +0.209 avg sentiment (50.9% Pos, 36.4% Neu, 12.8% Neg).
  2. Gaming & Live Stream Communities (#twitch, #streamer, #gaming, #live, #apex): 13.54% volume share, +0.179 avg sentiment (44.3% Pos, 41.2% Neu, 14.5% Neg).
  3. Entertainment & Video Streaming (#netflix, #movie, #series, #watch, #season): 13.27% volume share, +0.153 avg sentiment (44.9% Pos, 33.9% Neu, 21.1% Neg).
  4. Search, Digital Marketing & Android (#google, #seo, #pixel, #android, #marketing): 13.33% volume share, +0.169 avg sentiment (41.8% Pos, 45.1% Neu, 13.1% Neg).
  5. Enterprise Cloud & Infrastructure (#microsoft, #azure, #cloud, #windows, #teams): 9.06% volume share, +0.178 avg sentiment (46.8% Pos, 39.1% Neu, 14.2% Neg).
  6. Smartphones, iOS & Apple Devices (#apple, #iphone, #ipad, #ios, #app): 13.71% volume share, +0.210 avg sentiment (46.5% Pos, 40.7% Neu, 12.8% Neg).
- Inference Architecture: Real-time cosine similarity distance to cluster centroids via FastAPI (/api/topics/predict).

#### Module 2: Hashtag & Keyword Association Rule Mining
- Dataset: hashtag_association_rules_bigtech.csv containing 170 mined rules.
- Key Mathematical Metrics:
  - Support: Itemset co-occurrence probability P(A ∩ B).
  - Confidence: Conditional probability P(B | A) = Support(A ∪ B) / Support(A).
  - Lift: Correlation ratio P(B | A) / P(B) — measures strength above random chance.
- Key Mined Findings:
  - Peak Lift (42.26x, 100% Conf, 1.24% Support): {deals, ganga} -> {deal} (promotional synergy).
  - Cloud Ecosystem Binding: {aws} -> {cloud} (Lift: 24.65x, Conf: 63.6%) and {azure} -> {microsoft} (Lift: 8.76x, Conf: 88.4%).
  - Multi-Platform OTT Streaming Synergy: {amazon, disney} -> {netflix} (Lift: 19.87x, Conf: 98.6%) and {apple, disney} -> {netflix} (Lift: 19.42x, Conf: 96.3%).
  - Highest Dataset Support: {twitchstreamer} -> {twitch} (7.52% of entire dataset volume, 97.2% Confidence, 3.14x Lift).

#### Module 3: Sentiment Trend Prediction & Time-Series Forecasting
- Dataset: Daily time-series aggregated sentiment from 289,324 social media events (BigTech 2020 longitudinal window).
- Algorithm: Double Exponential Smoothing (Holt's Linear Trend Method) with Level (α = 0.35) and Trend (β = 0.20) equations.
- Horizon: Configurable multi-horizon forecasting (7, 14, 21, and 30 days forward).
- Error & Confidence: 95% Confidence Intervals computed via expanding residual variance envelope:
  Interval = Y_hat ± 1.96 * SE * sqrt(1 + 0.15 * h).
- Model Fit: R² = 84.1%, MAE = 0.0072, RMSE = 0.0094.
- Trend Directionality Classification:
  - Improving (Bullish): Slope > +0.015/period.
  - Stable (Neutral / Equilibrium): -0.015 ≤ Slope ≤ +0.015.
  - Declining (Bearish): Slope < -0.015/period.
- Brand Drilldown: Independent forecasting models for Apple, Amazon, Google, Microsoft, Netflix, Twitch, YouTube, and Tesla.

---

### PRESENTATION STRUCTURE REQUIREMENTS:

Generate a comprehensive 10-slide deck. For EACH slide, provide:
1. Slide Number & Title
2. Slide Subtitle / Executive Takeaway
3. Visual Layout & Graphic Suggestions (charts, diagrams, tables, metric callout cards)
4. Slide Content (Structured bullet points, formulas, and exact metrics)
5. Speaker Notes (Detailed 2-3 paragraph spoken script for the presenter)

Here is the exact slide breakdown:

- Slide 1: Title Slide — Advanced Predictive Analytics & Unsupervised Mining for Brand Intelligence
- Slide 2: Executive Overview — The Three Pillars of Phase 2 (Clustering, Association Mining, Trend Forecasting)
- Slide 3: Topic Clustering Methodology — Sublinear TF-IDF & MiniBatchKMeans Architecture (k=6)
- Slide 4: Empirical Findings: The 6 Conversational Topic Clusters (Volume Share, Keywords & Sentiment Polarity)
- Slide 5: Real-Time Centroid Inference & Topic Classification Pipeline
- Slide 6: Association Rule Mining: Apriori Theory & Mathematical Metrics (Support, Confidence, Lift)
- Slide 7: High-Impact Association Discoveries (Cloud Ecosystem Lock-In, Streaming Synergy & Retail Deals)
- Slide 8: Time-Series Sentiment Trend Forecasting: Holt's Linear Exponential Smoothing Model
- Slide 9: 95% Confidence Envelopes & Multi-Horizon Brand Trajectory Projections (7d to 30d)
- Slide 10: Technical Architecture, Production API Endpoints & Enterprise Business Impact

Make the tone rigorous, analytical, authoritative, and data-driven. Present all formulas cleanly using LaTeX notation.
```

---

## Slide-by-Slide Outline Quick Reference

| Slide | Topic | Key Focus / Real Values |
| :--- | :--- | :--- |
| **01** | Title Slide | Advanced Predictive Analytics & Unsupervised Mining |
| **02** | Executive Overview | 3 Pillars: Clustering, Association Rules, Trend Forecasting |
| **03** | Topic Clustering Methodology | MiniBatchKMeans ($k=6$), Sublinear TF-IDF (8k features) |
| **04** | Discovered Clusters Breakdown | 6 Topics: E-Commerce, Gaming, Streaming, Search, Cloud, Mobile |
| **05** | Real-Time Centroid Inference | Cosine distance similarity, `/api/topics/predict` pipeline |
| **06** | Association Rule Theory | Support $P(A \cap B)$, Confidence $P(B \mid A)$, Lift $\frac{P(B \mid A)}{P(B)}$ |
| **07** | Mined Association Discoveries | Deals Lift ($42.26\times$), AWS/Azure Cloud ($24.7\times$), Netflix OTT ($19.9\times$) |
| **08** | Time-Series Forecasting Model | Holt's Linear Exponential Smoothing ($\alpha=0.35, \beta=0.20, R^2=84.1\%$) |
| **09** | 95% Prediction Intervals | Dynamic expanding error cone, 7–30 day multi-horizon, brand filters |
| **10** | Production Architecture & Impact | FastAPI REST routes, Next.js UI integration, strategic ROI |
