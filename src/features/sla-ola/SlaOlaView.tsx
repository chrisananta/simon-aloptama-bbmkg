import React, { useState, useMemo } from 'react';
import { 
  BarChart2, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  Search, 
  Wrench, 
  RefreshCw, 
  MessageSquare, 
  Building2, 
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip
} from 'recharts';
import { AloptamaDevice, UPTStation } from '../../shared/types';
import { apiClient } from '../../shared/api';
import { WaReportModal } from '../monitoring/WaReportModal';
import { WeeklySlaOlaReportModal } from './WeeklySlaOlaReportModal';
import { useAuth } from '../auth/AuthContext';

interface SlaOlaViewProps {
  devices: AloptamaDevice[];
  stations?: UPTStation[];
}

export const SlaOlaView: React.FC<SlaOlaViewProps> = ({ devices, stations }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [selectedUpt, setSelectedUpt] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState('Agustus');
  const [selectedYear, setSelectedYear] = useState('2026');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NORMAL' | 'GANGGUAN' | 'MATI'>('ALL');
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [isWeeklyReportModalOpen, setIsWeeklyReportModalOpen] = useState(false);

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

  // Opsi dropdown dengan ID sebagai value dan Nama Stasiun sebagai tampilan label
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

  // Nama Stasiun Terpilih untuk Tampilan UI
  const selectedUptName = useMemo(() => {
    if (selectedUpt === 'ALL') return 'Seluruh UPT';
    return stationMap.get(selectedUpt) || selectedUpt;
  }, [selectedUpt, stationMap]);

  const uptFilteredDevices = useMemo(() => {
    if (selectedUpt === 'ALL') return devices;
    return devices.filter((d) => d.uptStation === selectedUpt);
  }, [devices, selectedUpt]);

  const [reportedTodayIds, setReportedTodayIds] = useState<string[]>([]);

  const isReportedToday = (dev: AloptamaDevice) => {
    if (reportedTodayIds.includes(dev.devicesId)) return true;
    const todayIso = new Date().toISOString().split('T')[0];
    if (
      dev.lastReportedDate === todayIso ||
      dev.lastCalibrated === todayIso
    ) {
      return true;
    }
    return false;
  };

  const handleResetReportedStatus = () => {
    setReportedTodayIds([]);
  };

  const MONTHS_LIST = [
    { name: 'Januari', short: 'Jan' },
    { name: 'Februari', short: 'Feb' },
    { name: 'Maret', short: 'Mar' },
    { name: 'April', short: 'Apr' },
    { name: 'Mei', short: 'Mei' },
    { name: 'Juni', short: 'Jun' },
    { name: 'Juli', short: 'Jul' },
    { name: 'Agustus', short: 'Ags' },
    { name: 'September', short: 'Sep' },
    { name: 'Oktober', short: 'Okt' },
    { name: 'November', short: 'Nov' },
    { name: 'Desember', short: 'Des' },
  ];

  const MONTH_INDEX_MAP: Record<string, number> = {
    Januari: 0, Februari: 1, Maret: 2, April: 3, Mei: 4, Juni: 5,
    Juli: 6, Agustus: 7, September: 8, Oktober: 9, November: 10, Desember: 11
  };

  const slaTrendData = useMemo(() => {
    return MONTHS_LIST.map((mObj, idx) => {
      const targetDevs = selectedUpt === 'ALL' ? devices : uptFilteredDevices;
      const totalMasterDevs = targetDevs.length;
      const targetMonthNum = idx + 1;
      const monthPaddedStr = targetMonthNum < 10 ? `0${targetMonthNum}` : `${targetMonthNum}`;

      if (totalMasterDevs === 0) {
        return { month: mObj.short, sla: 0, ola: 0 };
      }

      const reportedInThisMonthAndYear = targetDevs.filter((d) => {
        if (d.slaScore === undefined && d.olaScore === undefined) return false;
        if (!d.lastReportedDate) return false;
        const parts = d.lastReportedDate.split('-');
        return parts.length >= 3 && parts[0] === selectedYear && parts[1] === monthPaddedStr;
      });

      const totalSla = reportedInThisMonthAndYear.reduce((sum, d) => sum + (d.slaScore ?? 0), 0);
      const totalOla = reportedInThisMonthAndYear.reduce((sum, d) => sum + (d.olaScore ?? 0), 0);

      const avgSla = totalSla / totalMasterDevs;
      const avgOla = totalOla / totalMasterDevs;

      return {
        month: mObj.short,
        sla: Number(avgSla.toFixed(1)),
        ola: Number(avgOla.toFixed(1)),
      };
    });
  }, [selectedYear, selectedUpt, uptFilteredDevices, devices]);

  const monthIdx = MONTH_INDEX_MAP[selectedMonth] ?? 7;

  const olaByCategoryData = useMemo(() => {
    const CATEGORIES = [
      { key: 'AWOS', name: 'AWOS' },
      { key: 'AWS', name: 'AWS' },
      { key: 'ARG', name: 'ARG' },
      { key: 'Radar Cuaca', name: 'Radar Cuaca' },
      { key: 'Lightning Detector', name: 'Lightning' },
      { key: 'Seismometer', name: 'Seismometer' },
      { key: 'Accelerograph', name: 'Accelerograph' },
      { key: 'WRS NG', name: 'WRS NG' },
      { key: 'Sirene', name: 'Sirene' },
    ];

    const targetDevs = selectedUpt === 'ALL' ? devices : uptFilteredDevices;
    const targetMonthNum = monthIdx + 1;
    const monthPaddedStr = targetMonthNum < 10 ? `0${targetMonthNum}` : `${targetMonthNum}`;

    return CATEGORIES.map((catObj) => {
      const catDevs = targetDevs.filter((d) =>
        (d.category || '').toLowerCase().includes(catObj.key.toLowerCase()) ||
        (catObj.key === 'Radar Cuaca' && (d.category || '').toLowerCase().includes('radar')) ||
        (catObj.key === 'WRS NG' && (d.category || '').toLowerCase().includes('wrs')) ||
        (catObj.key === 'Lightning Detector' && (d.category || '').toLowerCase().includes('lightning'))
      );

      const jumlahLokasi = catDevs.length;

      const reportedInSelectedMonthAndYearCatDevs = catDevs.filter((d) => {
        if (d.olaScore === undefined) return false;
        if (!d.lastReportedDate) return false;
        const parts = d.lastReportedDate.split('-');
        return parts.length >= 3 && parts[0] === selectedYear && parts[1] === monthPaddedStr;
      });

      let score = 0;
      if (jumlahLokasi > 0) {
        const totalOla = reportedInSelectedMonthAndYearCatDevs.reduce((sum, d) => sum + (d.olaScore ?? 0), 0);
        score = Number((totalOla / jumlahLokasi).toFixed(1));
      }

      return {
        category: catObj.name,
        score,
        count: jumlahLokasi,
      };
    });
  }, [selectedYear, selectedUpt, selectedMonth, monthIdx, devices, uptFilteredDevices]);

  const balaiDevices = uptFilteredDevices.filter(
    (d) => (d.picKalibrasi || 'Balai').toLowerCase() === 'balai'
  );
  const balaiTotalDevs = balaiDevices.length || 1;
  const balaiTidakTerlambatCount = balaiDevices.filter(
    (d) => d.calibrationStatus === 'VALID' || d.calibrationStatus === 'SEGERA_DIKALIBRASI'
  ).length;
  const balaiTerlambatCount = balaiDevices.filter((d) => d.calibrationStatus === 'KADALUWARSA').length;
  const balaiKondisiKalibrasiPercent = Math.round((balaiTidakTerlambatCount / balaiTotalDevs) * 100);

  const rekapTableData = useMemo(() => {
    // Kategori resmi sesuai field `category` di database (lihat dropdown di
    // AdminMasterView.tsx). Pencocokan dilakukan exact-match (bukan substring)
    // supaya "AWOS Kat.II" dan "AWOS Kat.III" tidak pernah saling tertukar,
    // dan device dengan kategori lain tidak ikut kehitung secara tidak sengaja.
    const normalizeCategory = (s: string) =>
      (s || '').toLowerCase().replace(/[.\s]/g, '');

    const makeExactMatcher = (canonicalCategory: string) => {
      const target = normalizeCategory(canonicalCategory);
      return (d: AloptamaDevice) => normalizeCategory(d.category) === target;
    };

    const CATEGORIES = [
      {
        no: 1,
        key: 'AWOS Kat.I',
        name: 'AWOS KAT. I',
        matchFn: makeExactMatcher('AWOS Kat.I'),
      },
      {
        no: 2,
        key: 'AWOS Kat.II',
        name: 'AWOS KAT II',
        matchFn: makeExactMatcher('AWOS Kat.II'),
      },
      {
        no: 3,
        key: 'AWOS Kat.III',
        name: 'AWOS KAT III',
        matchFn: makeExactMatcher('AWOS Kat.III'),
      },
      {
        no: 4,
        key: 'Radar Cuaca',
        name: 'RADAR CUACA',
        matchFn: makeExactMatcher('Radar Cuaca'),
      },
      {
        no: 5,
        key: 'AWS',
        name: 'AWS',
        matchFn: makeExactMatcher('AWS'),
      },
      {
        no: 6,
        key: 'ARG',
        name: 'ARG',
        matchFn: makeExactMatcher('ARG'),
      },
      {
        no: 7,
        key: 'Seismometer',
        name: 'SEISMOMETER',
        matchFn: makeExactMatcher('Seismometer'),
      },
      {
        no: 8,
        key: 'Lightning Detector',
        name: 'LIGHTNING DETECTOR',
        matchFn: makeExactMatcher('Lightning Detector'),
      },
      {
        no: 9,
        key: 'Accelerograph',
        name: 'ACCELEROGRAPH NC',
        matchFn: makeExactMatcher('Accelerograph'),
      },
      {
        no: 10,
        key: 'WRS NG',
        name: 'WRS NEW GENERATION',
        matchFn: makeExactMatcher('WRS NG'),
      },
      {
        no: 11,
        key: 'Sirene',
        name: 'SIRENE',
        matchFn: makeExactMatcher('Sirene'),
      },
    ];

    const targetMonthNum = monthIdx + 1;
    const monthPaddedStr = targetMonthNum < 10 ? `0${targetMonthNum}` : `${targetMonthNum}`;

    return CATEGORIES.map((catObj) => {
      const catDevs = uptFilteredDevices.filter(catObj.matchFn);
      const jumlahLokasi = catDevs.length;

      const reportedDevs = catDevs.filter((d) => {
        if (d.slaScore === undefined && d.olaScore === undefined) return false;
        if (!d.lastReportedDate) return false;
        const parts = d.lastReportedDate.split('-');
        return parts.length >= 3 && parts[0] === selectedYear && parts[1] === monthPaddedStr;
      });

      let sla = 0;
      let ola = 0;
      let normalCount = 0;
      let gangguanCount = 0;
      let matiCount = 0;

      if (jumlahLokasi > 0) {
        normalCount = reportedDevs.filter((d) => d.conditionStatus === 'NORMAL').length;
        gangguanCount = reportedDevs.filter((d) => d.conditionStatus === 'GANGGUAN').length;
        matiCount = jumlahLokasi - normalCount - gangguanCount;

        const totalSla = reportedDevs.reduce((sum, d) => sum + (d.slaScore ?? 0), 0);
        const totalOla = reportedDevs.reduce((sum, d) => sum + (d.olaScore ?? 0), 0);

        sla = Number((totalSla / jumlahLokasi).toFixed(1));
        ola = Number((totalOla / jumlahLokasi).toFixed(1));
      }

      return {
        no: catObj.no,
        name: catObj.name,
        jumlahLokasi,
        sla,
        ola,
        normalCount,
        gangguanCount,
        matiCount,
        diff: null as number | null,
      };
    });
  }, [selectedYear, selectedMonth, monthIdx, selectedUpt, uptFilteredDevices]);

  const monthlySlaValue = useMemo(() => {
    const sumSla = rekapTableData.reduce((acc, curr) => acc + curr.sla, 0);
    return Number((sumSla / 10).toFixed(1));
  }, [rekapTableData]);

  const monthlyOlaValue = useMemo(() => {
    const sumOla = rekapTableData.reduce((acc, curr) => acc + curr.ola, 0);
    return Number((sumOla / 10).toFixed(1));
  }, [rekapTableData]);

  const totalLokasiSum = useMemo(
    () => rekapTableData.reduce((acc, curr) => acc + curr.jumlahLokasi, 0),
    [rekapTableData]
  );

  const avgSlaTotal = monthlySlaValue;
  const avgOlaTotal = monthlyOlaValue;

  const totalNormalSum = useMemo(
    () => rekapTableData.reduce((acc, curr) => acc + curr.normalCount, 0),
    [rekapTableData]
  );
  const totalGangguanSum = useMemo(
    () => rekapTableData.reduce((acc, curr) => acc + curr.gangguanCount, 0),
    [rekapTableData]
  );
  const totalMatiSum = useMemo(
    () => rekapTableData.reduce((acc, curr) => acc + curr.matiCount, 0),
    [rekapTableData]
  );
  
  const filteredDevices = devices.filter((dev) => {
    if (isReportedToday(dev)) {
      return false;
    }

    const matchesUpt = selectedUpt === 'ALL' || dev.uptStation === selectedUpt;

    const matchesSearch =
      searchQuery === '' ||
      (dev.site || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dev.devicesId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dev.uptStation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dev.category || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || dev.conditionStatus === statusFilter;

    return matchesUpt && matchesSearch && matchesStatus;
  });

  const sortedDevices = [...filteredDevices].sort((a, b) => {
    // Urutkan dari yang paling lama belum update.
    // Prioritaskan lastReportedDate (tanggal lapor terakhir); jika kosong, gunakan
    // lastCalibrated sebagai fallback. Alat yang belum pernah lapor sama sekali
    // dianggap paling lama (ditempatkan paling atas).
    const rawA = a.lastReportedDate || a.lastCalibrated;
    const rawB = b.lastReportedDate || b.lastCalibrated;

    const timeA = rawA ? new Date(rawA).getTime() : -Infinity;
    const timeB = rawB ? new Date(rawB).getTime() : -Infinity;

    return timeA - timeB;
  });

  const [tableFilterMonth, setTableFilterMonth] = useState<string>('REALTIME');

  const HISTORICAL_DISRUPTIONS: Array<{
    id: string;
    name: string;
    category: string;
    uptStation: string;
    status: 'GANGGUAN' | 'MATI';
    downtimeDuration: string;
    period: string;
    reportedDate: string;
    issue: string;
  }> = [];

  const activePeriodTarget = tableFilterMonth === 'HEADER_SYNC' ? `${selectedMonth} ${selectedYear}` : tableFilterMonth;

  let displayGangguan: Array<{
    id: string;
    name: string;
    category: string;
    uptStation: string;
    status: string;
    downtimeDuration: string;
    keterangan: string;
    reportedDate?: string;
  }> = [];

  let displayMati: Array<{
    id: string;
    name: string;
    category: string;
    uptStation: string;
    status: string;
    downtimeDuration: string;
    keterangan: string;
    reportedDate?: string;
  }> = [];

  if (tableFilterMonth === 'REALTIME') {
    const baseDevs = selectedUpt === 'ALL' ? devices : devices.filter((d) => d.uptStation === selectedUpt);

    displayGangguan = baseDevs
      .filter((d) => d.conditionStatus === 'GANGGUAN' && (d.slaScore === undefined || d.slaScore < 100))
      .map((d) => ({
        id: d.devicesId,
        name: d.site,
        category: d.category,
        uptStation: d.uptStation,
        status: 'GANGGUAN',
        downtimeDuration: d.downtimeDuration || '2 Jam',
        keterangan: d.issueDescription || '-',
        reportedDate: d.lastCalibrated || '28 Juli 2026',
      }));

    displayMati = baseDevs
      .filter((d) => d.conditionStatus === 'MATI' && (d.slaScore === undefined || d.slaScore < 100))
      .map((d) => ({
        id: d.devicesId,
        name: d.site,
        category: d.category,
        uptStation: d.uptStation,
        status: 'MATI',
        downtimeDuration: d.downtimeDuration || '18 Hari',
        keterangan: d.issueDescription || '-',
        reportedDate: d.lastCalibrated || '28 Juli 2026',
      }));
  } else {
    const filteredHist = HISTORICAL_DISRUPTIONS.filter((item) => {
      const matchesUpt = selectedUpt === 'ALL' || item.uptStation === selectedUpt;
      if (!matchesUpt) return false;
      if (activePeriodTarget === 'ALL') return true;
      return item.period.toLowerCase() === activePeriodTarget.toLowerCase();
    });

    displayGangguan = filteredHist
      .filter((h) => h.status === 'GANGGUAN')
      .map((h) => ({
        id: h.id,
        name: h.name,
        category: h.category,
        uptStation: h.uptStation,
        status: 'GANGGUAN',
        downtimeDuration: h.downtimeDuration,
        keterangan: h.issue || '-',
        reportedDate: h.reportedDate,
      }));

    displayMati = filteredHist
      .filter((h) => h.status === 'MATI')
      .map((h) => ({
        id: h.id,
        name: h.name,
        category: h.category,
        uptStation: h.uptStation,
        status: 'MATI',
        downtimeDuration: h.downtimeDuration,
        keterangan: h.issue || '-',
        reportedDate: h.reportedDate,
      }));
  }

  const hasDataForSelectedFilter = useMemo(() => {
    const targetDevs = selectedUpt === 'ALL' ? devices : uptFilteredDevices;
    const targetMonthNum = monthIdx + 1;
    const monthPaddedStr = String(targetMonthNum).padStart(2, '0');

    const hasReport = targetDevs.some((d) => {
      if (d.slaScore === undefined && d.olaScore === undefined) return false;
      if (!d.lastReportedDate) return false;

      const dateObj = new Date(d.lastReportedDate);
      if (!isNaN(dateObj.getTime())) {
        const year = dateObj.getFullYear().toString();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        return year === selectedYear && month === monthPaddedStr;
      }

      const parts = d.lastReportedDate.split('-');
      if (parts.length >= 3) {
        if (parts[0].length === 4) {
          return parts[0] === selectedYear && parts[1] === monthPaddedStr;
        }
        if (parts[2].length === 4) {
          return parts[2] === selectedYear && parts[1] === monthPaddedStr;
        }
      }

      return false;
    });

    return hasReport;
  }, [selectedYear, selectedUpt, monthIdx, devices, uptFilteredDevices]);

  const reportedCount = uptFilteredDevices.filter((dev) => isReportedToday(dev)).length;
  const totalDevicesCount = uptFilteredDevices.length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5">
        <div>
          <h2 className="font-heading font-bold text-lg sm:text-xl text-slate-900 flex items-center gap-2">
            <BarChart2 size={20} className="text-[#0052CC] sm:w-5 sm:h-5" />
            SLA &amp; OLA ALOPTAMA
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Service Level Agreement &amp; Operational Level Agreement Performa ALOPTAMA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 flex-1 sm:flex-none min-w-[140px] max-w-full">
            <Building2 size={14} className="text-[#0052CC] shrink-0" />
            <span className="shrink-0 hidden xs:inline">UPT:</span>
            <select
              value={selectedUpt}
              onChange={(e) => setSelectedUpt(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer truncate w-full"
            >
              <option value="ALL">Semua Stasiun UPT</option>
              {uptOptions.map((upt) => (
                <option key={upt.id} value={upt.id}>
                  {upt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700">
            <Calendar size={14} className="text-[#0052CC] shrink-0" />
            <span className="hidden xs:inline">Bulan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="Januari">Januari</option>
              <option value="Februari">Februari</option>
              <option value="Maret">Maret</option>
              <option value="April">April</option>
              <option value="Mei">Mei</option>
              <option value="Juni">Juni</option>
              <option value="Juli">Juli</option>
              <option value="Agustus">Agustus</option>
              <option value="September">September</option>
              <option value="Oktober">Oktober</option>
              <option value="November">November</option>
              <option value="Desember">Desember</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700">
            <span>Tahun:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 3 }, (_, i) => (2026 + i).toString()).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsWeeklyReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0052CC] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
              title="Buat Laporan Mingguan SLA & OLA resmi BMKG V (Khusus Admin)"
            >
              <FileText size={15} />
              <span>Buat Laporan Mingguan</span>
            </button>
          )}
        </div>
      </div>

      {!hasDataForSelectedFilter && (
        <div className="flex items-center gap-2.5 bg-amber-50/90 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-xs font-medium shadow-2xs">
          <Info size={18} className="shrink-0 text-amber-600" />
          <span>
            Belum ada data pengisian atau rekapitulasi historis untuk <strong>{selectedMonth} {selectedYear}</strong>{selectedUpt !== 'ALL' ? ` (${selectedUptName})` : ''}.
          </span>
        </div>
      )}

      {selectedYear === '2026' && selectedUpt !== 'ALL' && monthIdx <= 6 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-xs font-medium shadow-2xs">
          <Info size={16} className="shrink-0 text-amber-600" />
          <span>
            <strong>Informasi Data Filter 2026:</strong> Rekapitulasi historis Januari - Juli 2026 tersaji untuk gabungan seluruh Stasiun UPT. Data pengisian individual per UPT tersedia dan dimulai dari <strong>1 Agustus 2026</strong>.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none" />
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">
            SLA BULANAN ({selectedMonth} {selectedYear})
          </span>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-2">
            <span className="font-heading text-3xl sm:text-4xl font-black text-[#0052CC]">
              {Math.round(monthlySlaValue)}%
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Target ≥97%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 sm:mt-2 font-medium">
            Rata-rata ketersediaan peralatan dalam keadaan <strong>ON</strong> dalam sebulan.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none" />
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">
            OLA BULANAN ({selectedMonth} {selectedYear})
          </span>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-2">
            <span className="font-heading text-3xl sm:text-4xl font-black text-indigo-700">
              {Math.round(monthlyOlaValue)}%
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Target ≥97%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 sm:mt-2 font-medium">
            Rata-rata nilai/performa operasional alat beroperasi dalam sebulan.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
          <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wide">
            KONDISI KALIBRASI (BALAI)
          </span>
          <div className="mt-1.5 sm:mt-2 flex items-baseline gap-2">
            <span className="font-heading text-2xl sm:text-3xl md:text-4xl font-black text-emerald-600">
              {balaiTidakTerlambatCount} / {balaiDevices.length}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {balaiKondisiKalibrasiPercent}%
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1.5 sm:mt-2 font-medium">
            <span className="text-emerald-700 font-bold">🟢 {balaiTidakTerlambatCount} Tidak Terlambat</span> | {' '}
            <span className="text-rose-600 font-bold">🔴 {balaiTerlambatCount} Terlambat</span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-heading font-bold text-lg text-slate-900 flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-xs">
                <BarChart2 className="w-5 h-5" />
              </span>
              Rekapitulasi, Kondisi &amp; Analisa SLA OLA ({selectedMonth} {selectedYear})
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50/90 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {selectedUptName}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[1020px] bg-white rounded-xl border border-slate-300 overflow-hidden shadow-xs">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold uppercase tracking-wider text-[11px] border-b border-slate-300">
                  <th rowSpan={2} className="py-2.5 px-2 text-center w-12 border-r border-b border-slate-300">NO</th>
                  <th rowSpan={2} className="py-2.5 px-3 text-left border-r border-b border-slate-300">PERALATAN</th>
                  <th rowSpan={2} className="py-2.5 px-2 text-center w-28 border-r border-b border-slate-300">JUMLAH LOKASI</th>
                  <th colSpan={2} className="py-2 px-2 text-center border-r border-b border-slate-300 text-slate-900">PERSENTASE KINERJA</th>
                  <th colSpan={3} className="py-2 px-2 text-center border-r border-b border-slate-300 text-slate-900">KONDISI ALOPTAMA</th>
                  <th rowSpan={2} className="py-2.5 px-3 text-center w-48 border-b border-slate-300 text-slate-900">
                    ANALISA PERUBAHAN<br />
                    <span className="text-[9px] font-normal text-slate-500 normal-case">(Bulan Ini - Bulan Kemarin)</span>
                  </th>
                </tr>
                <tr className="bg-slate-50 text-slate-800 font-bold text-[10px] uppercase border-b border-slate-300">
                  <th className="py-2 px-2 text-center w-20 border-r border-slate-300">SLA</th>
                  <th className="py-2 px-2 text-center w-20 border-r border-slate-300">OLA</th>
                  <th className="py-2 px-1 text-center w-28 border-r border-slate-300">Normal (100%)</th>
                  <th className="py-2 px-1 text-center w-32 border-r border-slate-300">Gangguan (1-99%)</th>
                  <th className="py-2 px-1 text-center w-36 border-r border-slate-300">Tidak Beroperasi (0%)</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {rekapTableData.map((row) => (
                  <tr key={row.no} className="hover:bg-slate-50/80 transition-colors h-9 text-slate-800 font-medium border-b border-slate-200">
                    <td className="py-2 px-2 text-center font-bold text-slate-500 border-r border-slate-200">{row.no}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">{row.name}</td>
                    <td className="py-2 px-2 text-center font-bold text-slate-700 border-r border-slate-200">{row.jumlahLokasi}</td>
                    <td className="py-2 px-2 text-center font-bold border-r border-slate-200 text-slate-800">
                      {row.sla.toFixed(1)}%
                    </td>
                    <td className="py-2 px-2 text-center font-bold border-r border-slate-200 text-slate-800">
                      {row.ola.toFixed(1)}%
                    </td>
                    <td className="py-2 px-2 text-center font-bold border-r border-slate-200 text-slate-800">
                      {row.normalCount}
                    </td>
                    <td className="py-2 px-2 text-center font-bold border-r border-slate-200 text-slate-800">
                      {row.gangguanCount}
                    </td>
                    <td className="py-2 px-2 text-center font-bold border-r border-slate-200 text-slate-800">
                      {row.matiCount}
                    </td>
                    <td className="py-2 px-3 text-center font-semibold">
                      {row.diff !== null && row.diff !== undefined ? (
                        row.diff < 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                            <TrendingDown className="w-3.5 h-3.5" />
                            Turun {Math.abs(row.diff).toFixed(2)}%
                          </span>
                        ) : row.diff > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Naik {row.diff.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                            <Minus className="w-3 h-3 text-slate-400" />
                            Tetap
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400">---</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 text-slate-900 font-bold h-10 border-t-2 border-slate-300">
                  <td colSpan={2} className="py-2.5 px-3 text-left uppercase text-[11px] tracking-wider text-slate-900 font-black border-r border-slate-300">
                    TOTAL PERSENTASE
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-900 font-black text-xs border-r border-slate-300">{totalLokasiSum}</td>
                  <td className="py-2.5 px-2 text-center text-slate-900 font-black text-xs border-r border-slate-300">
                    {avgSlaTotal.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-900 font-black text-xs border-r border-slate-300">
                    {avgOlaTotal.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-900 font-black text-xs border-r border-slate-300">
                    {totalNormalSum}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-900 font-black text-xs border-r border-slate-300">
                    {totalGangguanSum}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-900 font-black text-xs border-r border-slate-300">
                    {totalMatiSum}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-500 text-[11px] font-medium italic">
                    Komparasi Periode Bulanan
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-800">
                Grafik Tren SLA Bulanan {selectedYear}
              </h3>
              <p className="text-xs text-slate-500">
                Rata-rata SLA ketersediaan peralatan {selectedUpt !== 'ALL' ? `milik ${selectedUptName}` : 'seluruh UPT'} per bulan
              </p>
            </div>
            <span className="text-xs font-bold text-[#0052CC] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
              {selectedUpt === 'ALL' ? `Filter: Tahun ${selectedYear}` : selectedUptName}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={slaTrendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                <YAxis domain={[0, 100]} stroke="#64748B" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F2D52', borderRadius: '10px', color: '#FFF', fontSize: '12px' }}
                  formatter={(value: any) => [`${value}%`, 'SLA Availability']}
                />
                <Line
                  type="monotone"
                  dataKey="sla"
                  name="SLA (%)"
                  stroke="#0052CC"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#0052CC' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-800">
                Grafik OLA Berdasarkan Jenis Peralatan ({selectedMonth} {selectedYear})
              </h3>
              <p className="text-xs text-slate-500">Capaian level operasional per jenis instrumentasi</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
              Filter: {selectedMonth} {selectedYear}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={olaByCategoryData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="category" stroke="#64748B" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                <YAxis domain={[0, 100]} stroke="#64748B" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F2D52', borderRadius: '10px', color: '#FFF', fontSize: '12px' }}
                  formatter={(value: any) => [`${value}%`, 'OLA Score']}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="OLA Score (%)"
                  stroke="#4F46E5"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#4F46E5' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* FILTER TUNGGAL & RESPONSIF DI MOBILE: RIWAYAT LOG GANGGUAN & ALAT MATI */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0052CC] flex items-center justify-center shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                Filter Riwayat Log Gangguan &amp; Alat Mati
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500">
                Pilih mode data status live real-time saat ini atau arsip rekapan
              </p>
            </div>
          </div>

          <span className="self-start sm:self-auto bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
            ⚡ STATUS LIVE REAL-TIME
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-slate-50 p-2 sm:p-3 rounded-xl border border-slate-200 gap-2">
          <span className="text-xs font-bold text-slate-700 shrink-0">
            Periode Tabel:
          </span>

          <select
            value={tableFilterMonth}
            onChange={(e) => setTableFilterMonth(e.target.value)}
            className="w-full sm:w-auto bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC] cursor-pointer"
          >
            <option value="REALTIME">⚡ Real-Time (Status Terkini Hari Ini)</option>
            <option value="HEADER_SYNC">🔄 Mengikuti Filter Header ({selectedMonth} {selectedYear})</option>
            <optgroup label="Bulan Tahun 2026">
              <option value="Juli 2026">Juli 2026</option>
              <option value="Juni 2026">Juni 2026</option>
              <option value="Mei 2026">Mei 2026</option>
              <option value="April 2026">April 2026</option>
              <option value="Maret 2026">Maret 2026</option>
              <option value="Februari 2026">Februari 2026</option>
              <option value="Januari 2026">Januari 2026</option>
            </optgroup>
            <optgroup label="Arsip Rekap">
              <option value="ALL">Semua Rekam Historis (≥ 2026)</option>
            </optgroup>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <h3 className="font-heading font-bold text-sm text-slate-900">
                Daftar Alat Gangguan ({displayGangguan.length})
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              🟡 Gangguan {tableFilterMonth !== 'REALTIME' && `(${activePeriodTarget})`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Nama Alat</th>
                  <th className="p-2.5">Lokasi / UPT</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayGangguan.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-slate-400">
                      🟢 Tidak ada catatan peralatan Gangguan pada periode {activePeriodTarget}.
                    </td>
                  </tr>
                ) : (
                  displayGangguan.map((dev) => (
                    <tr key={dev.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="p-2.5 font-semibold text-slate-900">
                        {dev.name}
                        <span className="block text-[10px] text-slate-500 font-normal">{dev.category} • {dev.reportedDate}</span>
                      </td>
                      <td className="p-2.5 text-slate-600 font-medium">
                        {stationMap.get(dev.uptStation) || dev.uptStation}
                      </td>
                      <td className="p-2.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          🟡 Gangguan
                        </span>
                      </td>
                      <td className="p-2.5 font-medium text-slate-800">
                        {dev.keterangan}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-600"></div>
              <h3 className="font-heading font-bold text-sm text-slate-900">
                Daftar Alat Mati ({displayMati.length})
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              🔴 Mati {tableFilterMonth !== 'REALTIME' && `(${activePeriodTarget})`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Nama Alat</th>
                  <th className="p-2.5">Lokasi / UPT</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayMati.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-slate-400">
                      🟢 Tidak ada catatan peralatan Mati pada periode {activePeriodTarget}.
                    </td>
                  </tr>
                ) : (
                  displayMati.map((dev) => (
                    <tr key={dev.id} className="hover:bg-rose-50/40 transition-colors">
                      <td className="p-2.5 font-semibold text-slate-900">
                        {dev.name}
                        <span className="block text-[10px] text-slate-500 font-normal">{dev.category} • {dev.reportedDate}</span>
                      </td>
                      <td className="p-2.5 text-slate-600 font-medium">
                        {stationMap.get(dev.uptStation) || dev.uptStation}
                      </td>
                      <td className="p-2.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          🔴 Mati
                        </span>
                      </td>
                      <td className="p-2.5 font-bold text-rose-600">
                        {dev.keterangan}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                <Wrench size={18} className="text-[#0052CC]" />
                Daftar Aloptama yang Belum Dilaporkan Hari Ini ({sortedDevices.length} Unit)
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 size={13} />
                {reportedCount} / {totalDevicesCount} Alat Sudah Lapor Hari Ini
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Peralatan yang belum diisi SLA OLA oleh teknisi UPT. Saat ini <strong>{reportedCount} dari {totalDevicesCount} unit alat ({Math.round((reportedCount/totalDevicesCount)*100)}%)</strong> telah melaporkan status hari ini.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari alat, ID, atau UPT..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="NORMAL">🟢 Normal</option>
              <option value="GANGGUAN">🟡 Gangguan</option>
              <option value="MATI">🔴 Mati</option>
            </select>

            <button
              onClick={() => setIsWaModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              title="Generate Format Laporan WA Group untuk UPT Belum Lapor"
            >
              <MessageSquare size={14} />
              <span>Laporan WA</span>
            </button>

            {reportedTodayIds.length > 0 && (
              <button
                onClick={handleResetReportedStatus}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                title="Reset status pengisian SLA OLA hari ini"
              >
                <RefreshCw size={13} />
                <span>Reset Status</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3">Nama &amp; ID Peralatan</th>
                <th className="p-3">Stasiun UPT</th>
                <th className="p-3">Terakhir Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {sortedDevices.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-10 text-slate-600 bg-emerald-50/50 rounded-xl">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 size={36} className="text-emerald-600" />
                      <span className="font-bold text-slate-800 text-sm">
                        Semua UPT Telah Mengisi SLA OLA Hari Ini
                      </span>
                      <span className="text-xs text-slate-500 max-w-md">
                        Tidak ada peralatan yang belum dilaporkan. Jika ada UPT yang belum mengisi SLA OLA, peralatan tersebut akan muncul di daftar ini.
                      </span>
                      {reportedTodayIds.length > 0 && (
                        <button
                          onClick={handleResetReportedStatus}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          <RefreshCw size={13} />
                          <span>Reset Status Pengisian</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedDevices.map((dev) => (
                  <tr key={dev.devicesId} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-900 text-xs">{dev.site}</div>
                      <div className="text-[11px] text-[#0052CC] font-semibold mt-0.5">
                        {dev.category} • <span className="font-mono">{dev.devicesId}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-800 font-semibold">
                      {stationMap.get(dev.uptStation) || dev.uptStation}
                    </td>
                    <td className="p-3 text-slate-700 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-[#0052CC] shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-800">
                          {dev.lastReportedDate || dev.lastCalibrated || '27 Juli 2026'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block ml-4">Belum Lapor Hari Ini</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <WaReportModal
        isOpen={isWaModalOpen}
        onClose={() => setIsWaModalOpen(false)}
        devices={sortedDevices}
        stations={stations}
      />

      <WeeklySlaOlaReportModal
        isOpen={isWeeklyReportModalOpen}
        onClose={() => setIsWeeklyReportModalOpen(false)}
        devices={devices}
      />
    </div>
  );
};