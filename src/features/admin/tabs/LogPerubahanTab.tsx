import React from 'react';
import { Trash2, Search, Download, Calendar } from 'lucide-react';
import { ChangeLog, LogAction, LogTable } from '../../../shared/types';

interface LogPerubahanTabProps {
  filteredLogs: ChangeLog[];
  logSearch: string;
  setLogSearch: (value: string) => void;
  logTableFilter: 'ALL' | LogTable;
  setLogTableFilter: (value: 'ALL' | LogTable) => void;
  logActionFilter: 'ALL' | LogAction;
  setLogActionFilter: (value: 'ALL' | LogAction) => void;
  handleExportLogsCSV: () => void;
  onClearLogs?: () => void;
}

export const LogPerubahanTab: React.FC<LogPerubahanTabProps> = ({
  filteredLogs,
  logSearch,
  setLogSearch,
  logTableFilter,
  setLogTableFilter,
  logActionFilter,
  setLogActionFilter,
  handleExportLogsCSV,
  onClearLogs,
}) => {
  return (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row gap-3 justify-between items-center shadow-2xs">
            <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari ID/Nama Record, Pengubah, atau Detail..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0052CC] focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  value={logTableFilter}
                  onChange={(e) => setLogTableFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0052CC]"
                >
                  <option value="ALL">Semua Tabel Target</option>
                  <option value="master_stasiun">master_stasiun</option>
                  <option value="master_alat">master_alat</option>
                  <option value="master_sla_ola">master_sla_ola</option>
                  <option value="master_akun">master_akun</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  value={logActionFilter}
                  onChange={(e) => setLogActionFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0052CC]"
                >
                  <option value="ALL">Semua Jenis Aksi</option>
                  <option value="TAMBAH">TAMBAH</option>
                  <option value="EDIT">EDIT</option>
                  <option value="HAPUS">HAPUS</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportLogsCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all cursor-pointer"
              >
                <Download size={15} />
                <span>Ekspor CSV</span>
              </button>

              {onClearLogs && (
                <button
                  onClick={() => {
                    if (confirm('Apakah Anda yakin ingin mengosongkan seluruh riwayat Log Perubahan?')) {
                      onClearLogs();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-all cursor-pointer"
                >
                  <Trash2 size={15} />
                  <span>Bersihkan Log</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3.5 pl-4">ID Log &amp; Waktu</th>
                    <th className="p-3.5">Tabel Target</th>
                    <th className="p-3.5 text-center">Jenis Aksi</th>
                    <th className="p-3.5">ID / Nama Item Target</th>
                    <th className="p-3.5">Admin / Pengubah</th>
                    <th className="p-3.5 pr-4">Detail Perubahan Database</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Belum ada riwayat perubahan database yang terekam.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-800 text-[11px]">{log.id}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar size={11} />
                            <span>{log.timestamp}</span>
                          </div>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <code className="px-2 py-0.5 bg-blue-50 text-[#0052CC] font-bold text-[11px] rounded border border-blue-100">
                            {log.table}
                          </code>
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {log.action === 'TAMBAH' && (
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded-full border border-emerald-200">
                              + TAMBAH
                            </span>
                          )}
                          {log.action === 'EDIT' && (
                            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 font-extrabold text-[10px] rounded-full border border-amber-200">
                              ✎ EDIT
                            </span>
                          )}
                          {log.action === 'HAPUS' && (
                            <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 font-extrabold text-[10px] rounded-full border border-rose-200">
                              ✕ HAPUS
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{log.recordName}</div>
                          <code className="text-[10px] text-slate-400">{log.recordId}</code>
                        </td>
                        <td className="p-3.5 text-slate-800 font-medium whitespace-nowrap">
                          {log.actor}
                        </td>
                        <td className="p-3.5 pr-4 text-slate-600 max-w-xs md:max-w-md break-words">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
  );
};
