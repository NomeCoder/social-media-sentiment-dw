import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CheckCircle2, AlertCircle, BarChart3, 
  Send, Cpu, RefreshCw, HelpCircle 
} from 'lucide-react';
import { predictSentiment, fetchModelMetrics } from '../services/api';

const SAMPLE_TWEETS = [
  "Delta customer service was amazing today, absolutely loved the prompt response!",
  "Terrible experience, flight was delayed for 7 hours with no explanation or voucher. #neveragain",
  "Google announces new AI features at I/O today, looking forward to the developer preview.",
  "My new iPad screen is gorgeous! Best tablet purchase I've ever made.",
  "Nvidia RTX 3080 restock sold out in 2 seconds, completely ridiculous bot situation."
];

export default function MLPlayground() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetchModelMetrics().then(setMetrics).catch(console.error);
  }, []);

  const handlePredict = async (tweetText = text) => {
    const input = tweetText || text;
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await predictSentiment(input);
      setPrediction(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectSample = (sample) => {
    setText(sample);
    handlePredict(sample);
  };

  return (
    <div>
      {/* Real-Time Prediction Sandbox */}
      <div className="glass-panel prediction-card" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles color="#38bdf8" size={22} />
              Live Sentiment Inference Engine
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
              Test the trained TF-IDF + Logistic Regression NLP pipeline on custom tweets
            </p>
          </div>
          <span className="dw-status-badge">Model: TF-IDF + Logistic Regression</span>
        </div>

        {/* Sample presets */}
        <div className="sample-prompts-row">
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', alignSelf: 'center', marginRight: 4 }}>Try Sample:</span>
          {SAMPLE_TWEETS.map((sample, idx) => (
            <button key={idx} className="sample-chip" onClick={() => selectSample(sample)}>
              Sample {idx + 1}
            </button>
          ))}
        </div>

        {/* Text input */}
        <textarea
          className="prediction-textarea"
          placeholder="Enter a tweet or customer review to classify sentiment in real-time..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Preserves negations, strips URLs/mentions, normalizes sentiment punctuation.
          </span>
          <button className="btn-primary" onClick={() => handlePredict()} disabled={loading || !text.trim()}>
            <Send size={15} />
            {loading ? 'Classifying...' : 'Predict Sentiment'}
          </button>
        </div>

        {/* Prediction Results Banner */}
        {prediction && (
          <div style={{
            marginTop: 24,
            padding: 20,
            borderRadius: 12,
            background: 'rgba(14, 23, 38, 0.85)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Classified Sentiment:</span>
                <span className={
                  prediction.sentiment === 'positive' ? 'badge-pos' :
                  prediction.sentiment === 'negative' ? 'badge-neg' : 'badge-neu'
                } style={{ fontSize: '0.95rem', padding: '4px 14px', textTransform: 'uppercase' }}>
                  {prediction.sentiment}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                  (Score: {prediction.sentiment_score > 0 ? `+${prediction.sentiment_score}` : prediction.sentiment_score})
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Confidence:</span>
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#38bdf8'
                }}>
                  {(prediction.confidence * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Probability Breakdown Progress Bars */}
            {prediction.probabilities && (
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 8, display: 'block' }}>
                  Class Probability Distribution:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {Object.entries(prediction.probabilities).map(([label, prob]) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                        <span style={{ textTransform: 'capitalize' }}>{label}</span>
                        <span style={{ fontWeight: 700 }}>{(prob * 100).toFixed(1)}%</span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          width: `${prob * 100}%`,
                          height: '100%',
                          background: label === 'positive' ? '#10b981' : label === 'negative' ? '#f43f5e' : '#0ea5e9'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Model Evaluation & Metrics Report */}
      {metrics && (
        <div className="glass-panel chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Model Evaluation Report & Test Performance</h3>
              <p className="chart-card-subtitle">
                Stratified 80/20 train/test evaluation on {metrics.sample_counts.total?.toLocaleString()} labeled ground-truth tweets
              </p>
            </div>
            <span className="dw-status-badge">Test Samples: {metrics.sample_counts.test?.toLocaleString()}</span>
          </div>

          {/* Metrics summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Accuracy</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8', marginTop: 4 }}>
                {(metrics.accuracy * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Macro F1-Score</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a855f7', marginTop: 4 }}>
                {(metrics.macro_f1 * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Weighted F1-Score</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: 4 }}>
                {(metrics.weighted_f1 * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Macro Precision</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>
                {(metrics.macro_precision * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Macro Recall</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', marginTop: 4 }}>
                {(metrics.macro_recall * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Confusion Matrix */}
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 12 }}>Confusion Matrix (Test Set)</h4>
            <div className="confusion-matrix-grid">
              <div className="cm-cell cm-header">Actual \ Pred</div>
              <div className="cm-cell cm-header">Positive</div>
              <div className="cm-cell cm-header">Neutral</div>
              <div className="cm-cell cm-header">Negative</div>

              {metrics.confusion_matrix.labels.map((actualLabel, rIdx) => (
                <React.Fragment key={actualLabel}>
                  <div className="cm-cell cm-header" style={{ textTransform: 'capitalize' }}>{actualLabel}</div>
                  {metrics.confusion_matrix.matrix[rIdx].map((val, cIdx) => (
                    <div 
                      key={cIdx} 
                      className={`cm-cell ${rIdx === cIdx ? 'cm-highlight' : 'cm-neutral'}`}
                    >
                      {val.toLocaleString()}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
