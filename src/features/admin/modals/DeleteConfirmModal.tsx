import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmModalProps {
  deleteConfirmTarget: { type: 'stasiun' | 'alat'; id: string; name: string };
  setDeleteConfirmTarget: (target: { type: 'stasiun' | 'alat'; id: string; name: string } | null) => void;
  handleConfirmDelete: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  deleteConfirmTarget,
  setDeleteConfirmTarget,
  handleConfirmDelete,
}) => {
  return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 sm:p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl shrink-0">
                <AlertTriangle size={22} />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Konfirmasi Hapus Data</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data master {deleteConfirmTarget.type === 'stasiun' ? 'Stasiun UPT' : 'Peralatan'}{' '}
              <strong className="text-slate-900 font-bold">"{deleteConfirmTarget.name}"</strong> (ID: {deleteConfirmTarget.id})? Tindakan ini akan dicatat ke audit log database.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Hapus Data
              </button>
            </div>
          </div>
        </div>
  );
};
