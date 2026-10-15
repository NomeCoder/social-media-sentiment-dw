"use client";

import React, { useState } from "react";
import Navbar from "@/components/navbar";
import ExecutiveOverview from "@/components/executive-overview";
import OLAPExplorer from "@/components/olap-explorer";
import BrandBenchmarks from "@/components/brand-benchmarks";
import MLPlayground from "@/components/ml-playground";
import TopicClustering from "@/components/topic-clustering";
import AssociationRules from "@/components/association-rules";
import TrendForecasting from "@/components/trend-forecasting";

export default function Home() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {activeTab === "overview" && <ExecutiveOverview />}
        {activeTab === "olap" && <OLAPExplorer />}
        {activeTab === "brands" && <BrandBenchmarks />}
        {activeTab === "ml" && <MLPlayground />}
        {activeTab === "topics" && <TopicClustering />}
        {activeTab === "rules" && <AssociationRules />}
        {activeTab === "forecast" && <TrendForecasting />}
      </main>
    </div>
  );
}
