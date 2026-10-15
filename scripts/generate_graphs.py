import sqlite3
import os
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# Set dark theme style
plt.style.use('dark_background')
sns.set_theme(style="darkgrid", palette="dark")

DB_PATH = "database/warehouse.db"
OUTPUT_DIR = r"C:\Users\ARYAN\.gemini\antigravity-ide\brain\8f0405b5-fd8b-464c-9db4-15ddb495fe0f"
os.makedirs(OUTPUT_DIR, exist_ok=True)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Colors
COLOR_POS = "#10b981"
COLOR_NEU = "#38bdf8"
COLOR_NEG = "#f43f5e"
COLOR_PURPLE = "#818cf8"
COLOR_AMBER = "#f59e0b"

# 1. Overall Sentiment Distribution Pie & Bar Chart
cursor.execute("""
    SELECT s.sentiment_label, COUNT(*) AS count
    FROM FACT_POST f
    JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
    GROUP BY s.sentiment_label
    ORDER BY count DESC;
""")
sent_data = cursor.fetchall()
sent_labels = [row[0] for row in sent_data]
sent_counts = [row[1] for row in sent_data]

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6), facecolor="#090d16")
ax1.set_facecolor("#090d16")
ax2.set_facecolor("#090d16")

colors_map = {"Positive": COLOR_POS, "Neutral": COLOR_NEU, "Negative": COLOR_NEG}
pie_colors = [colors_map.get(l, COLOR_PURPLE) for l in sent_labels]

wedges, texts, autotexts = ax1.pie(
    sent_counts, labels=sent_labels, autopct='%1.1f%%',
    startangle=140, colors=pie_colors, textprops=dict(color="w", fontsize=12, weight="bold"),
    wedgeprops=dict(width=0.4, edgecolor="#090d16", linewidth=2)
)
for at in autotexts:
    at.set_color("#090d16")

ax1.set_title("Overall Sentiment Share (289,324 Posts)", color="w", fontsize=14, weight="bold", pad=15)

bars = ax2.bar(sent_labels, sent_counts, color=pie_colors, width=0.5, edgecolor="none")
ax2.set_title("Sentiment Post Volume Counts", color="w", fontsize=14, weight="bold", pad=15)
ax2.set_ylabel("Number of Social Posts", color="#94a3b8", fontsize=11)
ax2.tick_params(colors="#94a3b8")
for bar in bars:
    yval = bar.get_height()
    ax2.text(bar.get_x() + bar.get_width()/2.0, yval + 2000, f"{yval:,}", ha='center', va='bottom', color="w", fontsize=11, weight="bold")

plt.tight_layout()
sent_path = os.path.join(OUTPUT_DIR, "sentiment_distribution.png")
plt.savefig(sent_path, dpi=200, bbox_inches="tight", facecolor=fig.get_facecolor())
plt.close()
print("Saved sentiment distribution graph:", sent_path)


# 2. Source Dataset Distribution
cursor.execute("""
    SELECT src.source_name, COUNT(*) AS count
    FROM FACT_POST f
    JOIN DIM_SOURCE src ON f.source_key = src.source_key
    GROUP BY src.source_name
    ORDER BY count DESC;
""")
source_data = cursor.fetchall()
src_labels = [row[0] for row in source_data]
src_counts = [row[1] for row in source_data]

fig, ax = plt.subplots(figsize=(10, 5), facecolor="#090d16")
ax.set_facecolor("#090d16")
src_bars = ax.barh(src_labels, src_counts, color=[COLOR_NEU, COLOR_PURPLE, COLOR_AMBER], height=0.5)
ax.set_title("Data Warehouse Ingestion Volume by Dataset Source", color="w", fontsize=14, weight="bold", pad=15)
ax.set_xlabel("Total Fact Records", color="#94a3b8", fontsize=11)
ax.tick_params(colors="#94a3b8")
ax.invert_yaxis()

for bar in src_bars:
    xval = bar.get_width()
    ax.text(xval + 3000, bar.get_y() + bar.get_height()/2.0, f"{xval:,} posts", ha='left', va='center', color="w", fontsize=11, weight="bold")

