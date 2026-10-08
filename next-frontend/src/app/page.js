"use client";

import React, { useState } from "react";
import Navbar from "@/components/navbar";
import ExecutiveOverview from "@/components/executive-overview";
import OLAPExplorer from "@/components/olap-explorer";
import BrandBenchmarks from "@/components/brand-benchmarks";
import MLPlayground from "@/components/ml-playground";

export default function Home() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {activeTab === "overview" && <ExecutiveOverview />}
        {activeTab === "olap" && <OLAPExplorer />}
        {activeTab === "brands" && <BrandBenchmarks />}
        {activeTab === "ml" && <MLPlayground />}
      </main>
    </div>
  );
}
