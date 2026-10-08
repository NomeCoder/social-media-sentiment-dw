from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any, List, Optional

class OLAPService:
    def __init__(self, db: Session):
        self.db = db

    def rollup(self, time_level: str = "quarter", brand: Optional[str] = None, industry: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        OLAP Roll-up: Aggregates sentiment data up the time hierarchy (Day -> Month -> Quarter -> Year)
        """
        time_level = time_level.lower()
        if time_level == "year":
            select_cols = "d.year AS time_bucket"
            group_by_cols = "d.year"
            order_by_cols = "d.year"
        elif time_level == "quarter":
            select_cols = "d.year || '-Q' || d.quarter AS time_bucket, d.year, d.quarter"
            group_by_cols = "d.year, d.quarter"
            order_by_cols = "d.year, d.quarter"
        elif time_level == "month":
            select_cols = "d.year || '-' || printf('%02d', d.month) AS time_bucket, d.year, d.month, d.month_name"
            group_by_cols = "d.year, d.month, d.month_name"
            order_by_cols = "d.year, d.month"
        else: # day
            select_cols = "d.full_date AS time_bucket, d.year, d.month, d.day"
            group_by_cols = "d.full_date, d.year, d.month, d.day"
            order_by_cols = "d.full_date"

        where_clauses = ["d.date_key != 19700101"]
        params = {}

        if brand:
            where_clauses.append("LOWER(b.brand_name) = LOWER(:brand)")
            params["brand"] = brand
        if industry:
            where_clauses.append("LOWER(b.industry) = LOWER(:industry)")
            params["industry"] = industry

        where_str = " AND ".join(where_clauses)

        sql = f"""
            SELECT
                {select_cols},
                COUNT(*) AS total_mentions,
                SUM(CASE WHEN s.sentiment_label = 'Positive' THEN 1 ELSE 0 END) AS positive_count,
                SUM(CASE WHEN s.sentiment_label = 'Neutral' THEN 1 ELSE 0 END) AS neutral_count,
                SUM(CASE WHEN s.sentiment_label = 'Negative' THEN 1 ELSE 0 END) AS negative_count,
                ROUND(AVG(f.sentiment_score), 4) AS avg_sentiment,
                ROUND(100.0 * SUM(CASE WHEN s.sentiment_label = 'Positive' THEN 1 ELSE 0 END) / COUNT(*), 2) AS positive_pct,
                ROUND(100.0 * SUM(CASE WHEN s.sentiment_label = 'Negative' THEN 1 ELSE 0 END) / COUNT(*), 2) AS negative_pct
            FROM FACT_POST f
            JOIN DIM_DATE d ON f.date_key = d.date_key
            JOIN DIM_BRAND b ON f.brand_key = b.brand_key
            JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
            WHERE {where_str}
            GROUP BY {group_by_cols}
            ORDER BY {order_by_cols}
        """

        result = self.db.execute(text(sql), params).mappings().all()
        return [dict(row) for row in result]

    def drilldown(self, year: Optional[int] = None, quarter: Optional[int] = None, month: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        OLAP Drill-down: Drills down from Year -> Quarter -> Month -> Day
        """
        where_clauses = ["d.date_key != 19700101"]
        params = {}

        if year and quarter and month:
            # Drill to Day
            time_col = "d.full_date AS drill_key, d.day_of_week AS label"
            group_by = "d.full_date, d.day_of_week"
            order_by = "d.full_date"
            where_clauses.extend(["d.year = :year", "d.month = :month"])
            params["year"] = year
            params["month"] = month
        elif year and quarter:
            # Drill to Month
            time_col = "d.year || '-' || printf('%02d', d.month) AS drill_key, d.month_name AS label"
            group_by = "d.year, d.month, d.month_name"
            order_by = "d.month"
            where_clauses.extend(["d.year = :year", "d.quarter = :quarter"])
            params["year"] = year
            params["quarter"] = quarter
        elif year:
            # Drill to Quarter
            time_col = "'Q' || d.quarter AS drill_key, 'Quarter ' || d.quarter AS label"
            group_by = "d.year, d.quarter"
            order_by = "d.quarter"
            where_clauses.append("d.year = :year")
            params["year"] = year
        else:
            # High level Year
            time_col = "CAST(d.year AS TEXT) AS drill_key, CAST(d.year AS TEXT) AS label"
            group_by = "d.year"
            order_by = "d.year"

        where_str = " AND ".join(where_clauses)
        sql = f"""
            SELECT
                {time_col},
                COUNT(*) AS mentions,
                SUM(CASE WHEN s.sentiment_label = 'Positive' THEN 1 ELSE 0 END) AS positive,
                SUM(CASE WHEN s.sentiment_label = 'Neutral' THEN 1 ELSE 0 END) AS neutral,
                SUM(CASE WHEN s.sentiment_label = 'Negative' THEN 1 ELSE 0 END) AS negative,
                ROUND(AVG(f.sentiment_score), 4) AS avg_sentiment
            FROM FACT_POST f
            JOIN DIM_DATE d ON f.date_key = d.date_key
            JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
            WHERE {where_str}
            GROUP BY {group_by}
            ORDER BY {order_by}
        """

        result = self.db.execute(text(sql), params).mappings().all()
        return [dict(row) for row in result]

    def slice_cube(self, dimension: str, value: str) -> List[Dict[str, Any]]:
        """
        OLAP Slice: Fixes one dimension (e.g., brand = 'United' or industry = 'Technology')
        and analyzes across secondary dimensions.
        """
        dimension = dimension.lower()
        params = {"val": value}

        if dimension == "brand":
            where_clause = "LOWER(b.brand_name) = LOWER(:val)"
            group_col = "d.year || '-' || printf('%02d', d.month) AS time_period, s.sentiment_label"
            group_by = "d.year, d.month, s.sentiment_label"
            order_by = "d.year, d.month, s.sentiment_label"
        elif dimension == "industry":
            where_clause = "LOWER(b.industry) = LOWER(:val)"
            group_col = "b.brand_name AS label, s.sentiment_label"
            group_by = "b.brand_name, s.sentiment_label"
            order_by = "b.brand_name, s.sentiment_label"
        elif dimension == "sentiment":
            where_clause = "LOWER(s.sentiment_label) = LOWER(:val)"
            group_col = "b.brand_name AS label, b.industry"
            group_by = "b.brand_name, b.industry"
            order_by = "COUNT(*) DESC"
        else:
            where_clause = "CAST(d.year AS TEXT) = :val"
            group_col = "b.brand_name AS label, s.sentiment_label"
            group_by = "b.brand_name, s.sentiment_label"
            order_by = "b.brand_name"

        sql = f"""
            SELECT
                {group_col},
                COUNT(*) AS count,
                ROUND(AVG(f.sentiment_score), 4) AS avg_sentiment
            FROM FACT_POST f
            JOIN DIM_BRAND b ON f.brand_key = b.brand_key
            JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
            JOIN DIM_DATE d ON f.date_key = d.date_key
            WHERE {where_clause}
            GROUP BY {group_by}
            ORDER BY {order_by}
        """

        result = self.db.execute(text(sql), params).mappings().all()
        return [dict(row) for row in result]

    def dice_cube(self, brands: Optional[List[str]] = None, sentiments: Optional[List[str]] = None,
                  years: Optional[List[int]] = None, industries: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        OLAP Dice: Multi-dimensional sub-cube filtering (e.g. Brands=[Apple, Google], Sentiments=[Negative], Year=2020)
        """
        where_clauses = ["1=1"]
        params = {}

        if brands and len(brands) > 0:
            brand_placeholders = [f":b_{i}" for i in range(len(brands))]
            where_clauses.append(f"LOWER(b.brand_name) IN ({','.join(brand_placeholders)})")
            for i, b in enumerate(brands):
                params[f"b_{i}"] = b.lower()

        if sentiments and len(sentiments) > 0:
            sent_placeholders = [f":s_{i}" for i in range(len(sentiments))]
            where_clauses.append(f"LOWER(s.sentiment_label) IN ({','.join(sent_placeholders)})")
            for i, s in enumerate(sentiments):
                params[f"s_{i}"] = s.lower()

        if years and len(years) > 0:
            yr_placeholders = [f":y_{i}" for i in range(len(years))]
            where_clauses.append(f"d.year IN ({','.join(yr_placeholders)})")
            for i, y in enumerate(years):
                params[f"y_{i}"] = y

        if industries and len(industries) > 0:
            ind_placeholders = [f":ind_{i}" for i in range(len(industries))]
            where_clauses.append(f"LOWER(b.industry) IN ({','.join(ind_placeholders)})")
            for i, ind in enumerate(industries):
                params[f"ind_{i}"] = ind.lower()

        where_str = " AND ".join(where_clauses)

        sql = f"""
            SELECT
                b.brand_name,
                b.industry,
                d.year,
                s.sentiment_label,
                COUNT(*) AS count,
                ROUND(AVG(f.sentiment_score), 4) AS avg_sentiment,
                SUM(f.retweet_count) AS total_retweets
            FROM FACT_POST f
            JOIN DIM_BRAND b ON f.brand_key = b.brand_key
            JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
            JOIN DIM_DATE d ON f.date_key = d.date_key
            WHERE {where_str}
            GROUP BY b.brand_name, b.industry, d.year, s.sentiment_label
            ORDER BY b.brand_name, d.year, s.sentiment_label
        """

        result = self.db.execute(text(sql), params).mappings().all()
        return [dict(row) for row in result]

    def pivot_cube(self, row_dim: str = "brand", col_dim: str = "sentiment") -> Dict[str, Any]:
        """
        OLAP Pivot: Cross-tabulation matrix.
        Example: Rows = Brands, Columns = Sentiments (Positive, Neutral, Negative)
        """
        if row_dim == "industry":
            row_col = "b.industry"
        elif row_dim == "year":
            row_col = "CAST(d.year AS TEXT)"
        else: # brand
            row_col = "b.brand_name"

        sql = f"""
            SELECT
                {row_col} AS row_name,
                SUM(CASE WHEN s.sentiment_label = 'Positive' THEN 1 ELSE 0 END) AS positive,
                SUM(CASE WHEN s.sentiment_label = 'Neutral' THEN 1 ELSE 0 END) AS neutral,
                SUM(CASE WHEN s.sentiment_label = 'Negative' THEN 1 ELSE 0 END) AS negative,
                COUNT(*) AS total,
                ROUND(AVG(f.sentiment_score), 4) AS avg_sentiment
            FROM FACT_POST f
            JOIN DIM_BRAND b ON f.brand_key = b.brand_key
            JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
            JOIN DIM_DATE d ON f.date_key = d.date_key
            GROUP BY {row_col}
            ORDER BY total DESC
        """

        rows = [dict(r) for r in self.db.execute(text(sql)).mappings().all()]
        return {
            "row_dimension": row_dim,
            "col_dimension": col_dim,
            "columns": ["Positive", "Neutral", "Negative", "Total", "Average Sentiment"],
            "data": rows
        }

    def brand_health_index(self) -> List[Dict[str, Any]]:
        """
        Brand Health Index: (Positive % - Negative %)
        Ranks brands by customer satisfaction.
        """
        sql = """
            SELECT
                b.brand_key,
                b.brand_name,
                b.industry,
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
                ROUND(AVG(f.sentiment_score), 4) AS avg_sentiment
            FROM FACT_POST f
            JOIN DIM_BRAND b ON f.brand_key = b.brand_key
            JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
            GROUP BY b.brand_key, b.brand_name, b.industry
            ORDER BY brand_health_index DESC
        """
        return [dict(r) for r in self.db.execute(text(sql)).mappings().all()]

    def engagement_weighted_sentiment(self) -> List[Dict[str, Any]]:
        """
        Engagement-weighted Sentiment:
        Formula: sum(sentiment_score * (1 + retweet_count)) / sum(1 + retweet_count)
        """
        sql = """
            SELECT
                b.brand_name,
                b.industry,
                COUNT(*) AS mentions,
                SUM(f.retweet_count) AS total_retweets,
                ROUND(AVG(f.sentiment_score), 4) AS raw_avg_sentiment,
                ROUND(
                    SUM(f.sentiment_score * (1 + f.retweet_count)) / SUM(1.0 + f.retweet_count),
                    4
                ) AS weighted_sentiment_score
            FROM FACT_POST f
            JOIN DIM_BRAND b ON f.brand_key = b.brand_key
            GROUP BY b.brand_name, b.industry
            ORDER BY weighted_sentiment_score DESC
        """
        return [dict(r) for r in self.db.execute(text(sql)).mappings().all()]

    def sentiment_trend(self) -> List[Dict[str, Any]]:
        """
        Calculates sentiment trend over time and labels period direction:
        Improving, Stable, or Declining
        """
        sql = """
            SELECT
                d.year,
                d.month,
                d.year || '-' || printf('%02d', d.month) AS period,
                COUNT(*) AS total,
                SUM(CASE WHEN s.sentiment_label = 'Positive' THEN 1 ELSE 0 END) AS positive,
                SUM(CASE WHEN s.sentiment_label = 'Neutral' THEN 1 ELSE 0 END) AS neutral,
                SUM(CASE WHEN s.sentiment_label = 'Negative' THEN 1 ELSE 0 END) AS negative,
                ROUND(AVG(f.sentiment_score), 4) AS avg_sentiment
            FROM FACT_POST f
            JOIN DIM_DATE d ON f.date_key = d.date_key
            JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
            WHERE d.date_key != 19700101
            GROUP BY d.year, d.month
            ORDER BY d.year, d.month
        """
        rows = [dict(r) for r in self.db.execute(text(sql)).mappings().all()]
        
        # Calculate period-over-period trend
        for i in range(len(rows)):
            if i == 0:
                rows[i]["delta"] = 0.0
                rows[i]["trend"] = "Baseline"
            else:
                prev_score = rows[i - 1]["avg_sentiment"]
                curr_score = rows[i]["avg_sentiment"]
                delta = round(curr_score - prev_score, 4)
                rows[i]["delta"] = delta
                if delta > 0.03:
                    rows[i]["trend"] = "Improving"
                elif delta < -0.03:
                    rows[i]["trend"] = "Declining"
                else:
                    rows[i]["trend"] = "Stable"
                    
        return rows
