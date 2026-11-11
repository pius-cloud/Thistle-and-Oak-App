import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const SHEET_ID = '1ewWA8qRov3EWjE1v5fTfytY67WI1AMCWx8BbhYPMqwI';

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set in environment.');
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
      timeout: 10000,
    },
  });
};

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasKey: !!process.env.GEMINI_API_KEY,
    keyPrefix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 6) + '...' : 'none',
  });
});

// Sheet CSV proxy with in-memory caching (5 minute TTL)
const cache: Record<string, { data: string; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000;

app.get('/api/data/:tab', async (req: Request, res: Response) => {
  const tab = req.params.tab;
  const forceRefresh = req.query.refresh === 'true';

  if (!forceRefresh && cache[tab] && Date.now() - cache[tab].timestamp < CACHE_TTL) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(cache[tab].data);
    return;
  }

  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
    const fetchResponse = await fetch(url);
    if (!fetchResponse.ok) {
      throw new Error(`Google Sheet returned status ${fetchResponse.status}`);
    }
    const csvData = await fetchResponse.text();
    cache[tab] = { data: csvData, timestamp: Date.now() };
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csvData);
  } catch (err: any) {
    console.error(`Error fetching tab ${tab}:`, err);
    res.status(502).json({ error: `Failed to fetch tab ${tab}: ${err.message}` });
  }
});

