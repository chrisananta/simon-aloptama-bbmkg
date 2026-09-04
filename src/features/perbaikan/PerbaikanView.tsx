import React, { useState, useEffect } from 'react';
import { Wrench, Plus, FileText, Trash2 } from 'lucide-react';
import { PerbaikanRecord } from '../../shared/types';
import { apiClient } from '../../shared/api';
import { PerbaikanFormModal } from './PerbaikanFormModal';
import { PerbaikanPrintModal } from './PerbaikanPrintModal';

export const PerbaikanView: React.FC = () => {
  const [records, setRecords] = useState<PerbaikanRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecordForPrint, setSelectedRecordForPrint] = useState<PerbaikanRecord | null>(null);

  const fetchRecords = async () => {
    const data = await apiClient.perbaikan.getAll();
    setRecords(data);
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus laporan perbaikan ini?')) {
      await apiClient.perbaikan.delete(id);
      fetchRecords();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Wrench size={20} className="text-[#0052CC]" /> Perbaikan &amp; Instalasi Peralatan
          </h2>
          <p className="text-xs text-slate-500 mt-1">Laporan pemeliharan, Instalasi &amp; Perbaikan.</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0052CC] hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
        >
          <Plus size={16} /> Buat Laporan Baru
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                <th className="p-4">Tanggal</th>
                <th className="p-4">Form</th>
                <th className="p-4">Nama Alat &amp; Merk</th>
                <th className="p-4">Jenis &amp; Lokasi</th>
                <th className="p-4">Hasil Pengecekan</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Belum ada laporan perbaikan/instalasi.</td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900 whitespace-nowrap">{r.tanggal}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-[#0052CC] font-bold text-[10px]">
                      {r.formType === 'FORM_1_1' ? 'Form 1.1 (MKG)' : 'Form 1.2 (Penunjang)'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{r.namaAlat}</div>
                    <div className="text-[11px] text-slate-500">{r.merk} - {r.typeSn}</div>
                  </td>
                  <td className="p-4 text-slate-700">
                    <div>{r.jenisPeralatan}</div>
                    <div className="text-[10px] text-slate-400">{r.lokasiAlat}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${r.kondisiAlat === 'LAYAK_NORMAL' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {r.kondisiAlat.replace('_', ' ')} ({r.persentaseFungsi}%)
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setSelectedRecordForPrint(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Cetak PDF">
                        <FileText size={16} />
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg" title="Hapus">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PerbaikanFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSaved={fetchRecords} />
      <PerbaikanPrintModal isOpen={!!selectedRecordForPrint} onClose={() => setSelectedRecordForPrint(null)} record={selectedRecordForPrint} />
    </div>
  );
};