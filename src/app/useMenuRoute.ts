import { useSyncExternalStore } from 'react';
import type { ActiveNavMenu } from '../shared/types';
import { getMenuRouter, type NavigateOptions } from './menuRouter';

export function useMenuRoute(): [ActiveNavMenu, (menu: ActiveNavMenu, options?: NavigateOptions) => void] {
  const router = getMenuRouter();
  const menu = useSyncExternalStore(router.subscribe, router.getMenu, router.getMenu);
  return [menu, router.navigate];
}