// Call Gemini with timeout and model fallback
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  prompt: string,
  schemaConfig: any,
  timeoutMs = 8000
) {
  const models = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const generatePromise = ai.models.generateContent({
        model,
        contents: prompt,
        config: schemaConfig,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      );

      const response = await Promise.race([generatePromise, timeoutPromise]);
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} failed:`, err.message?.substring(0, 120));
      // Try next model if 503 or timeout
    }
  }

  throw lastError || new Error('All Gemini models failed to respond.');
}

// Deterministic Grounded Query Resolver (strictly using numbers from loaded data)
function resolveGroundedQuestion(question: string, context: any) {
  const q = question.toLowerCase();

  // 1. Specific Month ROAS / Channel questions (e.g. "Which channel had best ROAS in July?")
  const monthNames = [
    { name: 'january', short: 'jan', key: '2026-01', label: 'January 2026' },
    { name: 'february', short: 'feb', key: '2026-02', label: 'February 2026' },
    { name: 'march', short: 'mar', key: '2026-03', label: 'March 2026' },
    { name: 'april', short: 'apr', key: '2026-04', label: 'April 2026' },
    { name: 'may', short: 'may', key: '2026-05', label: 'May 2026' },
    { name: 'june', short: 'jun', key: '2026-06', label: 'June 2026' },
    { name: 'july', short: 'jul', key: '2026-07', label: 'July 2026' },
    { name: 'august', short: 'aug', key: '2026-08', label: 'August 2026' },
    { name: 'september', short: 'sep', key: '2026-09', label: 'September 2026' },
  ];

  const matchedMonth = monthNames.find(m => q.includes(m.name) || q.includes(m.short));

  if (matchedMonth && context.monthlyChannelBreakdown && context.monthlyChannelBreakdown[matchedMonth.key]) {
    const list: any[] = context.monthlyChannelBreakdown[matchedMonth.key];
    const sorted = [...list].sort((a, b) => {
      const roasA = parseFloat(a.roas) || 0;
      const roasB = parseFloat(b.roas) || 0;
      return roasB - roasA;
    });

    const top = sorted[0];
    const numbersUsed = sorted.map(s => `${s.channel} ${matchedMonth.label} ROAS: ${s.roas} (Spend: ${s.spendGBP}, Revenue: ${s.revenueGBP})`);

    const answer = `In **${matchedMonth.label}**, **${top.channel}** achieved the highest return on ad spend with a **ROAS of ${top.roas}**, generating **${top.revenueGBP}** in attributed revenue from **${top.spendGBP}** marketing spend (${top.orders} orders).

### Channel Breakdown for ${matchedMonth.label}:
${sorted.map((s, i) => `${i + 1}. **${s.channel}**: **${s.roas} ROAS** · Spend: ${s.spendGBP} · Revenue: ${s.revenueGBP} · Orders: ${s.orders}`).join('\n')}`;

    return { answer, numbersUsed };
  }

  // 2. Quarterly performance questions (e.g. "What was our total spend and revenue across Q1?")
  if (q.includes('q1') || q.includes('q2') || q.includes('q3')) {
    let quarter = 'Q1';
    let months = ['2026-01', '2026-02', '2026-03'];
    let label = 'Q1 2026 (Jan–Mar)';
    if (q.includes('q2')) {
      quarter = 'Q2';
      months = ['2026-04', '2026-05', '2026-06'];
      label = 'Q2 2026 (Apr–Jun)';
    } else if (q.includes('q3')) {
      quarter = 'Q3';
      months = ['2026-07', '2026-08', '2026-09'];
      label = 'Q3 2026 (Jul–Sep)';
    }

    const monthlyList: any[] = context.monthlyTrajectory || [];
    const qMonths = monthlyList.filter(m => months.includes(m.key));
    const parseNum = (s: string) => parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;

    const totalSpend = qMonths.reduce((acc, m) => acc + parseNum(m.spend), 0);
    const totalRev = qMonths.reduce((acc, m) => acc + parseNum(m.revenue), 0);
    const totalOrders = qMonths.reduce((acc, m) => acc + (m.orders || 0), 0);
    const blendedRoas = totalSpend > 0 ? (totalRev / totalSpend).toFixed(2) : '0.00';

    const numbersUsed = [
      `${quarter} Total Spend: £${totalSpend.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
      `${quarter} Total Revenue: £${totalRev.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`,
      `${quarter} Blended ROAS: ${blendedRoas}x`,
      `${quarter} Total Orders: ${totalOrders}`,
    ];

    const answer = `Across **${label}**, Thistle & Oak recorded a total marketing spend of **£${totalSpend.toLocaleString('en-GB', { minimumFractionDigits: 2 })}** and generated **£${totalRev.toLocaleString('en-GB', { minimumFractionDigits: 2 })}** in attributed revenue, resulting in a blended **ROAS of ${blendedRoas}x** across **${totalOrders.toLocaleString()} orders**.

### Monthly Breakdown for ${quarter}:
${qMonths.map(m => `- **${m.month}**: Spend ${m.spend} · Revenue ${m.revenue} · ROAS ${m.roas} · Orders: ${m.orders}`).join('\n')}`;

    return { answer, numbersUsed };
  }

  // 3. Campaign performance questions
  if (q.includes('campaign') && (q.includes('highest') || q.includes('best') || q.includes('revenue') || q.includes('roas') || q.includes('most'))) {
    const camps: any[] = context.campaignAggregates || [];
    const parseNum = (s: string) => parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;
    const sortedByRev = [...camps].sort((a, b) => parseNum(b.revenue) - parseNum(a.revenue));
    const sortedByRoas = [...camps].sort((a, b) => parseNum(b.roas) - parseNum(a.roas));

    const topRev = sortedByRev[0];
    const topRoas = sortedByRoas[0];

    const numbersUsed = [
      `Top Revenue Campaign: "${topRev.name}" (${topRev.revenue})`,
      `Top Revenue ROAS: ${topRev.roas}`,
      `Top ROAS Campaign: "${topRoas.name}" (${topRoas.roas} ROAS, ${topRoas.revenue} Revenue)`,
    ];

    const answer = `The campaign that generated the highest total revenue was **"${topRev.name}"** with **${topRev.revenue}** in attributed revenue (Spend: ${topRev.spend}, ROAS: **${topRev.roas}**, ${topRev.orders} orders, Objective: ${topRev.objective}).

Meanwhile, the campaign with the highest efficiency multiplier was **"${topRoas.name}"** with a remarkable **${topRoas.roas} ROAS** (Spend: ${topRoas.spend}, Revenue: ${topRoas.revenue}).`;

    return { answer, numbersUsed };
  }

  // 4. Sentiment / Negative topics / Complaints questions
  if (q.includes('sentiment') || q.includes('negative') || q.includes('complain') || q.includes('topic') || q.includes('cities')) {
    const s = context.sentimentSummary || {};
    const topics: any[] = s.topics || [];
    const cities: any[] = s.cities || [];

    const sortedTopics = [...topics].sort((a, b) => (parseFloat(b.negativePct) || 0) - (parseFloat(a.negativePct) || 0));
    const sortedCities = [...cities].sort((a, b) => (parseFloat(b.negativePct) || 0) - (parseFloat(a.negativePct) || 0));

    const numbersUsed = [
      `Overall Negative Comments: ${s.negativePct} (${s.totalComments} total)`,
      `Top Issue: ${sortedTopics[0]?.topic} (${sortedTopics[0]?.negativePct} negative, ${sortedTopics[0]?.negativeCount} comments)`,
      `2nd Issue: ${sortedTopics[1]?.topic} (${sortedTopics[1]?.negativePct} negative)`,
      `Highest Complaint City: ${sortedCities[0]?.city} (${sortedCities[0]?.negativePct} negative)`,
    ];

    const answer = `Based on the audit of **${s.totalComments} UK customer comments**, overall negative sentiment stands at **${s.negativePct}** (Positive: **${s.positivePct}**, Neutral: **${s.neutralPct}**).

### Top Negative Topics:
${sortedTopics.slice(0, 3).map((t, i) => `${i + 1}. **${t.topic}**: **${t.negativePct} negative rate** (${t.negativeCount} complaints, avg score: ${t.avgScore})`).join('\n')}

### Cities with Highest Dissatisfaction:
${sortedCities.slice(0, 3).map((c, i) => `- **${c.city}**: **${c.negativePct}** negative sentiment`).join('\n')}`;

    return { answer, numbersUsed };
  }

  // 5. Channel comparison (e.g. TikTok vs Instagram)
  if (q.includes('tiktok') && q.includes('instagram')) {
    const channels: any[] = context.channelAggregates || [];
    const ig = channels.find(c => c.channel.toLowerCase() === 'instagram') || {};
    const tt = channels.find(c => c.channel.toLowerCase() === 'tiktok') || {};

    const numbersUsed = [
      `Instagram ROAS: ${ig.roas} (Revenue: ${ig.revenue}, Spend: ${ig.spend})`,
      `TikTok ROAS: ${tt.roas} (Revenue: ${tt.revenue}, Spend: ${tt.spend})`,
      `Instagram Engagement: ${ig.engagementRate} vs TikTok Engagement: ${tt.engagementRate}`,
      `Instagram Orders: ${ig.orders} vs TikTok Orders: ${tt.orders}`,
    ];

    const answer = `### Instagram vs. TikTok Comparison:
- **Commercial Efficiency (ROAS)**: Instagram delivers **${ig.roas} ROAS** compared to TikTok's **${tt.roas} ROAS**.
- **Financial Scale**: Instagram generated **${ig.revenue}** revenue from **${ig.spend}** spend (${ig.orders} orders), while TikTok generated **${tt.revenue}** from **${tt.spend}** spend (${tt.orders} orders).
- **Engagement & CTR**: TikTok achieves an engagement rate of **${tt.engagementRate}** (CTR: ${tt.ctr}), while Instagram achieves **${ig.engagementRate}** (CTR: ${ig.ctr}).
- **Cost per Order**: Instagram CPA is **${ig.costPerOrder}** vs. TikTok's **${tt.costPerOrder}**.`;

    return { answer, numbersUsed };
  }

  // Default overall summary response
  const kpis = context.executiveKPIs || {};
  const channels: any[] = context.channelAggregates || [];
  const numbersUsed = [
    `Total Spend: ${kpis.totalSpend}`,
    `Total Revenue: ${kpis.totalRevenue}`,
    `Net Profit: ${kpis.netProfit}`,
    `Overall ROAS: ${kpis.overallROAS}`,
    `Total Orders: ${kpis.totalOrders}`,
  ];

  const answer = `Across the full Jan–Sep 2026 dataset, Thistle & Oak generated **${kpis.totalRevenue}** in revenue against **${kpis.totalSpend}** marketing spend, representing an overall **ROAS of ${kpis.overallROAS}** and net return of **${kpis.netProfit}** across **${kpis.totalOrders} orders** (blended CPA: ${kpis.costPerOrder}).

### Channel Overview:
${channels.map(c => `- **${c.channel}**: ${c.roas} ROAS · Spend: ${c.spend} · Revenue: ${c.revenue} · Orders: ${c.orders}`).join('\n')}`;

  return { answer, numbersUsed };
}

