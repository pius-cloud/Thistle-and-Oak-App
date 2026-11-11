import React from 'react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: 'green' | 'purple' | 'red' | 'slate';
  icon?: React.ReactNode;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  badge,
  badgeColor = 'purple',
  icon,
}) => {
  const getBadgeStyle = () => {
    switch (badgeColor) {
      case 'green':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'red':
        return 'text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200';
      case 'slate':
        return 'text-slate-600 bg-slate-100 border-slate-200';
      case 'purple':
      default:
        return 'text-[#6B35A8] bg-purple-50 border-purple-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[#6B35A8] border border-slate-100">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight tabular-nums">{value}</span>
        {badge && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${getBadgeStyle()}`}>
            {badge}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
          {subtitle}
        </p>
      )}
    </div>
  );
};
