import React, { useState } from 'react';
import { 
  BarChart3, Database, Award, Sparkles, 
  Layers, HardDrive, ShieldCheck 
} from 'lucide-react';

import ExecutiveOverview from './components/ExecutiveOverview';
import OLAPExplorer from './components/OLAPExplorer';
import BrandBenchmarks from './components/BrandBenchmarks';
import MLPlayground from './components/MLPlayground';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div>
      {/* Top Navigation Bar */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand-title">
            <div className="brand-logo-icon">
              <Layers size={22} />
            </div>
            <div className="brand-text">
              <h1>Social Media Brand Sentiment Analytics</h1>
              <p>Enterprise Data Warehouse, OLAP Cube Engine & NLP Intelligence Platform</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="nav-tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            >
              <BarChart3 size={16} />
              Executive Dashboard
            </button>
            <button
              onClick={() => setActiveTab('olap')}
              className={`nav-tab-btn ${activeTab === 'olap' ? 'active' : ''}`}
            >
              <Database size={16} />
              OLAP Cube Explorer
            </button>
            <button
              onClick={() => setActiveTab('brands')}
              className={`nav-tab-btn ${activeTab === 'brands' ? 'active' : ''}`}
            >
              <Award size={16} />
              Brand Health Index
            </button>
            <button
              onClick={() => setActiveTab('ml')}
              className={`nav-tab-btn ${activeTab === 'ml' ? 'active' : ''}`}
            >
              <Sparkles size={16} />
              ML Predictor & Evaluation
            </button>
          </nav>

          {/* Data Warehouse Status Badge */}
          <div className="dw-status-badge">
            <span className="status-dot"></span>
            <span>289,324 Records (Star Schema DW)</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'overview' && <ExecutiveOverview />}
        {activeTab === 'olap' && <OLAPExplorer />}
        {activeTab === 'brands' && <BrandBenchmarks />}
        {activeTab === 'ml' && <MLPlayground />}
      </main>
    </div>
  );
}
