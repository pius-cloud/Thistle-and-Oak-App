import React, { useState, useMemo } from 'react';
import { useAnalytics } from '../context/AnalyticsContext';
import {
  calculateChannelAggregates,
  calculateCampaignAggregates,
} from '../utils/analyticsCalculations';
import {
  formatGBP,
  formatPercent,
  formatRatio,
  formatInt,
  formatDateUK,
} from '../utils/csvParser';
import {
  ArrowUpDown,
  Search,
  Download,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { ChannelAggregates, CampaignAggregates } from '../types/analytics';

type ChannelSortField = keyof ChannelAggregates;
type CampaignSortField = keyof CampaignAggregates;

export const RoiPage: React.FC = () => {
  const { dailyPerformance, campaigns } = useAnalytics();

  // Search terms
  const [channelSearch, setChannelSearch] = useState('');
  const [campaignSearch, setCampaignSearch] = useState('');

  // Sort states
  const [channelSortField, setChannelSortField] = useState<ChannelSortField>('roas');
  const [channelSortAsc, setChannelSortAsc] = useState(false);

  const [campaignSortField, setCampaignSortField] = useState<CampaignSortField>('roas');
  const [campaignSortAsc, setCampaignSortAsc] = useState(false);

  // Aggregations
  const allChannelData = useMemo(() => {
    return calculateChannelAggregates(dailyPerformance);
  }, [dailyPerformance]);

  const allCampaignData = useMemo(() => {
    return calculateCampaignAggregates(dailyPerformance, campaigns);
  }, [dailyPerformance, campaigns]);

  // Filtered and Sorted Channels
  const sortedChannels = useMemo(() => {
    let list = allChannelData.filter(c =>
      c.channel.toLowerCase().includes(channelSearch.toLowerCase())
    );
    list.sort((a, b) => {
      const aVal = a[channelSortField];
      const bVal = b[channelSortField];
      if (typeof aVal === 'string') {
        return channelSortAsc
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }
      return channelSortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return list;
  }, [allChannelData, channelSearch, channelSortField, channelSortAsc]);

  // Filtered and Sorted Campaigns
  const sortedCampaigns = useMemo(() => {
    let list = allCampaignData.filter(c =>
      c.campaign_name.toLowerCase().includes(campaignSearch.toLowerCase()) ||
      c.objective.toLowerCase().includes(campaignSearch.toLowerCase()) ||
      c.target_audience.toLowerCase().includes(campaignSearch.toLowerCase())
    );
    list.sort((a, b) => {
      const aVal = a[campaignSortField];
      const bVal = b[campaignSortField];
      if (typeof aVal === 'string') {
        return campaignSortAsc
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }
      return campaignSortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return list;
  }, [allCampaignData, campaignSearch, campaignSortField, campaignSortAsc]);

  const handleChannelSort = (field: ChannelSortField) => {
    if (channelSortField === field) {
      setChannelSortAsc(!channelSortAsc);
    } else {
      setChannelSortField(field);
      setChannelSortAsc(false); // Default descending for metrics
    }
  };

  const handleCampaignSort = (field: CampaignSortField) => {
    if (campaignSortField === field) {
      setCampaignSortAsc(!campaignSortAsc);
    } else {
      setCampaignSortField(field);
      setCampaignSortAsc(false);
    }
  };

  const getRoasBadge = (roas: number) => {
    if (roas < 1.0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono text-fuchsia-900 bg-fuchsia-100 border border-fuchsia-300">
          {formatRatio(roas)}x
        </span>
      );
    }
    if (roas >= 2.0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono text-emerald-800 bg-emerald-100 border border-emerald-300">
          {formatRatio(roas)}x
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono text-[#6B35A8] bg-purple-50 border border-purple-200">
        {formatRatio(roas)}x
      </span>
    );
  };

  // CSV export function for tables
  const exportCSV = (type: 'channels' | 'campaigns') => {
    if (type === 'channels') {
      const headers = ['Channel', 'Spend (£)', 'Revenue (£)', 'Orders', 'ROAS', 'Cost Per Order (£)', 'Engagement Rate (%)', 'CTR (%)', 'Conversion Rate (%)'];
      const rows = sortedChannels.map(c => [
        `"${c.channel}"`,
        c.spend.toFixed(2),
        c.revenue.toFixed(2),
        c.orders,
        c.roas.toFixed(2),
        c.cost_per_order.toFixed(2),
        (c.engagement_rate * 100).toFixed(2),
        (c.ctr * 100).toFixed(2),
        (c.conversion_rate * 100).toFixed(2),
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thistle_oak_channel_roi_${Date.now()}.csv`;
      a.click();
    } else {
      const headers = ['Campaign Name', 'Objective', 'Spend (£)', 'Revenue (£)', 'Orders', 'ROAS', 'Cost Per Order (£)', 'Engagement Rate (%)', 'CTR (%)', 'Conversion Rate (%)'];
      const rows = sortedCampaigns.map(c => [
        `"${c.campaign_name}"`,
        `"${c.objective}"`,
        c.spend.toFixed(2),
        c.revenue.toFixed(2),
        c.orders,
        c.roas.toFixed(2),
        c.cost_per_order.toFixed(2),
        (c.engagement_rate * 100).toFixed(2),
        (c.ctr * 100).toFixed(2),
        (c.conversion_rate * 100).toFixed(2),
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thistle_oak_campaign_roi_${Date.now()}.csv`;
      a.click();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Channel &amp; Campaign Commercial ROI
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Comprehensive unit economics and return on ad spend across all media channels and tactical campaigns.
        </p>
      </div>

      {/* Legend & Threshold Guide */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-6 flex-wrap">
          <span className="font-semibold text-slate-700">ROAS Benchmark Rules:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></span>
            <span className="text-slate-600 font-medium">ROAS &ge; 2.0 (Target Growth: Green)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-purple-50 border border-purple-200"></span>
            <span className="text-slate-600 font-medium">1.0 &le; ROAS &lt; 2.0 (Viable: Neutral Purple)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-fuchsia-100 border border-fuchsia-300"></span>
            <span className="text-slate-600 font-medium">ROAS &lt; 1.0 (Deficit: Red-Purple)</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400">
          All values computed from Google Sheet dataset in GBP (£)
        </div>
      </div>

      {/* Table 1: Channel ROI Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">1. Channel Performance Matrix</h2>
            <p className="text-xs text-slate-500">Cross-channel comparison sorted by commercial efficiency.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search channel..."
                value={channelSearch}
                onChange={e => setChannelSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#6B35A8]"
              />
            </div>
            <button
              onClick={() => exportCSV('channels')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold select-none">
                <th
                  onClick={() => handleChannelSort('channel')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center gap-1">
                    <span>Channel</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleChannelSort('spend')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Spend</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleChannelSort('revenue')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Revenue</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleChannelSort('orders')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Orders</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleChannelSort('roas')}
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ROAS</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleChannelSort('cost_per_order')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Cost / Order</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleChannelSort('engagement_rate')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Eng. Rate</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleChannelSort('ctr')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>CTR</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleChannelSort('conversion_rate')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Conv. Rate</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedChannels.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-400">
                    No channels matching search query.
                  </td>
                </tr>
              ) : (
                sortedChannels.map(ch => (
                  <tr key={ch.channel} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{ch.channel}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">{formatGBP(ch.spend)}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">{formatGBP(ch.revenue)}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">{formatInt(ch.orders)}</td>
                    <td className="py-3 px-4 text-center">{getRoasBadge(ch.roas)}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">{formatGBP(ch.cost_per_order)}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">{formatPercent(ch.engagement_rate)}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">{formatPercent(ch.ctr)}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">{formatPercent(ch.conversion_rate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 2: Campaign ROI Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">2. Campaign Performance Matrix</h2>
            <p className="text-xs text-slate-500">Breakdown across all 12 marketing campaigns from Jan to Sep 2026.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search campaign or objective..."
                value={campaignSearch}
                onChange={e => setCampaignSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#6B35A8]"
              />
            </div>
            <button
              onClick={() => exportCSV('campaigns')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold select-none">
                <th
                  onClick={() => handleCampaignSort('campaign_name')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center gap-1">
                    <span>Campaign Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleCampaignSort('objective')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center gap-1">
                    <span>Objective</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleCampaignSort('spend')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Spend</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleCampaignSort('revenue')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Revenue</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleCampaignSort('orders')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Orders</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleCampaignSort('roas')}
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ROAS</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleCampaignSort('cost_per_order')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Cost / Order</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleCampaignSort('engagement_rate')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Eng. Rate</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleCampaignSort('ctr')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>CTR</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleCampaignSort('conversion_rate')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/70"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Conv. Rate</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-slate-400">
                    No campaigns matching search query.
                  </td>
                </tr>
              ) : (
                sortedCampaigns.map(c => (
                  <tr key={c.campaign_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{c.campaign_name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {formatDateUK(c.start_date)} – {formatDateUK(c.end_date)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {c.objective}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">{formatGBP(c.spend)}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">{formatGBP(c.revenue)}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">{formatInt(c.orders)}</td>
                    <td className="py-3 px-4 text-center">{getRoasBadge(c.roas)}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">{formatGBP(c.cost_per_order)}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">{formatPercent(c.engagement_rate)}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">{formatPercent(c.ctr)}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">{formatPercent(c.conversion_rate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
