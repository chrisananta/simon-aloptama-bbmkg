import type { ActiveNavMenu } from '../shared/types';
import { menuFromPath, pathFromMenu } from './routes';

export interface NavigateOptions {
  replace?: boolean;
}

export interface MenuRouter {
  getMenu: () => ActiveNavMenu;
  navigate: (menu: ActiveNavMenu, options?: NavigateOptions) => void;
  subscribe: (listener: () => void) => () => void;
  dispose: () => void;
}

type RouterWindow = Pick<Window, 'location' | 'history' | 'addEventListener' | 'removeEventListener'>;

export function createMenuRouter(win: RouterWindow): MenuRouter {
  const listeners = new Set<() => void>();

  const readMenu = (): ActiveNavMenu => menuFromPath(win.location.pathname) ?? 'dashboard';

  // Alamat tak dikenal (mis. /abc) -> rapikan ke "/" tanpa menambah riwayat.
  if (menuFromPath(win.location.pathname) === null) {
    win.history.replaceState(win.history.state, '', pathFromMenu('dashboard'));
  }

  let current: ActiveNavMenu = readMenu();

  const emit = () => listeners.forEach((l) => l());

  const onPopState = () => {
    const next = readMenu();
    if (next !== current) {
      current = next;
      emit();
    }
  };
  win.addEventListener('popstate', onPopState);

  const navigate = (menu: ActiveNavMenu, options: NavigateOptions = {}) => {
    const path = pathFromMenu(menu);
    if (menuFromPath(win.location.pathname) !== menu) {
      if (options.replace) win.history.replaceState(win.history.state, '', path);
      else win.history.pushState(win.history.state, '', path);
    }
    if (menu !== current) {
      current = menu;
      emit();
    }
  };

  return {
    getMenu: () => current,
    navigate,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose: () => {
      win.removeEventListener('popstate', onPopState);
      listeners.clear();
    },
  };
}

let instance: MenuRouter | null = null;

/** Satu pengendali untuk seluruh aplikasi (dibuat saat pertama dipakai di browser). */
export function getMenuRouter(): MenuRouter {
  if (!instance) instance = createMenuRouter(window);
  return instance;
}