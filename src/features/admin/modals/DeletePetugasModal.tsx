import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { PetugasItem } from '../../../shared/services/petugasService';

interface DeletePetugasModalProps {
  deleteConfirmPetugas: PetugasItem;
  setDeleteConfirmPetugas: (p: PetugasItem | null) => void;
  handleConfirmDeletePetugas: () => void;
}

export const DeletePetugasModal: React.FC<DeletePetugasModalProps> = ({
  deleteConfirmPetugas,
  setDeleteConfirmPetugas,
  handleConfirmDeletePetugas,
}) => {
  return (
        <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base mb-1">Konfirmasi Hapus Personil</h3>
              <p className="text-slate-600 text-xs">
                Apakah Anda yakin ingin menghapus petugas <strong className="text-slate-900">{deleteConfirmPetugas.name}</strong> dari daftar master database?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmPetugas(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePetugas}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Hapus Personil
              </button>
            </div>
          </div>
        </div>
  );
};
