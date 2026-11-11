import {
  Campaign,
  CampaignAggregates,
  ChannelAggregates,
  CommentItem,
  DailyPerformance,
  MonthlyAggregate,
  Post,
} from '../types/analytics';
import { safeDivide } from './csvParser';

export interface FilterState {
  channel: string;
  objective: string;
  startDate: string;
  endDate: string;
}

export function filterDailyPerformance(
  records: DailyPerformance[],
  campaignsMap: Map<string, Campaign>,
  filters: FilterState
): DailyPerformance[] {
  return records.filter(row => {
    // Channel filter
    if (filters.channel && filters.channel !== 'All' && row.channel !== filters.channel) {
      return false;
    }
    // Objective filter
    if (filters.objective && filters.objective !== 'All') {
      const campaign = campaignsMap.get(row.campaign_id);
      if (!campaign || campaign.objective !== filters.objective) {
        return false;
      }
    }
    // Date range filter (dates are YYYY-MM-DD)
    if (filters.startDate && row.date < filters.startDate) {
      return false;
    }
    if (filters.endDate && row.date > filters.endDate) {
      return false;
    }
    return true;
  });
}

export interface SummaryKPIs {
  totalSpend: number;
  totalRevenue: number;
  totalOrders: number;
  totalSessions: number;
  totalImpressions: number;
  totalReach: number;
  totalClicks: number;
  totalInteractions: number; // likes + comments + shares + saves
  roas: number;
  roi: number;
  costPerOrder: number;
  engagementRate: number;
  ctr: number;
  conversionRate: number;
}

export function calculateKPIs(records: DailyPerformance[]): SummaryKPIs {
  let totalSpend = 0;
  let totalRevenue = 0;
  let totalOrders = 0;
  let totalSessions = 0;
  let totalImpressions = 0;
  let totalReach = 0;
  let totalClicks = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  let totalSaves = 0;

  for (const r of records) {
    totalSpend += r.spend_gbp;
    totalRevenue += r.revenue_gbp;
    totalOrders += r.orders;
    totalSessions += r.website_sessions;
    totalImpressions += r.impressions;
    totalReach += r.reach;
    totalClicks += r.link_clicks;
    totalLikes += r.likes;
    totalComments += r.comments;
    totalShares += r.shares;
    totalSaves += r.saves;
  }

  const totalInteractions = totalLikes + totalComments + totalShares + totalSaves;
  const roas = safeDivide(totalRevenue, totalSpend, 0);
  const roi = safeDivide(totalRevenue - totalSpend, totalSpend, 0);
  const costPerOrder = safeDivide(totalSpend, totalOrders, 0);
  const engagementRate = safeDivide(totalInteractions, totalImpressions, 0);
  const ctr = safeDivide(totalClicks, totalImpressions, 0);
  const conversionRate = safeDivide(totalOrders, totalSessions, 0);

  return {
    totalSpend,
    totalRevenue,
    totalOrders,
    totalSessions,
    totalImpressions,
    totalReach,
    totalClicks,
    totalInteractions,
    roas,
    roi,
    costPerOrder,
    engagementRate,
    ctr,
    conversionRate,
  };
}

export function calculateMonthlyAggregates(records: DailyPerformance[]): MonthlyAggregate[] {
  const monthMap: Record<string, { spend: number; revenue: number; orders: number }> = {};

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (const r of records) {
    if (!r.date) continue;
    const monthKey = r.date.substring(0, 7); // e.g. "2026-03"
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { spend: 0, revenue: 0, orders: 0 };
    }
    monthMap[monthKey].spend += r.spend_gbp;
    monthMap[monthKey].revenue += r.revenue_gbp;
    monthMap[monthKey].orders += r.orders;
  }

  const sortedKeys = Object.keys(monthMap).sort();
  return sortedKeys.map(key => {
    const [year, monthStr] = key.split('-');
    const monthIdx = parseInt(monthStr, 10) - 1;
    const label = `${monthNames[monthIdx] || monthStr} ${year}`;
    const data = monthMap[key];
    return {
      monthKey: key,
      monthLabel: label,
      spend: data.spend,
      revenue: data.revenue,
      orders: data.orders,
      roas: safeDivide(data.revenue, data.spend, 0),
    };
  });
}

