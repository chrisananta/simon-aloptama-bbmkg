import React from 'react';
import { X, UserCheck } from 'lucide-react';
import { PetugasItem } from '../../../shared/services/petugasService';

interface PetugasFormModalProps {
  editingPetugas: PetugasItem | null;
  petugasForm: Partial<PetugasItem>;
  setPetugasForm: (form: Partial<PetugasItem>) => void;
  setIsPetugasModalOpen: (open: boolean) => void;
  handleSavePetugas: (e: React.FormEvent) => void;
}

export const PetugasFormModal: React.FC<PetugasFormModalProps> = ({
  editingPetugas,
  petugasForm,
  setPetugasForm,
  setIsPetugasModalOpen,
  handleSavePetugas,
}) => {
  return (
        <div className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 my-auto flex flex-col max-h-[92vh]">
            <div className="bg-[#0A203C] text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-xs sm:text-sm flex items-center gap-2">
                <UserCheck size={18} className="text-blue-400 shrink-0" />
                <span>{editingPetugas ? 'Edit Personil Petugas Monitoring' : 'Tambah Personil Petugas Monitoring'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPetugasModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePetugas} className="p-3.5 sm:p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap &amp; Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={petugasForm.name || ''}
                  onChange={(e) => setPetugasForm({ ...petugasForm, name: e.target.value })}
                  placeholder="Contoh: Asrul Sani Arifin, S.Tr"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-[#0052CC] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIP (Opsional)
                </label>
                <input
                  type="text"
                  value={petugasForm.nip || ''}
                  onChange={(e) => setPetugasForm({ ...petugasForm, nip: e.target.value })}
                  placeholder="Contoh: 19950312 201801 1 001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-[#0052CC] focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jabatan / Peran Tim
                </label>
                <input
                  type="text"
                  value={petugasForm.jabatan || ''}
                  onChange={(e) => setPetugasForm({ ...petugasForm, jabatan: e.target.value })}
                  placeholder="Contoh: Staf Inskal &amp; Kalibrasi"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-[#0052CC] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPetugasModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#0052CC] hover:bg-blue-800 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Data Personil
                </button>
              </div>
            </form>
          </div>
        </div>
  );
};
