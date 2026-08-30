import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { SlaOlaLogRow } from '../types';

interface DeleteSlaOlaLogModalProps {
  deleteConfirmLog: SlaOlaLogRow;
  setDeleteConfirmLog: (log: SlaOlaLogRow | null) => void;
  handleConfirmDeleteLog: () => void;
}

export const DeleteSlaOlaLogModal: React.FC<DeleteSlaOlaLogModalProps> = ({
  deleteConfirmLog,
  setDeleteConfirmLog,
  handleConfirmDeleteLog,
}) => {
  return (
    <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shrink-0">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-900 text-base mb-1">Hapus Entri SLA/OLA?</h3>
          <p className="text-slate-600 text-xs">
            Entri tanggal <strong className="text-slate-900">{deleteConfirmLog.reportDate || '-'}</strong> untuk{' '}
            <strong className="text-slate-900">{deleteConfirmLog.namaAlat}</strong> ({deleteConfirmLog.kodeAlat}) akan dihapus permanen.
            Status live alat akan otomatis disesuaikan ke entri terakhir yang tersisa.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setDeleteConfirmLog(null)}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirmDeleteLog}
            className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Hapus Entri
          </button>
        </div>
      </div>
    </div>
  );
};
