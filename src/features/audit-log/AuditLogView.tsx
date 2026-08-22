import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  UserCheck, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Clock, 
  Layers, 
  Eye, 
  X,
  Database,
  BarChart2,
  Wrench,
  Server
} from 'lucide-react';
import { ChangeLog, LogAction, LogTable } from '../../shared/types';
import { apiClient } from '../../shared/api';

interface AuditLogViewProps {
  changeLogs?: ChangeLog[];
  onRefreshLogs?: () => void;
  onClearLogs?: () => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  changeLogs,
  onRefreshLogs,
  onClearLogs,
}) => {
  const logs = changeLogs || apiClient.auditLogs.getAll();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedTable, setSelectedTable] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<ChangeLog | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Filtering
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchQuery === '' ||
      (log.details || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.recordName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.recordId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.actor || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.id || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
    const matchesTable = selectedTable === 'ALL' || log.table === selectedTable;

    return matchesSearch && matchesAction && matchesTable;
  });

  // Calculate stats
  const totalCount = logs.length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = logs.filter((l) => l.timestamp.startsWith(todayStr)).length;
  const slaOlaCount = logs.filter((l) => l.action === 'SIMPAN_SLA_OLA').length;
  const kalibrasiCount = logs.filter((l) => l.action === 'SIMPAN_KALIBRASI').length;
  const masterCount = logs.filter((l) => l.action === 'TAMBAH' || l.action === 'EDIT' || l.action === 'HAPUS').length;

  const handleExportCsv = () => {
    apiClient.auditLogs.exportCsv();
  };

  const handleExportJson = () => {
    apiClient.auditLogs.exportJson();
  };

  const handleConfirmClear = () => {
    if (onClearLogs) {
      onClearLogs();
    } else {
      apiClient.auditLogs.clear('Administrator SIMON');
    }
    setShowClearConfirm(false);
    if (onRefreshLogs) onRefreshLogs();
  };

  const getActionBadge = (action: LogAction) => {
    switch (action) {
      case 'SIMPAN_SLA_OLA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <BarChart2 size={12} />
            SLA/OLA
          </span>
        );
      case 'SIMPAN_KALIBRASI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <Wrench size={12} />
            Kalibrasi
          </span>
        );
      case 'TAMBAH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            + Tambah
          </span>
        );
      case 'EDIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            ✎ Edit
          </span>
        );
      case 'HAPUS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            ✕ Hapus
          </span>
        );
      case 'SYNC_SERVER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-300">
            <Server size={12} />
            Sync Server
          </span>
        );
      case 'RESET_DATA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
            Reset
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            {action}
          </span>
        );
    }
  };

  const getTableBadge = (table: LogTable) => {
    switch (table) {
      case 'master_sla_ola':
        return <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">SLA/OLA</span>;
      case 'kalibrasi':
        return <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">Kalibrasi</span>;
      case 'master_stasiun':
        return <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Stasiun</span>;
      case 'master_alat':
        return <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Aloptama</span>;
      case 'sistem':
        return <span className="font-semibold text-slate-900 bg-slate-200 px-2 py-0.5 rounded border border-slate-300">Sistem</span>;
      default:
        return <span className="font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded">{table}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading font-bold text-xl text-slate-900 flex items-center gap-2">
              <FileText size={22} className="text-[#0052CC]" />
              Audit Log Aktivitas &amp; Perubahan Sistem
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0052CC] text-[10px] font-bold uppercase tracking-wider border border-blue-200">
              Audit Trail Terpusat
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Semua riwayat pengisian data, pembaruan SLA/OLA, rekaman kalibrasi, serta manipulasi database dicatat secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onRefreshLogs}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Muat ulang data audit log"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Unduh Audit Log sebagai CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Unduh Audit Log sebagai JSON"
          >
            <FileText size={14} />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Bersihkan seluruh log audit"
          >
            <Trash2 size={14} />
            <span>Bersihkan Log</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0052CC] border border-blue-200 flex items-center justify-center shrink-0">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Catatan Log</p>
            <p className="font-heading font-extrabold text-xl text-slate-900">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Aktivitas Hari Ini</p>
            <p className="font-heading font-extrabold text-xl text-emerald-700">{todayCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
            <Wrench size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Laporan Kalibrasi</p>
            <p className="font-heading font-extrabold text-xl text-purple-700">{kalibrasiCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <Database size={20} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Perubahan Master</p>
            <p className="font-heading font-extrabold text-xl text-amber-700">{masterCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari aktivitas, ID record, nama alat, operator..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white"
            />
          </div>

          <div>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
            >
              <option value="ALL">Semua Aksi / Operation</option>
              <option value="SIMPAN_SLA_OLA">SLA / OLA Entry</option>
              <option value="SIMPAN_KALIBRASI">Kalibrasi Entry</option>
              <option value="TAMBAH">+ Penambahan Master</option>
              <option value="EDIT">✎ Perubahan Master</option>
              <option value="HAPUS">✕ Penghapusan Master</option>
              <option value="SYNC_SERVER">Sync Server API</option>
              <option value="RESET_DATA">Reset System</option>
            </select>
          </div>

          <div>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
            >
              <option value="ALL">Semua Modul / Tabel</option>
              <option value="master_sla_ola">Modul SLA &amp; OLA</option>
              <option value="kalibrasi">Modul Kalibrasi</option>
              <option value="master_stasiun">Master Stasiun UPT</option>
              <option value="master_alat">Master Peralatan Aloptama</option>
              <option value="sistem">Sistem Operasional</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Audit Log Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#0052CC]" />
            Daftar Audit Log Recorded ({filteredLogs.length} Records)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-700">
            <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3.5">ID Log &amp; Waktu</th>
                <th className="p-3.5">Aksi / Operation</th>
                <th className="p-3.5">Modul</th>
                <th className="p-3.5">Target Record</th>
                <th className="p-3.5">Aktor / Operator</th>
                <th className="p-3.5">Detail Catatan Aktivitas</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Tidak ada catatan audit log yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 text-xs">{log.id}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock size={11} className="text-slate-400" />
                        {log.timestamp}
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-[11px]">
                      {getTableBadge(log.table)}
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <div className="font-bold text-slate-900 truncate">{log.recordName}</div>
                      <div className="text-[10px] font-mono text-blue-700 truncate">{log.recordId}</div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-medium text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <UserCheck size={13} className="text-[#0052CC]" />
                        <span>{log.actor}</span>
                      </div>
                    </td>
                    <td className="p-3.5 max-w-md text-slate-600 leading-relaxed text-xs">
                      <p className="line-clamp-2">{log.details}</p>
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#0052CC] hover:text-white text-slate-700 text-[11px] font-bold transition-all flex items-center gap-1 mx-auto cursor-pointer"
                        title="Lihat Detail Log"
                      >
                        <Eye size={13} />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-2 sm:my-6 flex flex-col max-h-[95vh]">
            <div className="bg-[#0A203C] text-white p-3 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
                  <ShieldCheck size={18} className="sm:w-[22px] sm:h-[22px]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading text-sm sm:text-lg font-bold">Detail Record Audit Log</h3>
                  <p className="text-[10px] sm:text-xs text-slate-300 mt-0.5 truncate">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 sm:p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 text-[11px] sm:text-xs text-slate-800 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 bg-slate-50 p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] sm:text-[11px]">Waktu Eksekusi:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedLog.timestamp}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] sm:text-[11px]">Operator / Aktor:</span>
                  <span className="font-bold text-blue-700">{selectedLog.actor}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] sm:text-[11px]">Aksi / Operations:</span>
                  <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] sm:text-[11px]">Modul / Tabel:</span>
                  <div className="mt-1">{getTableBadge(selectedLog.table)}</div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-semibold block text-[10px] sm:text-[11px]">Target Record:</span>
                <div className="p-2.5 sm:p-3 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-200 space-y-0.5">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">{selectedLog.recordName}</p>
                  <p className="font-mono text-blue-700 text-[11px] sm:text-xs break-all">ID: {selectedLog.recordId}</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-semibold block text-[10px] sm:text-[11px]">Rincian Deskripsi Aktivitas:</span>
                <div className="p-2.5 sm:p-3 bg-slate-900 text-slate-200 rounded-lg sm:rounded-xl font-mono leading-relaxed text-[11px] sm:text-xs break-words">
                  {selectedLog.details}
                </div>
              </div>

              {selectedLog.ipOrSource && (
                <div className="text-[10px] sm:text-[11px] text-slate-400 italic break-all">
                  Sumber Sistem: {selectedLog.ipOrSource}
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full sm:w-auto px-5 py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold bg-[#0052CC] text-white hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-4 sm:p-6 text-center space-y-3 sm:space-y-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-300">
              <Trash2 size={20} className="sm:w-6 sm:h-6" />
            </div>

            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-slate-900">Bersihkan Audit Log Sistem?</h3>
              <p className="text-[11px] sm:text-xs text-slate-600 mt-1">
                Semua {totalCount} catatan riwayat aktivitas akan dihapus. Aksi ini akan dicatat kembali sebagai peristiwa reset log.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-2 sm:gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmClear}
                className="w-full sm:w-auto px-5 py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-all cursor-pointer"
              >
                Ya, Bersihkan Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
