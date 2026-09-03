import React from 'react';
import { 
  Home, 
  BarChart2, 
  Calendar, 
  ExternalLink, 
  ChevronLeft, 
  ChevronRight, 
  Database,
  ShieldCheck,
  LogOut,
  Zap
} from 'lucide-react';
import { ActiveNavMenu, AloptamaDevice } from '../shared/types';
import { useAuth } from '../features/auth/AuthContext';
import sidebarLogoImg from '../assets/images/Logosidebar.png';
import { UserRole } from '../features/auth/authTypes';

const ROLE_LABEL: Record<UserRole, string> = {
  TEKNISI_UPT: 'Teknisi UPT',
  KAUPT_KABBMKG: 'KaUPT / KaBBMKG',
  ADMIN_INSKAL: 'Admin Inskal',
  SUPER_ADMIN: 'Super Admin',
};

const ROLE_BADGE_STYLE: Record<UserRole, string> = {
  TEKNISI_UPT: 'bg-blue-100 text-blue-800 border border-blue-200',
  KAUPT_KABBMKG: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
  ADMIN_INSKAL: 'bg-purple-100 text-purple-800 border border-purple-200',
  SUPER_ADMIN: 'bg-rose-100 text-rose-800 border border-rose-200',
};

interface SidebarProps {
  activeMenu: ActiveNavMenu;
  onSelectMenu: (menu: ActiveNavMenu) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  totalDevices?: number;
  normalCount?: number;
  gangguanCount?: number;
  matiCount?: number;
  devices?: AloptamaDevice[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeMenu,
  onSelectMenu,
  collapsed,
  onToggleCollapse,
  devices,
}) => {
  const { user, isMenuAllowed, logout } = useAuth();

  const warningCount = devices
    ? devices.filter(
        (d) => d.calibrationStatus === 'SEGERA_DIKALIBRASI' || d.calibrationStatus === 'KADALUWARSA'
      ).length
    : 0;

  const allMenuItems = [
    {
      id: 'dashboard' as ActiveNavMenu,
      label: 'Dashboard Monitoring',
      icon: Home,
      badge: null,
    },
    {
      id: 'sla-ola' as ActiveNavMenu,
      label: 'SLA & OLA Aloptama',
      icon: BarChart2,
      badge: null,
    },
    {
      id: 'kalibrasi' as ActiveNavMenu,
      label: 'Monitoring Kalibrasi',
      icon: Calendar,
      badge: warningCount > 0 ? `${warningCount} Warning` : null,
    },
    {
      id: 'sertifikat' as ActiveNavMenu,
      label: 'Sertifikat Kalibrasi Lapang',
      icon: ExternalLink,
      badge: 'External',
    },
    {
      id: 'admin-master' as ActiveNavMenu,
      label: 'Database Master',
      icon: Database,
      badge: 'Admin',
    },
    {
      id: 'audit-log' as ActiveNavMenu,
      label: 'Log Aktivitas',
      icon: ShieldCheck,
      badge: 'Audit',
    },
    {
      id: 'genset' as ActiveNavMenu,
      label: 'Monitoring Genset',
      icon: Zap,
      badge: 'Admin',
    },    
  ];

  // Filter menus according to logged-in user RBAC
  const visibleMenuItems = allMenuItems.filter((item) => isMenuAllowed(item.id));

  return (
    <>
      {!collapsed && (
        <div
          onClick={onToggleCollapse}
          className="fixed inset-0 bg-slate-900/40 z-20 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-30 flex flex-col bg-white border-r border-slate-200 text-slate-800 transition-all duration-300 shadow-md ${
          collapsed ? 'w-16 md:w-20' : 'w-64 md:w-72'
        }`}
      >
        <div
          className={`flex items-center border-b border-slate-200 bg-slate-50/80 transition-all duration-300 ${
            collapsed ? 'justify-center py-4 px-2 h-16' : 'justify-between px-3 md:px-4 py-3 min-h-[64px] md:min-h-[72px]'
          }`}
        >
          {!collapsed && (
            <div className="flex flex-1 items-center justify-center">
              <img 
              src= {sidebarLogoImg}
              alt="SIMON BBMKG V"
              className="h-8 md:h-10 w-auto max-w-full object-contain" />
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1.5 md:p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200 shrink-0 cursor-pointer"
            title={collapsed ? 'Perluas Sidebar' : 'Tutup Sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <div className="flex-1 py-3 md:py-4 px-2 md:px-3 overflow-y-auto space-y-1.5">
          <div className={`px-2 pb-2 ${collapsed ? 'hidden' : 'block'}`}>
            <p className="text-[10px] md:text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              NAVIGASI OPERASIONAL
            </p>
          </div>

          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectMenu(item.id);
                  if (typeof window !== 'undefined' && window.innerWidth < 768 && !collapsed) {
                    onToggleCollapse();
                  }
                }}
                className={`w-full flex items-center px-2.5 md:px-3 py-2.5 md:py-3 rounded-xl transition-all duration-200 text-left font-medium text-xs md:text-sm group ${
                  isActive
                    ? 'bg-[#0052CC] text-white font-semibold shadow-xs border-l-4 border-[#0F2D52]'
                    : 'text-slate-600 hover:bg-blue-50 hover:text-[#0052CC]'
                }`}
              >
                <Icon
                  size={18}
                  className={`shrink-0 transition-all duration-300 ease-out transform group-hover:scale-125 group-hover:-translate-y-0.5 group-hover:rotate-6 group-active:scale-90 md:w-5 md:h-5 ${
                    isActive ? 'text-white scale-110 -rotate-3' : 'text-slate-400 group-hover:text-[#0052CC]'
                  }`}
                />
                {!collapsed && (
                  <span className="ml-3 truncate flex-1 text-sm">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span
                    className={`ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                      item.id === 'kalibrasi'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : isActive
                          ? 'bg-blue-400/30 text-white border border-blue-300/40'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50/80 flex flex-col gap-2">
          {!collapsed ? (
            <>
              {user && (
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5 text-left">
                  <div className="w-8 h-8 rounded-lg bg-[#0052CC] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {user.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate leading-tight">{user.name}</p>
                    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                      ROLE_BADGE_STYLE[user.role]
                    }`}>
                      {ROLE_LABEL[user.role]}
                    </span>
                  </div>
                </div>
              )}
              <button
                onClick={logout}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 rounded-xl text-xs font-bold border border-rose-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut size={14} />
                <span>Keluar</span>
              </button>
              <p className="text-[10px] font-medium text-slate-400 text-center mt-0.5">
                ©2026 BBMKG V | chrs | v1.0
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {user && (
                <div 
                  className="w-8 h-8 rounded-lg bg-[#0052CC] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs"
                  title={`${user.name} (${ROLE_LABEL[user.role]})`}
                >
                  {user.name.charAt(0)}
                </div>
              )}
              <button
                onClick={logout}
                title="Logout"
                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition-colors cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
