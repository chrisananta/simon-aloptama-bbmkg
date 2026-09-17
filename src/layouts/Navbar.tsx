import React, { useState, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { ActiveNavMenu } from '../shared/types';

// Import gambar langsung dari folder assets/images
import simonLogo from '../assets/images/simonlogo.png';

interface NavbarProps {
  activeMenu: ActiveNavMenu;
  collapsed: boolean;
  lastUpdate?: string;
  onOpenServerModal?: () => void;
  onOpenSlaOlaModal?: () => void;
  syncSource?: string;
  isSyncing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeMenu,
  collapsed,
}) => {
  const [dateStr, setDateStr] = useState<string>('');
  const [timeWitStr, setTimeWitStr] = useState<string>('');
  const [timeUtcStr, setTimeUtcStr] = useState<string>('');
  // Dropdown tanggal/jam di HP: default TERTUTUP (cuma 1 baris ramping),
  // baru muncul detail WIT+UTC saat di-tap — persis pola bmkg.go.id
  const [showTimeDetail, setShowTimeDetail] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const day = now
        .toLocaleDateString('id-ID', { timeZone: 'Asia/Jayapura', weekday: 'long' })
        .toUpperCase();
      const date = now.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jayapura',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const wit = now.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jayapura',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const utc = now.toLocaleTimeString('id-ID', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setDateStr(`${day}, ${date}`);
      setTimeWitStr(`${wit} WIT`);
      setTimeUtcStr(`${utc} UTC`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getMenuTitle = () => {
    switch (activeMenu) {
      case 'dashboard':
        return 'Dashboard Monitoring Aloptama';
      case 'sla-ola':
        return 'SLA & OLA Aloptama';
      case 'kalibrasi':
        return 'Monitoring Status Kalibrasi';
      case 'sertifikat':
        return 'Portal Sertifikat Kalibrasi Lapang';
      case 'admin-master':
        return 'Pengelolaan Database Master';
      case 'audit-log':
        return 'Audit Log Aktivitas & Perubahan Sistem';
      default:
        return 'Perbaikan dan Instalasi Peralatan';
      case 'genset':
        return 'Monitoring Operasional Genset';   
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 z-20 bg-white border-b border-slate-200 shadow-xs transition-all duration-300 ${
        collapsed ? 'left-16 md:left-20' : 'left-0 md:left-72'
      }`}
    >
      {/* Bar tanggal & jam — HANYA di layar HP. Tertutup = 1 baris ramping
          full-width. Tap untuk buka dropdown detail WIT+UTC (overlay,
          tidak mendorong konten di bawahnya turun). Gaya seperti bmkg.go.id */}
      <div className="sm:hidden relative">
        <button
          type="button"
          onClick={() => setShowTimeDetail(v => !v)}
          className="w-full h-9 flex items-center justify-center gap-1.5 bg-slate-50 border-b border-slate-200 text-slate-600 cursor-pointer active:bg-slate-100"
        >
          <span className="text-[10px] font-bold uppercase tracking-wide">
            {dateStr || 'Memuat...'}
          </span>
          <ChevronDown
            size={13}
            className={`transition-transform duration-200 ${showTimeDetail ? 'rotate-180' : ''}`}
          />
        </button>

        {showTimeDetail && (
          <div className="absolute top-full left-0 right-0 z-30 bg-white border-b border-slate-200 shadow-md px-3 py-2.5 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              Standar Waktu Indonesia
            </p>
            <p className="text-sm font-bold text-emerald-600 tabular-nums leading-snug mt-0.5">
              {timeWitStr || '--:--:--'}{' '}
              <span className="text-slate-300 font-normal">/</span>{' '}
              {timeUtcStr || '--:--:--'}
            </p>
          </div>
        )}
      </div>

      {/* Baris logo + judul halaman (+ jam ringkas 1-baris untuk tablet/PC) */}
      <div className="h-16 flex items-center justify-between px-2.5 sm:px-4 md:px-6">
        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 min-w-0 flex-1 mr-2 sm:mr-4">
          {collapsed && (
            <>
              <img
              src={simonLogo} 
              alt="Logo Simon" 
              className="max-h-9 sm:max-h-11 w-auto shrink-0 object-contain"
              />
              <div className="hidden sm:block h-7 w-px bg-slate-200 shrink-0" />
            </>
          )}
          <h1 className="font-heading font-bold text-xs sm:text-sm md:text-base text-slate-800 leading-tight truncate">
            {getMenuTitle()}
          </h1>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* Jayapura WIT Clock — cuma 1 baris ringkas di tablet & PC (di HP sudah ada dropdown di atas) */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
            <Clock size={13} className="text-[#0052CC] shrink-0" />
            <span className="whitespace-nowrap text-[11px] font-semibold">
              {dateStr && timeWitStr ? `${dateStr}, pukul ${timeWitStr}` : 'Memuat Waktu...'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};