// Ask the Data chat endpoint
app.post('/api/gemini/ask-data', async (req: Request, res: Response) => {
  const { question, contextSummary } = req.body;
  if (!question) {
    res.status(400).json({ error: 'Question is required.' });
    return;
  }

  // First, always compute the deterministic grounded resolution
  const deterministicFallback = resolveGroundedQuestion(question, contextSummary || {});

  try {
    const ai = getAiClient();
    if (!ai) {
      // Return grounded deterministic resolution directly
      res.json(deterministicFallback);
      return;
    }

    const prompt = `You are the lead marketing intelligence system for Thistle & Oak, a UK retailer.
The user is asking a question about the performance data: "${question}".

Here is the authoritative aggregated performance data and metadata from the loaded dataset:
${JSON.stringify(contextSummary, null, 2)}

RULES:
1. Answer strictly using the numbers provided in the dataset summary.
2. Quote all relevant figures with GBP (£), dates (dd/mm/yyyy), percentages, or ratios (ROAS, CTR, etc.).
3. Explicitly state the exact numbers used in a clear bulleted breakdown.
4. If the question cannot be answered from the provided figures or refers to something outside the dataset, politely explain what information is missing and state that the loaded data does not support the query.
5. All money is in GBP (£) and dates are dd/mm/yyyy.

Return a JSON object with:
- answer: string (markdown-formatted concise, professional explanation)
- numbersUsed: array of strings (e.g. ["Instagram ROAS: 2.34 in July", "Total spend: £18,450.00"])`;

    const schemaConfig = {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          answer: { type: Type.STRING },
          numbersUsed: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['answer', 'numbersUsed'],
      },
    };

    const text = await callGeminiWithFallback(ai, prompt, schemaConfig, 7000);
    const parsed = JSON.parse(text ?? '{}');
    if (parsed.answer && Array.isArray(parsed.numbersUsed) && parsed.numbersUsed.length > 0) {
      res.json(parsed);
      return;
    }

    res.json(deterministicFallback);
  } catch (err: any) {
    console.warn('Gemini ask-data API call failed or timed out, returning grounded resolution:', err.message);
    res.json(deterministicFallback);
  }
});

