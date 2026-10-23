import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  MinusCircle,
  ShieldCheck,
  Users,
  Plus,
  Archive,
  Filter,
  X
} from 'lucide-react';
import { AloptamaDevice, CalibrationStatus, UPTStation } from '../../shared/types';
import { apiClient } from '../../shared/api';
import { PIC_TIDAK_DIKALIBRASI, isNotCalibrated } from '../../shared/utils/calibration';
import { CalibrationRecord } from './CalibrationTypes';
import { useAuth } from '../auth/AuthContext';
import { UserRole } from '../auth/authTypes';

const ROLE_LABEL: Record<UserRole, string> = {
  TEKNISI_UPT: 'Teknisi UPT',
  KAUPT_KABBMKG: 'KaUPT / KaBBMKG',
  ADMIN_INSKAL: 'Admin Inskal',
  SUPER_ADMIN: 'Super Admin',
};

interface CalibrationViewProps {
  devices: AloptamaDevice[];
  stations?: UPTStation[];
  calibrationLogs?: CalibrationRecord[];
  onOpenAddCalibrationModal?: () => void;
}

export const CalibrationView: React.FC<CalibrationViewProps> = ({ 
  devices, 
  stations,
  calibrationLogs = [],
  onOpenAddCalibrationModal 
}) => {
  const { permissions, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedUpt, setSelectedUpt] = useState<string>('ALL');
  const [selectedAgency, setSelectedAgency] = useState<string>('ALL');
  // Hanya alat yang sudah ditambahkan lewat tombol "Tambah Data Kalibrasi" atau
  // diperbarui dari Master Alat yang tampil di halaman ini.
  const [listedIds, setListedIds] = useState<string[]>([]);
  const [listedStatus, setListedStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [activeTab, setActiveTab] = useState<'latest' | 'repository'>('latest');
  // Semua filter diringkas ke 1 tombol yang membuka panel ini.
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (selectedStatus !== 'ALL' ? 1 : 0) +
    (selectedYear !== 'ALL' ? 1 : 0) +
    (selectedUpt !== 'ALL' ? 1 : 0) +
    (selectedAgency !== 'ALL' ? 1 : 0);
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
    setSelectedYear('ALL');
    setSelectedUpt('ALL');
    setSelectedAgency('ALL');
  };

  // Muat ulang daftar setiap kali data alat berubah (mis. setelah simpan kalibrasi).
  useEffect(() => {
    let cancelled = false;
    apiClient.calibration.getListed().then((ids) => {
      if (cancelled) return;
      if (ids) {
        setListedIds(ids);
        setListedStatus('ready');
      } else {
        setListedStatus('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [devices]);

  const listedDevices = useMemo(
    () => devices.filter((d) => listedIds.includes(d.devicesId)),
    [devices, listedIds]
  );

  // Map pencarian ID Stasiun -> Nama Stasiun
  const stationMap = useMemo(() => {
    const map = new Map<string, string>();
    const stationList = stations && stations.length > 0 ? stations : apiClient.stations.getAll();
    stationList.forEach((s) => {
      if (s.stationid) map.set(s.stationid, s.name);
      if (s.id) map.set(s.id, s.name);
    });
    return map;
  }, [stations]);

  // List opsi dropdown { id, name }
  const uptOptions = useMemo<{ id: string; name: string }[]>(() => {
    const stationIds = new Set<string>();
    devices.forEach((d) => {
      if (d.uptStation) {
        const idStr = typeof d.uptStation === 'string' 
          ? d.uptStation 
          : (d.uptStation as any).stationid || (d.uptStation as any).id;
        if (idStr) stationIds.add(idStr);
      }
    });
    return Array.from(stationIds).sort().map((id) => ({
      id: String(id),
      name: stationMap.get(String(id)) || String(id),
    }));
  }, [devices, stationMap]);

  const allRecords = [
    ...listedDevices.map((dev) => ({
      id: `latest-${dev.devicesId}`,
      deviceId: dev.devicesId,
      deviceName: dev.site,
      category: dev.category,
      uptStation: dev.uptStation,
      lastCalibrated: dev.lastCalibrated,
      calibrationValidUntil: dev.calibrationValidUntil,
      calibrationStatus: dev.calibrationStatus,
      calibrationAgency: dev.timkalibrasi,
      picKalibrasi: isNotCalibrated(dev)
        ? PIC_TIDAK_DIKALIBRASI
        : dev.picKalibrasi || ((dev.timkalibrasi || '').toLowerCase().includes('pusat') ? 'Pusat' : 'Balai'),
      notes: isNotCalibrated(dev)
        ? 'Alat tidak dikalibrasi'
        : dev.calibrationStatus === 'VALID' ? 'Kalibrasi Berkala Operasional' : 'Perlu Re-Kalibrasi INSKAL',
      yearCreated: dev.lastCalibrated ? dev.lastCalibrated.split('-')[0] : '',
      createdAt: dev.lastCalibrated,
      isRepository: false,
    })),
    ...calibrationLogs.map((log) => ({
      ...log,
      picKalibrasi: (log.calibrationAgency || '').toLowerCase().includes('pusat') ? 'Pusat' : 'Balai',
      isRepository: true,
    })),
  ];

  const filteredRecords = allRecords.filter((rec) => {
    if (activeTab === 'latest' && rec.isRepository) return false;
    if (activeTab === 'repository' && !rec.isRepository) return false;

    const matchesSearch =
      searchQuery === '' ||
      (rec.deviceName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rec.uptStation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (stationMap.get(rec.uptStation) || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rec.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rec.calibrationAgency || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === 'ALL' || rec.calibrationStatus === selectedStatus;

    // Alat tanpa tanggal kalibrasi (tidak dikalibrasi) tidak punya tahun kalibrasi.
    const yearVal = rec.lastCalibrated ? rec.lastCalibrated.split('-')[0] : '';
    const matchesYear =
      selectedYear === 'ALL' || (!!yearVal && (rec.lastCalibrated?.startsWith(selectedYear) || yearVal === selectedYear));

    const matchesUpt = selectedUpt === 'ALL' || rec.uptStation === selectedUpt;

    const matchesAgency = selectedAgency === 'ALL' || rec.picKalibrasi === selectedAgency;

    return matchesSearch && matchesStatus && matchesYear && matchesUpt && matchesAgency;
  });

  const formatDateIndo = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthIndex = parseInt(parts[1], 10) - 1;
    return `${parseInt(parts[2], 10)} ${months[monthIndex] || ''} ${parts[0]}`;
  };

  const renderStatusBadge = (status: CalibrationStatus) => {
    switch (status) {
      case 'VALID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 size={15} />
            Valid
          </span>
        );
      case 'SEGERA_DIKALIBRASI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle size={15} />
            Segera Dikalibrasi
          </span>
        );
      case 'KADALUWARSA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle size={15} />
            Kadaluwarsa
          </span>
        );
      case 'TIDAK_DIKALIBRASI':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
            <MinusCircle size={15} />
            Tidak Dikalibrasi
          </span>
        );
    }
  };

  const validCount = listedDevices.filter((d) => d.calibrationStatus === 'VALID').length;
  const warningCount = listedDevices.filter((d) => d.calibrationStatus === 'SEGERA_DIKALIBRASI').length;
  const expiredCount = listedDevices.filter((d) => d.calibrationStatus === 'KADALUWARSA').length;
  const notCalibratedCount = listedDevices.filter((d) => isNotCalibrated(d)).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
        <div>
          <h2 className="font-heading font-bold text-lg sm:text-xl text-slate-900 flex items-center gap-2">
            <Calendar size={20} className="text-[#0052CC] sm:w-5 sm:h-5" />
            Riwayat Kalibrasi Aloptama
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Masa berlaku sertifikat & histori pelaksanaan kalibrasi 
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-semibold">
          <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <span>🟢 Valid:</span>
            <span className="font-bold">{validCount}</span>
          </div>
          <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <span>🟡 Segera:</span>
            <span className="font-bold">{warningCount}</span>
          </div>
          <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <span>🔴 Kadaluwarsa:</span>
            <span className="font-bold">{expiredCount}</span>
          </div>
          {notCalibratedCount > 0 && (
            <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-300 flex items-center gap-1">
              <span>⚪ Tidak Dikalibrasi:</span>
              <span className="font-bold">{notCalibratedCount}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
            {activeTab === 'latest' ? 'HASIL MONITORING STATUS AKTIF' : 'RIWAYAT PENGISIAN KALIBRASI'} 
            ({filteredRecords.length} DATA)
          </span>

          <div className="flex items-center gap-2">
          {/* Semua filter (search, status, tahun, UPT, PIC) diringkas ke 1 tombol ini. */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilterPanel((v) => !v)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <Filter size={14} />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#0052CC] text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {showFilterPanel && (
              <>
                {/* Lapisan transparan: klik di luar panel akan menutupnya. */}
                <div className="fixed inset-0 z-40" onClick={() => setShowFilterPanel(false)} />
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Filter Data</span>
                    <button
                      type="button"
                      onClick={() => setShowFilterPanel(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                      aria-label="Tutup filter"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari alat, stasiun, atau personel..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white"
                    />
                  </div>

                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  >
                    <option value="ALL">Semua Status Kalibrasi</option>
                    <option value="VALID">🟢 Valid</option>
                    <option value="SEGERA_DIKALIBRASI">🟡 Segera Dikalibrasi</option>
                    <option value="KADALUWARSA">🔴 Kadaluwarsa</option>
                    <option value="TIDAK_DIKALIBRASI">⚪ Tidak Dikalibrasi</option>
                  </select>

                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  >
                    <option value="ALL">Semua Tahun Kalibrasi</option>
                    <option value="2026">Tahun 2026</option>
                  </select>

                  <select
                    value={selectedUpt}
                    onChange={(e) => setSelectedUpt(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  >
                    <option value="ALL">Semua Stasiun UPT</option>
                    {uptOptions.map((upt) => (
                      <option key={upt.id} value={upt.id}>
                        {upt.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedAgency}
                    onChange={(e) => setSelectedAgency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  >
                    <option value="ALL">Semua PIC Kalibrasi</option>
                    <option value="Balai">🏢 Balai (BBMKG Wilayah V)</option>
                    <option value="Pusat">🏛️ Pusat (BMKG Pusat)</option>
                    <option value={PIC_TIDAK_DIKALIBRASI}>⚪ Tidak Dikalibrasi</option>
                  </select>

                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="w-full text-center text-xs font-bold text-rose-600 hover:text-rose-700 py-1.5 cursor-pointer"
                    >
                      Reset Semua Filter
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        {permissions.canAddCalibration && (
          <button
            onClick={onOpenAddCalibrationModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0052CC] hover:bg-[#003a99] text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
            title="Tambah record kalibrasi"
          >
            <Plus size={15} />
            <span>Tambah Data Kalibrasi</span>
          </button>
        )}
        </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-700">
            <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3.5">Peralatan</th>
                <th className="p-3.5">Stasiun / UPT</th>
                <th className="p-3.5">Pelaksanaan Kalibrasi</th>
                <th className="p-3.5">Masa Berlaku</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Tim Kalibrasi INSKAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    {activeTab === 'repository' && calibrationLogs.length === 0 ? (
                      <div className="space-y-2">
                        <p className="font-semibold text-slate-600">Belum ada catatan histori tambahan di Repository.</p>
                        <p className="text-xs">Klik tombol <strong className="text-purple-700">Tambah Data Kalibrasi</strong> di atas untuk menambahkan catatan pelaksanaan kalibrasi oleh personel INSKAL.</p>
                      </div>
                    ) : activeTab === 'latest' && listedStatus === 'error' ? (
                      <div className="space-y-1">
                        <p className="font-semibold text-rose-600">Daftar alat kalibrasi tidak dapat dimuat.</p>
                        <p className="text-xs">Pastikan migration database sudah dijalankan, lalu muat ulang halaman.</p>
                      </div>
                    ) : activeTab === 'latest' && listedStatus === 'ready' && listedIds.length === 0 ? (
                      <div className="space-y-2">
                        <p className="font-semibold text-slate-600">Belum ada data kalibrasi yang ditampilkan.</p>
                        <p className="text-xs">
                          Klik <strong className="text-[#0052CC]">Tambah Data Kalibrasi</strong> di atas, atau perbarui data alat dari Master Alat.
                        </p>
                      </div>
                    ) : (
                      'Tidak ada data kalibrasi yang memenuhi kriteria filter.'
                    )}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 text-xs">{rec.deviceName}</div>
                      <div className="text-[11px] text-[#0052CC] font-semibold mt-0.5">
                        {rec.category} • {rec.deviceId}
                      </div>
                    </td>
                    <td className="p-3.5 font-medium text-slate-800">
                      {stationMap.get(rec.uptStation) || rec.uptStation}
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">
                      {formatDateIndo(rec.lastCalibrated)}
                      <span className="block text-[10px] text-slate-400"></span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">
                      {formatDateIndo(rec.calibrationValidUntil)}
                    </td>
                    <td className="p-3.5 text-center">
                      {renderStatusBadge(rec.calibrationStatus)}
                    </td>
                    <td className="p-3.5 text-slate-700 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Users size={13} className="text-purple-700 shrink-0" />
                        <span className="truncate max-w-[220px] font-semibold">{rec.calibrationAgency}</span>
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