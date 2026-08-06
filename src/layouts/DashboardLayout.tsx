import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ActiveNavMenu, AloptamaDevice } from '../shared/types';

interface DashboardLayoutProps {
  activeMenu: ActiveNavMenu;
  onSelectMenu: (menu: ActiveNavMenu) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  totalDevices: number;
  normalCount: number;
  gangguanCount: number;
  matiCount: number;
  devices: AloptamaDevice[];
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  activeMenu,
  onSelectMenu,
  collapsed,
  onToggleCollapse,
  totalDevices,
  normalCount,
  gangguanCount,
  matiCount,
  devices,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 flex flex-col">
      <Navbar activeMenu={activeMenu} collapsed={collapsed} />

      <Sidebar
        activeMenu={activeMenu}
        onSelectMenu={onSelectMenu}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        totalDevices={totalDevices}
        normalCount={normalCount}
        gangguanCount={gangguanCount}
        matiCount={matiCount}
        devices={devices}
      />

      <main
        className={`flex-1 pt-20 pb-10 px-3 sm:px-4 md:px-6 transition-all duration-300 ${
          collapsed ? 'ml-16 md:ml-20' : 'ml-0 md:ml-72'
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
};
