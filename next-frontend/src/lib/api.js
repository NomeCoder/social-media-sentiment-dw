const API_BASE = '/api';

export async function fetchOverview() {
  const res = await fetch(`${API_BASE}/dashboard/overview`);
  if (!res.ok) throw new Error('Failed to fetch overview KPIs');
  return res.json();
}

export async function fetchBrands() {
  const res = await fetch(`${API_BASE}/brands`);
  if (!res.ok) throw new Error('Failed to fetch brands');
  return res.json();
}

export async function fetchSentimentDistribution() {
  const res = await fetch(`${API_BASE}/sentiment/distribution`);
  if (!res.ok) throw new Error('Failed to fetch sentiment distribution');
  return res.json();
}

export async function fetchSentimentTrend() {
  const res = await fetch(`${API_BASE}/sentiment/trend`);
  if (!res.ok) throw new Error('Failed to fetch sentiment trend');
  return res.json();
}

export async function fetchNegativeReasons(brand = '') {
  const url = brand
    ? `${API_BASE}/sentiment/negative-reasons?brand=${encodeURIComponent(brand)}`
    : `${API_BASE}/sentiment/negative-reasons`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch negative reasons');
  return res.json();
}

export async function fetchOLAPRollup(level = 'quarter', brand = '', industry = '') {
  let url = `${API_BASE}/olap/rollup?level=${level}`;
  if (brand) url += `&brand=${encodeURIComponent(brand)}`;
  if (industry) url += `&industry=${encodeURIComponent(industry)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch OLAP rollup');
  return res.json();
}

export async function fetchOLAPDrilldown(year, quarter, month) {
  let url = `${API_BASE}/olap/drilldown?`;
  const params = [];
  if (year) params.push(`year=${year}`);
  if (quarter) params.push(`quarter=${quarter}`);
  if (month) params.push(`month=${month}`);
  url += params.join('&');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch OLAP drilldown');
  return res.json();
}

export async function fetchOLAPSlice(dimension, value) {
  const res = await fetch(`${API_BASE}/olap/slice?dimension=${encodeURIComponent(dimension)}&value=${encodeURIComponent(value)}`);
  if (!res.ok) throw new Error('Failed to fetch OLAP slice');
  return res.json();
}

export async function postOLAPDice(diceData) {
  const res = await fetch(`${API_BASE}/olap/dice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(diceData),
  });
  if (!res.ok) throw new Error('Failed to fetch OLAP dice');
  return res.json();
}

export async function fetchOLAPPivot(rowDim = 'brand', colDim = 'sentiment') {
  const res = await fetch(`${API_BASE}/olap/pivot?row_dim=${rowDim}&col_dim=${colDim}`);
  if (!res.ok) throw new Error('Failed to fetch OLAP pivot');
  return res.json();
}

export async function fetchBrandHealth() {
  const res = await fetch(`${API_BASE}/olap/brand-health`);
  if (!res.ok) throw new Error('Failed to fetch brand health');
  return res.json();
}

export async function fetchWeightedSentiment() {
  const res = await fetch(`${API_BASE}/olap/weighted-sentiment`);
  if (!res.ok) throw new Error('Failed to fetch weighted sentiment');
  return res.json();
}

export async function predictSentiment(text) {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Prediction failed');
  return res.json();
}

export async function fetchModelMetrics() {
  const res = await fetch(`${API_BASE}/model/metrics`);
  if (!res.ok) throw new Error('Failed to fetch model metrics');
  return res.json();
}