export function calculateChannelAggregates(records: DailyPerformance[]): ChannelAggregates[] {
  const map: Record<string, {
    spend: number;
    revenue: number;
    orders: number;
    website_sessions: number;
    impressions: number;
    link_clicks: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  }> = {};

  for (const r of records) {
    const ch = r.channel || 'Unknown';
    if (!map[ch]) {
      map[ch] = {
        spend: 0,
        revenue: 0,
        orders: 0,
        website_sessions: 0,
        impressions: 0,
        link_clicks: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
      };
    }
    const target = map[ch];
    target.spend += r.spend_gbp;
    target.revenue += r.revenue_gbp;
    target.orders += r.orders;
    target.website_sessions += r.website_sessions;
    target.impressions += r.impressions;
    target.link_clicks += r.link_clicks;
    target.likes += r.likes;
    target.comments += r.comments;
    target.shares += r.shares;
    target.saves += r.saves;
  }

  return Object.keys(map).map(channel => {
    const d = map[channel];
    const totalInteractions = d.likes + d.comments + d.shares + d.saves;
    return {
      channel,
      spend: d.spend,
      revenue: d.revenue,
      orders: d.orders,
      website_sessions: d.website_sessions,
      impressions: d.impressions,
      link_clicks: d.link_clicks,
      likes: d.likes,
      comments: d.comments,
      shares: d.shares,
      saves: d.saves,
      roas: safeDivide(d.revenue, d.spend, 0),
      roi: safeDivide(d.revenue - d.spend, d.spend, 0),
      cost_per_order: safeDivide(d.spend, d.orders, 0),
      engagement_rate: safeDivide(totalInteractions, d.impressions, 0),
      ctr: safeDivide(d.link_clicks, d.impressions, 0),
      conversion_rate: safeDivide(d.orders, d.website_sessions, 0),
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

export function calculateCampaignAggregates(
  records: DailyPerformance[],
  campaigns: Campaign[]
): CampaignAggregates[] {
  const campMap = new Map<string, Campaign>();
  campaigns.forEach(c => campMap.set(c.campaign_id, c));

  const map: Record<string, {
    spend: number;
    revenue: number;
    orders: number;
    website_sessions: number;
    impressions: number;
    link_clicks: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  }> = {};

  for (const r of records) {
    const cid = r.campaign_id || 'Unknown';
    if (!map[cid]) {
      map[cid] = {
        spend: 0,
        revenue: 0,
        orders: 0,
        website_sessions: 0,
        impressions: 0,
        link_clicks: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
      };
    }
    const target = map[cid];
    target.spend += r.spend_gbp;
    target.revenue += r.revenue_gbp;
    target.orders += r.orders;
    target.website_sessions += r.website_sessions;
    target.impressions += r.impressions;
    target.link_clicks += r.link_clicks;
    target.likes += r.likes;
    target.comments += r.comments;
    target.shares += r.shares;
    target.saves += r.saves;
  }

  // Include all campaigns that exist or have records
  const allIds = new Set([...Object.keys(map), ...campaigns.map(c => c.campaign_id)]);

  return Array.from(allIds).map(cid => {
    const cMeta = campMap.get(cid);
    const d = map[cid] || {
      spend: 0,
      revenue: 0,
      orders: 0,
      website_sessions: 0,
      impressions: 0,
      link_clicks: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
    };
    const totalInteractions = d.likes + d.comments + d.shares + d.saves;
    return {
      campaign_id: cid,
      campaign_name: cMeta ? cMeta.campaign_name : cid,
      objective: cMeta ? cMeta.objective : 'N/A',
      target_audience: cMeta ? cMeta.target_audience : 'N/A',
      budget_gbp: cMeta ? cMeta.budget_gbp : 0,
      start_date: cMeta ? cMeta.start_date : '',
      end_date: cMeta ? cMeta.end_date : '',
      spend: d.spend,
      revenue: d.revenue,
      orders: d.orders,
      website_sessions: d.website_sessions,
      impressions: d.impressions,
      link_clicks: d.link_clicks,
      likes: d.likes,
      comments: d.comments,
      shares: d.shares,
      saves: d.saves,
      roas: safeDivide(d.revenue, d.spend, 0),
      roi: safeDivide(d.revenue - d.spend, d.spend, 0),
      cost_per_order: safeDivide(d.spend, d.orders, 0),
      engagement_rate: safeDivide(totalInteractions, d.impressions, 0),
      ctr: safeDivide(d.link_clicks, d.impressions, 0),
      conversion_rate: safeDivide(d.orders, d.website_sessions, 0),
    };
  }).filter(c => c.spend > 0 || c.budget_gbp > 0);
}

export function getTopAndBottomCampaigns(campaignAggs: CampaignAggregates[]) {
  // Only consider campaigns with recorded spend to have meaningful ROAS
  const active = campaignAggs.filter(c => c.spend > 0);
  const sorted = [...active].sort((a, b) => b.roas - a.roas);
  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.length >= 3 ? sorted.slice(-3).reverse() : [...sorted].reverse();
  return { top3, bottom3 };
}

export function calculateContentTypeEngagement(posts: Post[]) {
  const map: Record<string, { totalEngPct: number; count: number; totalImpressions: number; totalInteractions: number }> = {};

  for (const p of posts) {
    const type = p.content_type || 'Other';
    if (!map[type]) {
      map[type] = { totalEngPct: 0, count: 0, totalImpressions: 0, totalInteractions: 0 };
    }
    const interactions = p.likes + p.comments + p.shares + p.saves;
    map[type].totalEngPct += p.engagement_rate_pct;
    map[type].count += 1;
    map[type].totalImpressions += p.impressions;
    map[type].totalInteractions += interactions;
  }

  return Object.keys(map).map(type => {
    const d = map[type];
    const avgEngPct = safeDivide(d.totalEngPct, d.count, 0);
    const weightedEngPct = safeDivide(d.totalInteractions, d.totalImpressions, 0) * 100;
    return {
      contentType: type,
      avgEngagementPct: avgEngPct,
      weightedEngagementPct: weightedEngPct,
      postCount: d.count,
      totalImpressions: d.totalImpressions,
    };
  }).sort((a, b) => b.avgEngagementPct - a.avgEngagementPct);
}

export function calculateContentThemeEngagement(posts: Post[]) {
  const map: Record<string, { totalEngPct: number; count: number; totalImpressions: number; totalInteractions: number }> = {};

  for (const p of posts) {
    const theme = p.content_theme || 'Other';
    if (!map[theme]) {
      map[theme] = { totalEngPct: 0, count: 0, totalImpressions: 0, totalInteractions: 0 };
    }
    const interactions = p.likes + p.comments + p.shares + p.saves;
    map[theme].totalEngPct += p.engagement_rate_pct;
    map[theme].count += 1;
    map[theme].totalImpressions += p.impressions;
    map[theme].totalInteractions += interactions;
  }

  return Object.keys(map).map(theme => {
    const d = map[theme];
    const avgEngPct = safeDivide(d.totalEngPct, d.count, 0);
    const weightedEngPct = safeDivide(d.totalInteractions, d.totalImpressions, 0) * 100;
    return {
      contentTheme: theme,
      avgEngagementPct: avgEngPct,
      weightedEngagementPct: weightedEngPct,
      postCount: d.count,
      totalImpressions: d.totalImpressions,
    };
  }).sort((a, b) => b.avgEngagementPct - a.avgEngagementPct);
}

export function calculateTopPosts(posts: Post[], campaigns: Campaign[], limit = 10) {
  const campMap = new Map<string, string>();
  campaigns.forEach(c => campMap.set(c.campaign_id, c.campaign_name));

  const sorted = [...posts].sort((a, b) => b.engagement_rate_pct - a.engagement_rate_pct);
  return sorted.slice(0, limit).map(p => ({
    ...p,
    campaign_name: campMap.get(p.campaign_id) || p.campaign_id,
  }));
}

export function calculateSentimentBreakdown(comments: CommentItem[]) {
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  let totalScore = 0;

  const topicMap: Record<string, { positive: number; neutral: number; negative: number; total: number; totalScore: number }> = {};
  const channelMap: Record<string, { positive: number; neutral: number; negative: number; total: number; totalScore: number }> = {};
  const cityMap: Record<string, { positive: number; neutral: number; negative: number; total: number; totalScore: number }> = {};

  for (const c of comments) {
    const label = c.sentiment_label;
    totalScore += c.sentiment_score;

    if (label === 'Positive') positive++;
    else if (label === 'Negative') negative++;
    else neutral++;

    // Topic
    const t = c.topic || 'General';
    if (!topicMap[t]) topicMap[t] = { positive: 0, neutral: 0, negative: 0, total: 0, totalScore: 0 };
    topicMap[t].total++;
    topicMap[t].totalScore += c.sentiment_score;
    if (label === 'Positive') topicMap[t].positive++;
    else if (label === 'Negative') topicMap[t].negative++;
    else topicMap[t].neutral++;

    // Channel
    const ch = c.channel || 'Unknown';
    if (!channelMap[ch]) channelMap[ch] = { positive: 0, neutral: 0, negative: 0, total: 0, totalScore: 0 };
    channelMap[ch].total++;
    channelMap[ch].totalScore += c.sentiment_score;
    if (label === 'Positive') channelMap[ch].positive++;
    else if (label === 'Negative') channelMap[ch].negative++;
    else channelMap[ch].neutral++;

    // City
    const city = c.uk_city || 'Unknown';
    if (!cityMap[city]) cityMap[city] = { positive: 0, neutral: 0, negative: 0, total: 0, totalScore: 0 };
    cityMap[city].total++;
    cityMap[city].totalScore += c.sentiment_score;
    if (label === 'Positive') cityMap[city].positive++;
    else if (label === 'Negative') cityMap[city].negative++;
    else cityMap[city].neutral++;
  }

  const total = comments.length;
  const avgScore = safeDivide(totalScore, total, 0);

  const formatPivot = (map: Record<string, { positive: number; neutral: number; negative: number; total: number; totalScore: number }>) => {
    return Object.keys(map).map(key => {
      const d = map[key];
      return {
        key,
        total: d.total,
        positive: d.positive,
        neutral: d.neutral,
        negative: d.negative,
        positivePct: safeDivide(d.positive, d.total, 0) * 100,
        neutralPct: safeDivide(d.neutral, d.total, 0) * 100,
        negativePct: safeDivide(d.negative, d.total, 0) * 100,
        avgScore: safeDivide(d.totalScore, d.total, 0),
      };
    }).sort((a, b) => b.total - a.total);
  };

  return {
    total,
    positive,
    neutral,
    negative,
    positivePct: safeDivide(positive, total, 0) * 100,
    neutralPct: safeDivide(neutral, total, 0) * 100,
    negativePct: safeDivide(negative, total, 0) * 100,
    avgScore,
    byTopic: formatPivot(topicMap),
    byChannel: formatPivot(channelMap),
    byCity: formatPivot(cityMap),
  };
}
