import React from 'react';
import { Edit2, Search, Database, Activity } from 'lucide-react';
import { UPTStation, AloptamaDevice } from '../../../shared/types';

interface MasterSlaOlaTabProps {
  stations: UPTStation[];
  devices: AloptamaDevice[];
  filteredSlaDevices: AloptamaDevice[];
  dynamicYears: string[];
  selectedMonthSlaOla: string;
  setSelectedMonthSlaOla: (value: string) => void;
  selectedYearSlaOla: string;
  setSelectedYearSlaOla: (value: string) => void;
  slaOlaSearchQuery: string;
  setSlaOlaSearchQuery: (value: string) => void;
  slaOlaUptFilter: string;
  setSlaOlaUptFilter: (value: string) => void;
  slaOlaCategoryFilter: string;
  setSlaOlaCategoryFilter: (value: string) => void;
  getSlaOlaForDevice: (dev: AloptamaDevice) => { sla: number; ola: number };
  handleOpenEditSlaOla: (dev: AloptamaDevice) => void;
}

export const MasterSlaOlaTab: React.FC<MasterSlaOlaTabProps> = ({
  stations,
  devices,
  filteredSlaDevices,
  dynamicYears,
  selectedMonthSlaOla,
  setSelectedMonthSlaOla,
  selectedYearSlaOla,
  setSelectedYearSlaOla,
  slaOlaSearchQuery,
  setSlaOlaSearchQuery,
  slaOlaUptFilter,
  setSlaOlaUptFilter,
  slaOlaCategoryFilter,
  setSlaOlaCategoryFilter,
  getSlaOlaForDevice,
  handleOpenEditSlaOla,
}) => {
  return (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Activity size={18} className="text-[#0052CC]" />
                  Database Master SLA &amp; OLA Bulanan Peralatan
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Input, ubah, dan overwrite persentase SLA (Ketersediaan) serta OLA (Performa) secara khusus per bulan dan tahun acuan.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-900">
                  <span>Bulan Acuan:</span>
                  <select
                    value={selectedMonthSlaOla}
                    onChange={(e) => setSelectedMonthSlaOla(e.target.value)}
                    className="bg-transparent font-extrabold text-[#0052CC] focus:outline-none cursor-pointer"
                  >
                    {[
                      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                    ].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-900">
                  <span>Tahun Acuan:</span>
                  <select
                    value={selectedYearSlaOla}
                    onChange={(e) => setSelectedYearSlaOla(e.target.value)}
                    className="bg-transparent font-extrabold text-[#0052CC] focus:outline-none cursor-pointer"
                  >
                    {dynamicYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari ID Alat, Nama Peralatan, atau Stasiun UPT..."
                  value={slaOlaSearchQuery}
                  onChange={(e) => setSlaOlaSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0052CC] focus:bg-white font-medium"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={slaOlaUptFilter}
                  onChange={(e) => setSlaOlaUptFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#0052CC]"
                >
                  <option value="ALL">Semua Stasiun UPT ({stations.length})</option>
                  {stations.map((st) => (
                    <option key={st.id} value={st.name}>{st.name}</option>
                  ))}
                </select>

                <select
                  value={slaOlaCategoryFilter}
                  onChange={(e) => setSlaOlaCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#0052CC]"
                >
                  <option value="ALL">Semua Kategori Peralatan</option>
                  {Array.from(new Set([
                    'AWOS', 'AWS', 'ARG', 'Radar Cuaca', 'Lightning Detector', 'Seismometer', 'Accelerograph', 'WRS NG',
                    ...devices.map((d) => d.category)
                  ].filter(Boolean))).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {(() => {
            const devScores = filteredSlaDevices.map(d => getSlaOlaForDevice(d));
            
            const avgSla = filteredSlaDevices.length > 0
              ? Math.round(devScores.reduce((sum, s) => sum + s.sla, 0) / filteredSlaDevices.length)
              : 0;

            const avgOla = filteredSlaDevices.length > 0
              ? Math.round(devScores.reduce((sum, s) => sum + s.ola, 0) / filteredSlaDevices.length)
              : 0;
            
            const normalCount = devScores.filter(s => s.sla > 0 && s.ola >= 97).length;
            const gangguanCount = devScores.filter(s => (s.sla > 0 || s.ola > 0) && s.ola < 97).length;
            const matiCount = devScores.filter(s => s.sla === 0 && s.ola === 0).length;
            
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Alat Terpantau</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">{filteredSlaDevices.length} Unit</span>
                  <span className="text-[10px] text-slate-400">Periode {selectedMonthSlaOla} {selectedYearSlaOla}</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30">
                  <span className="text-[11px] font-bold text-blue-700 uppercase block">Rata-Rata SLA</span>
                  <span className="text-2xl font-black text-[#0052CC] mt-1 block">
                    {avgSla}%
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold">Ketersediaan Peralatan</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/30">
                  <span className="text-[11px] font-bold text-indigo-700 uppercase block">Rata-Rata OLA (Performa)</span>
                  <span className="text-2xl font-black text-indigo-800 mt-1 block">
                    {avgOla}%
                  </span>
                  <span className="text-[10px] text-indigo-600 font-semibold">Tingkat Unjuk Kerja Alat</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Kondisi Status Alat</span>
                  <div className="flex items-center gap-2 mt-2 text-[11px] font-bold">
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                      🟢 {normalCount}
                    </span>
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                      🟡 {gangguanCount}
                    </span>
                    <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded">
                      🔴 {matiCount}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="p-3.5 pl-4">Nama Peralatan &amp; ID</th>
                    <th className="p-3.5">Kategori</th>
                    <th className="p-3.5">Stasiun UPT Pengelola</th>
                    <th className="p-3.5 text-center">Bulan &amp; Tahun</th>
                    <th className="p-3.5 text-center">SLA</th>
                    <th className="p-3.5 text-center">OLA</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 pr-4 text-center">Overwrite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredSlaDevices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Tidak ada data peralatan yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredSlaDevices.map((dev) => {
                      const { sla: slaVal, ola: olaVal } = getSlaOlaForDevice(dev);
                      const isZero = slaVal === 0 && olaVal === 0;

                      return (
                        <tr key={dev.devicesId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 pl-4 font-bold text-slate-900">
                            <div>{dev.site}</div>
                            <span className="font-mono text-[10px] text-[#0052CC] font-bold">{dev.devicesId}</span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[11px] rounded-md border border-slate-200">
                              {dev.category}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-600 max-w-[200px] truncate" title={dev.uptStation}>
                            {dev.uptStation}
                          </td>
                          <td className="p-3.5 text-center font-bold text-slate-800 whitespace-nowrap">
                            <span className="px-2 py-1 bg-slate-100 rounded-md text-[11px] border border-slate-200">
                              {selectedMonthSlaOla} {selectedYearSlaOla}
                            </span>
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap font-bold">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] border ${
                              slaVal >= 97 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : slaVal === 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {slaVal}%
                            </span>
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap font-bold">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] border ${
                              olaVal >= 97 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : olaVal === 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {olaVal}%
                            </span>
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            {isZero ? (
                              <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-extrabold text-[10px] rounded-full border border-rose-300">
                                🔴 MATI (0%)
                              </span>
                            ) : olaVal >= 97 ? (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full border border-emerald-300">
                                🟢 NORMAL ({olaVal}%)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-extrabold text-[10px] rounded-full border border-amber-300">
                                🟡 GANGGUAN ({olaVal}%)
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 pr-4 text-center">
                            <button
                              onClick={() => handleOpenEditSlaOla(dev)}
                              className="px-3 py-1.5 bg-[#0052CC] hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5 mx-auto cursor-pointer"
                            >
                              <Edit2 size={13} />
                              <span>Edit SLA/OLA</span>
                            </button>
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
