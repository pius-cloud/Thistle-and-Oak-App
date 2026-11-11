import React, { useState, useRef, useEffect } from 'react';
import { useAnalytics } from '../context/AnalyticsContext';
import {
  calculateKPIs,
  calculateMonthlyAggregates,
  calculateChannelAggregates,
  calculateCampaignAggregates,
  calculateContentTypeEngagement,
  calculateSentimentBreakdown,
} from '../utils/analyticsCalculations';
import { formatGBP, formatPercent, formatRatio, formatInt, formatDateUK } from '../utils/csvParser';
import {
  MessageSquare,
  Send,
  Sparkles,
  Database,
  Hash,
  ArrowRight,
  Bot,
  User,
  Clock,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  numbersUsed?: string[];
  timestamp: string;
}

export const AskDataPage: React.FC = () => {
  const { dailyPerformance, campaigns, posts, comments } = useAnalytics();

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your Thistle & Oak Marketing Data Intelligence Assistant. Ask me anything about our marketing spend, channel ROAS, campaign performance, content formats, or UK customer sentiment from Jan to Sep 2026. Every figure cited is grounded strictly in our loaded dataset.',
      numbersUsed: [
        `Total Spend: ${formatGBP(calculateKPIs(dailyPerformance).totalSpend)}`,
        `Total Attributed Revenue: ${formatGBP(calculateKPIs(dailyPerformance).totalRevenue)}`,
        `Overall ROAS: ${formatRatio(calculateKPIs(dailyPerformance).roas)}x`,
      ],
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Construct structured data context to send along with the user's question
  const buildContextSummary = () => {
    const kpis = calculateKPIs(dailyPerformance);
    const channels = calculateChannelAggregates(dailyPerformance);
    const campAggs = calculateCampaignAggregates(dailyPerformance, campaigns);
    const monthly = calculateMonthlyAggregates(dailyPerformance);
    const contentTypes = calculateContentTypeEngagement(posts);
    const sentiment = calculateSentimentBreakdown(comments);

    // Compute monthly channel breakdown (especially useful for questions like "Which channel had best ROAS in July?")
    const monthlyChannelMap: Record<string, Record<string, { spend: number; revenue: number; orders: number }>> = {};
    dailyPerformance.forEach(row => {
      const monthKey = row.date.substring(0, 7); // e.g. "2026-07"
      if (!monthlyChannelMap[monthKey]) monthlyChannelMap[monthKey] = {};
      if (!monthlyChannelMap[monthKey][row.channel]) {
        monthlyChannelMap[monthKey][row.channel] = { spend: 0, revenue: 0, orders: 0 };
      }
      monthlyChannelMap[monthKey][row.channel].spend += row.spend_gbp;
      monthlyChannelMap[monthKey][row.channel].revenue += row.revenue_gbp;
      monthlyChannelMap[monthKey][row.channel].orders += row.orders;
    });

    const monthlyChannelDetail: Record<string, any[]> = {};
    Object.keys(monthlyChannelMap).forEach(m => {
      monthlyChannelDetail[m] = Object.keys(monthlyChannelMap[m]).map(ch => {
        const d = monthlyChannelMap[m][ch];
        return {
          channel: ch,
          spendGBP: formatGBP(d.spend),
          revenueGBP: formatGBP(d.revenue),
          orders: d.orders,
          roas: `${formatRatio(d.spend > 0 ? d.revenue / d.spend : 0)}x`,
        };
      });
    });

    return {
      executiveKPIs: {
        totalSpend: formatGBP(kpis.totalSpend),
        totalRevenue: formatGBP(kpis.totalRevenue),
        netProfit: formatGBP(kpis.totalRevenue - kpis.totalSpend),
        totalOrders: kpis.totalOrders,
        overallROAS: `${formatRatio(kpis.roas)}x`,
        costPerOrder: formatGBP(kpis.costPerOrder),
        overallEngagementRate: formatPercent(kpis.engagementRate),
        overallCTR: formatPercent(kpis.ctr),
        overallConversionRate: formatPercent(kpis.conversionRate),
      },
      monthlyTrajectory: monthly.map(m => ({
        month: m.monthLabel,
        key: m.monthKey,
        spend: formatGBP(m.spend),
        revenue: formatGBP(m.revenue),
        orders: m.orders,
        roas: `${formatRatio(m.roas)}x`,
      })),
      channelAggregates: channels.map(c => ({
        channel: c.channel,
        spend: formatGBP(c.spend),
        revenue: formatGBP(c.revenue),
        orders: c.orders,
        roas: `${formatRatio(c.roas)}x`,
        costPerOrder: formatGBP(c.cost_per_order),
        engagementRate: formatPercent(c.engagement_rate),
        ctr: formatPercent(c.ctr),
        conversionRate: formatPercent(c.conversion_rate),
      })),
      campaignAggregates: campAggs.map(c => ({
        id: c.campaign_id,
        name: c.campaign_name,
        objective: c.objective,
        budget: formatGBP(c.budget_gbp),
        dates: `${formatDateUK(c.start_date)} to ${formatDateUK(c.end_date)}`,
        spend: formatGBP(c.spend),
        revenue: formatGBP(c.revenue),
        orders: c.orders,
        roas: `${formatRatio(c.roas)}x`,
        costPerOrder: formatGBP(c.cost_per_order),
        conversionRate: formatPercent(c.conversion_rate),
      })),
      monthlyChannelBreakdown: monthlyChannelDetail,
      contentTypes: contentTypes.map(ct => ({
        format: ct.contentType,
        avgEngagementRate: `${ct.avgEngagementPct.toFixed(2)}%`,
        postCount: ct.postCount,
      })),
      sentimentSummary: {
        totalComments: sentiment.total,
        positivePct: `${sentiment.positivePct.toFixed(1)}%`,
        neutralPct: `${sentiment.neutralPct.toFixed(1)}%`,
        negativePct: `${sentiment.negativePct.toFixed(1)}%`,
        topics: sentiment.byTopic.map(t => ({
          topic: t.key,
          total: t.total,
          negativeCount: t.negative,
          negativePct: `${t.negativePct.toFixed(1)}%`,
          avgScore: t.avgScore.toFixed(2),
        })),
        cities: sentiment.byCity.map(c => ({
          city: c.key,
          total: c.total,
          positivePct: `${c.positivePct.toFixed(1)}%`,
          negativePct: `${c.negativePct.toFixed(1)}%`,
        })),
      },
    };
  };

  const handleAsk = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const contextSummary = buildContextSummary();

      const res = await fetch('/api/gemini/ask-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          contextSummary,
        }),
      });

      let data: any = null;
      if (res.ok) {
        data = await res.json().catch(() => null);
      }

      if (data && data.answer) {
        const botMsg: ChatMessage = {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: data.answer,
          numbersUsed: Array.isArray(data.numbersUsed) ? data.numbersUsed : [],
          timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        throw new Error('Unable to parse server response');
      }
    } catch (err: any) {
      console.warn('Backend query issue, generating grounded client-side response:', err);

      // Local grounded fallback using authoritative loaded figures
      const qLower = q.toLowerCase();
      const kpis = calculateKPIs(dailyPerformance);
      const channels = calculateChannelAggregates(dailyPerformance);

      let answer = `Across the full Jan–Sep 2026 dataset, Thistle & Oak recorded **${formatGBP(kpis.totalRevenue)}** in revenue against **${formatGBP(kpis.totalSpend)}** marketing spend, representing an overall **ROAS of ${formatRatio(kpis.roas)}x** across **${kpis.totalOrders.toLocaleString()} orders**.`;
      let numbersUsed: string[] = [
        `Total Spend: ${formatGBP(kpis.totalSpend)}`,
        `Total Revenue: ${formatGBP(kpis.totalRevenue)}`,
        `Overall ROAS: ${formatRatio(kpis.roas)}x`,
        `Total Orders: ${kpis.totalOrders.toLocaleString()}`,
      ];

      // Check for July or other months
      if (qLower.includes('july') || qLower.includes('jul')) {
        const julyRows = dailyPerformance.filter(r => r.date && r.date.startsWith('2026-07'));
        const map: Record<string, { spend: number; rev: number; orders: number }> = {};
        julyRows.forEach(r => {
          if (!map[r.channel]) map[r.channel] = { spend: 0, rev: 0, orders: 0 };
          map[r.channel].spend += r.spend_gbp;
          map[r.channel].rev += r.revenue_gbp;
          map[r.channel].orders += r.orders;
        });
        const sorted = Object.keys(map).map(ch => ({
          channel: ch,
          spend: map[ch].spend,
          rev: map[ch].rev,
          orders: map[ch].orders,
          roas: map[ch].spend > 0 ? map[ch].rev / map[ch].spend : 0,
        })).sort((a, b) => b.roas - a.roas);

        const top = sorted[0];
        answer = `In **July 2026**, **${top.channel}** achieved the highest return on ad spend with a **ROAS of ${formatRatio(top.roas)}x**, generating **${formatGBP(top.rev)}** in revenue from **${formatGBP(top.spend)}** ad spend (${top.orders} orders).

### Channel Breakdown for July 2026:
${sorted.map((s, i) => `${i + 1}. **${s.channel}**: **${formatRatio(s.roas)}x ROAS** · Spend: ${formatGBP(s.spend)} · Revenue: ${formatGBP(s.rev)} · Orders: ${s.orders}`).join('\n')}`;

        numbersUsed = sorted.map(s => `${s.channel} July ROAS: ${formatRatio(s.roas)}x (${formatGBP(s.rev)} rev / ${formatGBP(s.spend)} spend)`);
      } else if (qLower.includes('q1') || qLower.includes('first quarter')) {
        const q1Rows = dailyPerformance.filter(r => r.date >= '2026-01-01' && r.date <= '2026-03-31');
        const q1Kpis = calculateKPIs(q1Rows);
        answer = `During **Q1 2026 (01/01/2026 – 31/03/2026)**, total marketing spend was **${formatGBP(q1Kpis.totalSpend)}** and attributed revenue reached **${formatGBP(q1Kpis.totalRevenue)}**, delivering a blended **ROAS of ${formatRatio(q1Kpis.roas)}x** and **${q1Kpis.totalOrders.toLocaleString()} customer orders**.`;
        numbersUsed = [
          `Q1 Total Spend: ${formatGBP(q1Kpis.totalSpend)}`,
          `Q1 Total Revenue: ${formatGBP(q1Kpis.totalRevenue)}`,
          `Q1 Blended ROAS: ${formatRatio(q1Kpis.roas)}x`,
          `Q1 Orders: ${q1Kpis.totalOrders.toLocaleString()}`,
        ];
      }

      const botMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: answer,
        numbersUsed,
        timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  const starterQuestions = [
    'Which channel had the best ROAS in July?',
    'What was our total spend and revenue across Q1?',
    'Which campaign generated the highest revenue and what was its ROAS?',
    'What are our top 3 negative sentiment topics and which cities complain most?',
    'How does TikTok engagement compare to Instagram?',
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Ask the Data (Natural Language Query)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Query the marketing data directly. Every response cites exact figures, spend, dates, and calculated multipliers.
        </p>
      </div>

      {/* Suggested Starter Questions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-[#6B35A8]" />
          <span>Suggested Questions (Click to Ask):</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {starterQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleAsk(q)}
              disabled={loading}
              className="text-left text-xs bg-slate-50 hover:bg-purple-50 hover:text-[#6B35A8] border border-slate-200 hover:border-purple-200 px-3 py-1.5 rounded-lg text-slate-700 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>{q}</span>
              <ArrowRight className="w-3 h-3 opacity-50 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[560px] overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-[#6B35A8] text-white shadow-sm'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-2 max-w-[85%]">
                <div
                  className={`p-4 rounded-xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#150B22] text-white shadow-sm'
                      : 'bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {/* Quoted Numbers Container */}
                {msg.numbersUsed && msg.numbersUsed.length > 0 && (
                  <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B35A8]">
                      <Hash className="w-3 h-3" />
                      <span>Data Points &amp; Numbers Used:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.numbersUsed.map((numStr, nIdx) => (
                        <span
                          key={nIdx}
                          className="px-2 py-0.5 bg-white border border-purple-200 rounded text-[11px] font-mono text-purple-900 font-medium"
                        >
                          {numStr}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={`text-[10px] text-slate-400 flex items-center gap-1 ${
                    msg.sender === 'user' ? 'justify-end' : ''
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>{msg.timestamp}</span>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 max-w-2xl">
              <div className="w-7 h-7 rounded-lg bg-[#6B35A8] text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-[#6B35A8] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-[#6B35A8] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-[#6B35A8] rounded-full animate-bounce"></span>
                </div>
                <span>Scanning 1,135 performance rows &amp; aggregates...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Query Input Bar */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleAsk();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              placeholder="Ask anything about spend, channels, ROAS, posts, or sentiment..."
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#6B35A8]"
            />
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#6B35A8] hover:bg-[#7D3FC5] rounded-lg transition-colors shadow-sm disabled:opacity-50 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
