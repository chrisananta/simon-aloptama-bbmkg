import React from 'react';
import { ActiveNavMenu } from '../shared/types';
import simonLogo from '../assets/images/simonlogo.png';

interface NavbarProps {
  activeMenu: ActiveNavMenu;
  collapsed: boolean;
  mobileSidebarHidden?: boolean;
  onRevealMobileSidebar?: () => void;
  lastUpdate?: string;
  onOpenServerModal?: () => void;
  onOpenSlaOlaModal?: () => void;
  syncSource?: string;
  isSyncing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeMenu,
  collapsed,
  mobileSidebarHidden = false,
  onRevealMobileSidebar,
}) => {
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
      case 'panduan':
        return 'Panduan Pemeliharaan Peralatan';
      default:
        return 'Perbaikan dan Instalasi Peralatan';
      case 'genset':
        return 'Monitoring Operasional Genset';   
    }
  };

  return (
    <header
      className={`fixed top-9 right-0 z-20 bg-white border-b border-slate-200 shadow-xs transition-all duration-300 ${
        mobileSidebarHidden ? 'left-0 sm:left-16' : 'left-16'
      } ${collapsed ? 'md:left-20' : 'md:left-72'}`}
    >
      {/* Bar tanggal & jam sudah dipindah ke <TimeBar /> (lihat App.tsx) —
          full-width dari ujung ke ujung layar, tidak lagi kepentok sidebar.
          Header ini sekarang cuma berisi judul halaman — logo S pindah ke
          header Sidebar (klik logo itu untuk membuka sidebar). Tombol logo
          kecil di bawah ini HANYA muncul di HP saat sidebar tersembunyi
          total, sebagai pemicu pertama untuk memunculkan rail ikon sidebar. */}
      <div className="h-16 flex items-center justify-between px-2.5 sm:px-4 md:px-6">
        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 min-w-0 flex-1 mr-2 sm:mr-4">
          {mobileSidebarHidden && (
            <button
              onClick={onRevealMobileSidebar}
              title="Buka menu"
              aria-label="Buka menu navigasi"
              className="sm:hidden flex items-center justify-center shrink-0 rounded-lg p-0.5 cursor-pointer active:scale-95 transition-transform"
            >
              <img src={simonLogo} alt="SIMON" draggable={false} className="h-8 w-8 object-contain select-none" />
            </button>
          )}
          <h1 className="font-heading font-bold text-xs sm:text-sm md:text-base text-slate-800 leading-tight truncate">
            {getMenuTitle()}
          </h1>
        </div>
      </div>
    </header>
  );
};