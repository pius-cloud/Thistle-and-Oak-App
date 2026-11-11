import React, { useMemo, useState } from 'react';
import { useAnalytics } from '../context/AnalyticsContext';
import {
  calculateContentTypeEngagement,
  calculateContentThemeEngagement,
  calculateTopPosts,
} from '../utils/analyticsCalculations';
import { formatPercent, formatInt, formatDateUK } from '../utils/csvParser';
import {
  Layers,
  Palette,
  Trophy,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MousePointerClick,
  Filter,
} from 'lucide-react';

export const ContentPerformancePage: React.FC = () => {
  const { posts, campaigns } = useAnalytics();

  const [channelFilter, setChannelFilter] = useState('All');

  // Filter posts if channel filter selected
  const filteredPosts = useMemo(() => {
    if (channelFilter === 'All') return posts;
    return posts.filter(p => p.channel === channelFilter);
  }, [posts, channelFilter]);

  // Aggregate by content type
  const typeEngagement = useMemo(() => {
    return calculateContentTypeEngagement(filteredPosts);
  }, [filteredPosts]);

  // Aggregate by content theme
  const themeEngagement = useMemo(() => {
    return calculateContentThemeEngagement(filteredPosts);
  }, [filteredPosts]);

  // Top 10 posts
  const top10Posts = useMemo(() => {
    return calculateTopPosts(filteredPosts, campaigns, 10);
  }, [filteredPosts, campaigns]);

  const channelsList = useMemo(() => {
    return Array.from(new Set(posts.map(p => p.channel))).filter(Boolean).sort();
  }, [posts]);

  // Max engagement values for scaling bar graphics
  const maxTypeEng = Math.max(...typeEngagement.map(t => t.avgEngagementPct), 5);
  const maxThemeEng = Math.max(...themeEngagement.map(t => t.avgEngagementPct), 5);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Creative &amp; Content Performance
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Engagement dynamics, format efficacy, and creative theme impact across organic and paid posts.
          </p>
        </div>

        {/* Channel Filter for Content */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value)}
            className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-1.5 font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-[#6B35A8]"
          >
            <option value="All">All Channels ({posts.length} posts)</option>
            {channelsList.map(ch => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: By Content Type and By Content Theme */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Type Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-[#6B35A8]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Average Engagement by Content Type</h2>
              <p className="text-[11px] text-slate-500">Benchmark across {typeEngagement.length} publishing formats</p>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {typeEngagement.map((item, idx) => {
              const widthPct = Math.min((item.avgEngagementPct / maxTypeEng) * 100, 100);
              return (
                <div key={item.contentType} className="group">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                      {item.contentType}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400">{item.postCount} posts</span>
                      <span className="font-bold text-[#6B35A8] font-mono tabular-nums text-xs">
                        {item.avgEngagementPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#6B35A8] h-full rounded-full transition-all duration-300 group-hover:bg-[#8E4BD8]"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Theme Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Average Engagement by Content Theme</h2>
              <p className="text-[11px] text-slate-500">Audience receptivity across key editorial pillars</p>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {themeEngagement.map((item, idx) => {
              const widthPct = Math.min((item.avgEngagementPct / maxThemeEng) * 100, 100);
              return (
                <div key={item.contentTheme} className="group">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                      {item.contentTheme}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400">{item.postCount} posts</span>
                      <span className="font-bold text-emerald-700 font-mono tabular-nums text-xs">
                        {item.avgEngagementPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300 group-hover:bg-emerald-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top 10 Posts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Top 10 High-Engagement Posts</h2>
              <p className="text-xs text-slate-500">
                Ranked strictly by recorded engagement rate percentage (likes + comments + shares + saves / impressions).
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
            Top 10 of {filteredPosts.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold select-none">
                <th className="py-3 px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Post &amp; Campaign</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Format / Theme</th>
                <th className="py-3 px-4 text-right">Impressions</th>
                <th className="py-3 px-4 text-right">Likes</th>
                <th className="py-3 px-4 text-right">Comments</th>
                <th className="py-3 px-4 text-right">Shares &amp; Saves</th>
                <th className="py-3 px-4 text-right">Clicks</th>
                <th className="py-3 px-4 text-right">Eng. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {top10Posts.map((post, idx) => (
                <tr key={post.post_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-center font-bold font-mono">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                      idx === 0
                        ? 'bg-amber-400 text-amber-950 font-bold shadow-sm'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-900 font-bold'
                        : idx === 2
                        ? 'bg-amber-200 text-amber-900 font-bold'
                        : 'text-slate-500 bg-slate-100'
                    }`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{post.campaign_name}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-slate-500">{post.post_id}</span>
                      <span>·</span>
                      <span>{formatDateUK(post.post_date)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">{post.channel}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{post.content_type}</div>
                    <div className="text-[10px] text-slate-500">{post.content_theme}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                    {formatInt(post.impressions)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                    {formatInt(post.likes)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                    {formatInt(post.comments)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                    {formatInt(post.shares + post.saves)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                    {formatInt(post.link_clicks)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#6B35A8]">
                    <span className="px-2 py-0.5 bg-purple-50 border border-purple-200 rounded">
                      {post.engagement_rate_pct.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
