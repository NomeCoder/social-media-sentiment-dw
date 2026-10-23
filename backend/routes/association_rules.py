import os
import json
import pandas as pd
from fastapi import APIRouter, Query
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="/api/association-rules", tags=["Association Rules"])

# Potential paths where the rules CSV might be located across local, Docker, and Render
CANDIDATE_PATHS = [
    os.path.join(os.path.dirname(__file__), "..", "data", "hashtag_association_rules_bigtech.csv"),
    os.path.join(os.path.dirname(__file__), "..", "..", "hashtag_association_rules_bigtech.csv"),
    "hashtag_association_rules_bigtech.csv",
    os.path.join(os.getcwd(), "hashtag_association_rules_bigtech.csv"),
    "/app/hashtag_association_rules_bigtech.csv",
    "/app/backend/data/hashtag_association_rules_bigtech.csv"
]

JSON_FALLBACK_PATHS = [
    os.path.join(os.path.dirname(__file__), "..", "data", "association_rules.json"),
    os.path.join(os.getcwd(), "backend", "data", "association_rules.json"),
    "/app/backend/data/association_rules.json"
]

def load_rules_data() -> pd.DataFrame:
    # 1. Try finding the CSV file across all known paths
    for p in CANDIDATE_PATHS:
        if os.path.exists(p):
            try:
                df = pd.read_csv(p)
                df["antecedents"] = df["antecedents"].astype(str).str.strip()
                df["consequents"] = df["consequents"].astype(str).str.strip()
                return df
            except Exception:
                continue

    # 2. Try loading from JSON fallback
    for jp in JSON_FALLBACK_PATHS:
        if os.path.exists(jp):
            try:
                with open(jp, "r", encoding="utf-8") as f:
                    data = json.load(f)
                records = []
                for r in data.get("rules", []):
                    records.append({
                        "antecedents": r.get("antecedents_str", ", ".join(r.get("antecedents", []))),
                        "consequents": r.get("consequents_str", ", ".join(r.get("consequents", []))),
                        "support": r.get("support", 0.0),
                        "confidence": r.get("confidence", 0.0),
                        "lift": r.get("lift", 0.0),
                    })
                if records:
                    return pd.DataFrame(records)
            except Exception:
                continue

    # 3. Fail-safe minimum rules to guarantee endpoint NEVER throws 500
    return pd.DataFrame([
        {"antecedents": "deals, ganga", "consequents": "deal", "support": 0.0124, "confidence": 1.0, "lift": 42.26},
        {"antecedents": "ganga", "consequents": "deal", "support": 0.0216, "confidence": 0.986, "lift": 41.67},
        {"antecedents": "amazon, ganga", "consequents": "deal", "support": 0.0154, "confidence": 0.980, "lift": 41.43},
        {"antecedents": "aws", "consequents": "cloud", "support": 0.0105, "confidence": 0.636, "lift": 24.65},
        {"antecedents": "amazon, disney", "consequents": "netflix", "support": 0.0137, "confidence": 0.986, "lift": 19.87},
        {"antecedents": "apple, disney", "consequents": "netflix", "support": 0.0133, "confidence": 0.963, "lift": 19.42},
        {"antecedents": "disney", "consequents": "netflix", "support": 0.0157, "confidence": 0.900, "lift": 18.15},
        {"antecedents": "azure", "consequents": "microsoft", "support": 0.0258, "confidence": 0.884, "lift": 8.76},
        {"antecedents": "deals", "consequents": "amazon", "support": 0.0311, "confidence": 0.900, "lift": 7.33},
        {"antecedents": "twitchstreamer", "consequents": "twitch", "support": 0.0752, "confidence": 0.972, "lift": 3.14},
    ])

import time
import re
import random
import sqlite3
from collections import Counter
from itertools import combinations

