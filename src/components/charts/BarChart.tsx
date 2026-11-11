import React, { useState } from 'react';
import { ChannelAggregates } from '../../types/analytics';
import { formatGBP, formatRatio, formatPercent } from '../../utils/csvParser';

interface BarChartProps {
  data: ChannelAggregates[];
}

export const BarChart: React.FC<BarChartProps> = ({ data }) => {
  const [hoverChannel, setHoverChannel] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        No channel data available for selected filter criteria.
      </div>
    );
  }

  // Sorted by ROAS descending
  const sorted = [...data].sort((a, b) => b.roas - a.roas);
  const maxRoas = Math.max(...sorted.map(d => d.roas), 2.5);
  const yMax = Math.ceil(maxRoas * 1.2 * 2) / 2; // e.g. 3.0, 3.5, etc.

  const width = 640;
  const height = 300;
  const padding = { top: 30, right: 30, bottom: 45, left: 55 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const barCount = sorted.length;
  const slotWidth = innerWidth / barCount;
  const barWidth = Math.min(Math.max(slotWidth * 0.55, 24), 52);

  const getY = (val: number) => {
    return padding.top + innerHeight - (val / yMax) * innerHeight;
  };

  const getBarColor = (roas: number) => {
    if (roas < 1.0) {
      // Red-purple for ROAS < 1
      return '#A21CAF'; // Rich red-purple (fuchsia-700)
    }
    if (roas >= 2.0) {
      // Green for ROAS >= 2
      return '#16A34A'; // Emerald/green-600
    }
    // Mid-range (1.0 to 1.99) - Thistle Purple accent
    return '#6B35A8';
  };

  const activeChannelData = sorted.find(d => d.channel === hoverChannel);

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#16A34A]"></span>
            <span className="text-slate-600 font-medium">ROAS &gt; 2.0 (Target)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#6B35A8]"></span>
            <span className="text-slate-600 font-medium">1.0 – 2.0 (Viable)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#A21CAF]"></span>
            <span className="text-slate-600 font-medium">ROAS &lt; 1.0 (Sub-parity)</span>
          </div>
        </div>
      </div>

      <div className="w-full aspect-[640/300] max-h-[320px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
          {/* Reference lines */}
          {/* 1.0x line (Break-even) */}
          <line
            x1={padding.left}
            y1={getY(1.0)}
            x2={width - padding.right}
            y2={getY(1.0)}
            stroke="#A21CAF"
            strokeWidth="1.2"
            strokeDasharray="4 3"
            opacity="0.8"
          />
          <text
            x={width - padding.right + 4}
            y={getY(1.0) + 3}
            textAnchor="start"
            className="fill-fuchsia-700 font-mono text-[9px] font-semibold"
          >
            1.0x
          </text>

          {/* 2.0x line (Target benchmark) */}
          {yMax >= 2.0 && (
            <>
              <line
                x1={padding.left}
                y1={getY(2.0)}
                x2={width - padding.right}
                y2={getY(2.0)}
                stroke="#16A34A"
                strokeWidth="1.2"
                strokeDasharray="4 3"
                opacity="0.8"
              />
              <text
                x={width - padding.right + 4}
                y={getY(2.0) + 3}
                textAnchor="start"
                className="fill-emerald-700 font-mono text-[9px] font-semibold"
              >
                2.0x
              </text>
            </>
          )}

          {/* Y-axis gridlines */}
          {[0, 1.0, 2.0, yMax].map((tick, i) => {
            const y = getY(tick);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="0.8"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 font-mono text-[10px]"
                >
                  {tick.toFixed(1)}x
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {sorted.map((item, i) => {
            const centerX = padding.left + i * slotWidth + slotWidth / 2;
            const x = centerX - barWidth / 2;
            const barHeight = Math.max((item.roas / yMax) * innerHeight, 2);
            const y = padding.top + innerHeight - barHeight;
            const color = getBarColor(item.roas);
            const isHovered = hoverChannel === item.channel;

            return (
              <g
                key={item.channel}
                className="cursor-pointer transition-opacity"
                opacity={hoverChannel && !isHovered ? 0.6 : 1}
                onMouseEnter={() => setHoverChannel(item.channel)}
                onMouseLeave={() => setHoverChannel(null)}
              >
                {/* Bar rect */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="4"
                  ry="4"
                  fill={color}
                  className="transition-all duration-200"
                />

                {/* ROAS value label on top of bar */}
                <text
                  x={centerX}
                  y={y - 6}
                  textAnchor="middle"
                  className="font-mono text-[11px] font-bold fill-slate-700"
                >
                  {formatRatio(item.roas)}x
                </text>

                {/* Channel name label on x-axis */}
                <text
                  x={centerX}
                  y={height - padding.bottom + 18}
                  textAnchor="middle"
                  className={`text-[11px] font-medium transition-colors ${
                    isHovered ? 'fill-[#6B35A8] font-bold' : 'fill-slate-600'
                  }`}
                >
                  {item.channel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hover Info Tooltip Box */}
      {activeChannelData && (
        <div className="mt-2 p-3 bg-slate-900 text-white rounded-lg shadow-lg flex flex-wrap items-center justify-between text-xs gap-4 border border-slate-700 animate-in fade-in duration-150">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Channel</span>
            <span className="font-semibold text-white">{activeChannelData.channel}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">ROAS</span>
            <span className={`font-bold font-mono text-sm tabular-nums ${activeChannelData.roas >= 2 ? 'text-emerald-400' : activeChannelData.roas < 1 ? 'text-fuchsia-300' : 'text-amber-300'}`}>
              {formatRatio(activeChannelData.roas)}x
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Revenue</span>
            <span className="font-bold text-emerald-400 font-mono tabular-nums">{formatGBP(activeChannelData.revenue)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Spend</span>
            <span className="font-bold text-slate-200 font-mono tabular-nums">{formatGBP(activeChannelData.spend)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Orders</span>
            <span className="font-bold text-white font-mono tabular-nums">{activeChannelData.orders.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">CTR</span>
            <span className="font-bold text-white font-mono tabular-nums">{formatPercent(activeChannelData.ctr)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
