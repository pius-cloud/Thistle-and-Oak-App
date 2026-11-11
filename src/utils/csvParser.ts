import { Campaign, CommentItem, DailyPerformance, Post } from '../types/analytics';

/**
 * Parses RFC 4180 CSV text with support for multiline strings, escaped quotes, and empty values.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentField += '"';
      i++; // Skip the escaped quote
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n after \r
      }
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function safeNumber(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  const cleaned = String(val).replace(/["',£%]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) || !isFinite(num) ? fallback : num;
}

export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (!denominator || denominator === 0 || isNaN(denominator) || !isFinite(denominator)) {
    return fallback;
  }
  const res = numerator / denominator;
  return isNaN(res) || !isFinite(res) ? fallback : res;
}

/**
 * Converts date string (e.g. 2026-01-12) to UK format (12/01/2026)
 */
export function formatDateUK(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  // If already in DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  // If in YYYY-MM-DD
  const parts = trimmed.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return trimmed;
}

/**
 * Format currency in GBP (£) with thousands separator and 2 decimal places.
 */
export function formatGBP(val: number, options?: { compact?: boolean; decimals?: number }): string {
  const safe = isNaN(val) || !isFinite(val) ? 0 : val;
  if (options?.compact && Math.abs(safe) >= 1000) {
    if (Math.abs(safe) >= 1000000) {
      return `£${(safe / 1000000).toFixed(options.decimals ?? 1)}m`;
    }
    return `£${(safe / 1000).toFixed(options.decimals ?? 1)}k`;
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: options?.decimals ?? 2,
    maximumFractionDigits: options?.decimals ?? 2,
  }).format(safe);
}

/**
 * Format percentage (e.g., 0.0452 => 4.52% or raw 4.52 => 4.52%)
 */
export function formatPercent(val: number, isRatio = true, decimals = 2): string {
  const safe = isNaN(val) || !isFinite(val) ? 0 : val;
  const multiplier = isRatio ? 100 : 1;
  return `${(safe * multiplier).toFixed(decimals)}%`;
}

/**
 * Format standard multiplier or ratio (e.g. ROAS 2.45)
 */
export function formatRatio(val: number, decimals = 2): string {
  const safe = isNaN(val) || !isFinite(val) ? 0 : val;
  return safe.toFixed(decimals);
}

/**
 * Format integers with commas
 */
export function formatInt(val: number): string {
  const safe = isNaN(val) || !isFinite(val) ? 0 : Math.round(val);
  return new Intl.NumberFormat('en-GB').format(safe);
}

/**
 * Map CSV rows to Campaign objects
 */
export function mapCampaigns(rows: string[][]): Campaign[] {
  if (rows.length < 2) return [];
  const header = rows[0].map(h => h.toLowerCase());
  const idIdx = header.indexOf('campaign_id');
  const nameIdx = header.indexOf('campaign_name');
  const objIdx = header.indexOf('objective');
  const startIdx = header.indexOf('start_date');
  const endIdx = header.indexOf('end_date');
  const budgetIdx = header.indexOf('budget_gbp');
  const audIdx = header.indexOf('target_audience');

  return rows.slice(1).map(r => ({
    campaign_id: r[idIdx] || '',
    campaign_name: r[nameIdx] || '',
    objective: r[objIdx] || '',
    start_date: r[startIdx] || '',
    end_date: r[endIdx] || '',
    budget_gbp: safeNumber(r[budgetIdx]),
    target_audience: r[audIdx] || '',
  }));
}

/**
 * Map CSV rows to DailyPerformance objects
 */
export function mapDailyPerformance(rows: string[][]): DailyPerformance[] {
  if (rows.length < 2) return [];
  const header = rows[0].map(h => h.toLowerCase());
  const getIdx = (name: string) => header.indexOf(name);

  return rows.slice(1).map(r => ({
    record_id: r[getIdx('record_id')] || '',
    date: r[getIdx('date')] || '',
    campaign_id: r[getIdx('campaign_id')] || '',
    channel: r[getIdx('channel')] || '',
    spend_gbp: safeNumber(r[getIdx('spend_gbp')]),
    impressions: safeNumber(r[getIdx('impressions')]),
    reach: safeNumber(r[getIdx('reach')]),
    link_clicks: safeNumber(r[getIdx('link_clicks')]),
    likes: safeNumber(r[getIdx('likes')]),
    comments: safeNumber(r[getIdx('comments')]),
    shares: safeNumber(r[getIdx('shares')]),
    saves: safeNumber(r[getIdx('saves')]),
    video_views: safeNumber(r[getIdx('video_views')]),
    website_sessions: safeNumber(r[getIdx('website_sessions')]),
    orders: safeNumber(r[getIdx('orders')]),
    revenue_gbp: safeNumber(r[getIdx('revenue_gbp')]),
  }));
}

/**
 * Map CSV rows to Post objects
 */
export function mapPosts(rows: string[][]): Post[] {
  if (rows.length < 2) return [];
  const header = rows[0].map(h => h.toLowerCase());
  const getIdx = (name: string) => header.indexOf(name);

  return rows.slice(1).map(r => ({
    post_id: r[getIdx('post_id')] || '',
    post_date: r[getIdx('post_date')] || '',
    campaign_id: r[getIdx('campaign_id')] || '',
    channel: r[getIdx('channel')] || '',
    content_type: r[getIdx('content_type')] || '',
    content_theme: r[getIdx('content_theme')] || '',
    hashtags: r[getIdx('hashtags')] || '',
    impressions: safeNumber(r[getIdx('impressions')]),
    likes: safeNumber(r[getIdx('likes')]),
    comments: safeNumber(r[getIdx('comments')]),
    shares: safeNumber(r[getIdx('shares')]),
    saves: safeNumber(r[getIdx('saves')]),
    link_clicks: safeNumber(r[getIdx('link_clicks')]),
    engagement_rate_pct: safeNumber(r[getIdx('engagement_rate_pct')]),
  }));
}

/**
 * Map CSV rows to CommentItem objects
 */
export function mapComments(rows: string[][]): CommentItem[] {
  if (rows.length < 2) return [];
  const header = rows[0].map(h => h.toLowerCase());
  const getIdx = (name: string) => header.indexOf(name);

  return rows.slice(1).map(r => ({
    comment_id: r[getIdx('comment_id')] || '',
    post_id: r[getIdx('post_id')] || '',
    comment_date: r[getIdx('comment_date')] || '',
    channel: r[getIdx('channel')] || '',
    uk_city: r[getIdx('uk_city')] || '',
    topic: r[getIdx('topic')] || '',
    comment_text: r[getIdx('comment_text')] || '',
    sentiment_label: r[getIdx('sentiment_label')] || 'Neutral',
    sentiment_score: safeNumber(r[getIdx('sentiment_score')]),
  }));
}
