import React, { useMemo } from 'react';
import { useAnalytics } from '../context/AnalyticsContext';
import { FilterBar } from '../components/common/FilterBar';
import { KPICard } from '../components/common/KPICard';
import { LineChart } from '../components/charts/LineChart';
import { BarChart } from '../components/charts/BarChart';
import {
  filterDailyPerformance,
  calculateKPIs,
  calculateMonthlyAggregates,
  calculateChannelAggregates,
  calculateCampaignAggregates,
  getTopAndBottomCampaigns,
} from '../utils/analyticsCalculations';
import { formatGBP, formatPercent, formatRatio, formatInt, formatDateUK } from '../utils/csvParser';
import {
  PoundSterling,
  ShoppingBag,
  TrendingUp,
  Percent,
  Award,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export const ExecutiveSummaryPage: React.FC = () => {
  const { dailyPerformance, campaigns, campaignsMap, filters } = useAnalytics();

  // Filter daily records according to global filter state
  const filteredRecords = useMemo(() => {
    return filterDailyPerformance(dailyPerformance, campaignsMap, filters);
  }, [dailyPerformance, campaignsMap, filters]);

  // Compute summary metrics from filtered records
  const kpis = useMemo(() => {
    return calculateKPIs(filteredRecords);
  }, [filteredRecords]);

  // Monthly revenue vs spend
  const monthlyData = useMemo(() => {
    return calculateMonthlyAggregates(filteredRecords);
  }, [filteredRecords]);

  // Channel aggregates
  const channelData = useMemo(() => {
    return calculateChannelAggregates(filteredRecords);
  }, [filteredRecords]);

  // Campaign aggregates
  const campaignData = useMemo(() => {
    return calculateCampaignAggregates(filteredRecords, campaigns);
  }, [filteredRecords, campaigns]);

  // Top 3 / Bottom 3 campaigns by ROAS
  const { top3, bottom3 } = useMemo(() => {
    return getTopAndBottomCampaigns(campaignData);
  }, [campaignData]);

  const roasBadgeColor = kpis.roas >= 2.0 ? 'green' : kpis.roas < 1.0 ? 'red' : 'purple';

  return (
    <div className="space-y-6">
      {/* Page Title & Intro */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Executive Performance Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Holistic cross-channel marketing efficiency and financial returns for Thistle & Oak (UK).
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
          Loaded records: <span className="font-semibold text-slate-800 font-mono tabular-nums">{filteredRecords.length.toLocaleString()}</span> of {dailyPerformance.length.toLocaleString()}
        </div>
      </div>

      {/* Global Filter Bar */}
      <FilterBar />

      {/* 5 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Marketing Spend"
          value={formatGBP(kpis.totalSpend)}
          subtitle={`${formatInt(filteredRecords.length)} daily channel entries`}
          icon={<PoundSterling className="w-4 h-4" />}
          badgeColor="slate"
        />

        <KPICard
          title="Total Attributed Revenue"
          value={formatGBP(kpis.totalRevenue)}
          subtitle={`Net Profit: ${formatGBP(kpis.totalRevenue - kpis.totalSpend)}`}
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          badge={`ROI ${formatPercent(kpis.roi)}`}
          badgeColor={kpis.roi > 0 ? 'green' : 'red'}
        />

        <KPICard
          title="Orders & CPA"
          value={formatInt(kpis.totalOrders)}
          subtitle={`Cost per Order: ${formatGBP(kpis.costPerOrder)}`}
          icon={<ShoppingBag className="w-4 h-4" />}
          badge={`Conv ${formatPercent(kpis.conversionRate)}`}
          badgeColor="purple"
        />

        <KPICard
          title="Blended ROAS"
          value={`${formatRatio(kpis.roas)}x`}
          subtitle={kpis.roas >= 2 ? 'Exceeding target (≥2.0x)' : kpis.roas < 1 ? 'Sub-parity alert (<1.0x)' : 'Within viable margin'}
          icon={<Percent className="w-4 h-4" />}
          badge={kpis.roas >= 2 ? 'Profitable' : kpis.roas < 1 ? 'Underperforming' : 'Viable'}
          badgeColor={roasBadgeColor}
        />

        <KPICard
          title="Engagement Rate"
          value={formatPercent(kpis.engagementRate)}
          subtitle={`${formatInt(kpis.totalInteractions)} likes/shares/saves`}
          icon={<Award className="w-4 h-4" />}
          badge={`CTR ${formatPercent(kpis.ctr)}`}
          badgeColor="purple"
        />
      </div>

      {/* Visual Analytics Grid: Line Chart and Channel ROAS Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Revenue vs Spend Line Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Monthly Revenue vs. Spend Trajectory
              </h2>
              <p className="text-xs text-slate-500">
                Evaluating commercial scale and return velocity month-over-month (dd/mm/yyyy context).
              </p>
            </div>
          </div>
          <LineChart data={monthlyData} />
        </div>

        {/* ROAS by Channel Bar Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Channel Efficiency (ROAS)
              </h2>
              <p className="text-xs text-slate-500">
                Target &ge; 2.0x (Green), Viable 1.0–2.0x (Purple), Sub-parity &lt; 1.0x (Red-purple).
              </p>
            </div>
          </div>
          <BarChart data={channelData} />
        </div>
      </div>

      {/* Top 3 / Bottom 3 Campaigns by ROAS Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Top 3 &amp; Bottom 3 Campaigns by ROAS
            </h2>
            <p className="text-xs text-slate-500">
              Identifies the highest commercial multipliers and immediate budget reallocation candidates.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 3 Panel */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <ArrowUpRight className="w-4 h-4" />
              <span>Top 3 Value Generators (Highest ROAS)</span>
            </div>
            {top3.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No campaign spend records found.</p>
            ) : (
              top3.map((camp, idx) => (
                <div
                  key={camp.campaign_id}
                  className="p-3.5 rounded-lg border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50/70 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <h4 className="font-semibold text-xs text-slate-900">{camp.campaign_name}</h4>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 pl-7">
                        Objective: <span className="font-medium text-slate-700">{camp.objective}</span> · Window: {formatDateUK(camp.start_date)} – {formatDateUK(camp.end_date)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold font-mono text-emerald-800 bg-emerald-100">
                        {formatRatio(camp.roas)}x ROAS
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-emerald-200/50 text-[11px] pl-7">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Spend</span>
                      <span className="font-semibold text-slate-800 font-mono tabular-nums">{formatGBP(camp.spend)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Revenue</span>
                      <span className="font-semibold text-emerald-700 font-mono tabular-nums">{formatGBP(camp.revenue)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Orders</span>
                      <span className="font-semibold text-slate-800 font-mono tabular-nums">{camp.orders.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom 3 Panel */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-fuchsia-800">
              <ArrowDownRight className="w-4 h-4 text-fuchsia-700" />
              <span>Bottom 3 Campaigns by ROAS (Review or Trim)</span>
            </div>
            {bottom3.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No campaign spend records found.</p>
            ) : (
              bottom3.map((camp, idx) => (
                <div
                  key={camp.campaign_id}
                  className="p-3.5 rounded-lg border border-fuchsia-200 bg-fuchsia-50/40 hover:bg-fuchsia-50/70 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-fuchsia-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <h4 className="font-semibold text-xs text-slate-900">{camp.campaign_name}</h4>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 pl-7">
                        Objective: <span className="font-medium text-slate-700">{camp.objective}</span> · Window: {formatDateUK(camp.start_date)} – {formatDateUK(camp.end_date)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold font-mono ${camp.roas < 1.0 ? 'text-fuchsia-900 bg-fuchsia-200' : 'text-purple-800 bg-purple-100'}`}>
                        {formatRatio(camp.roas)}x ROAS
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-fuchsia-200/50 text-[11px] pl-7">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Spend</span>
                      <span className="font-semibold text-slate-800 font-mono tabular-nums">{formatGBP(camp.spend)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Revenue</span>
                      <span className="font-semibold text-slate-700 font-mono tabular-nums">{formatGBP(camp.revenue)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Orders</span>
                      <span className="font-semibold text-slate-800 font-mono tabular-nums">{camp.orders.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
