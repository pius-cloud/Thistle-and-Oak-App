import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  Smile,
  Sparkles,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';

export type PageId =
  | 'executive-summary'
  | 'channel-campaign-roi'
  | 'content-performance'
  | 'sentiment'
  | 'ai-recommendations'
  | 'ask-data';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onSelectPage }) => {
  const navItems: Array<{ id: PageId; label: string; icon: React.ReactNode; badge?: string }> = [
    {
      id: 'executive-summary',
      label: 'Executive Summary',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'channel-campaign-roi',
      label: 'Channel & Campaign ROI',
      icon: <TrendingUp className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'content-performance',
      label: 'Content Performance',
      icon: <FileText className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'sentiment',
      label: 'Sentiment Analysis',
      icon: <Smile className="w-4 h-4 shrink-0" />,
      badge: '900 UK',
    },
    {
      id: 'ai-recommendations',
      label: 'AI Recommendations',
      icon: <Sparkles className="w-4 h-4 shrink-0 text-purple-300" />,
      badge: 'PDF',
    },
    {
      id: 'ask-data',
      label: 'Ask the Data',
      icon: <MessageSquare className="w-4 h-4 shrink-0 text-purple-300" />,
      badge: 'AI Chat',
    },
  ];

  return (
    <aside className="w-64 bg-[#150B22] text-slate-300 flex flex-col justify-between shrink-0 border-r border-purple-950/40 select-none">
      <div className="p-4">
        {/* Navigation Section */}
        <div className="text-[10px] uppercase font-bold tracking-wider text-purple-400/80 px-3 mb-2">
          Navigation
        </div>
        <nav className="space-y-1">
          {navItems.map(item => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#6B35A8] text-white shadow-sm font-semibold'
                    : 'text-purple-200/80 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-purple-950/80 text-purple-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Thistle & Oak Profile */}
        <div className="mt-8 p-3 rounded-lg bg-white/5 border border-purple-900/40 text-xs">
          <div className="font-semibold text-white text-[11px] mb-1">Thistle & Oak Retail</div>
          <div className="text-[11px] text-purple-300/80 space-y-1">
            <div className="flex justify-between">
              <span>Currency:</span>
              <span className="font-mono text-white font-medium">GBP (£)</span>
            </div>
            <div className="flex justify-between">
              <span>Date Format:</span>
              <span className="font-mono text-white font-medium">dd/mm/yyyy</span>
            </div>
            <div className="flex justify-between">
              <span>Active Market:</span>
              <span className="font-medium text-white">United Kingdom</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Footprint */}
      <div className="p-4 border-t border-purple-950/40 text-[11px] text-purple-400/80">
        <div className="flex items-center justify-between mb-1">
          <span>Data Ingestion</span>
          <span className="text-emerald-400 font-mono text-[10px]">● Live</span>
        </div>
        <div className="text-[10px] text-purple-300/60 leading-relaxed">
          Google Sheets synchronized. Calculations evaluated client-side.
        </div>
      </div>
    </aside>
  );
};
