import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Calendar, CalendarDays, Layers, Loader2 } from 'lucide-react';
import { AloptamaDevice } from '../../shared/types';
import { apiClient } from '../../shared/api';

type DailyMap = Record<string, Record<number, { sla: boolean; ola: number }>>;

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

interface SlaOlaHarianTableProps {
  /** Daftar alat yang ditampilkan (sudah mengikuti filter UPT di header halaman). */
  devices: AloptamaDevice[];
}

// Gaya sama dengan filter di header halaman SLA & OLA (SlaOlaView).
const filterBoxClass =
  'flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700';
const selectClass =
  'bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer';

const round1 = (n: number) => Math.round(n * 10) / 10;

export const SlaOlaHarianTable: React.FC<SlaOlaHarianTableProps> = ({ devices }) => {
  const now = new Date();
  const [jenis, setJenis] = useState<'SLA' | 'OLA'>('SLA');
  // '' = belum dipilih user -> otomatis AWOS Kat.I (supaya tabel tidak terlalu panjang).
  const [category, setCategory] = useState('');
  const [month, setMonth] = useState(now.getMonth()); // 0-11
  const [year, setYear] = useState(now.getFullYear());

  const [daily, setDaily] = useState<DailyMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadFailed(false);
    apiClient.slaOlaDaily.fetch(month + 1, year).then((result) => {
      if (cancelled) return;
      if (result === null) {
        setDaily({});
        setLoadFailed(true);
      } else {
        setDaily(result);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [month, year]);

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [month, year]);
  const dayColumns = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  // Hari ini (untuk menandai tanggal yang belum tiba pada bulan berjalan).
  const todayDay = useMemo(() => {
    const t = new Date();
    if (t.getFullYear() === year && t.getMonth() === month) return t.getDate();
    if (new Date(year, month, 1) > t) return 0; // bulan depan: semua tanggal belum tiba
    return daysInMonth; // bulan lalu: semua sudah lewat
  }, [year, month, daysInMonth]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(devices.map((d) => d.category).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [devices]
  );

  // Kategori awal: AWOS Kat.I; kalau tidak ada di daftar (mis. UPT terpilih tidak punya AWOS Kat.I),
  // pakai kategori pertama. Kalau pilihan user hilang dari daftar, juga jatuh ke kategori awal.
  const defaultCategory = useMemo(() => {
    const norm = (v: string) => v.toLowerCase().replace(/[.\s]/g, '');
    return categoryOptions.find((c) => norm(c) === 'awoskat.i'.replace(/[.\s]/g, '')) || categoryOptions[0] || 'ALL';
  }, [categoryOptions]);
  const activeCategory =
    category === 'ALL' || categoryOptions.includes(category) ? category : defaultCategory;

  const rows = useMemo(
    () =>
      devices
        .filter((d) => activeCategory === 'ALL' || d.category === activeCategory)
        .sort((a, b) => {
          const catCmp = (a.category || '').localeCompare(b.category || '');
          if (catCmp !== 0) return catCmp;
          return (a.site || '').localeCompare(b.site || '');
        }),
    [devices, activeCategory]
  );

  const renderCell = (entry: { sla: boolean; ola: number } | undefined) => {
    if (!entry) return null;
    if (jenis === 'SLA') {
      return entry.sla ? (
        <span className="font-bold text-emerald-700">ON</span>
      ) : (
        <span className="font-bold text-rose-600">OFF</span>
      );
    }
    const v = entry.ola;
    const color = v >= 100 ? 'text-emerald-700' : v <= 0 ? 'text-rose-600' : 'text-amber-600';
    return <span className={`font-bold ${color}`}>{round1(v)}</span>;
  };

  // Rata-rata bulan berjalan dari hari yang terisi. SLA = persentase hari ON
  // (sama dengan perhitungan SLA bulanan di rekap halaman ini).
  const averageOf = (deviceId: string): number | null => {
    const days = Object.values(daily[deviceId] || {});
    if (days.length === 0) return null;
    if (jenis === 'SLA') return round1((days.filter((d) => d.sla).length / days.length) * 100);
    return round1(days.reduce((sum, d) => sum + d.ola, 0) / days.length);
  };

  const filledDevices = rows.filter((d) => Object.keys(daily[d.devicesId] || {}).length > 0).length;

  return (
    <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
            <CalendarDays size={16} className="text-[#0052CC]" />
            Tabel Pengisian {jenis} Harian — {MONTHS[month]} {year}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className={filterBoxClass}>
            <Activity size={14} className="text-[#0052CC] shrink-0" />
            <select
              value={jenis}
              onChange={(e) => setJenis(e.target.value as 'SLA' | 'OLA')}
              className={selectClass}
              aria-label="Jenis tabel"
            >
              <option value="SLA">SLA (ON / OFF)</option>
              <option value="OLA">OLA (%)</option>
            </select>
          </div>

          <div className={`${filterBoxClass} max-w-full`}>
            <Layers size={14} className="text-[#0052CC] shrink-0" />
            <select
              value={activeCategory}
              onChange={(e) => setCategory(e.target.value)}
              className={`${selectClass} max-w-[190px] truncate`}
              aria-label="Kategori peralatan"
            >
              <option value="ALL">Semua Kategori Alat</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className={filterBoxClass}>
            <Calendar size={14} className="text-[#0052CC] shrink-0" />
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={selectClass} aria-label="Bulan">
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
          </div>

          <div className={filterBoxClass}>
            <span>Tahun:</span>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectClass} aria-label="Tahun">
              {Array.from({ length: 3 }, (_, i) => 2026 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loadFailed && (
        <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
          Gagal memuat isian harian dari server. Coba ganti periode atau muat ulang halaman.
        </div>
      )}

      <div className="relative overflow-x-auto rounded-xl border border-slate-300">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-white/60 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-[#0052CC]" />
          </div>
        )}
        <table className="w-full border-collapse text-[10px] text-slate-800">
          <thead>
            <tr className="bg-slate-100 font-bold uppercase text-center">
              <th className="border border-slate-300 py-1.5 px-1 w-8">No</th>
              <th className="border border-slate-300 py-1.5 px-2 text-left min-w-[150px]">Nama Alat</th>
              <th className="border border-slate-300 py-1.5 px-2 text-left min-w-[100px]">Kategori</th>
              {dayColumns.map((d) => (
                <th key={d} className="border border-slate-300 py-1.5 px-0.5 min-w-[26px]">{d}</th>
              ))}
              <th className="border border-slate-300 py-1.5 px-2 min-w-[64px]">Rata-rata</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={dayColumns.length + 4} className="py-6 text-center text-slate-500 font-semibold">
                  Tidak ada alat pada filter ini.
                </td>
              </tr>
            ) : (
              rows.map((dev, idx) => {
                const avg = averageOf(dev.devicesId);
                return (
                  <tr key={dev.devicesId} className="hover:bg-blue-50/40">
                    <td className="border border-slate-300 py-1 px-1 text-center font-semibold">{idx + 1}</td>
                    <td className="border border-slate-300 py-1 px-2 font-semibold">{dev.site}</td>
                    <td className="border border-slate-300 py-1 px-2 text-slate-600">{dev.category}</td>
                    {dayColumns.map((d) => (
                      <td
                        key={d}
                        className={`border border-slate-300 py-1 px-0.5 text-center ${d > todayDay ? 'bg-slate-50' : ''}`}
                      >
                        {renderCell(daily[dev.devicesId]?.[d])}
                      </td>
                    ))}
                    <td className="border border-slate-300 py-1 px-2 text-center font-bold">
                      {avg === null ? '-' : `${avg}%`}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};