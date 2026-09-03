import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AuthUser, AuthSession, UserRole, RBACPermissions } from './authTypes';
import { authService } from './authService';
import { ActiveNavMenu } from '../../shared/types';

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  permissions: RBACPermissions;
  login: (username: string, password?: string) => Promise<boolean>;
  loginAsPreset: (role: UserRole) => Promise<boolean>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  isMenuAllowed: (menu: ActiveNavMenu) => boolean;
  sessionTimeLeftMinutes: number;
  getLastAuthError: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_PERMISSIONS: RBACPermissions = {
  allowedMenus: ['dashboard', 'sla-ola', 'kalibrasi', 'sertifikat'],
  canAddCalibration: false,
  canManageMasterData: false,
  canViewAuditLogs: false,
  canClearAuditLogs: false,
  canInputSlaOla: true,
  isScopedToOwnUpt: true,
  canViewUnreportedList: false,
  canViewWeeklyReport: false,
  masterDataScope: 'FULL',
  canManageGenset: false,
  canManagePerbaikan: false,
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Terpisah dari isLoading: isInitializing HANYA true selama pengecekan sesi
  // pertama kali (pas app baru dibuka). Setelah itu SELAMANYA false - tidak
  // ikut nyala lagi tiap kali proses login() jalan. Ini yang dipakai
  // ProtectedRoute untuk memutuskan tampilkan spinner vs LoginPage, supaya
  // LoginPage tidak unmount/remount tiap kali user mencoba login.
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [sessionTimeLeftMinutes, setSessionTimeLeftMinutes] = useState<number>(0);
  // Pakai ref (bukan state) - supaya bisa dibaca LANGSUNG setelah login() selesai,
  // tanpa nunggu React re-render (yang bisa telat / "basi" saat dibaca).
  const lastAuthErrorRef = useRef<string | null>(null);
  const getLastAuthError = useCallback(() => lastAuthErrorRef.current, []);

  // Load session on startup
  const checkSession = useCallback(() => {
    try {
      const activeSession = authService.getCurrentSession();
      if (activeSession) {
        setSession(activeSession);
        setUser(activeSession.user);

        const diffMs = activeSession.expiresAt - Date.now();
        setSessionTimeLeftMinutes(Math.max(0, Math.floor(diffMs / (1000 * 60))));
      } else {
        setSession(null);
        setUser(null);
        setSessionTimeLeftMinutes(0);
      }
    } catch (e) {
      console.error('Check session error:', e);
      setSession(null);
      setUser(null);
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Backend menolak token (401) lewat authFetch -> paksa logout & balik ke login
  useEffect(() => {
    const handleServerSessionExpired = () => {
      console.warn('Token ditolak server (401). Sesi diakhiri, silakan login kembali.');
      setSession(null);
      setUser(null);
      setSessionTimeLeftMinutes(0);
    };
    window.addEventListener('simon_session_expired', handleServerSessionExpired);
    return () => window.removeEventListener('simon_session_expired', handleServerSessionExpired);
  }, []);

  // Periodic session countdown and auto-logout / auto-refresh check
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diffMs = session.expiresAt - now;

      if (diffMs <= 0) {
        console.warn('Session expired. Redirecting to login...');
        authService.logout(user?.name || 'Session Auto Expiry');
        setSession(null);
        setUser(null);
        setSessionTimeLeftMinutes(0);
      } else {
        setSessionTimeLeftMinutes(Math.max(0, Math.floor(diffMs / (1000 * 60))));
      }
    }, 15000); // Check every 15 sec

    return () => clearInterval(interval);
  }, [session, user]);

  const login = async (username: string, password?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      lastAuthErrorRef.current = null;
      const newSession = await authService.login(username, password);
      setSession(newSession);
      setUser(newSession.user);
      const diffMs = newSession.expiresAt - Date.now();
      setSessionTimeLeftMinutes(Math.max(0, Math.floor(diffMs / (1000 * 60))));
      return true;
    } catch (err) {
      console.error('Login failed:', err);
      lastAuthErrorRef.current = err instanceof Error ? err.message : 'Autentikasi gagal.';
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsPreset = async (role: UserRole): Promise<boolean> => {
    try {
      setIsLoading(true);
      const newSession = await authService.loginAsPreset(role);
      setSession(newSession);
      setUser(newSession.user);
      const diffMs = newSession.expiresAt - Date.now();
      setSessionTimeLeftMinutes(Math.max(0, Math.floor(diffMs / (1000 * 60))));
      return true;
    } catch (err) {
      console.error('Login preset failed:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    if (user) {
      authService.logout(user.name);
    }
    setSession(null);
    setUser(null);
    setSessionTimeLeftMinutes(0);
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshed = await authService.refreshToken();
      if (refreshed) {
        setSession(refreshed);
        setUser(refreshed.user);
        const diffMs = refreshed.expiresAt - Date.now();
        setSessionTimeLeftMinutes(Math.max(0, Math.floor(diffMs / (1000 * 60))));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Refresh token error:', e);
      return false;
    }
  };

  const permissions = user ? authService.getRBACPermissions(user.role) : DEFAULT_PERMISSIONS;

  const isMenuAllowed = (menu: ActiveNavMenu): boolean => {
    if (!user) return false;
    return authService.isMenuAllowed(user.role, menu);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user && !!session,
        isLoading,
        isInitializing,
        permissions,
        login,
        loginAsPreset,
        logout,
        refreshToken,
        isMenuAllowed,
        sessionTimeLeftMinutes,
        getLastAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
