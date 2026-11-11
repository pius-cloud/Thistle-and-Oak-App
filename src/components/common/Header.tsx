import React from 'react';
import { RefreshCw, ShieldCheck, Database, Calendar } from 'lucide-react';
import { useAnalytics } from '../../context/AnalyticsContext';

interface HeaderProps {
  currentPageTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ currentPageTitle }) => {
  const { loading, refreshData, lastUpdated, dateBounds } = useAnalytics();

  const formattedTime = lastUpdated
    ? `${String(lastUpdated.getDate()).padStart(2, '0')}/${String(lastUpdated.getMonth() + 1).padStart(2, '0')}/${lastUpdated.getFullYear()} ${String(lastUpdated.getHours()).padStart(2, '0')}:${String(lastUpdated.getMinutes()).padStart(2, '0')}`
    : 'Syncing...';

  return (
    <header className="bg-[#150B22] text-white border-b border-purple-950/40 px-6 py-3.5 flex items-center justify-between gap-6 shrink-0 z-20">
      {/* Zone 1: Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#6B35A8] flex items-center justify-center font-bold text-white shadow-inner">
          TO
        </div>
        <div>
          <div className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            Thistle & Oak
          </div>
          <div className="text-[10px] text-purple-300/80 uppercase font-semibold tracking-wider">
            Social Media & Marketing Analytics Hub
          </div>
        </div>
      </div>

      {/* Zone 2: Contextual Status / Active Section */}
      <div className="hidden md:flex items-center gap-4 text-xs text-purple-200/90 whitespace-nowrap">
        <span className="font-semibold text-white px-2.5 py-1 bg-purple-950/60 rounded border border-purple-800/40">
          {currentPageTitle}
        </span>
        <span className="text-purple-400">·</span>
        <div className="flex items-center gap-1.5 text-purple-200">
          <Calendar className="w-3.5 h-3.5 text-purple-400" />
          <span>Active Window: 02/01/2026 – 30/09/2026</span>
        </div>
        <span className="text-purple-400">·</span>
        <div className="flex items-center gap-1.5 text-purple-300">
          <Database className="w-3.5 h-3.5 text-[#6B35A8]" />
          <span>Google Sheets Live Source</span>
        </div>
      </div>

      {/* Zone 3: Primary Actions (Refresh data) */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => refreshData()}
          disabled={loading}
          aria-label="Refresh data"
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#6B35A8] hover:bg-[#7D3FC5] active:scale-[0.98] rounded-lg transition-all shadow-sm disabled:opacity-50 whitespace-nowrap"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Refreshing...' : 'Refresh data'}</span>
        </button>
      </div>
    </header>
  );
};
