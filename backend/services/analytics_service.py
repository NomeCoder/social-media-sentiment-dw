from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any, List

class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def get_overview_kpis(self) -> Dict[str, Any]:
        """
        Calculates high-level executive KPIs dynamically from SQL
        """
        # 1. Total mentions and sentiment counts
        sql_counts = """
            SELECT
                COUNT(*) AS total_mentions,
                SUM(CASE WHEN s.sentiment_label = 'Positive' THEN 1 ELSE 0 END) AS positive_count,
                SUM(CASE WHEN s.sentiment_label = 'Neutral' THEN 1 ELSE 0 END) AS neutral_count,
                SUM(CASE WHEN s.sentiment_label = 'Negative' THEN 1 ELSE 0 END) AS negative_count,
                ROUND(AVG(f.sentiment_score), 4) AS average_sentiment
            FROM FACT_POST f
            JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
        """
        row = dict(self.db.execute(text(sql_counts)).mappings().one())
        total = row["total_mentions"] or 1

        row["positive_pct"] = round(100.0 * (row["positive_count"] or 0) / total, 2)
        row["neutral_pct"] = round(100.0 * (row["neutral_count"] or 0) / total, 2)
        row["negative_pct"] = round(100.0 * (row["negative_count"] or 0) / total, 2)

        # 2. Most mentioned brand
        sql_most_mentioned = """
            SELECT b.brand_name
            FROM FACT_POST f
            JOIN DIM_BRAND b ON f.brand_key = b.brand_key
            GROUP BY b.brand_name
            ORDER BY COUNT(*) DESC
            LIMIT 1
        """
        res_mm = self.db.execute(text(sql_most_mentioned)).scalar()
        row["most_mentioned_brand"] = res_mm or "N/A"

        # 3. Most positive & most negative brand (with at least 500 mentions)
        sql_brand_sentiment = """
            SELECT
                b.brand_name,
                ROUND(AVG(f.sentiment_score), 4) AS avg_score
            FROM FACT_POST f
            JOIN DIM_BRAND b ON f.brand_key = b.brand_key
            GROUP BY b.brand_name
            HAVING COUNT(*) > 500
            ORDER BY avg_score DESC
        """
        scores = self.db.execute(text(sql_brand_sentiment)).fetchall()
        row["most_positive_brand"] = scores[0][0] if scores else "N/A"
        row["most_negative_brand"] = scores[-1][0] if scores else "N/A"

        return row

    def get_all_brands(self) -> List[Dict[str, Any]]:
        """
        Returns list of brands with volume, industry, and sentiment summary
        """
        sql = """
            SELECT
                b.brand_key,
                b.brand_name,
                b.industry,
                b.parent_company,
                COUNT(*) AS total_mentions,
                SUM(CASE WHEN s.sentiment_label = 'Positive' THEN 1 ELSE 0 END) AS positive_count,
                SUM(CASE WHEN s.sentiment_label = 'Neutral' THEN 1 ELSE 0 END) AS neutral_count,
                SUM(CASE WHEN s.sentiment_label = 'Negative' THEN 1 ELSE 0 END) AS negative_count,
                ROUND(100.0 * SUM(CASE WHEN s.sentiment_label = 'Positive' THEN 1 ELSE 0 END) / COUNT(*), 2) AS positive_pct,
                ROUND(100.0 * SUM(CASE WHEN s.sentiment_label = 'Neutral' THEN 1 ELSE 0 END) / COUNT(*), 2) AS neutral_pct,
                ROUND(100.0 * SUM(CASE WHEN s.sentiment_label = 'Negative' THEN 1 ELSE 0 END) / COUNT(*), 2) AS negative_pct,
                ROUND(
                    (100.0 * SUM(CASE WHEN s.sentiment_label = 'Positive' THEN 1 ELSE 0 END) / COUNT(*)) -
                    (100.0 * SUM(CASE WHEN s.sentiment_label = 'Negative' THEN 1 ELSE 0 END) / COUNT(*)), 2
                ) AS brand_health_index,
                ROUND(AVG(f.sentiment_score), 4) AS avg_sentiment,
                ROUND(
                    SUM(f.sentiment_score * (1 + f.retweet_count)) / SUM(1.0 + f.retweet_count),
                    4
                ) AS engagement_weighted_sentiment
            FROM FACT_POST f
            JOIN DIM_BRAND b ON f.brand_key = b.brand_key
            JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
            GROUP BY b.brand_key, b.brand_name, b.industry, b.parent_company
            ORDER BY total_mentions DESC
        """
        return [dict(r) for r in self.db.execute(text(sql)).mappings().all()]

    def get_sentiment_distribution(self) -> List[Dict[str, Any]]:
        """
        Returns distribution of mentions across sentiment labels
        """
        sql = """
            SELECT
                s.sentiment_label AS sentiment,
                COUNT(*) AS count
            FROM FACT_POST f
            JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
            GROUP BY s.sentiment_label
            ORDER BY count DESC
        """
        rows = [dict(r) for r in self.db.execute(text(sql)).mappings().all()]
        total = sum(r["count"] for r in rows) or 1
        for r in rows:
            r["percentage"] = round(100.0 * r["count"] / total, 2)
        return rows

    def get_negative_reasons(self, brand: str = None) -> List[Dict[str, Any]]:
        """
        Returns breakdown of negative reasons
        """
        where_clause = "r.negative_reason_key != 0"
        params = {}
        if brand:
            where_clause += " AND LOWER(b.brand_name) = LOWER(:brand)"
            params["brand"] = brand

        sql = f"""
            SELECT
                r.reason,
                COUNT(*) AS count
            FROM FACT_POST f
            JOIN DIM_NEGATIVE_REASON r ON f.negative_reason_key = r.negative_reason_key
            JOIN DIM_BRAND b ON f.brand_key = b.brand_key
            WHERE {where_clause}
            GROUP BY r.reason
            ORDER BY count DESC
        """
        rows = [dict(r) for r in self.db.execute(text(sql), params).mappings().all()]
        total = sum(r["count"] for r in rows) or 1
        for r in rows:
            r["percentage"] = round(100.0 * r["count"] / total, 2)
        return rows
