"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area 
} from "recharts";
import { 
  MessageSquare, ThumbsUp, ThumbsDown, MinusCircle, 
  Award, Activity, RefreshCw 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  fetchOverview, fetchSentimentDistribution, fetchSentimentTrend, 
  fetchBrands, fetchNegativeReasons 
} from "@/lib/api";

const COLORS = {
  positive: "#10b981",
  neutral: "#0ea5e9",
  negative: "#f43f5e",
};

export default function ExecutiveOverview() {
  const [overview, setOverview] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [trend, setTrend] = useState([]);
  const [brands, setBrands] = useState([]);
  const [negativeReasons, setNegativeReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reasonBrandFilter, setReasonBrandFilter] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [ovData, distData, trendData, brandsData, negData] = await Promise.all([
        fetchOverview(),
        fetchSentimentDistribution(),
        fetchSentimentTrend(),
        fetchBrands(),
        fetchNegativeReasons(),
      ]);
      setOverview(ovData);
      setDistribution(distData);
      setTrend(trendData);
      setBrands(brandsData);
      setNegativeReasons(negData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandChange = async (brand) => {
    setReasonBrandFilter(brand);
    try {
      const res = await fetchNegativeReasons(brand);
      setNegativeReasons(res);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400">
        <Activity className="h-8 w-8 animate-pulse text-sky-400" />
        <p className="mt-4 text-sm font-medium">Querying 289,324 Data Warehouse Events...</p>
      </div>
    );
  }

  const topBrands = brands.slice(0, 10).map((b) => ({
    name: b.brand_name,
    Positive: b.positive_count,
    Neutral: b.neutral_count,
    Negative: b.negative_count,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {/* Total Mentions */}
        <Card className="relative overflow-hidden border-sky-500/20 bg-gradient-to-b from-sky-500/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Mentions</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
              <MessageSquare className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-white">{overview?.total_mentions?.toLocaleString()}</div>
            <p className="mt-1 text-[11px] text-slate-400">Indexed across 3 source datasets</p>
          </CardContent>
        </Card>

        {/* Positive Share */}
        <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Positive Share</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <ThumbsUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-400">{overview?.positive_pct}%</div>
            <p className="mt-1 text-[11px] text-slate-400">{overview?.positive_count?.toLocaleString()} positive posts</p>
          </CardContent>
        </Card>

        {/* Neutral Share */}
        <Card className="relative overflow-hidden border-sky-500/20 bg-gradient-to-b from-sky-500/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Neutral Share</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
              <MinusCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-sky-400">{overview?.neutral_pct}%</div>
            <p className="mt-1 text-[11px] text-slate-400">{overview?.neutral_count?.toLocaleString()} neutral posts</p>
          </CardContent>
        </Card>

        {/* Negative Share */}
        <Card className="relative overflow-hidden border-rose-500/20 bg-gradient-to-b from-rose-500/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Negative Share</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
              <ThumbsDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-rose-400">{overview?.negative_pct}%</div>
            <p className="mt-1 text-[11px] text-slate-400">{overview?.negative_count?.toLocaleString()} complaints</p>
          </CardContent>
        </Card>

        {/* Avg Sentiment */}
        <Card className="relative overflow-hidden border-purple-500/20 bg-gradient-to-b from-purple-500/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Sentiment</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-purple-400">
              {overview?.average_sentiment > 0 ? `+${overview?.average_sentiment}` : overview?.average_sentiment}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Scale from -1.0 to +1.0</p>
          </CardContent>
        </Card>

        {/* Top Brand */}
        <Card className="relative overflow-hidden border-amber-500/20 bg-gradient-to-b from-amber-500/10 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Top Positive</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Award className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="truncate text-xl font-bold tracking-tight text-amber-300">{overview?.most_positive_brand}</div>
            <p className="mt-1 truncate text-[11px] text-slate-400">Lowest: {overview?.most_negative_brand}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Donut Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Sentiment Distribution</CardTitle>
            <CardDescription>Global share of positive, neutral, and negative posts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="count"
                    nameKey="sentiment"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={92}
                    paddingAngle={4}
                  >
                    {distribution.map((entry, index) => {
                      const s = entry.sentiment.toLowerCase();
                      const color = s === "positive" ? COLORS.positive : s === "negative" ? COLORS.negative : COLORS.neutral;
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(val, name, entry) => [`${val.toLocaleString()} (${entry.payload.percentage}%)`, name]}
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Area Chart */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Timeline Sentiment Trajectory</CardTitle>
            <CardDescription>Multi-year volume across SXSW 2011, Airline 2015, and Big Tech 2020</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="posGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="negGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="period" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                  <Legend />
                  <Area type="monotone" dataKey="positive" name="Positive Mentions" stroke="#10b981" fillOpacity={1} fill="url(#posGradient)" />
                  <Area type="monotone" dataKey="negative" name="Negative Complaints" stroke="#f43f5e" fillOpacity={1} fill="url(#negGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Brands Stacked Bar Chart */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Top 10 Brands Mention Breakdown</CardTitle>
            <CardDescription>Composition of Positive, Neutral, and Negative volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topBrands} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#64748b" angle={-25} textAnchor="end" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="Positive" stackId="a" fill="#10b981" />
                  <Bar dataKey="Neutral" stackId="a" fill="#0ea5e9" />
                  <Bar dataKey="Negative" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Negative Reason Breakdown */}
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Negative Reasons</CardTitle>
              <CardDescription>Primary complaint drivers</CardDescription>
            </div>
            <select
              value={reasonBrandFilter}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-xs text-slate-200 outline-none"
            >
              <option value="">All Airlines</option>
              {brands
                .filter((b) => b.industry === "Airline")
                .map((b) => (
                  <option key={b.brand_key} value={b.brand_name}>
                    {b.brand_name}
                  </option>
                ))}
            </select>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={negativeReasons.slice(0, 6)}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="reason" type="category" stroke="#64748b" tick={{ fontSize: 10 }} width={75} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    formatter={(val, name, entry) => [`${val.toLocaleString()} (${entry.payload.percentage}%)`, "Complaints"]}
                  />
                  <Bar dataKey="count" fill="#f43f5e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
