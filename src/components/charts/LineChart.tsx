import React, { useState } from 'react';
import { MonthlyAggregate } from '../../types/analytics';
import { formatGBP, formatRatio } from '../../utils/csvParser';

interface LineChartProps {
  data: MonthlyAggregate[];
}

export const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        No monthly performance data available for selected filter criteria.
      </div>
    );
  }

  // Chart dimensions
  const width = 760;
  const height = 300;
  const padding = { top: 30, right: 30, bottom: 40, left: 75 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(
    ...data.map(d => Math.max(d.revenue, d.spend)),
    1000
  );
  // Add 15% headroom for aesthetic spacing
  const yMax = Math.ceil((maxVal * 1.15) / 5000) * 5000;

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + innerWidth / 2;
    return padding.left + (index / (data.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    return padding.top + innerHeight - (val / yMax) * innerHeight;
  };

  // Generate smooth SVG paths
  const revenuePoints = data.map((d, i) => `${getX(i)},${getY(d.revenue)}`).join(' ');
  const spendPoints = data.map((d, i) => `${getX(i)},${getY(d.spend)}`).join(' ');

  const revenueArea = `${getX(0)},${padding.top + innerHeight} ${revenuePoints} ${getX(data.length - 1)},${padding.top + innerHeight}`;
  const spendArea = `${getX(0)},${padding.top + innerHeight} ${spendPoints} ${getX(data.length - 1)},${padding.top + innerHeight}`;

  // Y-axis ticks (4 ticks)
  const yTicks = [0, yMax * 0.33, yMax * 0.66, yMax];

  return (
    <div className="relative w-full overflow-hidden">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-[#6B35A8]"></span>
            <span className="font-medium text-slate-700">Revenue (£)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-slate-400"></span>
            <span className="font-medium text-slate-600">Marketing Spend (£)</span>
          </div>
        </div>
        <span className="text-slate-400">Hover points for month metrics</span>
      </div>

      <div className="w-full aspect-[760/300] max-h-[320px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6B35A8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6B35A8" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y axis labels */}
          {yTicks.map((tick, i) => {
            const y = getY(tick);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 font-mono text-[10px]"
                >
                  {formatGBP(tick, { compact: true, decimals: 0 })}
                </text>
              </g>
            );
          })}

          {/* Area fills */}
          <polygon points={revenueArea} fill="url(#revGrad)" />
          <polygon points={spendArea} fill="url(#spendGrad)" />

          {/* Lines */}
          <polyline
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={spendPoints}
          />
          <polyline
            fill="none"
            stroke="#6B35A8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={revenuePoints}
          />

          {/* Data dots and interaction areas */}
          {data.map((d, i) => {
            const x = getX(i);
            const yRev = getY(d.revenue);
            const ySpend = getY(d.spend);
            const isHovered = hoverIndex === i;

            return (
              <g key={i} className="cursor-pointer" onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
                {/* Active vertical cursor line */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={height - padding.bottom}
                    stroke="#6B35A8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Spend dot */}
                <circle
                  cx={x}
                  cy={ySpend}
                  r={isHovered ? 5 : 3.5}
                  fill="#FFFFFF"
                  stroke="#64748B"
                  strokeWidth="2"
                />

                {/* Revenue dot */}
                <circle
                  cx={x}
                  cy={yRev}
                  r={isHovered ? 6 : 4}
                  fill="#FFFFFF"
                  stroke="#6B35A8"
                  strokeWidth="2.5"
                />

                {/* X-axis label */}
                <text
                  x={x}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  className={`text-[11px] font-medium transition-colors ${
                    isHovered ? 'fill-[#6B35A8] font-bold' : 'fill-slate-500'
                  }`}
                >
                  {d.monthLabel.split(' ')[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover Info Tooltip Box */}
      {hoverIndex !== null && data[hoverIndex] && (
        <div className="mt-2 p-3 bg-slate-900 text-white rounded-lg shadow-lg flex flex-wrap items-center justify-between text-xs gap-4 border border-slate-700 animate-in fade-in duration-150">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Month</span>
            <span className="font-semibold text-white">{data[hoverIndex].monthLabel}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Revenue</span>
            <span className="font-bold text-emerald-400 font-mono tabular-nums">{formatGBP(data[hoverIndex].revenue)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Spend</span>
            <span className="font-bold text-slate-200 font-mono tabular-nums">{formatGBP(data[hoverIndex].spend)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Monthly ROAS</span>
            <span className={`font-bold font-mono tabular-nums ${data[hoverIndex].roas >= 2 ? 'text-emerald-400' : data[hoverIndex].roas < 1 ? 'text-purple-300' : 'text-amber-300'}`}>
              {formatRatio(data[hoverIndex].roas)}x
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Orders</span>
            <span className="font-bold text-white font-mono tabular-nums">{data[hoverIndex].orders.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
