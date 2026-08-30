import React from 'react';
import { Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { UPTStation, AloptamaDevice } from '../../../shared/types';

interface MasterStasiunTabProps {
  devices: AloptamaDevice[];
  filteredStations: UPTStation[];
  regions: string[];
  stasiunSearch: string;
  setStasiunSearch: (value: string) => void;
  stasiunRegionFilter: string;
  setStasiunRegionFilter: (value: string) => void;
  handleOpenAddStation: () => void;
  handleOpenEditStation: (st: UPTStation) => void;
  setDeleteConfirmTarget: (target: { type: 'stasiun' | 'alat'; id: string; name: string } | null) => void;
}

export const MasterStasiunTab: React.FC<MasterStasiunTabProps> = ({
  devices,
  filteredStations,
  regions,
  stasiunSearch,
  setStasiunSearch,
  stasiunRegionFilter,
  setStasiunRegionFilter,
  handleOpenAddStation,
  handleOpenEditStation,
  setDeleteConfirmTarget,
}) => {
  return (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row gap-3 justify-between items-center shadow-2xs">
            <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari Kode, Nama Stasiun, atau Lokasi..."
                  value={stasiunSearch}
                  onChange={(e) => setStasiunSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0052CC] focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                <select
                  value={stasiunRegionFilter}
                  onChange={(e) => setStasiunRegionFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0052CC]"
                >
                  <option value="ALL">Semua Wilayah Provinsi</option>
                  {regions.map((reg) => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleOpenAddStation}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0052CC] hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>Tambah Stasiun UPT</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3.5 pl-4">Kode UPT</th>
                    <th className="p-3.5">Nama Stasiun UPT</th>
                    <th className="p-3.5">Kelompok Wilayah</th>
                    <th className="p-3.5">Kabupaten / Kota</th>
                    <th className="p-3.5">Koordinat (Lat, Lng)</th>
                    <th className="p-3.5 text-center">Jumlah Alat</th>
                    <th className="p-3.5 pr-4 text-center">Aksi Master</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredStations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Tidak ada data stasiun UPT yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredStations.map((st) => {
                      const deviceCount = devices.filter((d) => {
                        if (!d.uptStation) return false;
                        const upt = (d.uptStation || '').trim().toLowerCase();
                        const stName = (st.name || '').trim().toLowerCase();
                        const stCode = st.stationid ? st.stationid.trim().toLowerCase() : '';
                        const stId = st.id ? st.id.trim().toLowerCase() : '';
                        return (stName && upt === stName) || (stCode && upt === stCode) || (stId && upt === stId);
                      }).length;

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 pl-4 font-bold text-[#0052CC] whitespace-nowrap">
                            {st.stationid}
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">
                            {st.name}
                          </td>
                          <td className="p-3.5">
                            <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 font-semibold text-[11px] rounded-md border border-blue-100">
                              {st.regionGroup}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-600">{st.location}</td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {typeof st.latitude === 'number' ? st.latitude.toFixed(3) : (st.latitude || 0)}, {typeof st.longitude === 'number' ? st.longitude.toFixed(3) : (st.longitude || 0)}
                          </td>
                          <td className="p-3.5 text-center font-bold">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-full text-[11px]">
                              {deviceCount} Alat
                            </span>
                          </td>
                          <td className="p-3.5 pr-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditStation(st)}
                                className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Data Stasiun Master"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmTarget({ type: 'stasiun', id: st.id, name: st.name })}
                                className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Data Stasiun Master"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
  );
};
