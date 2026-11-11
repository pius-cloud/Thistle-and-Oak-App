import React, { useState, useMemo, useRef } from 'react';
import { useAnalytics } from '../context/AnalyticsContext';
import { calculateSentimentBreakdown } from '../utils/analyticsCalculations';
import { formatPercent, formatDateUK } from '../utils/csvParser';
import { AISentimentResult, CommentItem } from '../types/analytics';
import {
  Smile,
  Meh,
  Frown,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Tag,
  Share2,
  Info,
} from 'lucide-react';

export const SentimentPage: React.FC = () => {
  const {
    comments,
    aiSentimentResults,
    setAiSentimentResults,
    aiSentimentLoading,
    setAiSentimentLoading,
    aiSentimentProgress,
    setAiSentimentProgress,
  } = useAnalytics();

  const [activeTab, setActiveTab] = useState<'topic' | 'channel' | 'city'>('topic');
  const [selectedBatchSize, setSelectedBatchSize] = useState<'sample' | 'full'>('full');
  const [apiError, setApiError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Reference sentiment distribution calculations
  const breakdown = useMemo(() => {
    return calculateSentimentBreakdown(comments);
  }, [comments]);

  // Comments map by ID
  const commentMap = useMemo(() => {
    const map = new Map<string, CommentItem>();
    comments.forEach(c => map.set(c.comment_id, c));
    return map;
  }, [comments]);

  // Model accuracy & discrepancy computation
  const { accuracyPct, matchesCount, totalEvaluated, discrepancies } = useMemo(() => {
    if (aiSentimentResults.length === 0) {
      return { accuracyPct: 0, matchesCount: 0, totalEvaluated: 0, discrepancies: [] };
    }

    let matches = 0;
    const errors: Array<{
      comment: CommentItem;
      predicted: AISentimentResult;
    }> = [];

    aiSentimentResults.forEach(res => {
      const original = commentMap.get(res.comment_id);
      if (original) {
        // Compare sentiment strings normalized
        if (original.sentiment_label.toLowerCase() === res.sentiment.toLowerCase()) {
          matches++;
        } else {
          errors.push({
            comment: original,
            predicted: res,
          });
        }
      }
    });

    const accuracy = (matches / aiSentimentResults.length) * 100;
    return {
      accuracyPct: accuracy,
      matchesCount: matches,
      totalEvaluated: aiSentimentResults.length,
      discrepancies: errors,
    };
  }, [aiSentimentResults, commentMap]);

  // Run AI sentiment analysis in batches of 50
  const runAiSentiment = async (mode: 'sample' | 'full') => {
    setApiError(null);
    setAiSentimentLoading(true);

    const targetComments = mode === 'sample' ? comments.slice(0, 50) : comments;
    const batchSize = 50;
    const totalBatches = Math.ceil(targetComments.length / batchSize);

    setAiSentimentProgress({
      currentBatch: 0,
      totalBatches,
      processedCount: 0,
      totalCount: targetComments.length,
    });

    const allResults: AISentimentResult[] = [];
    abortControllerRef.current = new AbortController();

    try {
      for (let i = 0; i < targetComments.length; i += batchSize) {
        const batch = targetComments.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;

        setAiSentimentProgress({
          currentBatch: batchNum,
          totalBatches,
          processedCount: allResults.length,
          totalCount: targetComments.length,
        });

        const payload = batch.map(c => ({
          comment_id: c.comment_id,
          comment_text: c.comment_text,
        }));

        const res = await fetch('/api/gemini/sentiment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comments: payload }),
          signal: abortControllerRef.current.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Batch ${batchNum} failed with status ${res.status}`);
        }

        const data = await res.json();
        if (Array.isArray(data.results)) {
          allResults.push(...data.results);
        }

        setAiSentimentResults([...allResults]);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Sentiment analysis run error:', err);
        setApiError(err.message || 'Error occurred during sentiment processing');
      }
    } finally {
      setAiSentimentLoading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelRun = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setAiSentimentLoading(false);
  };

  const getSentimentBadge = (label: string) => {
    const l = label.toLowerCase();
    if (l === 'positive') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
          <Smile className="w-3 h-3 text-emerald-600" />
          Positive
        </span>
      );
    }
    if (l === 'negative') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-fuchsia-900 bg-fuchsia-50 border border-fuchsia-200">
          <Frown className="w-3 h-3 text-fuchsia-700" />
          Negative
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200">
        <Meh className="w-3 h-3 text-slate-500" />
        Neutral
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Customer Sentiment Intelligence (UK Market)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Auditing 900 British customer comments with UK regional slang calibration and AI accuracy validation.
        </p>
      </div>

      {/* Part A: Reference Sentiment Distribution Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Total Comments Evaluated
          </span>
          <span className="text-2xl font-bold text-slate-900 font-mono mt-2 block tabular-nums">
            {breakdown.total.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            12 UK Cities · 5 Social Channels
          </span>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Positive Comments
            </span>
            <Smile className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-bold text-emerald-800 font-mono mt-2 block tabular-nums">
            {breakdown.positive.toLocaleString()}
          </span>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
            {breakdown.positivePct.toFixed(1)}% of total volume
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm bg-slate-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Neutral Comments
            </span>
            <Meh className="w-4 h-4 text-slate-500" />
          </div>
          <span className="text-2xl font-bold text-slate-800 font-mono mt-2 block tabular-nums">
            {breakdown.neutral.toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            {breakdown.neutralPct.toFixed(1)}% of total volume
          </span>
        </div>

        <div className="bg-white rounded-xl border border-fuchsia-200 p-4 shadow-sm bg-fuchsia-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-fuchsia-900 uppercase tracking-wider">
              Negative Comments
            </span>
            <Frown className="w-4 h-4 text-fuchsia-700" />
          </div>
          <span className="text-2xl font-bold text-fuchsia-900 font-mono mt-2 block tabular-nums">
            {breakdown.negative.toLocaleString()}
          </span>
          <span className="text-[11px] text-fuchsia-800 font-medium mt-1 block">
            {breakdown.negativePct.toFixed(1)}% of total volume
          </span>
        </div>
      </div>

      {/* Part A (cont): Reference Sentiment Breakdown by Topic, Channel, and City */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Reference Sentiment Breakdown (Google Sheets Truth)
            </h2>
            <p className="text-xs text-slate-500">
              Cross-tabulation across customer topics, publication channels, and UK metropolitan areas.
            </p>
          </div>

          {/* Segmented Tab Controls */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab('topic')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'topic' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Topic ({breakdown.byTopic.length})
            </button>
            <button
              onClick={() => setActiveTab('channel')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'channel' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Channel ({breakdown.byChannel.length})
            </button>
            <button
              onClick={() => setActiveTab('city')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'city' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By UK City ({breakdown.byCity.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">
                  {activeTab === 'topic' ? 'Topic Category' : activeTab === 'channel' ? 'Social Channel' : 'UK City'}
                </th>
                <th className="py-3 px-4 text-right">Total Comments</th>
                <th className="py-3 px-4 text-right">Positive</th>
                <th className="py-3 px-4 text-right">Neutral</th>
                <th className="py-3 px-4 text-right">Negative</th>
                <th className="py-3 px-4 text-right">Avg Score</th>
                <th className="py-3 px-4 w-48">Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(activeTab === 'topic' ? breakdown.byTopic : activeTab === 'channel' ? breakdown.byChannel : breakdown.byCity).map(row => (
                <tr key={row.key} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">{row.key}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">{row.total}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 font-medium">{row.positive} ({row.positivePct.toFixed(0)}%)</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">{row.neutral} ({row.neutralPct.toFixed(0)}%)</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-fuchsia-800 font-medium">{row.negative} ({row.negativePct.toFixed(0)}%)</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                    <span className={row.avgScore > 0 ? 'text-emerald-700' : row.avgScore < 0 ? 'text-fuchsia-700' : 'text-slate-600'}>
                      {row.avgScore > 0 ? `+${row.avgScore.toFixed(2)}` : row.avgScore.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
                      <div style={{ width: `${row.positivePct}%` }} className="bg-emerald-500" title={`Positive: ${row.positivePct.toFixed(1)}%`} />
                      <div style={{ width: `${row.neutralPct}%` }} className="bg-slate-300" title={`Neutral: ${row.neutralPct.toFixed(1)}%`} />
                      <div style={{ width: `${row.negativePct}%` }} className="bg-fuchsia-700" title={`Negative: ${row.negativePct.toFixed(1)}%`} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Part B: AI Sentiment Analysis Section */}
      <div className="bg-white rounded-xl border border-purple-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-purple-100">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#6B35A8]" />
              <h2 className="text-base font-bold text-slate-900">
                AI Sentiment Analysis (Gemini Flash with UK Slang Engine)
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Sends customer comments to Gemini in batches of 50. Calibrated for British English idioms
              (&ldquo;well chuffed&rdquo;, &ldquo;proper bargain&rdquo; vs &ldquo;daylight robbery&rdquo;, &ldquo;dodgy&rdquo;).
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {aiSentimentLoading ? (
              <button
                onClick={cancelRun}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel Analysis
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => runAiSentiment('sample')}
                  className="px-3.5 py-2 text-xs font-semibold text-[#6B35A8] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                >
                  Test 1 Batch (50 comments)
                </button>
                <button
                  onClick={() => runAiSentiment('full')}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#6B35A8] hover:bg-[#7D3FC5] active:scale-[0.98] rounded-lg transition-all shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run AI sentiment analysis</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar when running */}
        {aiSentimentLoading && (
          <div className="mt-4 p-4 rounded-lg bg-purple-50 border border-purple-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold mb-2">
              <span>
                Processing Batch {aiSentimentProgress.currentBatch} of {aiSentimentProgress.totalBatches}
              </span>
              <span className="font-mono text-[#6B35A8]">
                {aiSentimentProgress.processedCount} / {aiSentimentProgress.totalCount} comments ({Math.round((aiSentimentProgress.processedCount / (aiSentimentProgress.totalCount || 1)) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-purple-200 h-3 rounded-full overflow-hidden">
              <div
                className="bg-[#6B35A8] h-full transition-all duration-300 ease-out"
                style={{
                  width: `${(aiSentimentProgress.currentBatch / (aiSentimentProgress.totalBatches || 1)) * 100}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-purple-700 mt-2">
              Calling Gemini with UK vernacular prompt calibration. Results update dynamically as each 50-comment batch finishes.
            </p>
          </div>
        )}

        {/* API Error Message */}
        {apiError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Accuracy Scoreboard (if results exist) */}
        {aiSentimentResults.length > 0 && (
          <div className="mt-6 space-y-6">
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
                  Model Accuracy vs. Ground Truth
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">
                    {accuracyPct.toFixed(1)}%
                  </span>
                  <span className="text-xs text-slate-300">
                    ({matchesCount} exact matches out of {totalEvaluated} comments evaluated)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Evaluated</span>
                  <span className="text-white font-mono font-bold text-sm">{totalEvaluated}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Matches</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">{matchesCount}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Discrepancies</span>
                  <span className="text-fuchsia-400 font-mono font-bold text-sm">{discrepancies.length}</span>
                </div>
              </div>
            </div>

            {/* Table of Comments Model Got Wrong */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-fuchsia-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Discrepancy Analysis (Comments the Model Got Wrong: {discrepancies.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  Comparing Reference label vs. AI prediction
                </span>
              </div>

              {discrepancies.length === 0 ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-lg text-center text-xs text-emerald-800 font-medium">
                  Remarkable! 100% agreement on all evaluated comments.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
                      <tr>
                        <th className="py-2.5 px-3 w-20">ID</th>
                        <th className="py-2.5 px-3 w-24">Location</th>
                        <th className="py-2.5 px-3">Comment Text (UK Slang &amp; Context)</th>
                        <th className="py-2.5 px-3 w-28 text-center">Reference Label</th>
                        <th className="py-2.5 px-3 w-28 text-center">AI Prediction</th>
                        <th className="py-2.5 px-3 w-20 text-right">AI Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {discrepancies.map(({ comment, predicted }) => (
                        <tr key={comment.comment_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-500 font-medium">{comment.comment_id}</td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <div>{comment.uk_city}</div>
                            <div className="text-[10px] text-slate-400">{comment.channel}</div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 leading-snug">
                            &ldquo;{comment.comment_text}&rdquo;
                            <div className="text-[10px] text-slate-400 mt-0.5">Topic: {comment.topic}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {getSentimentBadge(comment.sentiment_label)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {getSentimentBadge(predicted.sentiment)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                            <span className={predicted.score > 0 ? 'text-emerald-700' : predicted.score < 0 ? 'text-fuchsia-700' : 'text-slate-600'}>
                              {predicted.score > 0 ? `+${predicted.score.toFixed(2)}` : predicted.score.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