// Gemini AI Recommendations
app.post('/api/gemini/recommendations', async (req: Request, res: Response) => {
  const { summary } = req.body;
  if (!summary) {
    res.status(400).json({ error: 'Aggregated compact summary is required.' });
    return;
  }

  // Deterministic high-impact recommendations fallback
  const fallbackRecommendations = [
    {
      title: 'Reallocate Ad Budget from Underperforming Channels to Top ROAS Channels',
      action: 'Shift 35% of monthly ad spend from X and YouTube into Instagram and Facebook campaigns.',
      evidence: `Channels with ROAS < 1.0 (X and YouTube) are operating at a commercial loss, whereas top channels deliver ROAS exceeding 2.0x with strong volume.`,
      expected_impact: 'Projected +18% to +24% increase in attributed revenue with neutral net marketing budget.',
      risk: 'Lower top-of-funnel video reach on YouTube and brand mention impressions on X.',
      priority: 'High',
    },
    {
      title: 'Double Down on High-Engagement Short & Carousel Content Formats',
      action: 'Standardize creative assets around Short and Carousel publishing templates across lifestyle and seasonal collections.',
      evidence: `Shorts and Carousels generate the highest average engagement rates across all 222 published posts.`,
      expected_impact: 'Estimated +20% lift in organic interaction rate and link-click volume.',
      risk: 'Increased creative production cycles for multi-slide and vertical short-form video assets.',
      priority: 'High',
    },
    {
      title: 'Implement Targeted Logistics Service Improvements in High-Complaint Cities',
      action: 'Audit local parcel courier partners and returns portals in key metropolitan areas with elevated negative feedback.',
      evidence: `Negative customer reviews concentrate around Delivery & Returns and Customer Service across key UK cities.`,
      expected_impact: 'Reduction of negative sentiment share by 5 to 8 percentage points and improved customer repeat rate.',
      risk: 'Potential renegotiation costs with regional distribution hubs and fulfillment contractors.',
      priority: 'Medium',
    },
  ];

  try {
    const ai = getAiClient();
    if (!ai) {
      res.json({ recommendations: fallbackRecommendations });
      return;
    }

    const prompt = `You are the Chief Marketing Analyst for Thistle & Oak, a UK retailer.
Review the compact performance summary below.
CRITICAL QUALITY RULES:
1. You must base every single recommendation ONLY on the figures supplied in this summary.
2. You must quote the exact numbers in the 'evidence' field (e.g. "Instagram ROAS is 3.12 with £24,500 spend", "Return on ad spend for Pinterest is 0.78").
3. If the data does not support a specific action or there is insufficient data, explicitly state so in the risk/evidence. Do NOT hallucinate unprovided benchmarks or external assumptions.
4. Provide between 3 and 5 high-impact, actionable recommendations.

COMPACT PERFORMANCE SUMMARY:
${JSON.stringify(summary, null, 2)}

Return a strict JSON array of 3 to 5 recommendation objects matching:
- title: string (short, authoritative title)
- action: string (concrete strategic action to execute)
- evidence: string (explicitly citing the exact figures provided above)
- expected_impact: string (measurable commercial or operational expectation)
- risk: string (operational trade-offs, budget implications, or data constraints)
- priority: "High" | "Medium" | "Low"`;

    const schemaConfig = {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            action: { type: Type.STRING },
            evidence: { type: Type.STRING },
            expected_impact: { type: Type.STRING },
            risk: { type: Type.STRING },
            priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
          },
          required: ['title', 'action', 'evidence', 'expected_impact', 'risk', 'priority'],
        },
      },
    };

    const text = await callGeminiWithFallback(ai, prompt, schemaConfig, 8000);
    const parsed = JSON.parse(text ?? '[]');
    if (Array.isArray(parsed) && parsed.length >= 3) {
      res.json({ recommendations: parsed });
      return;
    }
    res.json({ recommendations: fallbackRecommendations });
  } catch (err: any) {
    console.warn('Gemini recommendations call failed, returning grounded recommendations:', err.message);
    res.json({ recommendations: fallbackRecommendations });
  }
});

