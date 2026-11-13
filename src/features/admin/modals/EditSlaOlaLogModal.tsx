import React from 'react';
import { X, Activity } from 'lucide-react';
import { SlaOlaLogRow } from '../types';

interface EditSlaOlaLogModalProps {
  editingLog: SlaOlaLogRow;
  editLogSlaVal: number;
  setEditLogSlaVal: (value: number) => void;
  editLogOlaVal: number;
  setEditLogOlaVal: (value: number) => void;
  editLogKendala: string;
  setEditLogKendala: (value: string) => void;
  setIsEditLogModalOpen: (open: boolean) => void;
  handleSaveEditLog: (e: React.FormEvent) => void;
}

export const EditSlaOlaLogModal: React.FC<EditSlaOlaLogModalProps> = ({
  editingLog,
  editLogSlaVal,
  setEditLogSlaVal,
  editLogOlaVal,
  setEditLogOlaVal,
  editLogKendala,
  setEditLogKendala,
  setIsEditLogModalOpen,
  handleSaveEditLog,
}) => {
  return (
    <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-[#0A203C] text-white px-5 py-4 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Activity size={18} className="text-blue-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">Koreksi Entri SLA/OLA</h3>
              <p className="text-[11px] text-slate-300 truncate">
                {editingLog.namaAlat} <span className="text-slate-400">({editingLog.kodeAlat})</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditLogModalOpen(false)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSaveEditLog} className="p-5 space-y-4 text-xs text-slate-700">
          <p className="text-[11px] text-slate-500 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg">
            Tanggal laporan: <strong className="text-slate-800">{editingLog.reportDate || '-'}</strong>. Gunakan form ini untuk mengoreksi nilai yang salah diinput UPT — tanggal tidak dapat diubah.
          </p>

          <div>
            <label className="block font-bold text-slate-600 mb-1.5">Status SLA (Ketersediaan)</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditLogSlaVal(100)}
                className={`px-3 py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                  editLogSlaVal >= 100
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                ON (100%)
              </button>
              <button
                type="button"
                onClick={() => setEditLogSlaVal(0)}
                className={`px-3 py-2 rounded-lg font-bold border transition-colors cursor-pointer ${
                  editLogSlaVal < 100
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                OFF (0%)
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1.5">Nilai OLA (Performa) — %</label>
            <input
              type="number"
              min={0}
              max={100}
              value={editLogOlaVal}
              onChange={(e) => setEditLogOlaVal(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1.5">
              Keterangan Kendala <span className="font-normal text-slate-400">(opsional)</span>
            </label>
            <textarea
              rows={3}
              maxLength={2000}
              value={editLogKendala}
              onChange={(e) => setEditLogKendala(e.target.value)}
              placeholder="Contoh: Listrik padam, koneksi VSAT terputus, menunggu penggantian sparepart..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0052CC]/30 text-slate-800 resize-none"
            />
            <p className="text-[10px] text-slate-400 mt-1 text-right">{editLogKendala.length}/2000</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditLogModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-[#0052CC] hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Simpan Koreksi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};