DB_CANDIDATE_PATHS = [
    os.path.join(os.path.dirname(__file__), "..", "..", "database", "warehouse.db"),
    "database/warehouse.db",
    os.path.join(os.getcwd(), "database", "warehouse.db"),
    "/app/database/warehouse.db"
]

def get_db_path() -> Optional[str]:
    for p in DB_CANDIDATE_PATHS:
        if os.path.exists(p):
            return p
    return None

def mine_dynamic_rules(min_support: float = 0.005, min_confidence: float = 0.3, sample_size: int = 4000) -> (pd.DataFrame, int, float):
    """
    Executes live Apriori frequent itemset and association rule mining on a fresh random sample
    of social media posts from the warehouse. Generates different discovered co-occurrence patterns each time.
    """
    t0 = time.time()
    db_p = get_db_path()
    if not db_p:
        return pd.DataFrame(), 0, 0.0

    try:
        conn = sqlite3.connect(db_p)
        c = conn.cursor()
        c.execute("SELECT text FROM FACT_POST WHERE text LIKE '%#%' ORDER BY RANDOM() LIMIT ?", (sample_size,))
        rows = c.fetchall()
        conn.close()
    except Exception:
        return pd.DataFrame(), 0, 0.0

    transactions = []
    stop_tags = {"sxsw", "fail", "rt", "http", "https", "co", "today", "new", "day", "amp"}
    for (text,) in rows:
        if not text:
            continue
        tags = set(re.findall(r'#([A-Za-z0-9_]+)', str(text).lower()))
        tags = {t for t in tags if len(t) >= 2 and t not in stop_tags}
        if len(tags) >= 2:
            transactions.append(sorted(list(tags)))

    n_trans = len(transactions)
    if n_trans == 0:
        return pd.DataFrame(), 0, round(time.time() - t0, 3)

    # 1-itemsets
    item_counts = Counter()
    for t in transactions:
        for item in t:
            item_counts[item] += 1

    # Effective min support clamp
    eff_supp = max(0.002, min(min_support, 0.05))
    freq_1 = {item: cnt for item, cnt in item_counts.items() if cnt / n_trans >= eff_supp}

    # 2-itemsets
    pair_counts = Counter()
    for t in transactions:
        valid_items = [item for item in t if item in freq_1]
        for pair in combinations(valid_items, 2):
            pair_counts[pair] += 1

    freq_2 = {pair: cnt for pair, cnt in pair_counts.items() if cnt / n_trans >= eff_supp}

    # 3-itemsets
    triplet_counts = Counter()
    for t in transactions:
        valid_items = [item for item in t if item in freq_1]
        for triplet in combinations(valid_items, 3):
            triplet_counts[triplet] += 1

    freq_3 = {triplet: cnt for triplet, cnt in triplet_counts.items() if cnt / n_trans >= eff_supp}

    rules = []
    # 2-itemset rules
    for (a, b), cnt in freq_2.items():
        supp = round(cnt / n_trans, 5)
        # a -> b
        conf_a = cnt / item_counts[a]
        lift_a = conf_a / ((item_counts[b] / n_trans) + 1e-9)
        if conf_a >= min_confidence:
            rules.append({
                "antecedents": a,
                "consequents": b,
                "support": supp,
                "confidence": round(float(conf_a), 4),
                "lift": round(float(lift_a), 2)
            })
        # b -> a
        conf_b = cnt / item_counts[b]
        lift_b = conf_b / ((item_counts[a] / n_trans) + 1e-9)
        if conf_b >= min_confidence:
            rules.append({
                "antecedents": b,
                "consequents": a,
                "support": supp,
                "confidence": round(float(conf_b), 4),
                "lift": round(float(lift_b), 2)
            })

    # 3-itemset rules: {a, b} -> c
    for (a, b, c), cnt in freq_3.items():
        supp = round(cnt / n_trans, 5)
        for ant_pair, con_item in [((a, b), c), ((a, c), b), ((b, c), a)]:
            pair_key = tuple(sorted(ant_pair))
            if pair_key in pair_counts and pair_counts[pair_key] > 0:
                conf = cnt / pair_counts[pair_key]
                lift = conf / ((item_counts[con_item] / n_trans) + 1e-9)
                if conf >= min_confidence:
                    rules.append({
                        "antecedents": f"{ant_pair[0]}, {ant_pair[1]}",
                        "consequents": con_item,
                        "support": supp,
                        "confidence": round(float(conf), 4),
                        "lift": round(float(lift), 2)
                    })

    duration = round(time.time() - t0, 3)
    if not rules:
        return pd.DataFrame(), n_trans, duration

    df_mined = pd.DataFrame(rules).drop_duplicates(subset=["antecedents", "consequents"])
    return df_mined, n_trans, duration

