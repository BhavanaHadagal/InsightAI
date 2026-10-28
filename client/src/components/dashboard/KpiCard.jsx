import React from 'react';

const KpiCard = ({ title, value, subtitle, icon: Icon, badge, color = 'blue' }) => {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-700',
    },
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      badge: 'bg-emerald-100 text-emerald-700',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      badge: 'bg-purple-100 text-purple-700',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-700',
    },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow transition-shadow flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg ${scheme.bg} ${scheme.text} flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate" title={String(value)}>
          {value}
        </div>
        <div className="flex items-center justify-between mt-2">
          {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
          {badge && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${scheme.badge}`}>
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default KpiCard;

