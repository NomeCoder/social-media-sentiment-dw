"use client";

import React, { useState, useEffect } from "react";
import { 
  Network, Sparkles, Tag, PieChart as PieIcon, BarChart2, 
  Send, RefreshCw, Layers, CheckCircle2, ArrowRight, MessageSquare,
  Sliders, Activity, Info, Zap, ChevronRight, HelpCircle
} from "lucide-react";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, ReferenceLine, ReferenceDot 
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fetchTopicClusters, predictPostTopic } from "@/lib/api";

const SAMPLE_POSTS = [
  "Watching the entire new season of Stranger Things on Netflix tonight, totally obsessed!",
  "Going live on Twitch tonight with Apex Legends and Destiny 2 raid, come say hi to the stream!",
  "Excited for the new iPhone and iOS features launched at Apple event.",
  "Check out this huge Amazon Prime flash deal on kindle books and electronics!",
  "Flight was delayed 4 hours at the gate and now bags are lost, terrible customer experience.",
  "Deploying our enterprise backend microservices to Microsoft Azure cloud infrastructure."
];

export default function TopicClustering() {
  const [data, setData] = useState(null);
  const [selectedK, setSelectedK] = useState(6);
  const [selectedClusterId, setSelectedClusterId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showElbowCard, setShowElbowCard] = useState(true);
  
  // Live inference state
  const [customText, setCustomText] = useState("");
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    loadAllClusters();
  }, []);

  const loadAllClusters = async () => {
    setLoading(true);
    try {
      const res = await fetchTopicClusters();
      setData(res);
      const defaultK = res.default_k || 6;
      setSelectedK(defaultK);
      const kStr = String(defaultK);
      const currentList = res.k_clusters?.[kStr] || res.clusters || [];
      if (currentList.length > 0) {
        setSelectedClusterId(currentList[0].cluster_id);
      }
    } catch (err) {
      console.error("Failed to load topic clusters:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle changing k (from pills, slider, or elbow chart click)
  const handleSelectK = (newK) => {
    const kNum = Math.max(1, Math.min(10, parseInt(newK, 10)));
    setSelectedK(kNum);
    
    // Reset selected cluster to the first one of this k
    const kStr = String(kNum);
    const clustersForK = data?.k_clusters?.[kStr] || [];
    if (clustersForK.length > 0) {
      setSelectedClusterId(clustersForK[0].cluster_id);
    } else {
      setSelectedClusterId(0);
    }
    
    // Clear previous prediction when k changes so user re-tests with new centroids
    setPrediction(null);
  };

  const handlePredictTopic = async (textToPredict = customText) => {
    const text = textToPredict || customText;
    if (!text.trim()) return;
    setPredicting(true);
    try {
      const res = await predictPostTopic(text, selectedK);
      setPrediction(res);
    } catch (err) {
      console.error("Failed to predict post topic:", err);
    } finally {
      setPredicting(false);
    }
  };

  const selectSample = (sample) => {
    setCustomText(sample);
    handlePredictTopic(sample);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-sky-400" />
          <p className="text-sm text-slate-400">Loading unsupervised topic clusters & elbow optimization...</p>
        </div>
      </div>
    );
  }

  // Active clusters for the chosen k
  const kStr = String(selectedK);
  const clusters = data?.k_clusters?.[kStr] || (selectedK === 6 ? data?.clusters : []) || [];
  const activeCluster = clusters.find((c) => c.cluster_id === selectedClusterId) || clusters[0];
  const elbowCurve = data?.elbow_curve || [];
  const currentInertiaObj = elbowCurve.find((item) => item.k === selectedK) || { inertia: 24717.3, pct_inertia_reduction: 0.2 };

  // Format data for cluster volume & sentiment bar chart
  const chartData = clusters.map((c) => ({
    name: c.name.length > 18 ? c.name.substring(0, 16) + "..." : c.name,
    fullName: c.name,
    count: c.count,
    share: c.share_pct,
    positive: c.sentiment_distribution?.positive || 0,
    negative: c.sentiment_distribution?.negative || 0,
    neutral: c.sentiment_distribution?.neutral || 0,
    color: c.color || "#0ea5e9"
  }));

  // Cohesion interpretation
  const getCohesionLevel = (k) => {
    if (k <= 2) return { label: "High-level Macro Themes", color: "text-amber-400", desc: "Aggregated domain groupings with broad lexical coverage." };
    if (k <= 5) return { label: "Balanced Categorization", color: "text-sky-400", desc: "Clean separation of primary brand and industry topics." };
    if (k <= 7) return { label: "Optimal Semantic Nuance (Elbow Point)", color: "text-emerald-400", desc: "Maximum separation between tech, gaming, flights, streaming & retail." };
    return { label: "Fine-Grained Micro Clusters", color: "text-purple-400", desc: "Specialized sub-topics with niche vocabulary & specific incidents." };
  };

  const cohesion = getCohesionLevel(selectedK);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-purple-950/40 via-slate-900 to-sky-950/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-purple-500/40 bg-purple-500/10 text-purple-300">
                <Network className="mr-1.5 h-3.5 w-3.5" /> Unsupervised NLP Discovery
              </Badge>
              <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-300">
                MiniBatchKMeans (k={selectedK}) + Sublinear TF-IDF
              </Badge>
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                Interactive k &in; [1, 10]
              </Badge>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Topic Clustering & Semantic Categorization
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Unsupervised clustering partitions 289,000+ social media posts into natural conversational topics.
              Adjust <strong className="text-sky-300">k (1 to 10)</strong> below to dynamically inspect topic fragmentation,
              centroid keywords, and sentiment variance across granularities.
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 rounded-xl border border-white/10 bg-slate-950/60 p-4 sm:items-end">
            <span className="text-xs text-slate-400">Sample Ingestion Corpus</span>
            <span className="text-xl font-bold text-sky-400">
              {data?.total_posts_sampled?.toLocaleString() || "24,981"} Posts
            </span>
            <span className="text-[11px] text-slate-500">Stratified across BigTech & Airlines</span>
          </div>
        </div>
      </div>

      {/* Interactive k Selector Deck */}
      <Card className="border-sky-500/30 bg-slate-900/90 shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Sliders className="h-5 w-5 text-sky-400" />
                Interactive Cluster Count Selector (k = 1 to 10)
              </CardTitle>
              <CardDescription>
                Select or drag k to instantly inspect how KMeans partitions social conversations into semantic clusters
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs">
                <span className="text-slate-400">Active k:</span>
                <span className="font-mono text-base font-bold text-sky-400">{selectedK}</span>
                <span className="text-slate-500">/ 10</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowElbowCard(!showElbowCard)}
                className="border-white/10 text-xs text-slate-300 hover:text-white"
              >
                <Activity className="mr-1.5 h-3.5 w-3.5 text-purple-400" />
                {showElbowCard ? "Hide Elbow Curve" : "Show Elbow Curve"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick Pill Buttons 1 to 10 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Quick Select k:</span>
              <span className="text-[11px] text-slate-500">Click any value to re-cluster</span>
            </div>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((kVal) => {
                const isActive = selectedK === kVal;
                const isOptimal = kVal === 6;
                return (
                  <button
                    key={kVal}
                    onClick={() => handleSelectK(kVal)}
                    className={`relative flex flex-col items-center justify-center rounded-xl border p-2.5 transition-all ${
                      isActive
                        ? "border-sky-400 bg-sky-500/20 text-white shadow-lg shadow-sky-500/20 ring-2 ring-sky-400"
                        : "border-white/10 bg-slate-950/70 text-slate-300 hover:border-white/20 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <span className="text-sm font-bold font-mono">k = {kVal}</span>
                    {isOptimal && (
                      <span className="mt-1 rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-semibold text-emerald-400 border border-emerald-500/30">
                        Elbow
                      </span>
                    )}
                    {!isOptimal && (
                      <span className="mt-1 text-[10px] text-slate-500 font-mono">
                        {kVal === 1 ? "Macro" : kVal === 10 ? "Micro" : `${kVal} topics`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Range Slider */}
          <div className="space-y-2 rounded-xl border border-white/5 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Fine-grain Cluster Count Slider</span>
              <span className="font-mono text-xs font-bold text-sky-400">k = {selectedK} Clusters</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={selectedK}
              onChange={(e) => handleSelectK(e.target.value)}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-sky-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>k=1 (Unified Corpus)</span>
              <span className="text-emerald-400 font-semibold">k=6 (Recommended Optimal)</span>
              <span>k=10 (Granular Sub-themes)</span>
            </div>
          </div>

          {/* Cluster Summary Metrics */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/5 bg-slate-950/50 p-3">
              <span className="text-xs text-slate-400">Current Granularity</span>
              <div className={`mt-1 text-sm font-bold ${cohesion.color}`}>{cohesion.label}</div>
              <p className="mt-0.5 text-[11px] text-slate-500">{cohesion.desc}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-950/50 p-3">
              <span className="text-xs text-slate-400">WCSS Inertia (Compactness)</span>
              <div className="mt-1 font-mono text-sm font-bold text-white">
                {currentInertiaObj.inertia?.toLocaleString()}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">Within-Cluster Sum of Squares</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-950/50 p-3">
              <span className="text-xs text-slate-400">Optimal Heuristic</span>
              <div className="mt-1 text-sm font-bold text-sky-300">
                {selectedK === 6 ? "✓ Operating at Elbow Optimal (k=6)" : `k=${selectedK} (Optimal is k=6)`}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">Balances cluster cohesion & parsimony</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Elbow Method Optimization Curve Chart */}
      {showElbowCard && (
        <Card className="border-purple-500/20 bg-slate-900/90 shadow-xl">
          <CardHeader>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg text-white">
                  <Activity className="h-5 w-5 text-purple-400" />
                  K-Means Elbow Method Optimization Curve (k = 1 to 10)
                </CardTitle>
                <CardDescription>
                  Inertia (Within-Cluster Sum of Squares) across k=1 to 10. Click any node to set k directly.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-xs">
                Selected Point: k = {selectedK}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={elbowCurve} 
                  margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                  onClick={(e) => {
                    if (e && e.activePayload && e.activePayload[0]) {
                      handleSelectK(e.activePayload[0].payload.k);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis 
                    dataKey="k" 
                    stroke="#94a3b8" 
                    label={{ value: "Cluster Count (k)", position: "insideBottom", offset: -10, fill: "#94a3b8", fontSize: 12 }} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    domain={['dataMin - 200', 'dataMax + 200']}
                    tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                    label={{ value: "WCSS Inertia", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 12 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const pt = payload[0].payload;
                        const isCur = pt.k === selectedK;
                        return (
                          <div className="rounded-lg border border-purple-500/40 bg-slate-900 p-3 shadow-xl text-xs space-y-1">
                            <p className="font-bold text-white">k = {pt.k} Clusters {pt.k === 6 ? "(Elbow Optimal)" : ""}</p>
                            <p className="text-purple-300">Inertia: <strong className="text-white">{pt.inertia.toLocaleString()}</strong></p>
                            <p className="text-slate-400">Reduction vs k=1: <span className="text-emerald-400">{pt.pct_inertia_reduction}%</span></p>
                            {isCur && <p className="text-sky-400 font-semibold">● Currently Active in Dashboard</p>}
                            <p className="text-[10px] text-slate-500 mt-1 italic">Click to switch dashboard to k={pt.k}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine x={selectedK} stroke="#38bdf8" strokeDasharray="4 4" label={{ value: `Active k=${selectedK}`, fill: "#38bdf8", fontSize: 11, position: "top" }} />
                  <ReferenceLine x={6} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Optimal k=6", fill: "#10b981", fontSize: 11, position: "bottom" }} />
                  <Line 
                    type="monotone" 
                    dataKey="inertia" 
                    stroke="#a855f7" 
                    strokeWidth={3} 
                    dot={{ fill: "#a855f7", r: 5 }} 
                    activeDot={{ r: 8, fill: "#38bdf8" }} 
                  />
                  <ReferenceDot x={selectedK} y={currentInertiaObj.inertia} r={7} fill="#38bdf8" stroke="#ffffff" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 text-xs text-slate-400 flex items-start gap-2">
              <Info className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
              <span>
                <strong>Methodology:</strong> The Elbow method fits KMeans for each candidate $k$ and tracks intra-cluster variance (WCSS).
                At $k=6$, the reduction curve plateaus into diminishing returns, establishing $k=6$ as the optimal trade-off between clustering cohesion and computational parsimony.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cluster Cards Grid for Chosen k */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-sky-400" />
            Generated Topic Clusters for k = {selectedK}
          </h3>
          <span className="text-xs text-slate-400">
            Showing {clusters.length} clusters &middot; Click any card for detailed deep-dive
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clusters.map((c) => {
            const isSelected = c.cluster_id === selectedClusterId;
            return (
              <div
                key={c.cluster_id}
                onClick={() => setSelectedClusterId(c.cluster_id)}
                className={`group cursor-pointer rounded-xl border p-5 transition-all ${
                  isSelected
                    ? "border-sky-400/60 bg-slate-900 shadow-lg shadow-sky-500/10 ring-2 ring-sky-400/40"
                    : "border-white/10 bg-slate-900/60 hover:border-white/20 hover:bg-slate-900/90"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: c.color || "#38bdf8" }}
                    />
                    <Badge variant="outline" className="border-white/10 text-[11px] text-slate-300">
                      Cluster #{c.cluster_id} &middot; {c.category}
                    </Badge>
                  </div>
                  <span className="font-mono text-xs font-bold text-sky-400">
                    {c.share_pct}% share
                  </span>
                </div>

                <h3 className="mt-3 text-base font-bold text-slate-100 group-hover:text-white line-clamp-1">
                  {c.name}
                </h3>
                
                <p className="mt-1 text-xs text-slate-400">
                  {c.count?.toLocaleString()} posts &middot; Avg Sentiment:{" "}
                  <span className={`font-semibold ${c.avg_sentiment_score > 0 ? "text-emerald-400" : c.avg_sentiment_score < 0 ? "text-rose-400" : "text-slate-300"}`}>
                    {c.avg_sentiment_score > 0 ? `+${c.avg_sentiment_score}` : c.avg_sentiment_score}
                  </span>
                </p>

                {/* Keyword chips */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.top_terms?.slice(0, 5).map((term) => (
                    <span
                      key={term}
                      className="rounded-md border border-white/5 bg-slate-950/80 px-2 py-0.5 text-[11px] text-slate-300"
                    >
                      #{term}
                    </span>
                  ))}
                </div>

                {/* Sentiment mini bar */}
                <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-slate-950">
                  <div
                    style={{ width: `${c.sentiment_distribution?.positive || 0}%` }}
                    className="bg-emerald-500 transition-all"
                    title={`Positive: ${c.sentiment_distribution?.positive}%`}
                  />
                  <div
                    style={{ width: `${c.sentiment_distribution?.neutral || 0}%` }}
                    className="bg-sky-500 transition-all"
                    title={`Neutral: ${c.sentiment_distribution?.neutral}%`}
                  />
                  <div
                    style={{ width: `${c.sentiment_distribution?.negative || 0}%` }}
                    className="bg-rose-500 transition-all"
                    title={`Negative: ${c.sentiment_distribution?.negative}%`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Cluster Deep-Dive */}
      {activeCluster && (
        <Card className="border-sky-500/20 bg-slate-900/90 shadow-xl">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md"
                style={{ backgroundColor: `${activeCluster.color || '#38bdf8'}33`, borderColor: activeCluster.color }}
              >
                <Layers className="h-5 w-5" style={{ color: activeCluster.color || '#38bdf8' }} />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">
                  Cluster Deep-Dive: {activeCluster.name}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {activeCluster.category} &middot; {activeCluster.count?.toLocaleString()} analyzed posts ({activeCluster.share_pct}% total volume under k={selectedK})
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                Pos: {activeCluster.sentiment_distribution?.positive}%
              </Badge>
              <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-300">
                Neu: {activeCluster.sentiment_distribution?.neutral}%
              </Badge>
              <Badge className="border-rose-500/30 bg-rose-500/10 text-rose-300">
                Neg: {activeCluster.sentiment_distribution?.negative}%
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Top Keywords / Centroid tokens */}
              <div className="space-y-3 rounded-xl border border-white/5 bg-slate-950/60 p-4">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <Tag className="h-3.5 w-3.5 text-sky-400" /> Top TF-IDF Centroid Terms
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeCluster.top_terms?.map((term, i) => (
                    <span
                      key={term}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1 text-xs text-slate-200"
                    >
                      <span className="font-mono text-[10px] text-sky-400">#{i + 1}</span>
                      {term}
                    </span>
                  ))}
                </div>
              </div>

              {/* Dominant Brands in this topic */}
              <div className="space-y-3 rounded-xl border border-white/5 bg-slate-950/60 p-4">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <BarChart2 className="h-3.5 w-3.5 text-purple-400" /> Leading Brand Mentions
                </h4>
                <div className="space-y-2">
                  {activeCluster.top_brands &&
                    Object.entries(activeCluster.top_brands).map(([brand, count]) => {
                      const pct = activeCluster.count > 0 ? ((count / activeCluster.count) * 100).toFixed(1) : 0;
                      return (
                        <div key={brand} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-slate-200">{brand}</span>
                            <span className="text-slate-400">{count.toLocaleString()} ({pct}%)</span>
                          </div>
                          <Progress value={parseFloat(pct)} indicatorClassName="bg-purple-500" />
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Sentiment Breakdown */}
              <div className="space-y-3 rounded-xl border border-white/5 bg-slate-950/60 p-4">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <PieIcon className="h-3.5 w-3.5 text-emerald-400" /> Topic Sentiment Distribution
                </h4>
                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-emerald-400">Positive Sentiment</span>
                      <span className="font-bold text-white">{activeCluster.sentiment_distribution?.positive}%</span>
                    </div>
                    <Progress value={activeCluster.sentiment_distribution?.positive} indicatorClassName="bg-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-sky-400">Neutral Sentiment</span>
                      <span className="font-bold text-white">{activeCluster.sentiment_distribution?.neutral}%</span>
                    </div>
                    <Progress value={activeCluster.sentiment_distribution?.neutral} indicatorClassName="bg-sky-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-rose-400">Negative Sentiment</span>
                      <span className="font-bold text-white">{activeCluster.sentiment_distribution?.negative}%</span>
                    </div>
                    <Progress value={activeCluster.sentiment_distribution?.negative} indicatorClassName="bg-rose-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Representative Posts */}
            {activeCluster.sample_posts && activeCluster.sample_posts.length > 0 && (
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <MessageSquare className="h-3.5 w-3.5 text-sky-400" /> Representative Posts from this Topic Cluster
                </h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {activeCluster.sample_posts.map((post, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col justify-between rounded-xl border border-white/5 bg-slate-950/70 p-4"
                    >
                      <p className="text-xs leading-relaxed text-slate-300 italic">
                        "{post.text}"
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[11px]">
                        <span className="font-semibold text-sky-400">{post.brand_name}</span>
                        <Badge
                          variant={post.sentiment_label === "Positive" ? "positive" : post.sentiment_label === "Negative" ? "negative" : "neutral"}
                          className="text-[10px]"
                        >
                          {post.sentiment_label}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cross-Topic Volume & Sentiment Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart2 className="h-5 w-5 text-sky-400" />
            Topic Volume & Sentiment Comparison Across {selectedK} Clusters
          </CardTitle>
          <CardDescription>
            Comparative post distribution and positive vs negative proportion for current k={selectedK}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-white/10 bg-slate-900 p-3 shadow-xl text-xs">
                          <p className="font-bold text-white">{item.fullName}</p>
                          <p className="text-sky-400 mt-1">Posts: {item.count.toLocaleString()} ({item.share}%)</p>
                          <p className="text-emerald-400 mt-1">Positive: {item.positive}%</p>
                          <p className="text-slate-400">Neutral: {item.neutral}%</p>
                          <p className="text-rose-400">Negative: {item.negative}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Live Topic Classifier Playground */}
      <Card className="border-purple-500/30 bg-slate-900/80">
        <CardHeader>
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl text-white">
                <Sparkles className="h-5 w-5 text-purple-400" />
                Live Post Topic Predictor (Using k = {selectedK})
              </CardTitle>
              <CardDescription>
                Test real-time topic classification on custom text using cosine similarity against the {selectedK} cluster centroids
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-purple-500/40 text-purple-300">
                Inference: k = {selectedK} Centroids
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Quick Test:</span>
            {SAMPLE_POSTS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => selectSample(sample)}
                className="rounded-md border border-white/10 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:border-white/20 hover:text-white"
              >
                Sample {idx + 1}
              </button>
            ))}
          </div>

          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={`Type or paste any tweet or social post to predict which of the ${selectedK} topic clusters it belongs to...`}
            className="h-24 w-full rounded-xl border border-white/10 bg-slate-950 p-4 text-sm text-slate-100 outline-none transition-colors focus:border-purple-500/50"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Matches against 8,000 sublinear TF-IDF features across {selectedK} topic centroids.
            </span>
            <Button
              onClick={() => handlePredictTopic()}
              disabled={predicting || !customText.trim()}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              <Send className="mr-2 h-4 w-4" />
              {predicting ? `Classifying against k=${selectedK}...` : `Classify Post (k=${selectedK})`}
            </Button>
          </div>

          {/* Prediction Result Display */}
          {prediction && (
            <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-400">Predicted Topic (k={prediction.k}):</span>
                  <Badge
                    className="px-3 py-1 text-sm font-bold text-white shadow-sm"
                    style={{ backgroundColor: prediction.color || "#8b5cf6" }}
                  >
                    {prediction.topic_name}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    Category: <strong className="text-slate-200">{prediction.category}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Centroid Similarity:</span>
                  <div className="rounded-full bg-purple-500/20 px-3 py-1 text-sm font-bold text-purple-300 border border-purple-500/30">
                    {(prediction.similarity_score * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {prediction.top_terms && prediction.top_terms.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
                  <span className="text-xs text-slate-400 mr-2">Topic Signature:</span>
                  {prediction.top_terms.slice(0, 6).map((term) => (
                    <span
                      key={term}
                      className="rounded-md border border-white/10 bg-slate-900 px-2 py-0.5 text-xs text-slate-300"
                    >
                      #{term}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
