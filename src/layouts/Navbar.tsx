import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { ActiveNavMenu } from '../shared/types';
import { SimonLogo } from '../shared/components/ui/SimonLogo';

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
  const [witTime, setWitTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Jayapura',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      };
      setWitTime(now.toLocaleDateString('id-ID', options) + ' WIT');
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getMenuTitle = () => {
    switch (activeMenu) {
      case 'dashboard':
        return 'Dashboard Monitoring Operasional';
      case 'sla-ola':
        return 'SLA & OLA Aloptama BBMKG Wilayah V';
      case 'kalibrasi':
        return 'Monitoring Status Kalibrasi Peralatan';
      case 'sertifikat':
        return 'Portal Sertifikat Kalibrasi Lapang';
      case 'admin-master':
        return 'Pengelolaan Database Master';
      case 'audit-log':
        return 'Audit Log Aktivitas & Perubahan Sistem';
      default:
        return 'SIMON BBMKG V';
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 z-20 h-16 bg-white border-b border-slate-200 shadow-xs transition-all duration-300 flex items-center justify-between px-2.5 sm:px-4 md:px-6 ${
        collapsed ? 'left-16 md:left-20' : 'left-0 md:left-72'
      }`}
    >
      <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 min-w-0 flex-1 mr-2 sm:mr-4">
        {collapsed && (
          <>
            <SimonLogo variant="image" height={36} className="max-h-9 sm:max-h-11 shrink-0" />
            <div className="hidden sm:block h-7 w-px bg-slate-200 shrink-0" />
          </>
        )}
        <h1 className="font-heading font-bold text-xs sm:text-sm md:text-base text-slate-800 leading-tight truncate">
          {getMenuTitle()}
        </h1>
      </div>

      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        {/* Jayapura WIT Clock */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700">
          <Clock size={13} className="text-[#0052CC] shrink-0" />
          <span className="whitespace-nowrap">{witTime || 'Memuat Waktu...'}</span>
        </div>
      </div>
    </header>
  );
};
