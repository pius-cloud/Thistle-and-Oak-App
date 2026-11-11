export interface Campaign {
  campaign_id: string;
  campaign_name: string;
  objective: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  budget_gbp: number;
  target_audience: string;
}

export interface DailyPerformance {
  record_id: string;
  date: string; // YYYY-MM-DD
  campaign_id: string;
  channel: string;
  spend_gbp: number;
  impressions: number;
  reach: number;
  link_clicks: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  video_views: number;
  website_sessions: number;
  orders: number;
  revenue_gbp: number;
}

export interface Post {
  post_id: string;
  post_date: string; // YYYY-MM-DD
  campaign_id: string;
  channel: string;
  content_type: string;
  content_theme: string;
  hashtags: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  link_clicks: number;
  engagement_rate_pct: number;
}

export interface CommentItem {
  comment_id: string;
  post_id: string;
  comment_date: string; // YYYY-MM-DD
  channel: string;
  uk_city: string;
  topic: string;
  comment_text: string;
  sentiment_label: 'Positive' | 'Neutral' | 'Negative' | string;
  sentiment_score: number;
}

export interface ChannelAggregates {
  channel: string;
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
  roas: number;
  roi: number;
  cost_per_order: number;
  engagement_rate: number;
  ctr: number;
  conversion_rate: number;
}

export interface CampaignAggregates {
  campaign_id: string;
  campaign_name: string;
  objective: string;
  target_audience: string;
  budget_gbp: number;
  start_date: string;
  end_date: string;
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
  roas: number;
  roi: number;
  cost_per_order: number;
  engagement_rate: number;
  ctr: number;
  conversion_rate: number;
}

export interface MonthlyAggregate {
  monthKey: string; // e.g. "2026-01"
  monthLabel: string; // e.g. "Jan 2026"
  spend: number;
  revenue: number;
  orders: number;
  roas: number;
}

export interface AISentimentResult {
  comment_id: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  score: number;
  topic: string;
}

export interface AIRecommendation {
  title: string;
  action: string;
  evidence: string;
  expected_impact: string;
  risk: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface AskDataResponse {
  answer: string;
  numbersUsed: string[];
}
