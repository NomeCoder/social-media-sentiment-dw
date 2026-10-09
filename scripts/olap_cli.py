import sys
import sqlite3
import os

DB_PATH = "database/warehouse.db"

def get_connection():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database file not found at {DB_PATH}. Run 'python run.py' first.")
        sys.exit(1)
    return sqlite3.connect(DB_PATH)

def print_table(title, headers, rows):
    print("\n" + "=" * 70)
    print(f" {title.upper()} ")
    print("=" * 70)
    
    # Calculate widths
    widths = [len(h) for h in headers]
    for row in rows:
        for i, val in enumerate(row):
            widths[i] = max(widths[i], len(str(val)))
            
    header_str = " | ".join(f"{h:<{widths[i]}}" for i, h in enumerate(headers))
    divider_str = "-+-".join("-" * widths[i] for i in range(len(headers)))
    
    print(header_str)
    print(divider_str)
    for row in rows:
        print(" | ".join(f"{str(val):<{widths[i]}}" for i, val in enumerate(row)))
    print("=" * 70)

def run_rollup():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            d.year || '-Q' || d.quarter AS time_bucket,
            COUNT(*) AS total_mentions,
            SUM(CASE WHEN s.sentiment_label = 'Positive' THEN 1 ELSE 0 END) AS positive_count,
            SUM(CASE WHEN s.sentiment_label = 'Neutral' THEN 1 ELSE 0 END) AS neutral_count,
            SUM(CASE WHEN s.sentiment_label = 'Negative' THEN 1 ELSE 0 END) AS negative_count,
            ROUND(AVG(f.sentiment_score), 4) AS avg_sentiment
        FROM FACT_POST f
        JOIN DIM_DATE d ON f.date_key = d.date_key
        JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
        WHERE d.date_key != 19700101
        GROUP BY d.year, d.quarter
        ORDER BY d.year, d.quarter;
    """)
    rows = cur.fetchall()
    conn.close()
    print_table("1. OLAP Roll-up (Quarter Level Aggregation)", 
                ["Time Bucket", "Total Mentions", "Positive", "Neutral", "Negative", "Avg Sentiment"], rows)

def run_drilldown(year=2020):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            d.year || '-' || printf('%02d', d.month) AS drill_key,
            d.month_name AS label,
            COUNT(*) AS mentions,
            SUM(CASE WHEN s.sentiment_label = 'Positive' THEN 1 ELSE 0 END) AS positive,
            SUM(CASE WHEN s.sentiment_label = 'Neutral' THEN 1 ELSE 0 END) AS neutral,
            SUM(CASE WHEN s.sentiment_label = 'Negative' THEN 1 ELSE 0 END) AS negative
        FROM FACT_POST f
        JOIN DIM_DATE d ON f.date_key = d.date_key
        JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
        WHERE d.year = ?
        GROUP BY d.year, d.month, d.month_name
        ORDER BY d.month;
    """, (year,))
    rows = cur.fetchall()
    conn.close()
    print_table(f"2. OLAP Drill-down (Monthly breakdown for Year {year})", 
                ["Month Key", "Month Name", "Mentions", "Positive", "Neutral", "Negative"], rows)