plt.tight_layout()
src_path = os.path.join(OUTPUT_DIR, "source_distribution.png")
plt.savefig(src_path, dpi=200, bbox_inches="tight", facecolor=fig.get_facecolor())
plt.close()
print("Saved source distribution graph:", src_path)


# 3. Top Brands Mentioned & Sentiment Breakdown
cursor.execute("""
    SELECT b.brand_name, 
           SUM(CASE WHEN s.sentiment_label = 'Positive' THEN 1 ELSE 0 END) AS pos,
           SUM(CASE WHEN s.sentiment_label = 'Neutral' THEN 1 ELSE 0 END) AS neu,
           SUM(CASE WHEN s.sentiment_label = 'Negative' THEN 1 ELSE 0 END) AS neg
    FROM FACT_POST f
    JOIN DIM_BRAND b ON f.brand_key = b.brand_key
    JOIN DIM_SENTIMENT s ON f.sentiment_key = s.sentiment_key
    GROUP BY b.brand_name
    ORDER BY COUNT(*) DESC
    LIMIT 10;
""")
brand_data = cursor.fetchall()
brand_names = [row[0] for row in brand_data]
pos_counts = [row[1] for row in brand_data]
neu_counts = [row[2] for row in brand_data]
neg_counts = [row[3] for row in brand_data]

fig, ax = plt.subplots(figsize=(12, 6), facecolor="#090d16")
ax.set_facecolor("#090d16")

y_pos = np.arange(len(brand_names))
b1 = ax.barh(y_pos, pos_counts, color=COLOR_POS, label="Positive", height=0.55)
b2 = ax.barh(y_pos, neu_counts, left=pos_counts, color=COLOR_NEU, label="Neutral", height=0.55)
b3 = ax.barh(y_pos, neg_counts, left=np.array(pos_counts)+np.array(neu_counts), color=COLOR_NEG, label="Negative", height=0.55)

ax.set_yticks(y_pos)
ax.set_yticklabels(brand_names, color="w", fontsize=11, weight="bold")
ax.invert_yaxis()
ax.set_xlabel("Mention Volume", color="#94a3b8", fontsize=11)
ax.set_title("Top 10 Most Mentioned Brands — Sentiment Breakdown", color="w", fontsize=14, weight="bold", pad=15)
ax.tick_params(colors="#94a3b8")
ax.legend(loc="lower right", facecolor="#0f172a", edgecolor="#334155")

plt.tight_layout()
brand_path = os.path.join(OUTPUT_DIR, "brand_mentions_distribution.png")
plt.savefig(brand_path, dpi=200, bbox_inches="tight", facecolor=fig.get_facecolor())
plt.close()
print("Saved brand distribution graph:", brand_path)


# 4. Negative Reason Breakdown
cursor.execute("""
    SELECT r.reason, COUNT(*) AS count
    FROM FACT_POST f
    JOIN DIM_NEGATIVE_REASON r ON f.negative_reason_key = r.negative_reason_key
    WHERE r.reason != 'None' AND r.reason != 'Unknown'
    GROUP BY r.reason
    ORDER BY count DESC
    LIMIT 8;
""")
neg_data = cursor.fetchall()
neg_reasons = [row[0] for row in neg_data]
neg_counts = [row[1] for row in neg_data]

fig, ax = plt.subplots(figsize=(11, 5), facecolor="#090d16")
ax.set_facecolor("#090d16")

neg_bars = ax.barh(neg_reasons, neg_counts, color=COLOR_NEG, height=0.5)
ax.set_title("Top Categorized Negative Sentiment Drivers / Customer Complaints", color="w", fontsize=14, weight="bold", pad=15)
ax.set_xlabel("Complaint Count", color="#94a3b8", fontsize=11)
ax.tick_params(colors="#94a3b8")
ax.invert_yaxis()

for bar in neg_bars:
    xval = bar.get_width()
    ax.text(xval + 50, bar.get_y() + bar.get_height()/2.0, f"{xval:,}", ha='left', va='center', color="w", fontsize=10, weight="bold")

plt.tight_layout()
neg_path = os.path.join(OUTPUT_DIR, "negative_reasons_distribution.png")
plt.savefig(neg_path, dpi=200, bbox_inches="tight", facecolor=fig.get_facecolor())
plt.close()
print("Saved negative reasons graph:", neg_path)

conn.close()
