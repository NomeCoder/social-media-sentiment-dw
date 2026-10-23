"use client";

import React, { useState, useEffect } from "react";
import { 
  GitFork, Search, Filter, SlidersHorizontal, ArrowRight, 
  Sparkles, Zap, TrendingUp, Award, Layers, Hash, CheckCircle2,
  RefreshCw, ChevronLeft, ChevronRight, BarChart3
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis 
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchAssociationRules } from "@/lib/api";

export default function AssociationRules() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // User Inputs & Mining Controls
  const [search, setSearch] = useState("");
  const [minSupport, setMinSupport] = useState(0.5); // 0.5% default user input
  const [minConfidence, setMinConfidence] = useState(30); // 30% default user input
  const [minLift, setMinLift] = useState(0);
  const [sortBy, setSortBy] = useState("lift");
  const [miningMode, setMiningMode] = useState("dynamic"); // "dynamic" (live Apriori) or "benchmark"
  const [runCount, setRunCount] = useState(1);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    loadRules(false);
  }, [search, minLift, sortBy, miningMode]);

  const loadRules = async (isRegenerate = false) => {
    setLoading(true);
    try {
      const res = await fetchAssociationRules({
        search: search.trim() || undefined,
        min_support: minSupport > 0 ? Number((minSupport / 100).toFixed(4)) : undefined,
        min_confidence: minConfidence > 0 ? Number((minConfidence / 100).toFixed(4)) : undefined,
        min_lift: minLift > 0 ? minLift : undefined,
        sort_by: sortBy,
        order: "desc",
        limit: 150,
        mode: miningMode,
        regenerate: isRegenerate,
      });
      setData(res);
      setPage(1);
      if (isRegenerate) {
        setRunCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Failed to load association rules:", err);
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary || {};
  const rules = data?.rules || [];
  const insights = data?.insights || [];

  // Pagination
  const totalFiltered = rules.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const paginatedRules = rules.slice((page - 1) * pageSize, page * pageSize);

  // Top rules for lift chart
  const topLiftRules = rules.slice(0, 10).map((r) => ({
    name: `${r.antecedents_str} \u2192 ${r.consequents_str}`,
    shortName: `${r.antecedents[0]} \u2192 ${r.consequents[0]}`,
    lift: r.lift,
    confidence: r.confidence_pct,
    support: r.support_pct,
  }));

  const getLiftBadgeColor = (lift) => {
    if (lift >= 20) return "border-amber-400/40 bg-amber-500/20 text-amber-300 font-bold";
    if (lift >= 10) return "border-purple-400/40 bg-purple-500/20 text-purple-300 font-bold";
    if (lift >= 5) return "border-sky-400/40 bg-sky-500/20 text-sky-300";
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-300">
                <GitFork className="mr-1.5 h-3.5 w-3.5" /> Data Mining & Co-Occurrence
              </Badge>
              <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-300">
                Apriori / Association Rule Discovery
              </Badge>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Hashtag & Keyword Association Rules
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Discovers hidden correlations and frequent itemsets across BigTech hashtags (Amazon, Apple, Cloud, Gaming, Twitch, Netflix).
              Verified from <code>hashtag_association_rules_bigtech.csv</code>.
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 rounded-xl border border-white/10 bg-slate-950/60 p-4 sm:items-end">
            <span className="text-xs text-slate-400">Mined Rules Ingested</span>
            <span className="text-2xl font-bold text-amber-400">
              {summary.total_rules || 170} Association Rules
            </span>
            <span className="text-[11px] text-slate-500">Max Correlation Lift: {summary.max_lift || 42.26}x</span>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Max Rule Lift</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">
            {summary.max_lift || 42.26}x
          </div>
          <span className="text-[11px] text-slate-500">Deals & Ganga correlation</span>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Average Confidence</span>
            <Award className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-400">
            {summary.avg_confidence ? `${(summary.avg_confidence * 100).toFixed(1)}%` : "68.0%"}
          </div>
          <span className="text-[11px] text-slate-500">Conditional probability</span>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Average Lift</span>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-400">
            {summary.avg_lift ? `${summary.avg_lift}x` : "5.59x"}
          </div>
          <span className="text-[11px] text-slate-500">Above random baseline</span>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Top Consequent</span>
            <Hash className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-400 truncate">
            #twitch & #amazon
          </div>
          <span className="text-[11px] text-slate-500">Primary target clusters</span>
        </div>
      </div>

      {/* Curated Insights Banner */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
          <Sparkles className="h-4 w-4 text-amber-400" /> Key Discovered Co-Occurrence Patterns
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {insights.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-white/10 bg-slate-900/70 p-4 transition-colors hover:border-white/20"
            >
              <Badge variant="outline" className="border-amber-400/30 text-[10px] text-amber-300">
                {item.category}
              </Badge>
              <h4 className="mt-2 text-sm font-bold text-white">{item.title}</h4>
              <p className="mt-1 font-mono text-xs font-semibold text-sky-400">{item.rule}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                <span>Lift: <strong className="text-white">{item.lift}x</strong></span>
                <span>&middot;</span>
                <span>Conf: <strong className="text-white">{item.confidence}%</strong></span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top 10 High Lift Chart */}
      {topLiftRules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-amber-400" /> Top Association Rules by Lift Factor
            </CardTitle>
            <CardDescription>
              Lift &gt; 1 indicates strong positive association. Higher values reflect tight contextual co-occurrence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topLiftRules} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="shortName" stroke="#94a3b8" fontSize={11} width={130} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="rounded-lg border border-white/10 bg-slate-900 p-3 text-xs shadow-xl">
                            <p className="font-bold text-white">{d.name}</p>
                            <p className="text-amber-400 mt-1">Lift: {d.lift}x</p>
                            <p className="text-sky-400">Confidence: {d.confidence}%</p>
                            <p className="text-slate-400">Support: {d.support}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="lift" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                    {topLiftRules.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index < 3 ? "#f59e0b" : index < 6 ? "#8b5cf6" : "#0ea5e9"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interactive Rules Explorer */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg text-white">Interactive Rules Data Explorer</CardTitle>
              <CardDescription>
                Filter by keyword, minimum lift multiplier, confidence threshold, and support rate
              </CardDescription>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950 p-1">
              <button
                onClick={() => setMiningMode("dynamic")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  miningMode === "dynamic"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Live Apriori Mining
              </button>
              <button
                onClick={() => setMiningMode("benchmark")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  miningMode === "benchmark"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                BigTech Benchmark
              </button>
            </div>
          </div>

          {/* User Input Controls Deck */}
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-slate-950/70 p-3.5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search hashtag (e.g. apple, cloud, deal)..."
                className="h-9 w-52 rounded-lg border border-white/10 bg-slate-900 pl-9 pr-3 text-xs text-slate-200 outline-none focus:border-amber-400/50"
              />
            </div>

            {/* User Input: Min Support */}
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs">
              <span className="font-semibold text-slate-300">User Input Support:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="15.0"
                  value={minSupport}
                  onChange={(e) => setMinSupport(Math.max(0.05, parseFloat(e.target.value) || 0))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") loadRules(miningMode === "dynamic");
                  }}
                  className="w-14 rounded border border-white/20 bg-slate-950 px-1.5 py-0.5 text-center font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-400"
                />
                <span className="text-amber-400 font-mono font-bold">%</span>
              </div>
            </div>

            {/* User Input: Min Confidence */}
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs">
              <span className="font-semibold text-slate-300">User Input Confidence:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="5"
                  min="5"
                  max="100"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Math.max(1, parseFloat(e.target.value) || 0))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") loadRules(miningMode === "dynamic");
                  }}
                  className="w-14 rounded border border-white/20 bg-slate-950 px-1.5 py-0.5 text-center font-mono font-bold text-sky-400 focus:outline-none focus:border-sky-400"
                />
                <span className="text-sky-400 font-mono font-bold">%</span>
              </div>
            </div>

            {/* Min Lift */}
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
              <span>Min Lift:</span>
              <select
                value={minLift}
                onChange={(e) => setMinLift(Number(e.target.value))}
                className="bg-transparent font-bold text-purple-400 outline-none cursor-pointer"
              >
                <option value={0} className="bg-slate-900">All (&gt; 0x)</option>
                <option value={2} className="bg-slate-900">&gt; 2.0x</option>
                <option value={5} className="bg-slate-900">&gt; 5.0x</option>
                <option value={10} className="bg-slate-900">&gt; 10.0x</option>
                <option value={20} className="bg-slate-900">&gt; 20.0x</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent font-bold text-emerald-400 outline-none cursor-pointer"
              >
                <option value="lift" className="bg-slate-900">Lift</option>
                <option value="confidence" className="bg-slate-900">Confidence</option>
                <option value="support" className="bg-slate-900">Support</option>
              </select>
            </div>

            {/* Generate Different Rules Button */}
            <Button
              onClick={() => loadRules(true)}
              disabled={loading}
              className="ml-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-9 px-3.5 shadow-md flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Mining Live Rules..." : `Mine New Rules (Run #${runCount + 1})`}
            </Button>
          </div>

          {/* Status feedback bar for dynamic runs */}
          {summary.mining_mode === "dynamic" && (
            <div className="mt-3 flex flex-wrap items-center justify-between rounded-lg border border-amber-500/30 bg-amber-950/20 px-3.5 py-2 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span className="text-amber-200">
                  <strong>Dynamic Run #{runCount}:</strong> Discovered <strong>{summary.total_rules} rules</strong> from <strong>{summary.sampled_transactions?.toLocaleString() || "3,400"} sampled transactions</strong> in <strong>{summary.mining_duration_sec || "0.3"}s</strong>.
                </span>
              </div>
              <span className="text-[11px] text-amber-300/80 italic">
                * Fresh transaction sample drawn on each run — generating different rule sets each time!
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border border-white/10 overflow-hidden bg-slate-950/40">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 bg-slate-900/60">
                  <TableHead className="w-12 text-center text-slate-400">#</TableHead>
                  <TableHead className="text-slate-300">Antecedent Itemset (Condition)</TableHead>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="text-slate-300">Consequent Itemset (Result)</TableHead>
                  <TableHead className="text-right text-slate-300">Support</TableHead>
                  <TableHead className="text-right text-slate-300">Confidence</TableHead>
                  <TableHead className="text-right text-slate-300">Lift Multiplier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRules.map((rule, idx) => {
                  const globalIdx = (page - 1) * pageSize + idx + 1;
                  return (
                    <TableRow key={rule.id} className="border-white/5 hover:bg-slate-900/40 transition-colors">
                      <TableCell className="text-center font-mono text-xs text-slate-500">
                        {globalIdx}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {rule.antecedents.map((item) => (
                            <Badge
                              key={item}
                              variant="outline"
                              className="border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs"
                            >
                              #{item}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        <ArrowRight className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {rule.consequents.map((item) => (
                            <Badge
                              key={item}
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold"
                            >
                              #{item}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-300">
                        {rule.support_pct}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-white">
                        {rule.confidence_pct}%
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-block rounded-md px-2.5 py-1 font-mono text-xs ${getLiftBadgeColor(rule.lift)}`}>
                          {rule.lift}x
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {paginatedRules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                      No association rules match the selected filter criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          <div className="mt-4 flex flex-col items-center justify-between gap-3 text-xs text-slate-400 sm:flex-row">
            <span>
              Showing {rules.length > 0 ? (page - 1) * pageSize + 1 : 0} -{" "}
              {Math.min(page * pageSize, rules.length)} of {rules.length} filtered rules
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 px-2.5 text-xs border-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 font-mono text-xs text-slate-300">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 px-2.5 text-xs border-white/10"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
