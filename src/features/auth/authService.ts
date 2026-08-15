import { AuthUser, AuthSession, JWTPayload, UserRole, RBACPermissions } from './authTypes';
import { ActiveNavMenu } from '../../shared/types';
import { apiClient } from '../../shared/api';

const TOKEN_KEY = 'simon_jwt_token';
const REFRESH_TOKEN_KEY = 'simon_refresh_token';
const SESSION_EXP_KEY = 'simon_session_exp';

// Mockup preset dinonaktifkan - Otentikasi murni via PostgreSQL
export const PRESET_USERS: Record<string, AuthUser & { defaultPass: string }> = {};

/*Base64URL encoder & decoder helper*/
const base64UrlEncode = (str: string): string => {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const base64UrlDecode = (str: string): string => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return decodeURIComponent(escape(atob(base64)));
};

/**
 * Generate JWT Token lokal untuk fallback sesi jika diperlukan (Default 24 jam)
 */
export const createJWT = (user: AuthUser, expiresInMs = 24 * 60 * 60 * 1000): { token: string; exp: number; iat: number } => {
  const iat = Math.floor(Date.now() / 1000);
  const exp = Math.floor((Date.now() + expiresInMs) / 1000);

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: JWTPayload = {
    sub: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    title: user.title,
    uptStation: user.uptStation,
    iat,
    exp,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  // Simulated HMAC SHA256 Signature hash for JWT
  const signature = base64UrlEncode(`SIMON_SECRET_KEY_BBMKG_V_${encodedHeader}.${encodedPayload}`);

  const token = `${encodedHeader}.${encodedPayload}.${signature}`;
  return { token, exp: exp * 1000, iat: iat * 1000 };
};

/**
 * Parse JWT payload
 */
export const parseJWT = (token: string): JWTPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decodedPayload = base64UrlDecode(parts[1]);
    return JSON.parse(decodedPayload) as JWTPayload;
  } catch (err) {
    console.error('Failed to parse JWT token:', err);
    return null;
  }
};

/**
 * Validate JWT Token
 */
export const validateToken = (token: string): { valid: boolean; payload: JWTPayload | null; reason?: string } => {
  if (!token) return { valid: false, payload: null, reason: 'Token tidak ditemukan' };
  const payload = parseJWT(token);
  if (!payload) return { valid: false, payload: null, reason: 'Format token tidak valid' };

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp < nowSec) {
    return { valid: false, payload, reason: 'Sesi telah berakhir (Expired Token)' };
  }

  return { valid: true, payload };
};

/**
 * Authentication Service (Terhubung Langsung ke PostgreSQL)
 */
