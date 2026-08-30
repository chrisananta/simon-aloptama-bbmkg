import React from 'react';
import { Search, Edit2, Trash2, Loader2, Radio } from 'lucide-react';
import { SlaOlaLogRow } from '../types';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

interface MonitoringSlaOlaTabProps {
  filteredMonitoringLogs: SlaOlaLogRow[];
  isLoadingMonitoringLogs: boolean;
  monitoringMonth: number;
  setMonitoringMonth: (value: number) => void;
  monitoringYear: number;
  setMonitoringYear: (value: number) => void;
  monitoringSearch: string;
  setMonitoringSearch: (value: string) => void;
  dynamicYears: string[];
  handleOpenEditLog: (log: SlaOlaLogRow) => void;
  setDeleteConfirmLog: (log: SlaOlaLogRow | null) => void;
}

export const MonitoringSlaOlaTab: React.FC<MonitoringSlaOlaTabProps> = ({
  filteredMonitoringLogs,
  isLoadingMonitoringLogs,
  monitoringMonth,
  setMonitoringMonth,
  monitoringYear,
  setMonitoringYear,
  monitoringSearch,
  setMonitoringSearch,
  dynamicYears,
  handleOpenEditLog,
  setDeleteConfirmLog,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row gap-3 justify-between items-center shadow-2xs">
        <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID Alat atau Nama Peralatan..."
              value={monitoringSearch}
              onChange={(e) => setMonitoringSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30"
            />
          </div>
          <select
            value={monitoringMonth}
            onChange={(e) => setMonitoringMonth(Number(e.target.value))}
            className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg bg-white cursor-pointer"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>{name}</option>
            ))}
          </select>
          <select
            value={monitoringYear}
            onChange={(e) => setMonitoringYear(Number(e.target.value))}
            className="px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg bg-white cursor-pointer"
          >
            {dynamicYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">
          {filteredMonitoringLogs.length} Entri
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-[10px]">Tanggal Dilaporkan</th>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-[10px]">Kode Alat</th>
                <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-[10px]">Nama Alat</th>
                <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase text-[10px]">SLA</th>
                <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase text-[10px]">OLA</th>
                <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase text-[10px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingMonitoringLogs ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : filteredMonitoringLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    <Radio size={20} className="mx-auto mb-2 opacity-40" />
                    Tidak ada entri pengisian SLA/OLA pada periode ini.
                  </td>
                </tr>
              ) : (
                filteredMonitoringLogs.map((log) => {
                  const formattedDate = log.reportDate
                    ? (() => {
                        const [y, m, d] = log.reportDate!.split('-');
                        return `${d}/${m}/${y}`;
                      })()
                    : '-';
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-800 font-bold">{formattedDate}</span>
                          {log.isLate && (
                            <span
                              title="Diisi susulan (bukan pada hari kondisi terjadi)"
                              className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 text-amber-700"
                            >
                              Susulan
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-[#0052CC] whitespace-nowrap">{log.kodeAlat}</td>
                      <td className="px-4 py-3 text-slate-800 font-semibold">{log.namaAlat}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          log.kondisiSla ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {log.kondisiSla ? '100%' : '0%'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          log.kondisiOla >= 100 ? 'bg-emerald-100 text-emerald-700' :
                          log.kondisiOla > 0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {log.kondisiOla}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditLog(log)}
                            title="Koreksi nilai SLA/OLA"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-[#0052CC] transition-colors cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmLog(log)}
                            title="Hapus entri (salah input)"
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};