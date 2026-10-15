import os
import pandas as pd
from fastapi import APIRouter, Query
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="/api/association-rules", tags=["Association Rules"])

CSV_PATH = "hashtag_association_rules_bigtech.csv"

def load_rules_data() -> pd.DataFrame:
    if not os.path.exists(CSV_PATH):
        raise FileNotFoundError(f"Association rules file not found at {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    # Strip whitespace from string columns
    df["antecedents"] = df["antecedents"].astype(str).str.strip()
    df["consequents"] = df["consequents"].astype(str).str.strip()
    return df

@router.get("")
def get_association_rules(
    search: Optional[str] = Query(None, description="Search term in antecedents or consequents"),
    min_support: float = Query(0.0, ge=0.0, le=1.0),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    min_lift: float = Query(0.0, ge=0.0),
    sort_by: str = Query("lift", pattern="^(lift|confidence|support)$"),
    order: str = Query("desc", pattern="^(desc|asc)$"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
) -> Dict[str, Any]:
    """
    Returns mined hashtag and keyword co-occurrence association rules
    from the BigTech dataset with support, confidence, and lift metrics,
    interactive filters, summary statistics, and network graph data.
    """
    df = load_rules_data()
    total_count = len(df)

    # Calculate overall summary metrics
    summary = {
        "total_rules": total_count,
        "avg_support": round(float(df["support"].mean()), 4),
        "avg_confidence": round(float(df["confidence"].mean()), 4),
        "avg_lift": round(float(df["lift"].mean()), 4),
        "max_lift": round(float(df["lift"].max()), 4),
        "max_confidence": round(float(df["confidence"].max()), 4),
        "top_consequents": df["consequents"].value_counts().head(5).to_dict(),
        "top_antecedents": df["antecedents"].value_counts().head(5).to_dict()
    }

    # Filtering
    filtered = df.copy()
    if search:
        s = search.lower().strip()
        filtered = filtered[
            filtered["antecedents"].str.lower().str.contains(s) |
            filtered["consequents"].str.lower().str.contains(s)
        ]

    filtered = filtered[
        (filtered["support"] >= min_support) &
        (filtered["confidence"] >= min_confidence) &
        (filtered["lift"] >= min_lift)
    ]

    # Sorting
    ascending = (order == "asc")
    filtered = filtered.sort_values(by=sort_by, ascending=ascending)

    filtered_count = len(filtered)
    paged = filtered.iloc[offset : offset + limit]

    rules_list = []
    for idx, row in paged.iterrows():
        ant_raw = row["antecedents"]
        con_raw = row["consequents"]
        ant_tokens = [t.strip() for t in ant_raw.split(",") if t.strip()]
        con_tokens = [t.strip() for t in con_raw.split(",") if t.strip()]

        rules_list.append({
            "id": int(idx),
            "antecedents": ant_tokens,
            "consequents": con_tokens,
            "antecedents_str": ant_raw,
            "consequents_str": con_raw,
            "support": round(float(row["support"]), 4),
            "support_pct": round(float(row["support"]) * 100, 2),
            "confidence": round(float(row["confidence"]), 4),
            "confidence_pct": round(float(row["confidence"]) * 100, 1),
            "lift": round(float(row["lift"]), 2),
        })

    # Generate co-occurrence network graph nodes and links (top 30 highest lift rules)
    top_network_rules = df.sort_values(by="lift", ascending=False).head(35)
    nodes_set = set()
    edges = []

    for _, r in top_network_rules.iterrows():
        source = r["antecedents"].split(",")[0].strip()
        target = r["consequents"].split(",")[0].strip()
        nodes_set.add(source)
        nodes_set.add(target)
        edges.append({
            "source": source,
            "target": target,
            "weight": round(float(r["lift"]), 2),
            "confidence": round(float(r["confidence"]), 3),
            "support": round(float(r["support"]), 4),
        })

    nodes = [{"id": n, "label": f"#{n}"} for n in sorted(list(nodes_set))]

    # Curated insights from the association rules
    insights = [
        {
            "category": "E-Commerce Deals & Retail Synergy",
            "title": "Deal Affinity & Ganga Promo Surge",
            "rule": "{deals, ganga} \u2192 {deal}",
            "lift": 42.26,
            "confidence": 100.0,
            "description": "Spanish and international promotional hashtag co-occurrences cluster heavily around Amazon retail deals with 100% conditional probability."
        },
        {
            "category": "Cloud Computing Infrastructure",
            "title": "AWS and Azure Ecosystem Lock-In",
            "rule": "{aws} \u2192 {cloud} / {azure} \u2192 {microsoft}",
            "lift": 24.65,
            "confidence": 88.4,
            "description": "Direct enterprise binding: AWS is 24.6x more likely to co-occur with Cloud, while Azure displays 88.4% confidence linking directly to Microsoft."
        },
        {
            "category": "Media Streaming Convergence",
            "title": "Multi-Platform Entertainment Synergy",
            "rule": "{amazon, disney} \u2192 {netflix}",
            "lift": 19.87,
            "confidence": 98.6,
            "description": "Users discussing Disney+ and Amazon Prime co-mention Netflix in 98.6% of instances, showing strong cross-streaming industry comparisons."
        },
        {
            "category": "Gaming & Live Streaming Community",
            "title": "Dominant Twitch Creator Ecosystem",
            "rule": "{twitchstreamer} \u2192 {twitch}",
            "lift": 3.14,
            "confidence": 97.2,
            "description": "Highest total support in the dataset (7.52% of all posts) with 97.2% confidence linking streamers directly to the Twitch platform."
        }
    ]

    return {
        "summary": summary,
        "rules": rules_list,
        "total_rules": total_count,
        "filtered_rules_count": filtered_count,
        "page_limit": limit,
        "page_offset": offset,
        "network": {
            "nodes": nodes,
            "links": edges
        },
        "insights": insights
    }
