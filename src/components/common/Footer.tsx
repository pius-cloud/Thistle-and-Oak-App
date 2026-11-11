import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto py-5 px-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
        <p className="font-medium text-slate-600">
          Synthetic training data – Thistle & Oak, Jan to Sep 2026
        </p>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span>All values in GBP (£)</span>
          <span>·</span>
          <span>Dates in dd/mm/yyyy</span>
          <span>·</span>
          <span>UK Retail Division</span>
        </div>
      </div>
    </footer>
  );
};
