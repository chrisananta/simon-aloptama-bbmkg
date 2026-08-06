import React from 'react';
import { Server, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { DashboardSummaryStats } from './DashboardTypes';

export const DashboardCard: React.FC<DashboardSummaryStats> = ({
  totalCount,
  normalCount,
  gangguanCount,
  matiCount,
}) => {
  const normalPercentage = Math.round((normalCount / (totalCount || 1)) * 100);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
      <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">
            TOTAL ALOPTAMA
          </span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-blue-50 text-[#0052CC]">
            <Server size={16} className="sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-2">
          <span className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900">
            {totalCount}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-500 ml-1 font-medium">Unit</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200 flex flex-col justify-between border-l-4 border-l-emerald-500">
        <div className="flex justify-between items-start">
          <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wide">
            NORMAL
          </span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={16} className="sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-2">
          <span className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold text-emerald-600">
            {normalCount}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-500 ml-1 font-medium">
            ({normalPercentage}%)
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200 flex flex-col justify-between border-l-4 border-l-amber-500">
        <div className="flex justify-between items-start">
          <span className="text-[10px] sm:text-xs font-bold text-amber-700 uppercase tracking-wide">
            GANGGUAN
          </span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-amber-50 text-amber-600">
            <AlertTriangle size={16} className="sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-2">
          <span className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold text-amber-600">
            {gangguanCount}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-500 ml-1 font-medium">Unit</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200 flex flex-col justify-between border-l-4 border-l-rose-500">
        <div className="flex justify-between items-start">
          <span className="text-[10px] sm:text-xs font-bold text-rose-700 uppercase tracking-wide">
            MATI
          </span>
          <div className="p-1.5 sm:p-2 rounded-lg bg-rose-50 text-rose-600">
            <XCircle size={16} className="sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-1.5 sm:mt-2">
          <span className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold text-rose-600">
            {matiCount}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-500 ml-1 font-medium">Unit</span>
        </div>
      </div>
    </div>
  );
};
