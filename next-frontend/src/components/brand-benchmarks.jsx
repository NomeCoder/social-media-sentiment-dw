"use client";

import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Award } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { fetchBrands } from "@/lib/api";

export default function BrandBenchmarks() {
  const [brands, setBrands] = useState([]);
  const [selectedIndustry, setSelectedIndustry] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBrands()
      .then((data) => {
        setBrands(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const filteredBrands = brands.filter((b) =>
    selectedIndustry === "All" ? true : b.industry === selectedIndustry
  );

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Award className="h-5 w-5 text-amber-400" />
              Brand Health Index & Satisfaction Rankings
            </CardTitle>
            <CardDescription>
              Formula: Positive % &minus; Negative %. Tracked across Technology and Airline sectors.
            </CardDescription>
          </div>

          <div className="flex gap-2">
            {["All", "Technology", "Airline"].map((ind) => (
              <Button
                key={ind}
                variant={selectedIndustry === ind ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedIndustry(ind)}
                className="text-xs"
              >
                {ind}
              </Button>
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* Leaderboard Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Health Ranking (Top 15)</CardTitle>
          <CardDescription>Net customer satisfaction percentage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredBrands.slice(0, 15)} margin={{ top: 10, right: 20, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="brand_name" stroke="#64748b" angle={-25} textAnchor="end" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  formatter={(val) => [`${val}%`, "Brand Health Index"]}
                />
                <Bar dataKey="brand_health_index" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Complete Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Brand Matrix</CardTitle>
          <CardDescription>All 24 tracked entities with volume and engagement metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Brand Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Total Mentions</TableHead>
                <TableHead>Positive %</TableHead>
                <TableHead>Neutral %</TableHead>
                <TableHead>Negative %</TableHead>
                <TableHead>Brand Health Index</TableHead>
                <TableHead>Weighted Sentiment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBrands.map((b, idx) => (
                <TableRow key={b.brand_key}>
                  <TableCell className="font-bold text-slate-500">#{idx + 1}</TableCell>
                  <TableCell className="font-semibold text-white">{b.brand_name}</TableCell>
                  <TableCell>
                    <Badge variant={b.industry === "Airline" ? "negative" : "neutral"} className="text-[10px]">
                      {b.industry}
                    </Badge>
                  </TableCell>
                  <TableCell>{b.total_mentions.toLocaleString()}</TableCell>
                  <TableCell><Badge variant="positive">{b.positive_pct}%</Badge></TableCell>
                  <TableCell><Badge variant="neutral">{b.neutral_pct}%</Badge></TableCell>
                  <TableCell><Badge variant="negative">{b.negative_pct}%</Badge></TableCell>
                  <TableCell className={`font-bold ${b.brand_health_index >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {b.brand_health_index > 0 ? `+${b.brand_health_index}` : b.brand_health_index}%
                  </TableCell>
                  <TableCell className="font-medium text-slate-200">
                    {b.engagement_weighted_sentiment > 0 ? `+${b.engagement_weighted_sentiment}` : b.engagement_weighted_sentiment}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
