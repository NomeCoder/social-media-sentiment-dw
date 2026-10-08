"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell 
} from "recharts";
import { Database, RefreshCw, Layers, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { 
  fetchOLAPRollup, fetchOLAPDrilldown, fetchOLAPSlice, 
  postOLAPDice, fetchOLAPPivot, fetchBrandHealth, fetchWeightedSentiment,
  fetchBrands 
} from "@/lib/api";

export default function OLAPExplorer() {
  const [operation, setOperation] = useState("rollup");
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pivotMeta, setPivotMeta] = useState(null);

  // Roll-up state
  const [rollupLevel, setRollupLevel] = useState("quarter");
  const [rollupBrand, setRollupBrand] = useState("");
  const [rollupIndustry, setRollupIndustry] = useState("");

  // Drilldown state
  const [drillYear, setDrillYear] = useState("");
  const [drillQuarter, setDrillQuarter] = useState("");

  // Slice state
  const [sliceDim, setSliceDim] = useState("brand");
  const [sliceVal, setSliceVal] = useState("Apple");

  // Dice state
  const [selectedDiceBrands, setSelectedDiceBrands] = useState(["Apple", "Google", "United"]);
  const [selectedDiceSentiments, setSelectedDiceSentiments] = useState(["Positive", "Negative"]);
  const [selectedDiceYears, setSelectedDiceYears] = useState([2015, 2020]);

  // Pivot state
  const [pivotRow, setPivotRow] = useState("brand");

  useEffect(() => {
    fetchBrands().then(setBrands).catch(console.error);
  }, []);

  useEffect(() => {
    executeOperation();
  }, [
    operation,
    rollupLevel,
    rollupBrand,
    rollupIndustry,
    drillYear,
    drillQuarter,
    sliceDim,
    sliceVal,
    selectedDiceBrands,
    selectedDiceSentiments,
    selectedDiceYears,
    pivotRow,
  ]);

  const executeOperation = async () => {
    setLoading(true);
    setPivotMeta(null);
    try {
      if (operation === "rollup") {
        const res = await fetchOLAPRollup(rollupLevel, rollupBrand, rollupIndustry);
        setData(res);
      } else if (operation === "drilldown") {
        const res = await fetchOLAPDrilldown(drillYear ? parseInt(drillYear) : null, drillQuarter ? parseInt(drillQuarter) : null);
        setData(res);
      } else if (operation === "slice") {
        const res = await fetchOLAPSlice(sliceDim, sliceVal);
        setData(res);
      } else if (operation === "dice") {
        const res = await postOLAPDice({
          brands: selectedDiceBrands,
          sentiments: selectedDiceSentiments,
          years: selectedDiceYears.map((y) => parseInt(y)),
        });
        setData(res);
      } else if (operation === "pivot") {
        const res = await fetchOLAPPivot(pivotRow, "sentiment");
        setPivotMeta(res);
        setData(res.data);
      } else if (operation === "brand-health") {
        const res = await fetchBrandHealth();
        setData(res);
      } else if (operation === "weighted-sentiment") {
        const res = await fetchWeightedSentiment();
        setData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDiceBrand = (b) => {
    setSelectedDiceBrands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  };

  const toggleDiceSentiment = (s) => {
    setSelectedDiceSentiments((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const toggleDiceYear = (y) => {
    setSelectedDiceYears((prev) => (prev.includes(y) ? prev.filter((x) => x !== y) : [...prev, y]));
  };

  return (
    <div className="space-y-6">
      {/* Studio Header & Operation Selector */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Database className="h-5 w-5 text-sky-400" />
              Interactive OLAP Cube Engine
            </CardTitle>
            <CardDescription>
              Execute dynamic slicing, dicing, rollups, and crosstabs over the Star Schema Data Warehouse
            </CardDescription>
          </div>
          <Button onClick={executeOperation} disabled={loading} size="sm">
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Computing Cube..." : "Refresh OLAP"}
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Operation Navigation Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "rollup", label: "1. Roll-up (Aggregation)" },
              { id: "drilldown", label: "2. Drill-down (Granularity)" },
              { id: "slice", label: "3. Slice (Fix Dimension)" },
              { id: "dice", label: "4. Dice (Sub-cube Matrix)" },
              { id: "pivot", label: "5. Pivot (Cross-tab)" },
              { id: "brand-health", label: "6. Brand Health Index" },
              { id: "weighted-sentiment", label: "7. Engagement-Weighted" },
            ].map((op) => (
              <Button
                key={op.id}
                variant={operation === op.id ? "default" : "outline"}
                size="sm"
                onClick={() => setOperation(op.id)}
                className="text-xs"
              >
                {op.label}
              </Button>
            ))}
          </div>

          {/* Dynamic Controls based on chosen operation */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-white/5 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {operation === "rollup" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Time Hierarchy Level</label>
                  <select
                    value={rollupLevel}
                    onChange={(e) => setRollupLevel(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none"
                  >
                    <option value="year">Year (Highest)</option>
                    <option value="quarter">Quarter</option>
                    <option value="month">Month</option>
                    <option value="day">Day (Lowest)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Filter by Brand (Optional)</label>
                  <select
                    value={rollupBrand}
                    onChange={(e) => setRollupBrand(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none"
                  >
                    <option value="">All Brands</option>
                    {brands.map((b) => (
                      <option key={b.brand_key} value={b.brand_name}>
                        {b.brand_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Filter by Industry (Optional)</label>
                  <select
                    value={rollupIndustry}
                    onChange={(e) => setRollupIndustry(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none"
                  >
                    <option value="">All Industries</option>
                    <option value="Technology">Technology</option>
                    <option value="Airline">Airline</option>
                  </select>
                </div>
              </>
            )}

            {operation === "drilldown" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Drill Year Filter</label>
                  <select
                    value={drillYear}
                    onChange={(e) => {
                      setDrillYear(e.target.value);
                      setDrillQuarter("");
                    }}
                    className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none"
                  >
                    <option value="">All Years (High-Level Overview)</option>
                    <option value="2011">2011 (SXSW Tech Events)</option>
                    <option value="2015">2015 (Twitter Airlines)</option>
                    <option value="2020">2020 (Big Tech Corpus)</option>
                  </select>
                </div>
                {drillYear && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Drill to Quarter (Optional)</label>
                    <select
                      value={drillQuarter}
                      onChange={(e) => setDrillQuarter(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none"
                    >
                      <option value="">All Quarters in {drillYear}</option>
                      <option value="1">Q1</option>
                      <option value="2">Q2</option>
                      <option value="3">Q3</option>
                      <option value="4">Q4</option>
                    </select>
                  </div>
                )}
              </>
            )}

            {operation === "slice" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Slice Fixed Dimension</label>
                  <select
                    value={sliceDim}
                    onChange={(e) => {
                      setSliceDim(e.target.value);
                      if (e.target.value === "brand") setSliceVal("Apple");
                      else if (e.target.value === "industry") setSliceVal("Airline");
                      else if (e.target.value === "sentiment") setSliceVal("Negative");
                      else setSliceVal("2020");
                    }}
                    className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none"
                  >
                    <option value="brand">Brand</option>
                    <option value="industry">Industry</option>
                    <option value="sentiment">Sentiment</option>
                    <option value="year">Year</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Fixed Dimension Value</label>
                  {sliceDim === "brand" && (
                    <select
                      value={sliceVal}
                      onChange={(e) => setSliceVal(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none"
                    >
                      {brands.map((b) => (
                        <option key={b.brand_key} value={b.brand_name}>
                          {b.brand_name}
                        </option>
                      ))}
                    </select>
                  )}
                  {sliceDim === "industry" && (
                    <select
                      value={sliceVal}
                      onChange={(e) => setSliceVal(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none"
                    >
                      <option value="Technology">Technology</option>
                      <option value="Airline">Airline</option>
                    </select>
                  )}
                  {sliceDim === "sentiment" && (
                    <select
                      value={sliceVal}
                      onChange={(e) => setSliceVal(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none"
                    >
                      <option value="Positive">Positive</option>
                      <option value="Neutral">Neutral</option>
                      <option value="Negative">Negative</option>
                    </select>
                  )}
                  {sliceDim === "year" && (
                    <select
                      value={sliceVal}
                      onChange={(e) => setSliceVal(e.target.value)}
                      className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none"
                    >
                      <option value="2011">2011</option>
                      <option value="2015">2015</option>
                      <option value="2020">2020</option>
                    </select>
                  )}
                </div>
              </>
            )}

            {operation === "dice" && (
              <div className="col-span-full space-y-3">
                <div>
                  <span className="text-xs font-semibold text-slate-300">Select Sub-cube Brands:</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {["Apple", "Google", "Nvidia", "Amazon", "Tesla", "United", "Delta", "Southwest"].map((b) => (
                      <button
                        key={b}
                        onClick={() => toggleDiceBrand(b)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                          selectedDiceBrands.includes(b)
                            ? "border-sky-500/50 bg-sky-500/20 text-sky-300 font-semibold"
                            : "border-white/10 bg-slate-950 text-slate-400 hover:text-white"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-6">
                  <div>
                    <span className="text-xs font-semibold text-slate-300">Sentiments:</span>
                    <div className="mt-1 flex gap-1.5">
                      {["Positive", "Neutral", "Negative"].map((s) => (
                        <button
                          key={s}
                          onClick={() => toggleDiceSentiment(s)}
                          className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                            selectedDiceSentiments.includes(s)
                              ? "border-sky-500/50 bg-sky-500/20 text-sky-300 font-semibold"
                              : "border-white/10 bg-slate-950 text-slate-400 hover:text-white"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-300">Years:</span>
                    <div className="mt-1 flex gap-1.5">
                      {[2011, 2015, 2020].map((y) => (
                        <button
                          key={y}
                          onClick={() => toggleDiceYear(y)}
                          className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                            selectedDiceYears.includes(y)
                              ? "border-sky-500/50 bg-sky-500/20 text-sky-300 font-semibold"
                              : "border-white/10 bg-slate-950 text-slate-400 hover:text-white"
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {operation === "pivot" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Primary Row Dimension</label>
                <select
                  value={pivotRow}
                  onChange={(e) => setPivotRow(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 outline-none"
                >
                  <option value="brand">Brand (Cross-tabulated with Sentiment)</option>
                  <option value="industry">Industry (Cross-tabulated with Sentiment)</option>
                  <option value="year">Year (Cross-tabulated with Sentiment)</option>
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Visual Projection Chart - Rendered for ALL 7 Operations */}
      {data && data.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-4 w-4 text-sky-400" />
                {operation === "rollup" && "Roll-up Temporal Aggregation Chart"}
                {operation === "drilldown" && "Drill-down Granular Breakdown Chart"}
                {operation === "slice" && `Slice Projection: [${sliceDim.toUpperCase()} = "${sliceVal}"]`}
                {operation === "dice" && "Sub-cube Multi-Dimensional Dice Matrix Chart"}
                {operation === "pivot" && `Cross-Tabulation Pivot Chart: [${pivotRow.toUpperCase()} × Sentiment]`}
                {operation === "brand-health" && "Brand Health Index Ranking (Pos% − Neg%)"}
                {operation === "weighted-sentiment" && "Raw Sentiment vs. Retweet-Weighted Sentiment Score"}
              </CardTitle>
              <CardDescription>
                {operation === "rollup" && "Aggregated sentiment count volumes across selected time hierarchy buckets"}
                {operation === "drilldown" && "Sub-period drilldown distribution of positive, neutral, and negative posts"}
                {operation === "slice" && "Volume breakdown across secondary dimensions with the fixed attribute"}
                {operation === "dice" && "Multi-attribute intersection volumes for the selected sub-cube coordinates"}
                {operation === "pivot" && "Visual stacked breakdown of sentiment distribution across primary rows"}
                {operation === "brand-health" && "Net promoter-style Brand Health Index ranking with zero baseline"}
                {operation === "weighted-sentiment" && "Comparison showing impact of viral social retweets on brand score"}
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-sky-500/30 text-sky-400 capitalize">
              OLAP: {operation.replace("-", " ")}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {/* 1. Roll-up Chart */}
                {operation === "rollup" && (
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="time_bucket" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#090d16", borderColor: "rgba(255,255,255,0.15)", borderRadius: "8px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                    <Bar dataKey="positive_count" name="Positive" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="neutral_count" name="Neutral" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="negative_count" name="Negative" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}

                {/* 2. Drill-down Chart */}
                {operation === "drilldown" && (
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#090d16", borderColor: "rgba(255,255,255,0.15)", borderRadius: "8px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                    <Bar dataKey="positive" name="Positive" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="neutral" name="Neutral" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="negative" name="Negative" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}

                {/* 3. Slice Chart */}
                {operation === "slice" && (
                  <BarChart data={data.slice(0, 16).map((d) => ({
                    ...d,
                    displayLabel: `${d.label || d.time_period || "Item"}${d.sentiment_label ? ` (${d.sentiment_label})` : ""}`
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="displayLabel" stroke="#94a3b8" angle={-25} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#090d16", borderColor: "rgba(255,255,255,0.15)", borderRadius: "8px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="count" name="Mention Count" radius={[4, 4, 0, 0]}>
                      {data.slice(0, 16).map((entry, index) => {
                        const s = entry.sentiment_label?.toLowerCase();
                        const color = s === "positive" ? "#10b981" : s === "negative" ? "#f43f5e" : s === "neutral" ? "#38bdf8" : "#818cf8";
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                )}

                {/* 4. Dice Chart */}
                {operation === "dice" && (
                  <BarChart data={data.slice(0, 16).map((d) => ({
                    ...d,
                    diceLabel: `${d.brand_name} '${String(d.year).slice(-2)} - ${d.sentiment_label}`
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="diceLabel" stroke="#94a3b8" angle={-25} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#090d16", borderColor: "rgba(255,255,255,0.15)", borderRadius: "8px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="count" name="Sub-cube Cell Count" radius={[4, 4, 0, 0]}>
                      {data.slice(0, 16).map((entry, index) => {
                        const s = entry.sentiment_label?.toLowerCase();
                        const color = s === "positive" ? "#10b981" : s === "negative" ? "#f43f5e" : "#38bdf8";
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                )}

                {/* 5. Pivot Cross-tab Chart */}
                {operation === "pivot" && (
                  <BarChart data={data.slice(0, 12)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="row_name" stroke="#94a3b8" angle={-20} textAnchor="end" height={50} tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#090d16", borderColor: "rgba(255,255,255,0.15)", borderRadius: "8px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                    <Bar dataKey="positive" name="Positive" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="neutral" name="Neutral" fill="#38bdf8" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="negative" name="Negative" fill="#f43f5e" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}

                {/* 6. Brand Health Index Chart */}
                {operation === "brand-health" && (
                  <BarChart data={data.slice(0, 14)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="brand_name" stroke="#94a3b8" angle={-25} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                    <YAxis domain={[-100, 100]} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
                    <Tooltip contentStyle={{ backgroundColor: "#090d16", borderColor: "rgba(255,255,255,0.15)", borderRadius: "8px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="brand_health_index" name="Health Index (Pos% − Neg%)" radius={[4, 4, 0, 0]}>
                      {data.slice(0, 14).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.brand_health_index >= 0 ? "#10b981" : "#f43f5e"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                )}

                {/* 7. Engagement-Weighted Sentiment Chart */}
                {operation === "weighted-sentiment" && (
                  <BarChart data={data.slice(0, 14)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="brand_name" stroke="#94a3b8" angle={-25} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                    <YAxis domain={[-1, 1]} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
                    <Tooltip contentStyle={{ backgroundColor: "#090d16", borderColor: "rgba(255,255,255,0.15)", borderRadius: "8px" }} />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                    <Bar dataKey="raw_avg_sentiment" name="Raw Avg Sentiment (-1 to +1)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="weighted_sentiment_score" name="Engagement-Weighted Sentiment" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dynamic Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>OLAP Query Result Table ({data?.length || 0} records)</CardTitle>
          <CardDescription>Dynamic SQL analytical query tuples returned directly from Star Schema</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              {operation === "pivot" && pivotMeta ? (
                <TableRow>
                  <TableHead>{pivotMeta.row_dimension.toUpperCase()}</TableHead>
                  <TableHead>Positive</TableHead>
                  <TableHead>Neutral</TableHead>
                  <TableHead>Negative</TableHead>
                  <TableHead>Total Mentions</TableHead>
                  <TableHead>Average Sentiment</TableHead>
                </TableRow>
              ) : operation === "rollup" ? (
                <TableRow>
                  <TableHead>Time Bucket</TableHead>
                  <TableHead>Total Mentions</TableHead>
                  <TableHead>Positive Count</TableHead>
                  <TableHead>Neutral Count</TableHead>
                  <TableHead>Negative Count</TableHead>
                  <TableHead>Positive %</TableHead>
                  <TableHead>Negative %</TableHead>
                  <TableHead>Avg Sentiment</TableHead>
                </TableRow>
              ) : operation === "drilldown" ? (
                <TableRow>
                  <TableHead>Time Period / Unit</TableHead>
                  <TableHead>Total Mentions</TableHead>
                  <TableHead>Positive</TableHead>
                  <TableHead>Neutral</TableHead>
                  <TableHead>Negative</TableHead>
                  <TableHead>Avg Sentiment</TableHead>
                </TableRow>
              ) : operation === "brand-health" ? (
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Mentions</TableHead>
                  <TableHead>Positive %</TableHead>
                  <TableHead>Neutral %</TableHead>
                  <TableHead>Negative %</TableHead>
                  <TableHead>Health Index</TableHead>
                  <TableHead>Avg Score</TableHead>
                </TableRow>
              ) : operation === "weighted-sentiment" ? (
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Mentions</TableHead>
                  <TableHead>Total Retweets</TableHead>
                  <TableHead>Raw Sentiment</TableHead>
                  <TableHead>Weighted Sentiment</TableHead>
                </TableRow>
              ) : (
                <TableRow>
                  {data && data.length > 0 &&
                    Object.keys(data[0]).map((k) => (
                      <TableHead key={k}>{k.replace(/_/g, " ").toUpperCase()}</TableHead>
                    ))}
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {data && data.map((row, idx) => (
                <TableRow key={idx}>
                  {operation === "pivot" ? (
                    <>
                      <TableCell className="font-semibold text-white">{row.row_name}</TableCell>
                      <TableCell><Badge variant="positive">{row.positive?.toLocaleString()}</Badge></TableCell>
                      <TableCell><Badge variant="neutral">{row.neutral?.toLocaleString()}</Badge></TableCell>
                      <TableCell><Badge variant="negative">{row.negative?.toLocaleString()}</Badge></TableCell>
                      <TableCell className="font-bold text-white">{row.total?.toLocaleString()}</TableCell>
                      <TableCell>{row.avg_sentiment > 0 ? `+${row.avg_sentiment}` : row.avg_sentiment}</TableCell>
                    </>
                  ) : operation === "rollup" ? (
                    <>
                      <TableCell className="font-bold text-sky-400">{row.time_bucket}</TableCell>
                      <TableCell>{row.total_mentions?.toLocaleString()}</TableCell>
                      <TableCell>{row.positive_count?.toLocaleString()}</TableCell>
                      <TableCell>{row.neutral_count?.toLocaleString()}</TableCell>
                      <TableCell>{row.negative_count?.toLocaleString()}</TableCell>
                      <TableCell><Badge variant="positive">{row.positive_pct}%</Badge></TableCell>
                      <TableCell><Badge variant="negative">{row.negative_pct}%</Badge></TableCell>
                      <TableCell>{row.avg_sentiment > 0 ? `+${row.avg_sentiment}` : row.avg_sentiment}</TableCell>
                    </>
                  ) : operation === "drilldown" ? (
                    <>
                      <TableCell className="font-bold text-sky-400">{row.label || row.drill_key}</TableCell>
                      <TableCell className="font-semibold text-white">{row.mentions?.toLocaleString()}</TableCell>
                      <TableCell><Badge variant="positive">{row.positive?.toLocaleString()}</Badge></TableCell>
                      <TableCell><Badge variant="neutral">{row.neutral?.toLocaleString()}</Badge></TableCell>
                      <TableCell><Badge variant="negative">{row.negative?.toLocaleString()}</Badge></TableCell>
                      <TableCell>{row.avg_sentiment > 0 ? `+${row.avg_sentiment}` : row.avg_sentiment}</TableCell>
                    </>
                  ) : operation === "brand-health" ? (
                    <>
                      <TableCell className="font-semibold text-white">{row.brand_name}</TableCell>
                      <TableCell className="text-xs text-slate-400">{row.industry}</TableCell>
                      <TableCell>{row.total_mentions?.toLocaleString()}</TableCell>
                      <TableCell><Badge variant="positive">{row.positive_pct}%</Badge></TableCell>
                      <TableCell><Badge variant="neutral">{row.neutral_pct}%</Badge></TableCell>
                      <TableCell><Badge variant="negative">{row.negative_pct}%</Badge></TableCell>
                      <TableCell className={`font-bold ${row.brand_health_index >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {row.brand_health_index > 0 ? `+${row.brand_health_index}` : row.brand_health_index}%
                      </TableCell>
                      <TableCell>{row.avg_sentiment}</TableCell>
                    </>
                  ) : operation === "weighted-sentiment" ? (
                    <>
                      <TableCell className="font-semibold text-white">{row.brand_name}</TableCell>
                      <TableCell className="text-xs text-slate-400">{row.industry}</TableCell>
                      <TableCell>{row.mentions?.toLocaleString()}</TableCell>
                      <TableCell>{row.total_retweets?.toLocaleString()}</TableCell>
                      <TableCell>{row.raw_avg_sentiment}</TableCell>
                      <TableCell className={`font-bold ${row.weighted_sentiment_score >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {row.weighted_sentiment_score > 0 ? `+${row.weighted_sentiment_score}` : row.weighted_sentiment_score}
                      </TableCell>
                    </>
                  ) : (
                    Object.values(row).map((val, cIdx) => (
                      <TableCell key={cIdx}>{typeof val === "number" ? val.toLocaleString() : String(val)}</TableCell>
                    ))
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
