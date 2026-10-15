const API_BASE = '/api';

export const fetchOverview = async () => {
  const res = await fetch(`${API_BASE}/dashboard/overview`);
  if (!res.ok) throw new Error('Failed to fetch overview KPIs');
  return res.json();
};

export const fetchBrands = async () => {
  const res = await fetch(`${API_BASE}/brands`);
  if (!res.ok) throw new Error('Failed to fetch brands');
  return res.json();
};

export const fetchSentimentDistribution = async () => {
  const res = await fetch(`${API_BASE}/sentiment/distribution`);
  if (!res.ok) throw new Error('Failed to fetch sentiment distribution');
  return res.json();
};

export const fetchSentimentTrend = async () => {
  const res = await fetch(`${API_BASE}/sentiment/trend`);
  if (!res.ok) throw new Error('Failed to fetch sentiment trend');
  return res.json();
};

export const fetchNegativeReasons = async (brand = '') => {
  const url = brand ? `${API_BASE}/sentiment/negative-reasons?brand=${encodeURIComponent(brand)}` : `${API_BASE}/sentiment/negative-reasons`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch negative reasons');
  return res.json();
};

export const fetchOLAPRollup = async (level = 'quarter', brand = '', industry = '') => {
  let url = `${API_BASE}/olap/rollup?level=${level}`;
  if (brand) url += `&brand=${encodeURIComponent(brand)}`;
  if (industry) url += `&industry=${encodeURIComponent(industry)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch OLAP rollup');
  return res.json();
};

export const fetchOLAPDrilldown = async (year, quarter, month) => {
  let url = `${API_BASE}/olap/drilldown?`;
  const params = [];
  if (year) params.push(`year=${year}`);
  if (quarter) params.push(`quarter=${quarter}`);
  if (month) params.push(`month=${month}`);
  url += params.join('&');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch OLAP drilldown');
  return res.json();
};

export const fetchOLAPSlice = async (dimension, value) => {
  const res = await fetch(`${API_BASE}/olap/slice?dimension=${encodeURIComponent(dimension)}&value=${encodeURIComponent(value)}`);
  if (!res.ok) throw new Error('Failed to fetch OLAP slice');
  return res.json();
};

export const postOLAPDice = async (diceData) => {
  const res = await fetch(`${API_BASE}/olap/dice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(diceData)
  });
  if (!res.ok) throw new Error('Failed to fetch OLAP dice');
  return res.json();
};

export const fetchOLAPPivot = async (rowDim = 'brand', colDim = 'sentiment') => {
  const res = await fetch(`${API_BASE}/olap/pivot?row_dim=${rowDim}&col_dim=${colDim}`);
  if (!res.ok) throw new Error('Failed to fetch OLAP pivot');
  return res.json();
};

export const fetchBrandHealth = async () => {
  const res = await fetch(`${API_BASE}/olap/brand-health`);
  if (!res.ok) throw new Error('Failed to fetch brand health');
  return res.json();
};

export const fetchWeightedSentiment = async () => {
  const res = await fetch(`${API_BASE}/olap/weighted-sentiment`);
  if (!res.ok) throw new Error('Failed to fetch weighted sentiment');
  return res.json();
};

export const predictSentiment = async (text) => {
  const res = await fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error('Prediction failed');
  return res.json();
};

export const fetchModelMetrics = async () => {
  const res = await fetch(`${API_BASE}/model/metrics`);
  if (!res.ok) throw new Error('Failed to fetch model metrics');
  return res.json();
};

export const fetchAssociationRules = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.append('search', params.search);
  if (params.min_support !== undefined) searchParams.append('min_support', params.min_support);
  if (params.min_confidence !== undefined) searchParams.append('min_confidence', params.min_confidence);
  if (params.min_lift !== undefined) searchParams.append('min_lift', params.min_lift);
  if (params.sort_by) searchParams.append('sort_by', params.sort_by);
  if (params.order) searchParams.append('order', params.order);
  if (params.limit) searchParams.append('limit', params.limit);
  if (params.offset) searchParams.append('offset', params.offset);

  const queryStr = searchParams.toString();
  const url = `${API_BASE}/association-rules${queryStr ? `?${queryStr}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch association rules');
  return res.json();
};

export const fetchTopicClusters = async () => {
  const res = await fetch(`${API_BASE}/topics/clusters`);
  if (!res.ok) throw new Error('Failed to fetch topic clusters');
  return res.json();
};

export const predictPostTopic = async (text) => {
  const res = await fetch(`${API_BASE}/topics/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Failed to predict topic');
  return res.json();
};

export const fetchSentimentTrendForecast = async (brand = '', horizon = 14) => {
  const searchParams = new URLSearchParams();
  if (brand && brand !== 'All Brands' && brand !== 'all') {
    searchParams.append('brand', brand);
  }
  searchParams.append('horizon', horizon);
  const url = `${API_BASE}/prediction/trend-forecast?${searchParams.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch sentiment trend forecast');
  return res.json();
};
