import React from 'react';
import { Plus, Edit2, Trash2, Search, Download } from 'lucide-react';
import { UPTStation, AloptamaDevice, EquipmentCategory } from '../../../shared/types';
import { isNotCalibrated } from '../../../shared/utils/calibration';

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
  // Mode Teknisi UPT: tanpa tombol Tambah & Hapus, filter UPT disembunyikan
  // (data sudah dibatasi ke UPT sendiri oleh parent).
  canAdd?: boolean;
  canDelete?: boolean;
  showUptFilter?: boolean;
  // Search & filter kategori: disembunyikan untuk selain Super Admin.
  showSearchAndCategory?: boolean;
  // Tombol Ekspor CSV (mengekspor seluruh hasil filter, bukan hanya 100 baris di tabel).
  canExport?: boolean;
}

const csvCell = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

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
  canAdd = true,
  canDelete = true,
  showUptFilter = true,
  showSearchAndCategory = true,
  canExport = true,
}) => {
  // Kotak search/filter/tambah disembunyikan total (bukan cuma isinya) kalau
  // tidak ada satu pun yang ditampilkan - contoh: Teknisi UPT.
  const hasToolbar = showSearchAndCategory || showUptFilter || canAdd || canExport;

  const handleExportCsv = () => {
    if (filteredDevices.length === 0) {
      alert('Tidak ada data peralatan untuk diekspor.');
      return;
    }

    const headers = [
      'ID_ALAT', 'NAMA_PERALATAN', 'LOKASI', 'KATEGORI', 'MERK', 'STASIUN_UPT',
      'LATITUDE', 'LONGITUDE', 'PIC_KALIBRASI', 'KONDISI', 'STATUS_KALIBRASI',
      'KALIBRASI_TERAKHIR', 'MASA_BERLAKU_KALIBRASI',
    ];
    const rows = filteredDevices.map((d) => [
      d.devicesId,
      d.site,
      d.locationName,
      d.category,
      d.merk,
      d.uptStation,
      d.latitude,
      d.longitude,
      isNotCalibrated(d) ? 'TIDAK DIKALIBRASI' : d.picKalibrasi,
      d.conditionStatus,
      d.calibrationStatus,
      d.lastCalibrated,
      d.calibrationValidUntil,
    ].map(csvCell).join(','));

    // BOM agar Excel membaca UTF-8 dengan benar.
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Master_Alat_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  return (
        <div className="space-y-4">
          {hasToolbar && (
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col lg:flex-row gap-3 justify-between lg:items-center shadow-2xs">
            <div className="flex flex-1 flex-wrap items-center gap-3 w-full lg:w-auto">
              {showSearchAndCategory && (
              <div className="relative w-full lg:w-auto lg:flex-1 lg:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari ID Alat, Nama Peralatan, Lokasi..."
                  value={alatSearch}
                  onChange={(e) => setAlatSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 placeholder:font-semibold placeholder:text-slate-400 outline-none focus:border-[#0052CC] focus:bg-white"
                />
              </div>
              )}

              {showUptFilter && (
              <div className="flex items-center gap-1.5 flex-1 min-w-[160px] lg:flex-none">
                <select
                  value={alatUptFilter}
                  onChange={(e) => setAlatUptFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#0052CC] lg:max-w-[180px] truncate"
                >
                  <option value="ALL">Semua Stasiun UPT</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              )}

              {showSearchAndCategory && (
              <div className="flex items-center gap-1.5 flex-1 min-w-[160px] lg:flex-none">
                <select
                  value={alatCategoryFilter}
                  onChange={(e) => setAlatCategoryFilter(e.target.value)}
                  className="w-full lg:w-auto bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#0052CC]"
                >
                  <option value="ALL">Semua Kategori Alat</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0 w-full lg:w-auto">
            {canExport && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-all cursor-pointer shrink-0"
              title="Unduh data alat (sesuai filter) sebagai CSV"
            >
              <Download size={15} />
              <span>Ekspor CSV</span>
            </button>
            )}

            {canAdd && (
            <button
              onClick={handleOpenAddDevice}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0052CC] hover:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>Tambah Alat Master</span>
            </button>
            )}
            </div>
          </div>
          )}

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
                    <th className="p-3.5 pr-4 text-center">{canDelete ? 'Aksi Master' : 'Aksi'}</th>
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
                          {isNotCalibrated(dev) ? (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-extrabold text-[10px] rounded-full border border-slate-300">
                              TIDAK DIKALIBRASI
                            </span>
                          ) : (dev.picKalibrasi === 'Pusat' || dev.picKalibrasi === 'PUSAT') ? (
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
                          {dev.calibrationStatus === 'TIDAK_DIKALIBRASI' && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 font-extrabold text-[10px] rounded-full border border-slate-300">
                              N/A
                            </span>
                          )}
                          {dev.calibrationStatus === 'KADALUWARSA' && (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-extrabold text-[10px] rounded-full border border-rose-200">
                              KADALUWARSA
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {dev.calibrationValidUntil ? `s/d ${dev.calibrationValidUntil}` : '-'}
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
                            {canDelete && (
                            <button
                              onClick={() => setDeleteConfirmTarget({ type: 'alat', id: dev.devicesId, name: dev.site })}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Data Master Alat"
                            >
                              <Trash2 size={15} />
                            </button>
                            )}
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