"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Send, Activity, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { predictSentiment, fetchModelMetrics } from "@/lib/api";

const SAMPLE_TWEETS = [
  "Delta customer service was amazing today, absolutely loved the prompt response!",
  "Terrible experience, flight was delayed for 7 hours with no explanation or voucher. #neveragain",
  "Google announces new AI features at I/O today, looking forward to the developer preview.",
  "My new iPad screen is gorgeous! Best tablet purchase I've ever made.",
  "Nvidia RTX 3080 restock sold out in 2 seconds, completely ridiculous bot situation.",
];

export default function MLPlayground() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetchModelMetrics().then(setMetrics).catch(console.error);
  }, []);

  const handlePredict = async (customText = text) => {
    const input = customText || text;
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
    <div className="space-y-6">
      {/* Real-time inference sandbox */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-sky-400" />
              Live Sentiment Inference Engine
            </CardTitle>
            <CardDescription>
              Test the optimized Calibrated LinearSVC + Sublinear N-Gram NLP model on custom text
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-sky-500/30 text-sky-300">
            Pipeline: Sublinear N-Gram + Calibrated LinearSVC
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Preset sample buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Quick Test:</span>
            {SAMPLE_TWEETS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => selectSample(sample)}
                className="rounded-md border border-white/10 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:border-white/20 hover:text-white"
              >
                Sample {idx + 1}
              </button>
            ))}
          </div>

          {/* Text input area */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste any tweet, customer review, or social media post to test real-time sentiment..."
            className="h-28 w-full rounded-xl border border-white/10 bg-slate-950 p-4 text-sm text-slate-100 outline-none transition-colors focus:border-sky-500/50"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Preserves negations, handles URLs and @mentions, normalizes punctuation.
            </span>
            <Button onClick={() => handlePredict()} disabled={loading || !text.trim()}>
              <Send className="mr-2 h-4 w-4" />
              {loading ? "Analyzing..." : "Classify Sentiment"}
            </Button>
          </div>

          {/* Prediction Result Banner */}
          {prediction && (
            <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-400">Predicted Label:</span>
                  <Badge
                    variant={
                      prediction.sentiment === "positive"
                        ? "positive"
                        : prediction.sentiment === "negative"
                        ? "negative"
                        : "neutral"
                    }
                    className="px-3 py-1 text-sm uppercase font-bold"
                  >
                    {prediction.sentiment}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    (Score: {prediction.sentiment_score > 0 ? `+${prediction.sentiment_score}` : prediction.sentiment_score})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Model Confidence:</span>
                  <div className="rounded-full bg-sky-500/10 px-3 py-1 text-sm font-bold text-sky-400">
                    {(prediction.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Class probabilities */}
              {prediction.probabilities && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-400">Class Probabilities:</span>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {Object.entries(prediction.probabilities).map(([lbl, prob]) => {
                      const color =
                        lbl === "positive"
                          ? "bg-emerald-500"
                          : lbl === "negative"
                          ? "bg-rose-500"
                          : "bg-sky-500";
                      return (
                        <div key={lbl} className="rounded-lg border border-white/5 bg-slate-950/60 p-3">
                          <div className="mb-1.5 flex justify-between text-xs">
                            <span className="capitalize text-slate-300">{lbl}</span>
                            <span className="font-bold text-white">{(prob * 100).toFixed(1)}%</span>
                          </div>
                          <Progress value={prob * 100} indicatorClassName={color} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Performance Report & Confusion Matrix */}
      {metrics && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Model Evaluation Report</CardTitle>
              <CardDescription>
                Stratified 80/20 train/test evaluation across {metrics.sample_counts?.total?.toLocaleString()} labeled tweets
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
              Test Set: {metrics.sample_counts?.test?.toLocaleString()} samples
            </Badge>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Metric score cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4">
                <span className="text-xs text-slate-400">Accuracy</span>
                <div className="mt-1 text-2xl font-bold text-sky-400">
                  {(metrics.accuracy * 100).toFixed(1)}%
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4">
                <span className="text-xs text-slate-400">Macro F1</span>
                <div className="mt-1 text-2xl font-bold text-purple-400">
                  {(metrics.macro_f1 * 100).toFixed(1)}%
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4">
                <span className="text-xs text-slate-400">Weighted F1</span>
                <div className="mt-1 text-2xl font-bold text-emerald-400">
                  {(metrics.weighted_f1 * 100).toFixed(1)}%
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4">
                <span className="text-xs text-slate-400">Macro Precision</span>
                <div className="mt-1 text-2xl font-bold text-amber-400">
                  {(metrics.macro_precision * 100).toFixed(1)}%
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4">
                <span className="text-xs text-slate-400">Macro Recall</span>
                <div className="mt-1 text-2xl font-bold text-teal-400">
                  {(metrics.macro_recall * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Confusion matrix */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Confusion Matrix (Test Set)
              </h4>
              <div className="mx-auto grid max-w-md grid-cols-4 gap-2 font-mono text-xs">
                <div className="flex items-center justify-center p-2 text-slate-500">Actual \ Pred</div>
                <div className="flex items-center justify-center p-2 text-slate-400">Positive</div>
                <div className="flex items-center justify-center p-2 text-slate-400">Neutral</div>
                <div className="flex items-center justify-center p-2 text-slate-400">Negative</div>

                {metrics.confusion_matrix?.labels.map((actual, rIdx) => (
                  <React.Fragment key={actual}>
                    <div className="flex items-center justify-center p-2 capitalize text-slate-400">{actual}</div>
                    {metrics.confusion_matrix.matrix[rIdx].map((val, cIdx) => (
                      <div
                        key={cIdx}
                        className={`flex items-center justify-center rounded-lg p-3 font-bold ${
                          rIdx === cIdx
                            ? "border border-sky-400/40 bg-sky-500/20 text-sky-300"
                            : "border border-white/5 bg-slate-950 text-slate-400"
                        }`}
                      >
                        {val.toLocaleString()}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
