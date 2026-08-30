import React from 'react';
import { Edit2, Trash2, Search, UserPlus, UserCheck } from 'lucide-react';
import { PetugasItem } from '../../../shared/services/petugasService';

interface MasterPetugasTabProps {
  filteredPetugas: PetugasItem[];
  petugasSearch: string;
  setPetugasSearch: (value: string) => void;
  handleOpenAddPetugas: () => void;
  handleOpenEditPetugas: (p: PetugasItem) => void;
  setDeleteConfirmPetugas: (p: PetugasItem | null) => void;
}

export const MasterPetugasTab: React.FC<MasterPetugasTabProps> = ({
  filteredPetugas,
  petugasSearch,
  setPetugasSearch,
  handleOpenAddPetugas,
  handleOpenEditPetugas,
  setDeleteConfirmPetugas,
}) => {
  return (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row gap-3 justify-between items-center shadow-2xs">
            <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari Nama Petugas, NIP, Jabatan..."
                  value={petugasSearch}
                  onChange={(e) => setPetugasSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0052CC] focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={handleOpenAddPetugas}
                title="Tambah Personil Petugas Monitoring Baru"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm bg-[#0052CC] hover:bg-blue-800 text-white cursor-pointer"
              >
                <UserPlus size={16} />
                <span>Tambah Personil Petugas</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <UserCheck size={18} className="text-[#0052CC]" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Daftar Personil Petugas Monitoring ({filteredPetugas.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Personil tercatat secara resmi pada Laporan Mingguan Aloptama
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3.5 pl-4 w-12 text-center">No</th>
                    <th className="p-3.5">Nama Lengkap &amp; Gelar</th>
                    <th className="p-3.5">NIP</th>
                    <th className="p-3.5">Jabatan / Peran</th>
                    <th className="p-3.5 pr-4 text-center">Aksi (Admin)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredPetugas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Tidak ada data personil petugas monitoring.
                      </td>
                    </tr>
                  ) : (
                    filteredPetugas.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-[#0052CC] flex items-center justify-center font-black text-xs shrink-0">
                              {p.name.charAt(0)}
                            </div>
                            <div>
                              <span>{p.name}</span>
                              <div className="text-[10px] text-slate-400 font-mono font-normal">{p.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">
                          {p.nip ? p.nip : <span className="text-slate-300 italic">-</span>}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 bg-blue-50 text-[#0052CC] border border-blue-100 rounded-lg font-semibold text-[11px]">
                            {p.jabatan || 'Staf Operasional'}
                          </span>
                        </td>
                        <td className="p-3.5 pr-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditPetugas(p)}
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Personil Petugas"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmPetugas(p)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Personil Petugas"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
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
