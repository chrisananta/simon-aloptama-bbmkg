import React, { useState, useEffect } from 'react';
import { Zap, Plus, FileText, Calendar as CalIcon, Trash2, AlertTriangle, X } from 'lucide-react';
import { GensetRecord } from '../../shared/types';
import { apiClient } from '../../shared/api';
import { GensetFormModal } from './GensetFormModal';
import { GensetReportModal } from './GensetReportModal';

export const GensetView: React.FC = () => {
  const [records, setRecords] = useState<GensetRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  
  // State modal konfirmasi hapus
  const [deleteConfirmRecord, setDeleteConfirmRecord] = useState<GensetRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRecords = async () => {
    const data = await apiClient.genset.getAll();
    setRecords(data);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleDeleteRecord = async () => {
    if (!deleteConfirmRecord) return;
    setIsDeleting(true);
    try {
      await apiClient.genset.delete(deleteConfirmRecord.id);
      await fetchRecords();
      setDeleteConfirmRecord(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus data monitoring genset.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRecords = records.filter(r => {
    if (selectedMonth === 'ALL') return true;
    return r.tanggal.startsWith(selectedMonth);
  });

  const uniqueMonths = Array.from(new Set(records.map(r => r.tanggal.substring(0, 7)))).sort().reverse();

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Zap size={20} className="text-[#0052CC]" /> Riwayat Monitoring Genset
          </h2>
          <p className="text-xs text-slate-500 mt-1">Daftar inspeksi dan kondisi operasional Genset.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
            <CalIcon size={14} className="text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">Semua Bulan</option>
              {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <button
            onClick={() => setIsReportOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <FileText size={16} /> Laporan Bulanan
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#0052CC] hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus size={16} /> Pengisian Monitoring
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                <th className="p-4">Tanggal &amp; Jam</th>
                <th className="p-4">Gedung</th>
                <th className="p-4">Nama Petugas</th>
                <th className="p-4">Kesimpulan Kondisi</th>
                <th className="p-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Tidak ada riwayat.</td></tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900 whitespace-nowrap">
                      {r.tanggal}
                      <span className="block text-[10px] font-normal text-slate-400">{r.jam || '-'}</span>
                    </td>
                    <td className="p-4 text-slate-700 font-semibold">{r.gedung || 'Operasional'}</td>
                    <td className="p-4 text-slate-700">{r.petugas}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full font-bold text-[10px] ${r.kesimpulan === 'BAIK' ? 'bg-emerald-100 text-emerald-800' : r.kesimpulan.includes('RUSAK') ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                        {r.kesimpulan}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setDeleteConfirmRecord(r)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus riwayat monitoring"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <GensetFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSaved={fetchRecords} />
      <GensetReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} records={records} />

      {/* Modal Konfirmasi Hapus */}
      {deleteConfirmRecord && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base mb-1">Hapus Riwayat Monitoring?</h3>
              <p className="text-slate-600 text-xs">
                Data monitoring tanggal <strong className="text-slate-900">{deleteConfirmRecord.tanggal}</strong> ({deleteConfirmRecord.gedung}) oleh <strong className="text-slate-900">{deleteConfirmRecord.petugas}</strong> akan dihapus permanen.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmRecord(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteRecord}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Hapus Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};