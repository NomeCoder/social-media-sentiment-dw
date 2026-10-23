const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && (window.location.port === '3000' || window.location.port === '5173')
    ? 'http://127.0.0.1:8000/api'
    : '/api');

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

export async function fetchTopicClusters(k = null) {
  const url = k ? `${API_BASE}/topics/clusters?k=${k}` : `${API_BASE}/topics/clusters`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch topic clusters');
  return res.json();
}

export async function fetchElbowCurve() {
  const res = await fetch(`${API_BASE}/topics/elbow`);
  if (!res.ok) throw new Error('Failed to fetch elbow curve');
  return res.json();
}

export async function predictPostTopic(text, k = null) {
  const body = { text };
  if (k !== null && k !== undefined) {
    body.k = k;
  }
  const url = k ? `${API_BASE}/topics/predict?k=${k}` : `${API_BASE}/topics/predict`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to predict topic');
  return res.json();
}

export async function fetchAssociationRules(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.append('search', params.search);
  if (params.min_support !== undefined) searchParams.append('min_support', params.min_support);
  if (params.min_confidence !== undefined) searchParams.append('min_confidence', params.min_confidence);
  if (params.min_lift !== undefined) searchParams.append('min_lift', params.min_lift);
  if (params.sort_by) searchParams.append('sort_by', params.sort_by);
  if (params.order) searchParams.append('order', params.order);
  if (params.limit) searchParams.append('limit', params.limit);
  if (params.offset) searchParams.append('offset', params.offset);
  if (params.mode) searchParams.append('mode', params.mode);
  if (params.regenerate) searchParams.append('regenerate', 'true');

  const queryStr = searchParams.toString();
  const url = `${API_BASE}/association-rules${queryStr ? `?${queryStr}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch association rules');
  return res.json();
}

export async function fetchSentimentTrendForecast(brand = '', horizon = 14) {
  const searchParams = new URLSearchParams();
  if (brand && brand !== 'All Brands' && brand !== 'all') {
    searchParams.append('brand', brand);
  }
  searchParams.append('horizon', horizon);
  const url = `${API_BASE}/prediction/trend-forecast?${searchParams.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch sentiment trend forecast');
  return res.json();
}
