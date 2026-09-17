import React from 'react';

const StatsCard = ({ title, value, subtitle, icon: Icon, color = 'blue' }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100'
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</h3>
          {subtitle && <p className="mt-1 text-xs text-slate-500 font-medium">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${colorMap[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
