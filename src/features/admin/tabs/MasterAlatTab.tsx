import React from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { UPTStation, AloptamaDevice, EquipmentCategory } from '../../../shared/types';

interface MasterAlatTabProps {
  stations: UPTStation[];
  categories: EquipmentCategory[];
  filteredDevices: AloptamaDevice[];
  alatSearch: string;
  setAlatSearch: (value: string) => void;
  alatUptFilter: string;
  setAlatUptFilter: (value: string) => void;
  alatCategoryFilter: string;
  setAlatCategoryFilter: (value: string) => void;
  handleOpenAddDevice: () => void;
  handleOpenEditDevice: (dev: AloptamaDevice) => void;
  setDeleteConfirmTarget: (target: { type: 'stasiun' | 'alat'; id: string; name: string } | null) => void;
}

export const MasterAlatTab: React.FC<MasterAlatTabProps> = ({
  stations,
  categories,
  filteredDevices,
  alatSearch,
  setAlatSearch,
  alatUptFilter,
  setAlatUptFilter,
  alatCategoryFilter,
  setAlatCategoryFilter,
  handleOpenAddDevice,
  handleOpenEditDevice,
  setDeleteConfirmTarget,
}) => {
  return (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row gap-3 justify-between items-center shadow-2xs">
            <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari ID Alat, Nama Peralatan, Lokasi..."
                  value={alatSearch}
                  onChange={(e) => setAlatSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0052CC] focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  value={alatUptFilter}
                  onChange={(e) => setAlatUptFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0052CC] max-w-[180px] truncate"
                >
                  <option value="ALL">Semua Stasiun UPT</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  value={alatCategoryFilter}
                  onChange={(e) => setAlatCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0052CC]"
                >
                  <option value="ALL">Semua Kategori Alat</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleOpenAddDevice}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0052CC] hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>Tambah Alat Master</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3.5 pl-4">ID Alat</th>
                    <th className="p-3.5">Nama Peralatan</th>
                    <th className="p-3.5">Kategori</th>
                    <th className="p-3.5">Stasiun UPT Pengelola</th>
                    <th className="p-3.5 text-center">PIC Kalibrasi</th>
                    <th className="p-3.5 text-center">Status Kalibrasi</th>
                    <th className="p-3.5">Masa Berlaku</th>
                    <th className="p-3.5 pr-4 text-center">Aksi Master</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Tidak ada peralatan yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredDevices.slice(0, 100).map((dev) => (
                      <tr key={dev.devicesId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-4 font-mono font-bold text-[#0052CC] whitespace-nowrap">
                          {dev.devicesId}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          <div>{dev.site}</div>
                          <span className="text-[10px] text-slate-400 font-normal">{dev.locationName}</span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[11px] rounded-md border border-slate-200">
                            {dev.category}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 max-w-[200px] truncate" title={dev.uptStation}>
                          {dev.uptStation}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {(dev.picKalibrasi === 'Pusat' || dev.picKalibrasi === 'PUSAT') ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded-full border border-emerald-200">
                              PUSAT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded-full border border-emerald-200">
                              BALAI
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {dev.calibrationStatus === 'VALID' && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-extrabold text-[10px] rounded-full border border-blue-200">
                              VALID
                            </span>
                          )}
                          {dev.calibrationStatus === 'SEGERA_DIKALIBRASI' && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-extrabold text-[10px] rounded-full border border-amber-200">
                              SEGERA
                            </span>
                          )}
                          {dev.calibrationStatus === 'KADALUWARSA' && (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-extrabold text-[10px] rounded-full border border-rose-200">
                              KADALUWARSA
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          s/d {dev.calibrationValidUntil}
                        </td>
                        <td className="p-3.5 pr-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditDevice(dev)}
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Data Master Alat"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmTarget({ type: 'alat', id: dev.devicesId, name: dev.site })}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Data Master Alat"
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
            {filteredDevices.length > 100 && (
              <div className="p-3 text-center bg-slate-50 text-slate-500 text-xs border-t border-slate-200">
                Menampilkan 100 dari total {filteredDevices.length} peralatan. Gunakan filter untuk penyaringan lebih spesifik.
              </div>
            )}
          </div>
        </div>
  );
};
