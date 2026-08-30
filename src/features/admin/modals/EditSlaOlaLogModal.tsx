import React from 'react';
import { X, Activity } from 'lucide-react';
import { SlaOlaLogRow } from '../types';

interface EditSlaOlaLogModalProps {
  editingLog: SlaOlaLogRow;
  editLogSlaVal: number;
  setEditLogSlaVal: (value: number) => void;
  editLogOlaVal: number;
  setEditLogOlaVal: (value: number) => void;
  setIsEditLogModalOpen: (open: boolean) => void;
  handleSaveEditLog: (e: React.FormEvent) => void;
}

export const EditSlaOlaLogModal: React.FC<EditSlaOlaLogModalProps> = ({
  editingLog,
  editLogSlaVal,
  setEditLogSlaVal,
  editLogOlaVal,
  setEditLogOlaVal,
  setIsEditLogModalOpen,
  handleSaveEditLog,
}) => {
  return (
    <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-blue-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-[#0052CC] rounded-lg">
              <Activity size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Koreksi Entri SLA/OLA</h3>
              <p className="text-[11px] text-slate-500">
                {editingLog.namaAlat} <span className="text-slate-400">({editingLog.kodeAlat})</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditLogModalOpen(false)}
            className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
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