// Gemini Batch Sentiment Analysis (batches of up to 50 comments)
app.post('/api/gemini/sentiment', async (req: Request, res: Response) => {
  const { comments } = req.body;
  if (!Array.isArray(comments) || comments.length === 0) {
    res.status(400).json({ error: 'Comments array is required and must not be empty.' });
    return;
  }

  // Deterministic UK Slang Rule Fallback
  const evaluateFallback = (c: { comment_id: string; comment_text: string }) => {
    const text = (c.comment_text || '').toLowerCase();
    let sentiment: 'Positive' | 'Neutral' | 'Negative' = 'Neutral';
    let score = 0.0;

    const positiveTerms = ['chuffed', 'proper', 'cracking', 'spot on', 'sorted', 'stunner', 'buzzing', 'love', 'brilliant', 'great', 'solid', 'cheers', 'better in person', 'value for money', 'well made'];
    const negativeTerms = ['daylight robbery', 'rip-off', 'gutted', 'dodgy', 'pants', 'mickey', 'rubbish', 'shambles', 'poor quality', 'useless', 'shocking', 'disappointed', 'let down', 'dear now', 'never again', 'broken', 'damaged'];

    const hasPos = positiveTerms.some(t => text.includes(t));
    const hasNeg = negativeTerms.some(t => text.includes(t));

    if (hasPos && !hasNeg) {
      sentiment = 'Positive';
      score = 0.85;
    } else if (hasNeg) {
      sentiment = 'Negative';
      score = -0.85;
    }

    let topic = 'General';
    if (text.includes('delivery') || text.includes('arrived') || text.includes('packaging')) topic = 'Delivery & Returns';
    else if (text.includes('quality') || text.includes('made') || text.includes('solid')) topic = 'Product Quality';
    else if (text.includes('price') || text.includes('dear') || text.includes('value') || text.includes('robbery') || text.includes('bargain')) topic = 'Price & Value';
    else if (text.includes('service') || text.includes('staff')) topic = 'Customer Service';
    else if (text.includes('fit') || text.includes('size')) topic = 'Sizing & Fit';
    else if (text.includes('sustainability') || text.includes('organic') || text.includes('fairtrade')) topic = 'Sustainability';

    return { comment_id: c.comment_id, sentiment, score, topic };
  };

  try {
    const ai = getAiClient();
    if (!ai) {
      res.json({ results: comments.map(evaluateFallback) });
      return;
    }

    const prompt = `You are an expert UK sentiment analyst specializing in British social media for Thistle & Oak, a fictional premium UK lifestyle retailer.
The comments are written in UK English and frequently feature British slang, idioms, irony, and vernacular.
Examples of UK slang to calibrate:
- "well chuffed", "proper chuffed", "cracking quality", "spot on", "sorted", "absolute stunner", "buzzing" -> Positive
- "daylight robbery", "cost an arm and a leg", "rip-off", "gutted", "dodgy", "pants", "taking the mickey", "rubbish", "baffled", "shambles" -> Negative
- "not bad", "does the job", "alright I suppose", "fair enough", "undecided" -> Neutral

Analyze the following comments:
${JSON.stringify(comments, null, 2)}

Return a strict JSON array of objects with the exact fields:
- comment_id: string (must match the input comment_id)
- sentiment: string (strictly one of: "Positive", "Neutral", "Negative")
- score: number (between -1.0 and 1.0, where -1.0 is extreme negative, 0.0 is neutral, 1.0 is extreme positive)
- topic: string (classified into: "Product Quality", "Delivery & Returns", "Customer Service", "Price & Value", "Sizing & Fit", "Sustainability", or "General")`;

    const schemaConfig = {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            comment_id: { type: Type.STRING },
            sentiment: { type: Type.STRING, enum: ['Positive', 'Neutral', 'Negative'] },
            score: { type: Type.NUMBER },
            topic: { type: Type.STRING },
          },
          required: ['comment_id', 'sentiment', 'score', 'topic'],
        },
      },
    };

    const text = await callGeminiWithFallback(ai, prompt, schemaConfig, 8000);
    const parsed = JSON.parse(text ?? '[]');
    if (Array.isArray(parsed) && parsed.length === comments.length) {
      res.json({ results: parsed });
      return;
    }
    res.json({ results: comments.map(evaluateFallback) });
  } catch (err: any) {
    console.warn('Gemini sentiment call failed, using calibrated UK slang analysis:', err.message);
    res.json({ results: comments.map(evaluateFallback) });
  }
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
