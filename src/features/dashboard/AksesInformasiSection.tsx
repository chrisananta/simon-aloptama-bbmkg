import React, { useMemo } from 'react';
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { ActiveNavMenu } from '../../shared/types';
import { useAuth } from '../auth/AuthContext';
import { useCarousel } from './useCarousel';

interface AksesItem {
  menu: ActiveNavMenu;
  label: string;
  icon: LucideIcon;
  /** true = hanya Admin Inskal & Super Admin. */
  adminOnly?: boolean;
}

const AKSES_ITEMS: AksesItem[] = [
  { menu: 'sla-ola', label: 'SLA & OLA', icon: BarChart2 },
  { menu: 'kalibrasi', label: 'Status Kalibrasi', icon: CalendarCheck },
  { menu: 'genset', label: 'Monitoring Genset', icon: Zap, adminOnly: true },
  { menu: 'perbaikan', label: 'Perbaikan dan Instalasi Peralatan', icon: Wrench, adminOnly: true },
  { menu: 'sertifikat', label: 'Sertifikat Kalibrasi Lapang', icon: FileCheck2 },
  { menu: 'panduan', label: 'Panduan Pemeliharaan', icon: BookOpen },
];

interface AksesInformasiSectionProps {
  onNavigate?: (menu: ActiveNavMenu) => void;
}

/** "Akses Informasi Lainnya": pintasan ke menu lain*/
export const AksesInformasiSection: React.FC<AksesInformasiSectionProps> = ({ onNavigate }) => {
  const { user, isMenuAllowed } = useAuth();
  const isAdmin = user?.role === 'ADMIN_INSKAL' || user?.role === 'SUPER_ADMIN';

  // Kartu yang tidak boleh diakses role ini disembunyikan (bukan dikunci).
  const items = useMemo(
    () =>
      AKSES_ITEMS.filter((it) => (it.adminOnly ? isAdmin : true) && isMenuAllowed(it.menu)),
    [isAdmin, isMenuAllowed]
  );

  const { trackRef, canPrev, canNext, updateArrows, slide } = useCarousel([items.length]);

  const arrowClass =
    'hidden sm:flex absolute top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-700 hover:bg-slate-50 disabled:opacity-0 disabled:pointer-events-none transition';

  if (items.length === 0) return null;

  return (
    <section className="pt-6 sm:pt-12 lg:pt-16 pb-6 sm:pb-12">
      <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-6 sm:mb-10">
        Akses Informasi Lainnya
      </h2>

      <div className="relative">
        <button type="button" aria-label="Geser ke kiri" onClick={() => slide(-1)} disabled={!canPrev} className={`${arrowClass} -left-4`}>
          <ChevronLeft size={18} />
        </button>
        <button type="button" aria-label="Geser ke kanan" onClick={() => slide(1)} disabled={!canNext} className={`${arrowClass} -right-4`}>
          <ChevronRight size={18} />
        </button>

        <div
          ref={trackRef}
          onScroll={updateArrows}
          className="flex gap-3 sm:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map(({ menu, label, icon: Icon }) => (
            <button
              key={menu}
              type="button"
              onClick={() => onNavigate?.(menu)}
              className="group snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052CC]/40 shrink-0 w-[62%] sm:w-[calc((100%-3.75rem)/4)] h-[170px] sm:h-[200px] rounded-2xl border border-slate-200 bg-white px-5 py-5 flex flex-col justify-between text-left hover:border-[#0052CC]/40 hover:shadow-md transition"
            >
              <Icon size={36} strokeWidth={1.3} className="text-slate-800 group-hover:text-[#0052CC] transition-colors" />
              <div>
                <span className="block font-heading text-sm sm:text-base font-bold text-slate-900 leading-snug">{label}</span>
                {/* Muncul saat kursor diarahkan / kartu difokus, judul naik ke atas (seperti bmkg.go.id) */}
                <span className="flex items-center gap-1.5 overflow-hidden max-h-0 opacity-0 group-hover:max-h-6 group-hover:opacity-100 group-hover:mt-2 group-focus-visible:max-h-6 group-focus-visible:opacity-100 group-focus-visible:mt-2 transition-all duration-300 text-[11px] font-semibold text-[#0052CC]">
                  Lihat Detail <ArrowRight size={13} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};