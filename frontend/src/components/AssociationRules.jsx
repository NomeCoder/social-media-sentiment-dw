import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { GitFork, Search, SlidersHorizontal, Sparkles, Zap, Award, TrendingUp, Hash, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchAssociationRules } from '../services/api';

export default function AssociationRules() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [minLift, setMinLift] = useState(0);
  const [minConfidence, setMinConfidence] = useState(0);
  const [sortBy, setSortBy] = useState('lift');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    loadRules();
  }, [search, minLift, minConfidence, sortBy]);

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await fetchAssociationRules({
        search: search.trim() || undefined,
        min_lift: minLift > 0 ? minLift : undefined,
        min_confidence: minConfidence > 0 ? minConfidence / 100 : undefined,
        sort_by: sortBy,
        order: 'desc',
        limit: 150,
      });
      setData(res);
      setPage(1);
    } catch (err) {
      console.error('Failed to load association rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary || {};
  const rules = data?.rules || [];
  const insights = data?.insights || [];

  const totalFiltered = rules.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const paginatedRules = rules.slice((page - 1) * pageSize, page * pageSize);

  const topLiftRules = rules.slice(0, 10).map((r) => ({
    name: `${r.antecedents_str} -> ${r.consequents_str}`,
    shortName: `${r.antecedents[0]} -> ${r.consequents[0]}`,
    lift: r.lift,
    confidence: r.confidence_pct,
    support: r.support_pct,
  }));

  return (
    <div>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '24px 28px', marginBottom: 24, borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 20, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 700, marginBottom: 8 }}>
              <GitFork size={14} /> Data Mining & Co-Occurrence
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
              Hashtag & Keyword Association Rules
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
              Discovered correlations and frequent itemsets across BigTech hashtags (Amazon, Apple, Cloud, Gaming, Twitch, Netflix).
            </p>
          </div>
          <div style={{ background: 'rgba(14, 23, 38, 0.8)', padding: '12px 20px', borderRadius: 12, border: '1px solid var(--border-subtle)', textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mined Rules Ingested</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>
              {summary.total_rules || 170} Rules
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Max Correlation: {summary.max_lift || 42.26}x Lift</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="glass-panel" style={{ padding: 18, borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <span>Max Rule Lift</span>
            <Zap size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: 8 }}>
            {summary.max_lift || 42.26}x
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Deals & Ganga correlation</span>
        </div>

        <div className="glass-panel" style={{ padding: 18, borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <span>Average Confidence</span>
            <Award size={16} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)', marginTop: 8 }}>
            {summary.avg_confidence ? `${(summary.avg_confidence * 100).toFixed(1)}%` : '68.0%'}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Conditional probability</span>
        </div>

        <div className="glass-panel" style={{ padding: 18, borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <span>Average Lift</span>
            <TrendingUp size={16} color="#a855f7" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#a855f7', marginTop: 8 }}>
            {summary.avg_lift ? `${summary.avg_lift}x` : '5.59x'}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Above random baseline</span>
        </div>

        <div className="glass-panel" style={{ padding: 18, borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <span>Top Consequent</span>
            <Hash size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            #twitch & #amazon
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Primary target clusters</span>
        </div>
      </div>

      {/* Curated Insights */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="#f59e0b" /> Key Discovered Co-Occurrence Patterns
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {insights.map((item, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: 16, borderRadius: 12 }}>
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 700 }}>
                {item.category}
              </span>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 8, marginBottom: 4 }}>{item.title}</h4>
              <p style={{ fontFamily: 'monospace', color: 'var(--primary)', fontSize: '0.8rem', margin: '4px 0' }}>{item.rule}</p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '6px 0' }}>
                Lift: <strong style={{ color: '#fff' }}>{item.lift}x</strong> &middot; Conf: <strong style={{ color: '#fff' }}>{item.confidence}%</strong>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: 0 }}>{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top 10 High Lift Chart */}
      {topLiftRules.length > 0 && (
        <div className="glass-panel chart-card" style={{ marginBottom: 24, padding: 20, borderRadius: 16 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 4 }}>Top Association Rules by Lift Factor</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 16 }}>Lift &gt; 1 indicates strong positive correlation above independent chance.</p>
          <div style={{ height: 260, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topLiftRules} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis type="category" dataKey="shortName" stroke="#94a3b8" fontSize={11} width={130} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(14, 23, 38, 0.95)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}
                />
                <Bar dataKey="lift" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                  {topLiftRules.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index < 3 ? '#f59e0b' : index < 6 ? '#a855f7' : '#38bdf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Rules Table & Filter Controls */}
      <div className="glass-panel" style={{ padding: 20, borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Interactive Rules Explorer</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>Search and filter rules by Support, Confidence, and Lift</p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search hashtag (e.g. apple, cloud)..."
                style={{ padding: '6px 12px 6px 30px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: '#fff', fontSize: '0.8rem', outline: 'none' }}
              />
              <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-dim)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', background: 'var(--bg-main)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <SlidersHorizontal size={14} color="var(--text-muted)" />
              <span>Min Lift:</span>
              <select
                value={minLift}
                onChange={(e) => setMinLift(Number(e.target.value))}
                style={{ background: 'transparent', color: '#f59e0b', fontWeight: 700, border: 'none', outline: 'none', cursor: 'pointer' }}
              >
                <option value={0} style={{ background: '#090d16' }}>All</option>
                <option value={2} style={{ background: '#090d16' }}>&gt; 2.0x</option>
                <option value={5} style={{ background: '#090d16' }}>&gt; 5.0x</option>
                <option value={10} style={{ background: '#090d16' }}>&gt; 10.0x</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', background: 'var(--bg-main)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <span>Min Conf:</span>
              <select
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                style={{ background: 'transparent', color: 'var(--primary)', fontWeight: 700, border: 'none', outline: 'none', cursor: 'pointer' }}
              >
                <option value={0} style={{ background: '#090d16' }}>0%</option>
                <option value={50} style={{ background: '#090d16' }}>&gt; 50%</option>
                <option value={75} style={{ background: '#090d16' }}>&gt; 75%</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 8px', width: 40, textAlign: 'center' }}>#</th>
                <th style={{ padding: '10px 12px' }}>Antecedent (Condition)</th>
                <th style={{ width: 30 }}></th>
                <th style={{ padding: '10px 12px' }}>Consequent (Result)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Support</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Confidence</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Lift</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRules.map((rule, idx) => {
                const globalIdx = (page - 1) * pageSize + idx + 1;
                return (
                  <tr key={rule.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                      {globalIdx}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {rule.antecedents.map((item) => (
                          <span key={item} style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary)', fontSize: '0.75rem' }}>
                            #{item}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-dim)' }}>
                      <ArrowRight size={14} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {rule.consequents.map((item) => (
                          <span key={item} style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>
                            #{item}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {rule.support_pct}%
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#fff' }}>
                      {rule.confidence_pct}%
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 6, background: rule.lift >= 10 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(168, 85, 247, 0.2)', color: rule.lift >= 10 ? '#f59e0b' : '#a855f7', fontWeight: 700, fontFamily: 'monospace' }}>
                        {rule.lift}x
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span>Showing {rules.length > 0 ? (page - 1) * pageSize + 1 : 0} - {Math.min(page * pageSize, rules.length)} of {rules.length} filtered rules</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 6, color: '#fff', cursor: 'pointer' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontFamily: 'monospace' }}>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 6, color: '#fff', cursor: 'pointer' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
