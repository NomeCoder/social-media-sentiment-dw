import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, MessageSquare, ThumbsUp, ThumbsDown, 
  MinusCircle, Award, AlertTriangle, Layers, Activity 
} from 'lucide-react';
import { 
  fetchOverview, fetchSentimentDistribution, fetchSentimentTrend, 
  fetchBrands, fetchNegativeReasons 
} from '../services/api';

const COLORS = {
  positive: '#10b981',
  neutral: '#0ea5e9',
  negative: '#f43f5e'
};

const PIE_COLORS = ['#10b981', '#0ea5e9', '#f43f5e', '#64748b'];

export default function ExecutiveOverview() {
  const [overview, setOverview] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [trend, setTrend] = useState([]);
  const [brands, setBrands] = useState([]);
  const [negativeReasons, setNegativeReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ovData, distData, trendData, brandsData, negData] = await Promise.all([
        fetchOverview(),
        fetchSentimentDistribution(),
        fetchSentimentTrend(),
        fetchBrands(),
        fetchNegativeReasons()
      ]);
      setOverview(ovData);
      setDistribution(distData);
      setTrend(trendData);
      setBrands(brandsData);
      setNegativeReasons(negData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReasonBrandChange = async (brand) => {
    setSelectedBrandFilter(brand);
    try {
      const reasons = await fetchNegativeReasons(brand);
      setNegativeReasons(reasons);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
        <Activity size={36} className="status-dot" style={{ margin: '0 auto 16px', display: 'block' }} />
        <p>Loading Data Warehouse OLAP Cube Metrics...</p>
      </div>
    );
  }

  // Filter top 10 brands for comparison chart
  const topBrands = brands.slice(0, 10).map(b => ({
    name: b.brand_name,
    Positive: b.positive_count,
    Neutral: b.neutral_count,
    Negative: b.negative_count,
    Health: b.brand_health_index
  }));

  return (
    <div>
      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="glass-panel kpi-card" style={{ '--card-accent': '#38bdf8' }}>
          <div className="kpi-header">
            <span className="kpi-title">Total Posts</span>
            <div className="kpi-icon-wrap"><MessageSquare size={18} /></div>
          </div>
          <div className="kpi-value">{overview?.total_mentions?.toLocaleString()}</div>
          <div className="kpi-subtitle">
            <span>Indexed across 3 source datasets</span>
          </div>
        </div>

        <div className="glass-panel kpi-card" style={{ '--card-accent': '#10b981' }}>
          <div className="kpi-header">
            <span className="kpi-title">Positive Share</span>
            <div className="kpi-icon-wrap" style={{ color: '#10b981' }}><ThumbsUp size={18} /></div>
          </div>
          <div className="kpi-value" style={{ color: '#34d399' }}>{overview?.positive_pct}%</div>
          <div className="kpi-subtitle">
            <span>{overview?.positive_count?.toLocaleString()} positive mentions</span>
          </div>
        </div>

        <div className="glass-panel kpi-card" style={{ '--card-accent': '#0ea5e9' }}>
          <div className="kpi-header">
            <span className="kpi-title">Neutral Share</span>
            <div className="kpi-icon-wrap" style={{ color: '#0ea5e9' }}><MinusCircle size={18} /></div>
          </div>
          <div className="kpi-value" style={{ color: '#38bdf8' }}>{overview?.neutral_pct}%</div>
          <div className="kpi-subtitle">
            <span>{overview?.neutral_count?.toLocaleString()} neutral mentions</span>
          </div>
        </div>

        <div className="glass-panel kpi-card" style={{ '--card-accent': '#f43f5e' }}>
          <div className="kpi-header">
            <span className="kpi-title">Negative Share</span>
            <div className="kpi-icon-wrap" style={{ color: '#f43f5e' }}><ThumbsDown size={18} /></div>
          </div>
          <div className="kpi-value" style={{ color: '#fb7185' }}>{overview?.negative_pct}%</div>
          <div className="kpi-subtitle">
            <span>{overview?.negative_count?.toLocaleString()} complaints</span>
          </div>
        </div>

        <div className="glass-panel kpi-card" style={{ '--card-accent': '#a855f7' }}>
          <div className="kpi-header">
            <span className="kpi-title">Avg Sentiment</span>
            <div className="kpi-icon-wrap" style={{ color: '#a855f7' }}><Activity size={18} /></div>
          </div>
          <div className="kpi-value">{overview?.average_sentiment > 0 ? `+${overview?.average_sentiment}` : overview?.average_sentiment}</div>
          <div className="kpi-subtitle">
            <span>Scale from -1.0 to +1.0</span>
          </div>
        </div>

        <div className="glass-panel kpi-card" style={{ '--card-accent': '#f59e0b' }}>
          <div className="kpi-header">
            <span className="kpi-title">Top Positive Brand</span>
            <div className="kpi-icon-wrap" style={{ color: '#f59e0b' }}><Award size={18} /></div>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.45rem' }}>{overview?.most_positive_brand}</div>
          <div className="kpi-subtitle">
            <span>Lowest: {overview?.most_negative_brand}</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Sentiment Distribution Pie */}
        <div className="glass-panel chart-card col-4">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Sentiment Distribution</h3>
              <p className="chart-card-subtitle">Global breakdown of all social events</p>
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  dataKey="count"
                  nameKey="sentiment"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                >
                  {distribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.sentiment.toLowerCase() === 'positive' ? COLORS.positive : 
                            entry.sentiment.toLowerCase() === 'negative' ? COLORS.negative : 
                            entry.sentiment.toLowerCase() === 'neutral' ? COLORS.neutral : '#64748b'} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val, name, entry) => [`${val.toLocaleString()} (${entry.payload.percentage}%)`, name]}
                  contentStyle={{ backgroundColor: '#0e1726', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment Trend Over Time */}
        <div className="glass-panel chart-card col-8">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Timeline Dynamics & Sentiment Score</h3>
              <p className="chart-card-subtitle">Monthly progression showing SXSW 2011, Airline 2015, and Big Tech 2020</p>
            </div>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="period" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0e1726', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Legend />
                <Area type="monotone" dataKey="positive" name="Positive Posts" stroke="#10b981" fillOpacity={1} fill="url(#colorPositive)" />
                <Area type="monotone" dataKey="negative" name="Negative Posts" stroke="#f43f5e" fillOpacity={1} fill="url(#colorNegative)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Brands Sentiment Composition */}
        <div className="glass-panel chart-card col-8">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Top 10 Brands Mention Breakdown</h3>
              <p className="chart-card-subtitle">Multi-class volume distribution across highest traffic brands</p>
            </div>
          </div>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topBrands} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#64748b" angle={-25} textAnchor="end" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0e1726', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Positive" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Neutral" stackId="a" fill="#0ea5e9" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Negative" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Negative Reason Drivers */}
        <div className="glass-panel chart-card col-4">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Negative Reason Drivers</h3>
              <p className="chart-card-subtitle">Primary complaint categories from airline customers</p>
            </div>
            <select 
              className="control-select" 
              value={selectedBrandFilter} 
              onChange={(e) => handleReasonBrandChange(e.target.value)}
              style={{ fontSize: '0.78rem', padding: '4px 8px' }}
            >
              <option value="">All Airlines</option>
              {brands.filter(b => b.industry === 'Airline').map(b => (
                <option key={b.brand_key} value={b.brand_name}>{b.brand_name}</option>
              ))}
            </select>
          </div>
          <div style={{ height: 320 }}>
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
                  contentStyle={{ backgroundColor: '#0e1726', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  formatter={(val, name, entry) => [`${val.toLocaleString()} (${entry.payload.percentage}%)`, 'Complaints']}
                />
                <Bar dataKey="count" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