export const authService = {

/**
   * Login user melalui Backend API PostgreSQL
   */
  login: async (username: string, password?: string): Promise<AuthSession> => {
    const cleanUser = username.trim().toLowerCase();

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Respons bukan JSON valid
      }

      if (res.ok && data?.success && data?.user) {
        const token = data.token || createJWT(data.user).token;
        const refreshToken = `REFRESH_${data.token || base64UrlEncode(JSON.stringify({ id: data.user.id, ts: Date.now() }))}`;
        const exp = Date.now() + 24 * 60 * 60 * 1000;

        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        localStorage.setItem(SESSION_EXP_KEY, String(exp));

        return {
          token,
          refreshToken,
          user: data.user,
          expiresAt: exp,
          createdAt: Date.now(),
        };
      }

      throw new Error(
        data?.message || 'Autentikasi gagal. Periksa kembali username dan kata sandi Anda.'
      );
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error('Gagal terhubung ke server PostgreSQL backend. Silakan periksa koneksi jaringan / server Anda.');
      }
      throw err;
    }
  },

  /**
   * Preset Quick Login (for demo/convenience)
   */
 loginAsPreset: async (rolePreset: UserRole): Promise<AuthSession> => {
    throw new Error('Mode preset login dinonaktifkan. Silakan login menggunakan akun terdaftar di PostgreSQL.');
  },

  /**
   * Perbarui Token Sesi
   */
  refreshToken: async (): Promise<AuthSession | null> => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!currentToken || !refreshToken) return null;

    const payload = parseJWT(currentToken);
    if (!payload) return null;

    const allUsers = apiClient.users.getAll();
    const foundUser = allUsers.find(
      (u) =>
        (u.id && (payload.sub || payload.id) && u.id === (payload.sub || payload.id)) ||
        (u.username && payload.username && u.username.toLowerCase() === payload.username.toLowerCase())
    );
    const user: AuthUser = foundUser || {
      id: payload.sub || payload.id || '',
      username: payload.username || 'user',
      name: payload.name || 'User',
      role: payload.role || 'UPT_PIMPINAN',
      title: payload.title || 'Operator UPT',
      uptStation: payload.uptStation || 'BBMKG Wilayah V Papua',
    };

    // Create fresh token with extended expiry (24 hours)
    const { token: newToken, exp, iat } = createJWT(user, 24 * 60 * 60 * 1000);
    const newRefreshToken = `REFRESH_${base64UrlEncode(JSON.stringify({ id: user.id, ts: Date.now() }))}`;

    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
    localStorage.setItem(SESSION_EXP_KEY, String(exp));

    // Audit log
    apiClient.auditLogs.add({
      table: 'autentikasi',
      action: 'REFRESH_TOKEN',
      recordId: user.id,
      recordName: user.name,
      actor: `${user.name} (${user.role})`,
      details: `Memperbarui token JWT autentikasi sesi aktif (Refresh Token)`,
      status: 'SUCCESS',
    });

    return {
      token: newToken,
      refreshToken: newRefreshToken,
      user,
      expiresAt: exp,
      createdAt: iat,
    };
  },

  /**
   * Logout user and invalidate session
   */
  logout: (actorName = 'Pengguna'): void => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (currentToken) {
      const payload = parseJWT(currentToken);
      if (payload) {
        apiClient.auditLogs.add({
          table: 'autentikasi',
          action: 'LOGOUT',
          recordId: payload.sub || payload.id || 'UNKNOWN',
          recordName: payload.name,
          actor: actorName,
          details: `Pengguna melakukan logout dan mengakhiri sesi aktif`,
          status: 'SUCCESS',
        });
      }
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(SESSION_EXP_KEY);
  },

  /**
   * Get Active Session if valid
   */
  getCurrentSession: (): AuthSession | null => {
    const token = localStorage.getItem(TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!token || !refreshToken) return null;

    const validation = validateToken(token);
    if (!validation.valid || !validation.payload) {
      console.warn('JWT Token invalid or expired:', validation.reason);
      return null;
    }

    const payload = validation.payload;
    const allUsers = apiClient.users.getAll();
    const foundUser = allUsers.find(
      (u) =>
        (u.id && (payload.sub || payload.id) && u.id === (payload.sub || payload.id)) ||
        (u.username && payload.username && u.username.toLowerCase() === payload.username.toLowerCase())
    );
    const user: AuthUser = foundUser || {
      id: payload.sub || payload.id || '',
      username: payload.username || 'user',
      name: payload.name || 'User',
      role: payload.role || 'UPT_PIMPINAN',
      title: payload.title || 'Operator UPT',
      uptStation: payload.uptStation || 'BBMKG Wilayah V Papua',
    };

    return {
      token,
      refreshToken,
      user,
      expiresAt: payload.exp * 1000,
      createdAt: payload.iat * 1000,
    };
  },

  /**
   *Pembagian Hak Akses RBAC
   */
  getRBACPermissions: (role: UserRole): RBACPermissions => {
    if (role === 'ADMIN') {
      return {
        allowedMenus: ['dashboard', 'sla-ola', 'kalibrasi', 'sertifikat', 'admin-master', 'audit-log'],
        canAddCalibration: true,
        canManageMasterData: true,
        canViewAuditLogs: true,
        canClearAuditLogs: true,
        canInputSlaOla: true,
      };
    }

    // Role UPT Dan Pimpinan
    return {
      allowedMenus: ['dashboard', 'sla-ola', 'kalibrasi', 'sertifikat'],
      canAddCalibration: false,
      canManageMasterData: false,
      canViewAuditLogs: false,
      canClearAuditLogs: false,
      canInputSlaOla: true,
    };
  },

  /**
   * Cek izin menu navigasi
   */
  isMenuAllowed: (role: UserRole, menu: ActiveNavMenu): boolean => {
    const permissions = authService.getRBACPermissions(role);
    return permissions.allowedMenus.includes(menu);
  },
};