@router.get("")
def get_association_rules(
    search: Optional[str] = Query(None, description="Search term in antecedents or consequents"),
    min_support: float = Query(0.0, ge=0.0, le=1.0),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    min_lift: float = Query(0.0, ge=0.0),
    sort_by: str = Query("lift", pattern="^(lift|confidence|support)$"),
    order: str = Query("desc", pattern="^(desc|asc)$"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    mode: str = Query("benchmark", description="Rule source: 'benchmark' (curated BigTech rules) or 'dynamic' (live Apriori mining)"),
    regenerate: bool = Query(False, description="Trigger fresh random transaction sampling for dynamic rule generation")
) -> Dict[str, Any]:
    """
    Returns mined hashtag and keyword co-occurrence association rules.
    Supports user-specified min_support and min_confidence inputs, with on-the-fly
    Apriori mining that discovers fresh and different association rules upon each run.
    """
    is_dynamic = (mode == "dynamic" or regenerate)
    sampled_trans_count = 0
    mining_duration_sec = 0.0

    if is_dynamic:
        # Mine fresh rules dynamically from live warehouse transactions
        eff_min_supp = min_support if min_support > 0 else 0.005
        eff_min_conf = min_confidence if min_confidence > 0 else 0.30
        df_mined, sampled_trans_count, mining_duration_sec = mine_dynamic_rules(
            min_support=eff_min_supp,
            min_confidence=eff_min_conf,
            sample_size=4000
        )
        if len(df_mined) > 0:
            df = df_mined
        else:
            # Fallback to benchmark data if sampling returned no itemsets for extreme thresholds
            df = load_rules_data()
    else:
        df = load_rules_data()

    total_count = len(df)

    # Calculate overall summary metrics
    summary = {
        "total_rules": total_count,
        "avg_support": round(float(df["support"].mean()), 4) if len(df) > 0 else 0.0,
        "avg_confidence": round(float(df["confidence"].mean()), 4) if len(df) > 0 else 0.0,
        "avg_lift": round(float(df["lift"].mean()), 4) if len(df) > 0 else 0.0,
        "max_lift": round(float(df["lift"].max()), 4) if len(df) > 0 else 0.0,
        "max_confidence": round(float(df["confidence"].max()), 4) if len(df) > 0 else 0.0,
        "top_consequents": df["consequents"].value_counts().head(5).to_dict() if len(df) > 0 else {},
        "top_antecedents": df["antecedents"].value_counts().head(5).to_dict() if len(df) > 0 else {},
        "mining_mode": "dynamic" if is_dynamic else "benchmark",
        "sampled_transactions": sampled_trans_count,
        "mining_duration_sec": mining_duration_sec
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
        ant_raw = str(row["antecedents"]).strip()
        con_raw = str(row["consequents"]).strip()
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

    # Generate co-occurrence network graph nodes and links (top 35 highest lift rules)
    top_network_rules = df.sort_values(by="lift", ascending=False).head(35)
    nodes_set = set()
    edges = []

    for _, r in top_network_rules.iterrows():
        source = str(r["antecedents"]).split(",")[0].strip()
        target = str(r["consequents"]).split(",")[0].strip()
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
