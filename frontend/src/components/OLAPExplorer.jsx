import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Database, Filter, RotateCw, GitCommit, Layers, 
  ArrowDownRight, CheckSquare, RefreshCw 
} from 'lucide-react';
import { 
  fetchOLAPRollup, fetchOLAPDrilldown, fetchOLAPSlice, 
  postOLAPDice, fetchOLAPPivot, fetchBrandHealth, fetchWeightedSentiment,
  fetchBrands 
} from '../services/api';

export default function OLAPExplorer() {
  const [operation, setOperation] = useState('rollup');
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [pivotMeta, setPivotMeta] = useState(null);

  // Roll-up state
  const [rollupLevel, setRollupLevel] = useState('quarter');
  const [rollupBrand, setRollupBrand] = useState('');
  const [rollupIndustry, setRollupIndustry] = useState('');

  // Drilldown state
  const [drillYear, setDrillYear] = useState('');
  const [drillQuarter, setDrillQuarter] = useState('');

  // Slice state
  const [sliceDim, setSliceDim] = useState('brand');
  const [sliceVal, setSliceVal] = useState('Apple');

  // Dice state
  const [selectedDiceBrands, setSelectedDiceBrands] = useState(['Apple', 'Google', 'United']);
  const [selectedDiceSentiments, setSelectedDiceSentiments] = useState(['Positive', 'Negative']);
  const [selectedDiceYears, setSelectedDiceYears] = useState([2015, 2020]);

  // Pivot state
  const [pivotRow, setPivotRow] = useState('brand');

  useEffect(() => {
    fetchBrands().then(setBrands).catch(console.error);
    executeOperation();
  }, [operation]);

  const executeOperation = async () => {
    setLoading(true);
    setPivotMeta(null);
    try {
      if (operation === 'rollup') {
        const res = await fetchOLAPRollup(rollupLevel, rollupBrand, rollupIndustry);
        setData(res);
      } else if (operation === 'drilldown') {
        const res = await fetchOLAPDrilldown(drillYear ? parseInt(drillYear) : null, drillQuarter ? parseInt(drillQuarter) : null);
        setData(res);
      } else if (operation === 'slice') {
        const res = await fetchOLAPSlice(sliceDim, sliceVal);
        setData(res);
      } else if (operation === 'dice') {
        const res = await postOLAPDice({
          brands: selectedDiceBrands,
          sentiments: selectedDiceSentiments,
          years: selectedDiceYears.map(y => parseInt(y))
        });
        setData(res);
      } else if (operation === 'pivot') {
        const res = await fetchOLAPPivot(pivotRow, 'sentiment');
        setPivotMeta(res);
        setData(res.data);
      } else if (operation === 'brand-health') {
        const res = await fetchBrandHealth();
        setData(res);
      } else if (operation === 'weighted-sentiment') {
        const res = await fetchWeightedSentiment();
        setData(res);
      }
    } catch (err) {
      console.error('OLAP query error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandCheckbox = (bName) => {
    setSelectedDiceBrands(prev => 
      prev.includes(bName) ? prev.filter(x => x !== bName) : [...prev, bName]
    );
  };

  const handleSentimentCheckbox = (sName) => {
    setSelectedDiceSentiments(prev => 
      prev.includes(sName) ? prev.filter(x => x !== sName) : [...prev, sName]
    );
  };

  const handleYearCheckbox = (yr) => {
    setSelectedDiceYears(prev => 
      prev.includes(yr) ? prev.filter(x => x !== yr) : [...prev, yr]
    );
  };

  return (
    <div>
      {/* Studio Header & Operation Selector */}
      <div className="glass-panel olap-controls-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Database color="#38bdf8" size={22} />
              Interactive OLAP Cube Engine
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
              Execute multidimensional queries over the Star Schema analytical cube
            </p>
          </div>

          <button className="btn-primary" onClick={executeOperation} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'status-dot' : ''} />
            {loading ? 'Computing Cube...' : 'Execute OLAP Query'}
          </button>
        </div>

        {/* Operation Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
          {[
            { id: 'rollup', label: '1. Roll-up (Aggregation)' },
            { id: 'drilldown', label: '2. Drill-down (Granularity)' },
            { id: 'slice', label: '3. Slice (Fixed Dimension)' },
            { id: 'dice', label: '4. Dice (Sub-cube Filtering)' },
            { id: 'pivot', label: '5. Pivot (Cross-tabulation)' },
            { id: 'brand-health', label: '6. Brand Health Index' },
            { id: 'weighted-sentiment', label: '7. Engagement-Weighted' }
          ].map(op => (
            <button
              key={op.id}
              onClick={() => setOperation(op.id)}
              className={`nav-tab-btn ${operation === op.id ? 'active' : ''}`}
              style={{ fontSize: '0.82rem', padding: '6px 14px' }}
            >
              {op.label}
            </button>
          ))}
        </div>

        {/* Dynamic Controls based on selected Operation */}
        <div className="olap-controls-grid">
          {operation === 'rollup' && (
            <>
              <div className="control-group">
                <label className="control-label">Time Hierarchy Level</label>
                <select className="control-select" value={rollupLevel} onChange={e => setRollupLevel(e.target.value)}>
                  <option value="year">Year (Highest)</option>
                  <option value="quarter">Quarter</option>
                  <option value="month">Month</option>
                  <option value="day">Day (Lowest)</option>
                </select>
              </div>
              <div className="control-group">
                <label className="control-label">Filter by Brand (Optional)</label>
                <select className="control-select" value={rollupBrand} onChange={e => setRollupBrand(e.target.value)}>
                  <option value="">All Brands</option>
                  {brands.map(b => (
                    <option key={b.brand_key} value={b.brand_name}>{b.brand_name}</option>
                  ))}
                </select>
              </div>
              <div className="control-group">
                <label className="control-label">Filter by Industry (Optional)</label>
                <select className="control-select" value={rollupIndustry} onChange={e => setRollupIndustry(e.target.value)}>
                  <option value="">All Industries</option>
                  <option value="Technology">Technology</option>
                  <option value="Airline">Airline</option>
                </select>
              </div>
            </>
          )}

          {operation === 'drilldown' && (
            <>
              <div className="control-group">
                <label className="control-label">Year Dimension</label>
                <select className="control-select" value={drillYear} onChange={e => setDrillYear(e.target.value)}>
                  <option value="">All Years (High-Level)</option>
                  <option value="2011">2011 (SXSW Tech)</option>
                  <option value="2015">2015 (Airline Tweets)</option>
                  <option value="2020">2020 (Big Tech)</option>
                </select>
              </div>
              {drillYear && (
                <div className="control-group">
                  <label className="control-label">Quarter Dimension</label>
                  <select className="control-select" value={drillQuarter} onChange={e => setDrillQuarter(e.target.value)}>
                    <option value="">All Quarters</option>
                    <option value="1">Q1</option>
                    <option value="2">Q2</option>
                    <option value="3">Q3</option>
                    <option value="4">Q4</option>
                  </select>
                </div>
              )}
            </>
          )}

          {operation === 'slice' && (
            <>
              <div className="control-group">
                <label className="control-label">Slice Dimension</label>
                <select className="control-select" value={sliceDim} onChange={e => {
                  setSliceDim(e.target.value);
                  if (e.target.value === 'brand') setSliceVal('Apple');
                  else if (e.target.value === 'industry') setSliceVal('Airline');
                  else if (e.target.value === 'sentiment') setSliceVal('Negative');
                  else setSliceVal('2020');
                }}>
                  <option value="brand">Brand</option>
                  <option value="industry">Industry</option>
                  <option value="sentiment">Sentiment</option>
                  <option value="year">Year</option>
                </select>
              </div>

              <div className="control-group">
                <label className="control-label">Fixed Slice Value</label>
                {sliceDim === 'brand' && (
                  <select className="control-select" value={sliceVal} onChange={e => setSliceVal(e.target.value)}>
                    {brands.map(b => (
                      <option key={b.brand_key} value={b.brand_name}>{b.brand_name}</option>
                    ))}
                  </select>
                )}
                {sliceDim === 'industry' && (
                  <select className="control-select" value={sliceVal} onChange={e => setSliceVal(e.target.value)}>
                    <option value="Technology">Technology</option>
                    <option value="Airline">Airline</option>
                  </select>
                )}
                {sliceDim === 'sentiment' && (
                  <select className="control-select" value={sliceVal} onChange={e => setSliceVal(e.target.value)}>
                    <option value="Positive">Positive</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Negative">Negative</option>
                  </select>
                )}
                {sliceDim === 'year' && (
                  <select className="control-select" value={sliceVal} onChange={e => setSliceVal(e.target.value)}>
                    <option value="2011">2011</option>
                    <option value="2015">2015</option>
                    <option value="2020">2020</option>
                  </select>
                )}
              </div>
            </>
          )}

          {operation === 'dice' && (
            <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="control-label" style={{ marginBottom: 6, display: 'block' }}>Select Brands (Multi-select):</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Apple', 'Google', 'Nvidia', 'Amazon', 'Tesla', 'United', 'Delta', 'Southwest'].map(b => (
                    <button
                      key={b}
                      onClick={() => handleBrandCheckbox(b)}
                      className="sample-chip"
                      style={{
                        backgroundColor: selectedDiceBrands.includes(b) ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                        borderColor: selectedDiceBrands.includes(b) ? '#38bdf8' : 'rgba(255,255,255,0.08)',
                        color: selectedDiceBrands.includes(b) ? '#ffffff' : 'var(--text-muted)'
                      }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <label className="control-label" style={{ marginBottom: 6, display: 'block' }}>Sentiments:</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['Positive', 'Neutral', 'Negative'].map(s => (
                      <button
                        key={s}
                        onClick={() => handleSentimentCheckbox(s)}
                        className="sample-chip"
                        style={{
                          backgroundColor: selectedDiceSentiments.includes(s) ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                          borderColor: selectedDiceSentiments.includes(s) ? '#38bdf8' : 'rgba(255,255,255,0.08)',
                          color: selectedDiceSentiments.includes(s) ? '#ffffff' : 'var(--text-muted)'
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="control-label" style={{ marginBottom: 6, display: 'block' }}>Years:</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[2011, 2015, 2020].map(y => (
                      <button
                        key={y}
                        onClick={() => handleYearCheckbox(y)}
                        className="sample-chip"
                        style={{
                          backgroundColor: selectedDiceYears.includes(y) ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                          borderColor: selectedDiceYears.includes(y) ? '#38bdf8' : 'rgba(255,255,255,0.08)',
                          color: selectedDiceYears.includes(y) ? '#ffffff' : 'var(--text-muted)'
                        }}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {operation === 'pivot' && (
            <div className="control-group">
              <label className="control-label">Rows Dimension</label>
              <select className="control-select" value={pivotRow} onChange={e => setPivotRow(e.target.value)}>
                <option value="brand">Brand</option>
                <option value="industry">Industry</option>
                <option value="year">Year</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Visual Chart if applicable */}
      {data.length > 0 && operation !== 'pivot' && (
        <div className="glass-panel chart-card" style={{ marginBottom: 24 }}>
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">OLAP Cube Visual Projection</h3>
              <p className="chart-card-subtitle">Rendered aggregation for {operation.toUpperCase()} operation</p>
            </div>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              {operation === 'rollup' ? (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="time_bucket" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0e1726', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="positive_count" name="Positive" fill="#10b981" />
                  <Bar dataKey="neutral_count" name="Neutral" fill="#0ea5e9" />
                  <Bar dataKey="negative_count" name="Negative" fill="#f43f5e" />
                </BarChart>
              ) : operation === 'brand-health' ? (
                <BarChart data={data.slice(0, 12)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="brand_name" stroke="#64748b" angle={-25} textAnchor="end" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0e1726', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Bar dataKey="brand_health_index" name="Health Index (Pos% - Neg%)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart data={data.slice(0, 15)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey={data[0]?.label ? 'label' : data[0]?.time_bucket ? 'time_bucket' : data[0]?.brand_name ? 'brand_name' : 'drill_key'} stroke="#64748b" angle={-20} textAnchor="end" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0e1726', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Bar dataKey="count" name="Count" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Dynamic Results Table */}
      <div className="glass-panel chart-card">
        <div className="chart-card-header">
          <div>
            <h3 className="chart-card-title">OLAP Query Execution Results ({data.length} records)</h3>
            <p className="chart-card-subtitle">Underlying relational star schema aggregated tuple set</p>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              {operation === 'pivot' && pivotMeta ? (
                <tr>
                  <th>{pivotMeta.row_dimension.toUpperCase()}</th>
                  <th>Positive</th>
                  <th>Neutral</th>
                  <th>Negative</th>
                  <th>Total Mentions</th>
                  <th>Average Sentiment</th>
                </tr>
              ) : operation === 'rollup' ? (
                <tr>
                  <th>Time Bucket</th>
                  <th>Total Mentions</th>
                  <th>Positive Count</th>
                  <th>Neutral Count</th>
                  <th>Negative Count</th>
                  <th>Positive %</th>
                  <th>Negative %</th>
                  <th>Avg Sentiment</th>
                </tr>
              ) : operation === 'brand-health' ? (
                <tr>
                  <th>Brand</th>
                  <th>Industry</th>
                  <th>Mentions</th>
                  <th>Positive %</th>
                  <th>Neutral %</th>
                  <th>Negative %</th>
                  <th>Health Index</th>
                  <th>Avg Score</th>
                </tr>
              ) : operation === 'weighted-sentiment' ? (
                <tr>
                  <th>Brand</th>
                  <th>Industry</th>
                  <th>Total Mentions</th>
                  <th>Retweet Engagement</th>
                  <th>Raw Sentiment</th>
                  <th>Weighted Sentiment</th>
                </tr>
              ) : (
                <tr>
                  {data.length > 0 && Object.keys(data[0]).map(key => (
                    <th key={key}>{key.replace(/_/g, ' ').toUpperCase()}</th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx}>
                  {operation === 'pivot' ? (
                    <>
                      <td style={{ fontWeight: 600 }}>{row.row_name}</td>
                      <td><span className="badge-pos">{row.positive?.toLocaleString()}</span></td>
                      <td><span className="badge-neu">{row.neutral?.toLocaleString()}</span></td>
                      <td><span className="badge-neg">{row.negative?.toLocaleString()}</span></td>
                      <td style={{ fontWeight: 700 }}>{row.total?.toLocaleString()}</td>
                      <td>{row.avg_sentiment > 0 ? `+${row.avg_sentiment}` : row.avg_sentiment}</td>
                    </>
                  ) : operation === 'rollup' ? (
                    <>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>{row.time_bucket}</td>
                      <td>{row.total_mentions?.toLocaleString()}</td>
                      <td>{row.positive_count?.toLocaleString()}</td>
                      <td>{row.neutral_count?.toLocaleString()}</td>
                      <td>{row.negative_count?.toLocaleString()}</td>
                      <td><span className="badge-pos">{row.positive_pct}%</span></td>
                      <td><span className="badge-neg">{row.negative_pct}%</span></td>
                      <td>{row.avg_sentiment > 0 ? `+${row.avg_sentiment}` : row.avg_sentiment}</td>
                    </>
                  ) : operation === 'brand-health' ? (
                    <>
                      <td style={{ fontWeight: 600 }}>{row.brand_name}</td>
                      <td><span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{row.industry}</span></td>
                      <td>{row.total_mentions?.toLocaleString()}</td>
                      <td><span className="badge-pos">{row.positive_pct}%</span></td>
                      <td><span className="badge-neu">{row.neutral_pct}%</span></td>
                      <td><span className="badge-neg">{row.negative_pct}%</span></td>
                      <td style={{ fontWeight: 800, color: row.brand_health_index >= 0 ? '#34d399' : '#fb7185' }}>
                        {row.brand_health_index > 0 ? `+${row.brand_health_index}` : row.brand_health_index}%
                      </td>
                      <td>{row.avg_sentiment}</td>
                    </>
                  ) : operation === 'weighted-sentiment' ? (
                    <>
                      <td style={{ fontWeight: 600 }}>{row.brand_name}</td>
                      <td>{row.industry}</td>
                      <td>{row.mentions?.toLocaleString()}</td>
                      <td>{row.total_retweets?.toLocaleString()}</td>
                      <td>{row.raw_avg_sentiment}</td>
                      <td style={{ fontWeight: 800, color: row.weighted_sentiment_score >= 0 ? '#34d399' : '#fb7185' }}>
                        {row.weighted_sentiment_score > 0 ? `+${row.weighted_sentiment_score}` : row.weighted_sentiment_score}
                      </td>
                    </>
                  ) : (
                    Object.values(row).map((val, cIdx) => (
                      <td key={cIdx}>{typeof val === 'number' ? val.toLocaleString() : String(val)}</td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
