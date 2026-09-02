import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck,
  Users,
  Plus,
  Archive
} from 'lucide-react';
import { AloptamaDevice, CalibrationStatus, UPTStation } from '../../shared/types';
import { apiClient } from '../../shared/api';
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
  const [activeTab, setActiveTab] = useState<'latest' | 'repository'>('latest');

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
    ...devices.map((dev) => ({
      id: `latest-${dev.devicesId}`,
      deviceId: dev.devicesId,
      deviceName: dev.site,
      category: dev.category,
      uptStation: dev.uptStation,
      lastCalibrated: dev.lastCalibrated,
      calibrationValidUntil: dev.calibrationValidUntil,
      calibrationStatus: dev.calibrationStatus,
      calibrationAgency: dev.timkalibrasi,
      picKalibrasi: dev.picKalibrasi || ((dev.timkalibrasi || '').toLowerCase().includes('pusat') ? 'Pusat' : 'Balai'),
      notes: dev.calibrationStatus === 'VALID' ? 'Kalibrasi Berkala Operasional' : 'Perlu Re-Kalibrasi INSKAL',
      yearCreated: dev.lastCalibrated ? dev.lastCalibrated.split('-')[0] : '2026',
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

    const yearVal = rec.lastCalibrated ? rec.lastCalibrated.split('-')[0] : '2026';
    const matchesYear =
      selectedYear === 'ALL' || (rec.lastCalibrated && rec.lastCalibrated.startsWith(selectedYear)) || yearVal === selectedYear;

    const matchesUpt = selectedUpt === 'ALL' || rec.uptStation === selectedUpt;

    const matchesAgency = selectedAgency === 'ALL' || rec.picKalibrasi === selectedAgency;

    return matchesSearch && matchesStatus && matchesYear && matchesUpt && matchesAgency;
  });

  const formatDateIndo = (dateStr: string) => {
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
    }
  };

  const validCount = devices.filter((d) => d.calibrationStatus === 'VALID').length;
  const warningCount = devices.filter((d) => d.calibrationStatus === 'SEGERA_DIKALIBRASI').length;
  const expiredCount = devices.filter((d) => d.calibrationStatus === 'KADALUWARSA').length;

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
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <div className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#0052CC] text-white shadow-2xs flex items-center gap-1.5">
            <ShieldCheck size={14} />
            Status Kalibrasi Aktif ({devices.length})
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari alat, stasiun, atau personel..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white"
            />
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
            >
              <option value="ALL">Semua Status Kalibrasi</option>
              <option value="VALID">🟢 Valid</option>
              <option value="SEGERA_DIKALIBRASI">🟡 Segera Dikalibrasi</option>
              <option value="KADALUWARSA">🔴 Kadaluwarsa</option>
            </select>
          </div>

          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
            >
              <option value="ALL">Semua Tahun Kalibrasi</option>
              <option value="2026">Tahun 2026</option>
            </select>
          </div>

          <div>
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
          </div>

          <div>
            <select
              value={selectedAgency}
              onChange={(e) => setSelectedAgency(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
            >
              <option value="ALL">Semua PIC Kalibrasi</option>
              <option value="Balai">🏢 Balai (BBMKG Wilayah V)</option>
              <option value="Pusat">🏛️ Pusat (BMKG Pusat)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
            {activeTab === 'latest' ? 'HASIL MONITORING STATUS AKTIF' : 'RIWAYAT PENGISIAN KALIBRASI'} 
            ({filteredRecords.length} DATA)
          </span>
          
          {permissions.canAddCalibration ? (
            <button
              onClick={onOpenAddCalibrationModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0052CC] hover:bg-[#003a99] text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
              title="Tambah record kalibrasi"
            >
              <Plus size={15} />
              <span>Tambah Data Kalibrasi</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-[11px] font-bold">
              <ShieldCheck size={14} className="text-[#0052CC]" />
              <span>Informasi Kalibrasi Mode Read-Only ({user ? ROLE_LABEL[user.role] : ''})</span>
            </div>
          )}
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
                      {rec.notes && (
                        <div className="text-[10px] text-slate-500 italic mt-0.5 max-w-xs">
                          "{rec.notes}"
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-medium text-slate-800">
                      {stationMap.get(rec.uptStation) || rec.uptStation}
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">
                      {formatDateIndo(rec.lastCalibrated)}
                      <span className="block text-[10px] text-slate-400">Tahun: {rec.lastCalibrated ? rec.lastCalibrated.split('-')[0] : '2026'}</span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-900">
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