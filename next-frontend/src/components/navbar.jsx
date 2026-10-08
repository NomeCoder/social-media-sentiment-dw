"use client";

import React from "react";
import { Layers, BarChart3, Database, Award, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Navbar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: "overview", label: "Executive Dashboard", icon: BarChart3 },
    { id: "olap", label: "OLAP Cube Explorer", icon: Database },
    { id: "brands", label: "Brand Health Index", icon: Award },
    { id: "ml", label: "ML Sentiment Studio", icon: Sparkles },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        {/* Brand logo & title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-600 text-slate-950 shadow-lg shadow-sky-500/25">
            <Layers className="h-5 w-5 font-bold" />
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-base font-bold tracking-tight text-transparent">
              SocialPulse Analytics
            </h1>
            <p className="text-[11px] text-slate-400">
              Enterprise Star Schema DW &middot; OLAP Engine &middot; Next.js + shadcn/ui
            </p>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900/90 p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-white shadow-sm shadow-sky-500/20 border border-sky-400/40"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-sky-400" : "text-slate-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Status badge */}
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span>289,324 Records (Star Schema)</span>
        </div>
      </div>
    </header>
  );
}
