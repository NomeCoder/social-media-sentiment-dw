import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import { Award, TrendingUp, TrendingDown, ShieldCheck, Zap } from 'lucide-react';
import { fetchBrands } from '../services/api';

export default function BrandBenchmarks() {
  const [brands, setBrands] = useState([]);
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBrands()
      .then(data => {
        setBrands(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const filteredBrands = brands.filter(b => 
    selectedIndustry === 'All' ? true : b.industry === selectedIndustry
  );

  return (
    <div>
      {/* Header and Filter */}
      <div className="glass-panel chart-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Award color="#f59e0b" size={22} />
              Brand Health Index & Satisfaction Benchmarks
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
              Brand Health Index = (Positive % - Negative %). Ranked across Technology and Airline sectors.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {['All', 'Technology', 'Airline'].map(ind => (
              <button
                key={ind}
                onClick={() => setSelectedIndustry(ind)}
                className={`nav-tab-btn ${selectedIndustry === ind ? 'active' : ''}`}
                style={{ fontSize: '0.82rem', padding: '6px 14px' }}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard Chart */}
      <div className="glass-panel chart-card" style={{ marginBottom: 24 }}>
        <div className="chart-card-header">
          <div>
            <h3 className="chart-card-title">Brand Health Index Ranking (Top 15)</h3>
            <p className="chart-card-subtitle">Net sentiment margin from -100% to +100%</p>
          </div>
        </div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={filteredBrands.slice(0, 15)}
              margin={{ top: 10, right: 20, left: 20, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="brand_name" stroke="#64748b" angle={-25} textAnchor="end" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0e1726', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                formatter={(val) => [`${val}%`, 'Brand Health Index']}
              />
              <Bar 
                dataKey="brand_health_index" 
                fill="#38bdf8" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full Leaderboard Table */}
      <div className="glass-panel chart-card">
        <div className="chart-card-header">
          <div>
            <h3 className="chart-card-title">Complete Brand Intelligence Matrix</h3>
            <p className="chart-card-subtitle">All 24 tracked entities with volume, sentiment rates, and engagement weighting</p>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Brand Name</th>
                <th>Industry</th>
                <th>Total Volume</th>
                <th>Positive %</th>
                <th>Neutral %</th>
                <th>Negative %</th>
                <th>Brand Health Index</th>
                <th>Engagement Weighted</th>
              </tr>
            </thead>
            <tbody>
              {filteredBrands.map((b, idx) => (
                <tr key={b.brand_key}>
                  <td style={{ fontWeight: 700, color: 'var(--text-dim)' }}>#{idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{b.brand_name}</td>
                  <td>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      padding: '2px 8px', 
                      borderRadius: '4px',
                      background: b.industry === 'Airline' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                      color: b.industry === 'Airline' ? '#fb7185' : '#38bdf8'
                    }}>
                      {b.industry}
                    </span>
                  </td>
                  <td>{b.total_mentions.toLocaleString()}</td>
                  <td><span className="badge-pos">{b.positive_pct}%</span></td>
                  <td><span className="badge-neu">{b.neutral_pct}%</span></td>
                  <td><span className="badge-neg">{b.negative_pct}%</span></td>
                  <td style={{ 
                    fontWeight: 800, 
                    color: b.brand_health_index >= 0 ? '#34d399' : '#fb7185' 
                  }}>
                    {b.brand_health_index > 0 ? `+${b.brand_health_index}` : b.brand_health_index}%
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {b.engagement_weighted_sentiment > 0 ? `+${b.engagement_weighted_sentiment}` : b.engagement_weighted_sentiment}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
