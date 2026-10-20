import type { ActiveNavMenu } from '../shared/types';

export const MENU_PATHS: Record<ActiveNavMenu, string> = {
  dashboard: '/',
  'sla-ola': '/sla-ola',
  kalibrasi: '/kalibrasi',
  sertifikat: '/sertifikat',
  'admin-master': '/admin-master',
  'audit-log': '/audit-log',
  genset: '/genset',
  perbaikan: '/perbaikan',
  panduan: '/panduan',
};

const normalizePath = (pathname: string): string => {
  const lower = (pathname || '/').toLowerCase().replace(/\/+$/, '');
  return lower === '' ? '/' : lower;
};

const PATH_TO_MENU: Record<string, ActiveNavMenu> = {
  ...Object.fromEntries(
    (Object.entries(MENU_PATHS) as [ActiveNavMenu, string][]).map(([menu, path]) => [path, menu])
  ),
  '/dashboard': 'dashboard',
};

export const pathFromMenu = (menu: ActiveNavMenu): string => MENU_PATHS[menu];

/** Alamat -> menu. Mengembalikan null bila alamat tidak dikenal. */
export function menuFromPath(pathname: string): ActiveNavMenu | null {
  return PATH_TO_MENU[normalizePath(pathname)] ?? null;
}