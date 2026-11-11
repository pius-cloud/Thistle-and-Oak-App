import React from 'react';
import { Filter, RotateCcw, Calendar } from 'lucide-react';
import { useAnalytics } from '../../context/AnalyticsContext';

export const FilterBar: React.FC = () => {
  const {
    filters,
    setFilters,
    resetFilters,
    availableChannels,
    availableObjectives,
    dateBounds,
  } = useAnalytics();

  const handleChannelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, channel: e.target.value }));
  };

  const handleObjectiveChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, objective: e.target.value }));
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, startDate: e.target.value }));
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, endDate: e.target.value }));
  };

  const setQuarter = (q: 'Q1' | 'Q2' | 'Q3' | 'ALL') => {
    if (q === 'Q1') {
      setFilters(prev => ({ ...prev, startDate: '2026-01-01', endDate: '2026-03-31' }));
    } else if (q === 'Q2') {
      setFilters(prev => ({ ...prev, startDate: '2026-04-01', endDate: '2026-06-30' }));
    } else if (q === 'Q3') {
      setFilters(prev => ({ ...prev, startDate: '2026-07-01', endDate: '2026-09-30' }));
    } else {
      setFilters(prev => ({ ...prev, startDate: dateBounds.min, endDate: dateBounds.max }));
    }
  };

  const isFiltered =
    filters.channel !== 'All' ||
    filters.objective !== 'All' ||
    (filters.startDate && filters.startDate !== dateBounds.min) ||
    (filters.endDate && filters.endDate !== dateBounds.max);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-[#6B35A8]" />
          <span>Global Filter Controls</span>
        </div>

        {/* Quick presets */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 mr-1 text-[11px]">Period:</span>
          <button
            onClick={() => setQuarter('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filters.startDate === dateBounds.min && filters.endDate === dateBounds.max
                ? 'bg-[#6B35A8] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Jan–Sep
          </button>
          <button
            onClick={() => setQuarter('Q1')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filters.startDate === '2026-01-01' && filters.endDate === '2026-03-31'
                ? 'bg-[#6B35A8] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Q1 (Jan–Mar)
          </button>
          <button
            onClick={() => setQuarter('Q2')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filters.startDate === '2026-04-01' && filters.endDate === '2026-06-30'
                ? 'bg-[#6B35A8] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Q2 (Apr–Jun)
          </button>
          <button
            onClick={() => setQuarter('Q3')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filters.startDate === '2026-07-01' && filters.endDate === '2026-09-30'
                ? 'bg-[#6B35A8] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Q3 (Jul–Sep)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3 pt-3 border-t border-slate-100 text-xs">
        {/* Channel Dropdown */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Marketing Channel
          </label>
          <select
            value={filters.channel}
            onChange={handleChannelChange}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#6B35A8]"
          >
            <option value="All">All Channels ({availableChannels.length})</option>
            {availableChannels.map(ch => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
        </div>

        {/* Objective Dropdown */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Campaign Objective
          </label>
          <select
            value={filters.objective}
            onChange={handleObjectiveChange}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#6B35A8]"
          >
            <option value="All">All Objectives ({availableObjectives.length})</option>
            {availableObjectives.map(obj => (
              <option key={obj} value={obj}>
                {obj}
              </option>
            ))}
          </select>
        </div>

        {/* Date Start */}
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Start Date (dd/mm/yyyy)
          </label>
          <input
            type="date"
            min={dateBounds.min}
            max={dateBounds.max}
            value={filters.startDate}
            onChange={handleStartDateChange}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#6B35A8]"
          />
        </div>

        {/* Date End & Reset */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-medium text-slate-500">
              End Date (dd/mm/yyyy)
            </label>
            {isFiltered && (
              <button
                onClick={resetFilters}
                className="text-[11px] text-[#6B35A8] hover:text-[#522584] font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
          <input
            type="date"
            min={dateBounds.min}
            max={dateBounds.max}
            value={filters.endDate}
            onChange={handleEndDateChange}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#6B35A8]"
          />
        </div>
      </div>
    </div>
  );
};