def run_slice(brand="Apple"):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            d.year || '-' || printf('%02d', d.month) AS time_period,
            s.sentiment_label,
            COUNT(*) AS count,
            ROUND(AVG(f.sentiment_score), 4) AS avg_sentiment
        FROM FACT_POST f
        JOIN DIM_BRAND b ON f.brand_key = b.brand_key
        JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
        JOIN DIM_DATE d ON f.date_key = d.date_key
        WHERE LOWER(b.brand_name) = LOWER(?)
        GROUP BY d.year, d.month, s.sentiment_label
        ORDER BY d.year, d.month, s.sentiment_label;
    """, (brand,))
    rows = cur.fetchall()
    conn.close()
    print_table(f"3. OLAP Slice (Fixed Brand = '{brand}')", 
                ["Time Period", "Sentiment", "Count", "Avg Score"], rows)

def run_dice():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            b.brand_name,
            d.year,
            s.sentiment_label,
            COUNT(*) AS count,
            ROUND(AVG(f.sentiment_score), 4) AS avg_sentiment
        FROM FACT_POST f
        JOIN DIM_BRAND b ON f.brand_key = b.brand_key
        JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
        JOIN DIM_DATE d ON f.date_key = d.date_key
        WHERE LOWER(b.brand_name) IN ('apple', 'google')
          AND LOWER(s.sentiment_label) IN ('positive', 'negative')
          AND d.year = 2020
        GROUP BY b.brand_name, d.year, s.sentiment_label
        ORDER BY b.brand_name, s.sentiment_label;
    """)
    rows = cur.fetchall()
    conn.close()
    print_table("4. OLAP Dice (Sub-cube: Brands [Apple, Google] x Sentiments [Pos, Neg] x Year [2020])", 
                ["Brand", "Year", "Sentiment", "Count", "Avg Score"], rows)

def run_pivot():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            b.brand_name AS row_name,
            SUM(CASE WHEN s.sentiment_label = 'Positive' THEN 1 ELSE 0 END) AS positive,
            SUM(CASE WHEN s.sentiment_label = 'Neutral' THEN 1 ELSE 0 END) AS neutral,
            SUM(CASE WHEN s.sentiment_label = 'Negative' THEN 1 ELSE 0 END) AS negative,
            COUNT(*) AS total,
            ROUND(AVG(f.sentiment_score), 4) AS avg_sentiment
        FROM FACT_POST f
        JOIN DIM_BRAND b ON f.brand_key = b.brand_key
        JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
        GROUP BY b.brand_name
        ORDER BY total DESC
        LIMIT 10;
    """)
    rows = cur.fetchall()
    conn.close()
    print_table("5. OLAP Pivot Matrix (Brand x Sentiment Crosstab)", 
                ["Brand", "Positive", "Neutral", "Negative", "Total", "Avg Score"], rows)

def run_brand_health():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            b.brand_name,
            b.industry,
            COUNT(*) AS total_mentions,
            ROUND(100.0 * SUM(CASE WHEN s.sentiment_label = 'Positive' THEN 1 ELSE 0 END) / COUNT(*), 1) AS pos_pct,
            ROUND(100.0 * SUM(CASE WHEN s.sentiment_label = 'Negative' THEN 1 ELSE 0 END) / COUNT(*), 1) AS neg_pct,
            ROUND(
                (100.0 * SUM(CASE WHEN s.sentiment_label = 'Positive' THEN 1 ELSE 0 END) / COUNT(*)) -
                (100.0 * SUM(CASE WHEN s.sentiment_label = 'Negative' THEN 1 ELSE 0 END) / COUNT(*)), 1
            ) AS brand_health_index
        FROM FACT_POST f
        JOIN DIM_BRAND b ON f.brand_key = b.brand_key
        JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
        GROUP BY b.brand_key, b.brand_name, b.industry
        HAVING COUNT(*) > 100
        ORDER BY brand_health_index DESC;
    """)
    rows = cur.fetchall()
    conn.close()
    print_table("6. Brand Health Index (Net Sentiment %: Pos% - Neg%)", 
                ["Brand", "Industry", "Mentions", "Pos %", "Neg %", "Health Index"], rows)

def main():
    arg = sys.argv[1].lower() if len(sys.argv) > 1 else "all"
    if arg == "rollup":
        run_rollup()
    elif arg == "drilldown":
        run_drilldown()
    elif arg == "slice":
        brand = sys.argv[2] if len(sys.argv) > 2 else "Apple"
        run_slice(brand)
    elif arg == "dice":
        run_dice()
    elif arg == "pivot":
        run_pivot()
    elif arg == "health":
        run_brand_health()
    else:
        run_rollup()
        run_drilldown()
        run_slice()
        run_dice()
        run_pivot()
        run_brand_health()

if __name__ == "__main__":
    main()
