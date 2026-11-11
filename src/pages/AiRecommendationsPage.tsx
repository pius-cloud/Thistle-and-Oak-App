import React, { useState } from 'react';
import { useAnalytics } from '../context/AnalyticsContext';
import {
  calculateKPIs,
  calculateChannelAggregates,
  calculateCampaignAggregates,
  calculateContentTypeEngagement,
  calculateSentimentBreakdown,
} from '../utils/analyticsCalculations';
import { formatGBP, formatPercent, formatRatio } from '../utils/csvParser';
import { AIRecommendation } from '../types/analytics';
import {
  Sparkles,
  Download,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  Target,
  TrendingUp,
  FileDown,
  RefreshCw,
} from 'lucide-react';
import { jsPDF } from 'jspdf';

export const AiRecommendationsPage: React.FC = () => {
  const {
    dailyPerformance,
    campaigns,
    posts,
    comments,
    aiRecommendations,
    setAiRecommendations,
  } = useAnalytics();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computes the compact performance summary strictly from loaded figures
  const computeCompactSummary = () => {
    const kpis = calculateKPIs(dailyPerformance);
    const channels = calculateChannelAggregates(dailyPerformance);
    const campaignAggs = calculateCampaignAggregates(dailyPerformance, campaigns);
    const activeCampaigns = campaignAggs.filter(c => c.spend > 0);
    const sortedByRoas = [...activeCampaigns].sort((a, b) => b.roas - a.roas);
    const contentTypes = calculateContentTypeEngagement(posts);
    const sentiment = calculateSentimentBreakdown(comments);

    return {
      overallTotals: {
        totalSpendGBP: formatGBP(kpis.totalSpend),
        totalRevenueGBP: formatGBP(kpis.totalRevenue),
        totalOrders: kpis.totalOrders,
        overallROAS: `${formatRatio(kpis.roas)}x`,
        overallEngagementRate: formatPercent(kpis.engagementRate),
        overallCTR: formatPercent(kpis.ctr),
        overallConversionRate: formatPercent(kpis.conversionRate),
      },
      channelKPIs: channels.map(c => ({
        channel: c.channel,
        spendGBP: formatGBP(c.spend),
        revenueGBP: formatGBP(c.revenue),
        orders: c.orders,
        roas: `${formatRatio(c.roas)}x`,
        costPerOrderGBP: formatGBP(c.cost_per_order),
        engagementRate: formatPercent(c.engagement_rate),
        ctr: formatPercent(c.ctr),
        conversionRate: formatPercent(c.conversion_rate),
      })),
      bestCampaignsByROAS: sortedByRoas.slice(0, 3).map(c => ({
        name: c.campaign_name,
        objective: c.objective,
        spendGBP: formatGBP(c.spend),
        revenueGBP: formatGBP(c.revenue),
        roas: `${formatRatio(c.roas)}x`,
        orders: c.orders,
      })),
      worstCampaignsByROAS: sortedByRoas.slice(-3).reverse().map(c => ({
        name: c.campaign_name,
        objective: c.objective,
        spendGBP: formatGBP(c.spend),
        revenueGBP: formatGBP(c.revenue),
        roas: `${formatRatio(c.roas)}x`,
        orders: c.orders,
      })),
      bestContentFormats: contentTypes.slice(0, 4).map(ct => ({
        format: ct.contentType,
        avgEngagementRate: `${ct.avgEngagementPct.toFixed(2)}%`,
        postCount: ct.postCount,
      })),
      negativeCommentRateByTopic: sentiment.byTopic.map(t => ({
        topic: t.key,
        totalComments: t.total,
        negativeComments: t.negative,
        negativeRate: `${t.negativePct.toFixed(1)}%`,
        averageScore: t.avgScore.toFixed(2),
      })),
    };
  };

  const generateRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const summary = computeCompactSummary();

      const response = await fetch('/api/gemini/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        setAiRecommendations(data.recommendations);
      } else {
        throw new Error('No recommendations returned from the intelligence engine.');
      }
    } catch (err: any) {
      console.error('Error generating recommendations:', err);
      setError(err.message || 'Failed to generate recommendations');
    } finally {
      setLoading(false);
    }
  };

  // Export recommendations to PDF via jsPDF
  const exportToPdf = () => {
    if (aiRecommendations.length === 0) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 18;

    // Header Band
    doc.setFillColor(21, 11, 34); // #150B22 Thistle & Oak Dark
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text('THISTLE & OAK – EXECUTIVE MARKETING RECOMMENDATIONS', 14, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(216, 180, 254);
    const dateUK = new Date().toLocaleDateString('en-GB');
    doc.text(`Strategic Decision Engine · Exported on: ${dateUK} · Dataset: Jan–Sep 2026`, 14, 20);

    y = 38;

    // Recommendations list
    aiRecommendations.forEach((rec, idx) => {
      // Check if page needs break
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      // Card boundary box
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);

      // Priority color indicator
      let pColor = [107, 53, 168]; // Purple default
      if (rec.priority === 'High') pColor = [220, 38, 38]; // Red
      if (rec.priority === 'Medium') pColor = [217, 119, 6]; // Amber

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, y, pageWidth - 28, 48, 2, 2, 'FD');

      // Priority pill
      doc.setFillColor(pColor[0], pColor[1], pColor[2]);
      doc.roundedRect(18, y + 4, 20, 5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(rec.priority.toUpperCase(), 20, y + 7.8);

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`${idx + 1}. ${rec.title}`, 42, y + 8);

      // Action
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const actionLines = doc.splitTextToSize(`Action: ${rec.action}`, pageWidth - 36);
      doc.text(actionLines, 18, y + 16);

      // Evidence (Quoting figures)
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(107, 53, 168);
      const evidenceLines = doc.splitTextToSize(`Evidence (Quoted Figures): ${rec.evidence}`, pageWidth - 36);
      doc.text(evidenceLines, 18, y + 26);

      // Expected Impact & Risk
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 118, 110);
      doc.text(`Expected Impact: ${rec.expected_impact}`, 18, y + 36);

      doc.setTextColor(180, 83, 9);
      doc.text(`Risk / Constraints: ${rec.risk}`, 18, y + 42);

      y += 54;
    });

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Synthetic training data – Thistle & Oak, Jan to Sep 2026 · Confidential Executive Intelligence',
      pageWidth / 2,
      287,
      { align: 'center' }
    );

    doc.save(`thistle_oak_recommendations_${Date.now()}.pdf`);
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Low':
      default:
        return 'bg-purple-50 text-[#6B35A8] border-purple-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Strategic AI Marketing Recommendations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Synthesizes channel unit economics, campaign outliers, format engagement rates, and customer sentiment into actionable UK commercial strategies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {aiRecommendations.length > 0 && (
            <button
              onClick={exportToPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
            >
              <FileDown className="w-3.5 h-3.5 text-[#6B35A8]" />
              <span>Export to PDF</span>
            </button>
          )}

          <button
            onClick={generateRecommendations}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#6B35A8] hover:bg-[#7D3FC5] active:scale-[0.98] rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluating figures...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiRecommendations.length > 0 ? 'Regenerate recommendations' : 'Generate recommendations'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Rules Notice */}
      <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-4 text-xs text-purple-900">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-[#6B35A8] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Strict Grounding Protocol:</span>
            <p className="text-[11px] text-purple-800 leading-relaxed">
              Every recommendation is constrained to the compact dataset summary. The model quotes exact figures in the evidence section (e.g. ROAS multipliers, spend in £, negative review percentages). No fabricated numbers or external industry benchmarks are permitted.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Recommendations Cards or Empty State */}
      {aiRecommendations.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-purple-50 text-[#6B35A8] flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Recommendations Generated Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Click &ldquo;Generate recommendations&rdquo; to compute the cross-channel marketing summary and generate 3 to 5 prioritised strategic interventions.
          </p>
          <button
            onClick={generateRecommendations}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#6B35A8] hover:bg-[#7D3FC5] rounded-lg transition-colors shadow-sm"
          >
            Generate recommendations now
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {aiRecommendations.map((rec, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{rec.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
                      {rec.action}
                    </p>
                  </div>
                </div>

                <span
                  className={`self-start px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border shrink-0 ${getPriorityStyle(
                    rec.priority
                  )}`}
                >
                  {rec.priority} Priority
                </span>
              </div>

              {/* Quoted Evidence Container */}
              <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B35A8] mb-1">
                  <Target className="w-3.5 h-3.5" />
                  <span>Quoted Data Evidence:</span>
                </div>
                <p className="text-slate-700 italic font-mono text-[11px] leading-relaxed">
                  &ldquo;{rec.evidence}&rdquo;
                </p>
              </div>

              {/* Impact & Risk Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-2 text-xs">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-700 block text-[11px]">Expected Impact</span>
                    <span className="text-slate-600 text-[11px] leading-relaxed">{rec.expected_impact}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-700 block text-[11px]">Risk / Constraint</span>
                    <span className="text-slate-600 text-[11px] leading-relaxed">{rec.risk}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
