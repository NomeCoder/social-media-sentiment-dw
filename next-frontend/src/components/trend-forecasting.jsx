"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, TrendingDown, Minus, Calendar, 
  Target, Sparkles, Activity, ShieldCheck, RefreshCw, 
  BarChart3, Clock, AlertCircle, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine 
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchSentimentTrendForecast } from "@/lib/api";

const BRAND_OPTIONS = [
  "All Brands",
  "Twitch",
  "Youtube",
  "Apple",
  "Netflix",
  "Google",
  "Microsoft",
  "Amazon",
  "Tesla"
];

const HORIZON_OPTIONS = [
  { label: "7 Days", value: 7 },
  { label: "14 Days", value: 14 },
  { label: "21 Days", value: 21 },
  { label: "30 Days", value: 30 }
];

export default function TrendForecasting() {
  const [selectedBrand, setSelectedBrand] = useState("All Brands");
  const [horizon, setHorizon] = useState(14);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForecast();
  }, [selectedBrand, horizon]);

  const loadForecast = async () => {
    setLoading(true);
    try {
      const res = await fetchSentimentTrendForecast(selectedBrand, horizon);
      setForecastData(res);
    } catch (err) {
      console.error("Failed to load trend forecast:", err);
    } finally {
      setLoading(false);
    }
  };

  const trendSummary = forecastData?.trend_summary || {};
  const fitMetrics = forecastData?.model_fit_metrics || {};
  const historical = forecastData?.historical || [];
  const forecast = forecastData?.forecast || [];

  // Combine historical and forecast for continuous line chart
  const combinedChartData = [];

  historical.forEach((h) => {
    combinedChartData.push({
      date: h.date.substring(5), // MM-DD
      fullDate: h.date,
      historicalScore: h.avg_sentiment,
      forecastScore: null,
      lowerBound: null,
      upperBound: null,
      positivePct: h.positive_pct,
      negativePct: h.negative_pct,
      isForecast: false,
    });
  });

  // Connect transition point
  if (historical.length > 0) {
    const lastHist = historical[historical.length - 1];
    combinedChartData[combinedChartData.length - 1].forecastScore = lastHist.avg_sentiment;
    combinedChartData[combinedChartData.length - 1].lowerBound = lastHist.avg_sentiment;
    combinedChartData[combinedChartData.length - 1].upperBound = lastHist.avg_sentiment;
  }

  forecast.forEach((f) => {
    combinedChartData.push({
      date: f.date.substring(5),
      fullDate: f.date,
      historicalScore: null,
      forecastScore: f.predicted_sentiment,
      lowerBound: f.lower_bound,
      upperBound: f.upper_bound,
      positivePct: f.projected_positive_pct,
      negativePct: f.projected_negative_pct,
      isForecast: true,
    });
  });

  const isImproving = trendSummary.direction?.includes("Improving");
  const isDeclining = trendSummary.direction?.includes("Declining");

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-sky-950/40 p-6 sm:p-8 backdrop-blur-xl">
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                <TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Predictive Sentiment Intelligence
              </Badge>
              <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-300">
                Holt's Linear Exponential Smoothing + 95% Confidence Cone
              </Badge>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Sentiment Trend Prediction & Forecasting
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Projects future brand sentiment trajectory across upcoming periods. Computes trend direction,
              velocity drift, confidence intervals, and expected positive vs negative share.
            </p>
          </div>

          {/* Interactive controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Brand select */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-slate-300">
              <Target className="h-4 w-4 text-sky-400" />
              <span>Target:</span>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="bg-transparent font-bold text-white outline-none cursor-pointer"
              >
                {BRAND_OPTIONS.map((b) => (
                  <option key={b} value={b} className="bg-slate-900">
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Horizon select */}
            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/80 p-1">
              {HORIZON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setHorizon(opt.value)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                    horizon === opt.value
                      ? "bg-sky-500/20 text-sky-300 border border-sky-400/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-sky-400" />
            <p className="text-sm text-slate-400">Fitting Holt's trend model and calculating confidence bounds...</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* Direction */}
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Forecast Direction</span>
                {isImproving ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                ) : isDeclining ? (
                  <ArrowDownRight className="h-4 w-4 text-rose-400" />
                ) : (
                  <Minus className="h-4 w-4 text-sky-400" />
                )}
              </div>
              <div
                className="mt-2 text-xl font-bold truncate"
                style={{ color: trendSummary.direction_color || "#38bdf8" }}
              >
                {trendSummary.direction}
              </div>
              <span className="text-[11px] text-slate-500">
                Momentum: <strong>{trendSummary.momentum_label}</strong>
              </span>
            </div>

            {/* Current vs Projected */}
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Current \u2192 Projected Score</span>
                <Sparkles className="h-4 w-4 text-sky-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl font-bold text-slate-300">
                  {trendSummary.current_sentiment > 0 ? `+${trendSummary.current_sentiment}` : trendSummary.current_sentiment}
                </span>
                <span className="text-xs text-slate-500">&rarr;</span>
                <span
                  className="text-xl font-bold"
                  style={{ color: trendSummary.direction_color || "#38bdf8" }}
                >
                  {trendSummary.projected_sentiment > 0 ? `+${trendSummary.projected_sentiment}` : trendSummary.projected_sentiment}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Expected Drift:{" "}
                <strong className={trendSummary.delta >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {trendSummary.delta >= 0 ? `+${trendSummary.delta}` : trendSummary.delta}
                </strong>
              </span>
            </div>

            {/* 95% Confidence Interval */}
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>95% Confidence Margin</span>
                <ShieldCheck className="h-4 w-4 text-purple-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-purple-400">
                &plusmn;{trendSummary.avg_confidence_margin}
              </div>
              <span className="text-[11px] text-slate-500">
                Forecast Horizon: {horizon} Days forward
              </span>
            </div>

            {/* Model Fit */}
            <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Model Fit (R&sup2; Score)</span>
                <Activity className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-400">
                {(fitMetrics.r2_score * 100).toFixed(1)}%
              </div>
              <span className="text-[11px] text-slate-500">
                MAE: {fitMetrics.mae} &middot; RMSE: {fitMetrics.rmse}
              </span>
            </div>
          </div>

          {/* Time Series Forecast Chart */}
          <Card>
            <CardHeader>
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <CardTitle className="text-lg text-white">
                    Historical Observed vs Projected Sentiment Trajectory ({selectedBrand})
                  </CardTitle>
                  <CardDescription>
                    Solid cyan line represents historical daily actuals. Amber dashed line represents Holt's trend forecast with shaded 95% confidence bounds.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                    <span className="text-slate-300">Historical Actual</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="text-slate-300">Projected Forecast</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500/30 border border-amber-400/50" />
                    <span className="text-slate-300">95% Confidence Envelope</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={combinedChartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                    <defs>
                      {/* Gradient for historical area */}
                      <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                      </linearGradient>
                      {/* Gradient for forecast confidence envelope */}
                      <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={["auto", "auto"]} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="rounded-lg border border-white/10 bg-slate-900 p-3 text-xs shadow-xl space-y-1">
                              <p className="font-bold text-white flex items-center justify-between gap-4">
                                <span>{item.fullDate}</span>
                                <Badge variant={item.isForecast ? "outline" : "secondary"} className="text-[10px]">
                                  {item.isForecast ? "Forecast" : "Historical"}
                                </Badge>
                              </p>
                              {item.historicalScore !== null && (
                                <p className="text-sky-400 font-semibold">
                                  Sentiment Score: {item.historicalScore > 0 ? `+${item.historicalScore}` : item.historicalScore}
                                </p>
                              )}
                              {item.isForecast && (
                                <>
                                  <p className="text-amber-400 font-semibold">
                                    Projected Score: {item.forecastScore > 0 ? `+${item.forecastScore}` : item.forecastScore}
                                  </p>
                                  <p className="text-slate-400 text-[11px]">
                                    95% Bounds: [{item.lowerBound}, {item.upperBound}]
                                  </p>
                                </>
                              )}
                              <div className="pt-1 border-t border-white/10 flex justify-between gap-3 text-[11px]">
                                <span className="text-emerald-400">Pos: {item.positivePct}%</span>
                                <span className="text-rose-400">Neg: {item.negativePct}%</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    {/* Shaded Upper and Lower bounds envelope */}
                    <Area
                      type="monotone"
                      dataKey="upperBound"
                      stroke="none"
                      fill="url(#confGrad)"
                      connectNulls
                    />
                    <Area
                      type="monotone"
                      dataKey="lowerBound"
                      stroke="none"
                      fill="#0b0f19"
                      connectNulls
                    />

                    {/* Historical observed curve */}
                    <Line
                      type="monotone"
                      dataKey="historicalScore"
                      stroke="#0ea5e9"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#0ea5e9" }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />

                    {/* Forecasted projected curve */}
                    <Line
                      type="monotone"
                      dataKey="forecastScore"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      strokeDasharray="5 5"
                      dot={{ r: 3, fill: "#f59e0b" }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Forecasted Daily Timeline Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-white">
                Forecast Projection Breakdown ({horizon} Days Forward)
              </CardTitle>
              <CardDescription>
                Detailed day-by-day sentiment projection, prediction intervals, and estimated positive/negative distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-white/10 overflow-hidden bg-slate-950/40">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 bg-slate-900/60">
                      <TableHead className="text-slate-300">Target Date</TableHead>
                      <TableHead className="text-slate-300">Offset</TableHead>
                      <TableHead className="text-right text-slate-300">Projected Sentiment</TableHead>
                      <TableHead className="text-right text-slate-300">Lower Bound (95%)</TableHead>
                      <TableHead className="text-right text-slate-300">Upper Bound (95%)</TableHead>
                      <TableHead className="text-right text-slate-300">Projected Pos %</TableHead>
                      <TableHead className="text-right text-slate-300">Projected Neg %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecast.map((f) => (
                      <TableRow key={f.date} className="border-white/5 hover:bg-slate-900/40">
                        <TableCell className="font-mono text-xs font-semibold text-white">
                          {f.date}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">
                          +{f.day_offset}d
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold text-amber-400">
                          {f.predicted_sentiment > 0 ? `+${f.predicted_sentiment}` : f.predicted_sentiment}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-400">
                          {f.lower_bound}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-400">
                          {f.upper_bound}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-emerald-400 font-semibold">
                          {f.projected_positive_pct}%
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-rose-400 font-semibold">
                          {f.projected_negative_pct}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
