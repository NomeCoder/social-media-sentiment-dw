# Data Warehouse Distribution & Visual Analytics Report

This report presents the exact data distribution graphs generated from the **289,324 social media post records** in the Star Schema Data Warehouse.

---

## 1. Overall Sentiment Share Distribution

The pie chart and volume breakdown illustrate the macro sentiment proportion across all ingested datasets.

![Overall Sentiment Share Distribution](C:/Users/ARYAN/.gemini/antigravity-ide/brain/8f0405b5-fd8b-464c-9db4-15ddb495fe0f/sentiment_distribution.png)

### Key Metric Breakdown:
- **Positive Sentiment**: 137,422 posts (**47.5%**)
- **Neutral Sentiment**: 111,364 posts (**38.5%**)
- **Negative Sentiment**: 40,538 posts (**14.0%**)
- **Total Posts Analyzed**: **289,324 posts**

---

## 2. Ingestion Volume by Dataset Source

The bar chart below outlines the contribution of each social media source dataset integrated into `FACT_POST`.

![Dataset Source Volume Distribution](C:/Users/ARYAN/.gemini/antigravity-ide/brain/8f0405b5-fd8b-464c-9db4-15ddb495fe0f/source_distribution.png)

### Source Breakdown:
1. **Bigtech (2020)**: **266,095 posts** (92.0% of total warehouse volume)
2. **Tweets (US Airlines)**: **14,640 posts** (5.1% of total warehouse volume)
3. **Dataset - Train (SXSW Brand Tech)**: **8,589 posts** (2.9% of total warehouse volume)

---

## 3. Top 10 Brand Mentions & Sentiment Breakdown

Horizontal stacked bar visualization comparing positive, neutral, and negative post counts for the top 10 brands.

![Top 10 Brand Mentions & Sentiment Breakdown](C:/Users/ARYAN/.gemini/antigravity-ide/brain/8f0405b5-fd8b-464c-9db4-15ddb495fe0f/brand_mentions_distribution.png)

### Top Brand Highlights:
- **Twitch**: 40,000 posts (45.2% Positive, 39.9% Neutral, 14.8% Negative)
- **YouTube**: 39,978 posts (39.4% Positive, 49.4% Neutral, 11.2% Negative)
- **Apple**: 39,230 posts (45.8% Positive, 39.5% Neutral, 14.7% Negative)
- **Netflix**: 37,732 posts (45.3% Positive, 33.1% Neutral, 21.6% Negative)
- **Google**: 34,868 posts (44.1% Positive, 42.5% Neutral, 13.4% Negative)
- **Microsoft**: 25,483 posts (48.1% Positive, 38.5% Neutral, 13.4% Negative)
- **Amazon**: 24,823 posts (52.4% Positive, 35.9% Neutral, 11.7% Negative)

---

## 4. Top Categorized Negative Sentiment Drivers

Breakdown of human-annotated complaint causes and negative sentiment drivers.

![Top Categorized Negative Sentiment Drivers](C:/Users/ARYAN/.gemini/antigravity-ide/brain/8f0405b5-fd8b-464c-9db4-15ddb495fe0f/negative_reasons_distribution.png)

### Key Negative Drivers:
1. **Customer Service Issue**: 2,910 complaints
2. **Late Flight**: 1,665 complaints
3. **Can't Tell / General Complaint**: 1,190 complaints
4. **Cancelled Flight**: 847 complaints
5. **Lost Luggage**: 724 complaints
6. **Bad Flight Experience**: 580 complaints
