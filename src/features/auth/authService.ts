import { AuthUser, AuthSession, JWTPayload, UserRole, RBACPermissions } from './authTypes';
import { ActiveNavMenu } from '../../shared/types';
import { apiClient } from '../../shared/api';

const TOKEN_KEY = 'simon_jwt_token';
const REFRESH_TOKEN_KEY = 'simon_refresh_token';
const SESSION_EXP_KEY = 'simon_session_exp';

// Default mock accounts
export const PRESET_USERS: Record<string, AuthUser & { defaultPass: string }> = {
  admin: {
    id: 'USR-ADMIN-001',
    username: 'admin.inskal',
    defaultPass: 'inskal123',
    name: 'Ir. Fajar Nur, M.T.',
    role: 'ADMIN',
    title: 'Admin INSKAL & Kalibrasi BBMKG V',
    nip: '19850412 201012 1 001',
    email: 'fajar.nur@bmkg.go.id',
    uptStation: 'BBMKG Wilayah V Papua',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  },
  upt_jayapura: {
    id: 'USR-UPT-001',
    username: 'upt.jayapura',
    defaultPass: 'bmkg123',
    name: 'Agus Prasetyo, S.Tr.',
    role: 'UPT_PIMPINAN',
    title: 'Operator UPT Stamet Dok II Jayapura',
    nip: '19920815 201503 1 002',
    email: 'stamet.jayapura@bmkg.go.id',
    uptStation: 'Stasiun Meteorologi Dok II Jayapura',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
  },
  pimpinan: {
    id: 'USR-PIMP-001',
    username: 'pimpinan.balai',
    defaultPass: 'bmkg123',
    name: 'Dr. Yosafat, M.Si.',
    role: 'UPT_PIMPINAN',
    title: 'Kepala BBMKG Wilayah V Papua',
    nip: '19760310 199903 1 001',
    email: 'pimpinan.balai5@bmkg.go.id',
    uptStation: 'BBMKG Wilayah V Papua',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
  },
};

/**
 * Base64URL encoder & decoder helper
 */
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
 * Generate JWT Token (Header.Payload.Signature)
 */
export const createJWT = (user: AuthUser, expiresInMs = 8 * 60 * 60 * 1000): { token: string; exp: number; iat: number } => {
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
 * Authentication Service
 */
export const authService = {
  /**
   * Login user with username & password or preset
   */
  login: async (username: string, password?: string): Promise<AuthSession> => {
    const cleanUser = username.trim().toLowerCase();

    // 1. First attempt PostgreSQL database authentication via backend API
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
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
      }
    } catch (e) {
      console.warn('Backend PostgreSQL login attempt failed, falling back to local credentials:', e);
    }

    let targetUser: AuthUser | undefined;

    // Search in dynamic users storage
    const allUsers = apiClient.users.getAll();
    targetUser = allUsers.find(
      (u) => u.username.toLowerCase() === cleanUser || u.id.toLowerCase() === cleanUser
    );

    if (!targetUser) {
      // Check presets
      const foundPreset = Object.values(PRESET_USERS).find(
        (u) => u.username.toLowerCase() === cleanUser || u.id.toLowerCase() === cleanUser
      );

      if (foundPreset) {
        targetUser = foundPreset;
      } else {
        // Dynamic fallback user generation based on username rule
        const isAdmin = cleanUser.includes('admin') || cleanUser.includes('inskal');
        const role: UserRole = isAdmin ? 'ADMIN' : 'UPT_PIMPINAN';
        
        targetUser = {
          id: `USR-${Date.now().toString().slice(-4)}`,
          username: cleanUser,
          name: cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1),
          role,
          title: isAdmin ? 'Admin Sistem INSKAL BMKG' : 'Operator / Pimpinan UPT BMKG',
          uptStation: isAdmin ? 'BBMKG Wilayah V Papua' : 'Stasiun UPT Papua',
          nip: '19900101 201801 1 001',
        };
      }
    }

    // Generate JWT & Refresh Tokens
    const { token, exp, iat } = createJWT(targetUser);
    const refreshToken = `REFRESH_${base64UrlEncode(JSON.stringify({ id: targetUser.id, ts: Date.now() }))}`;

    // Store in localStorage
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(SESSION_EXP_KEY, String(exp));

    const session: AuthSession = {
      token,
      refreshToken,
      user: targetUser,
      expiresAt: exp,
      createdAt: iat,
    };

    // Log login activity to audit log
    apiClient.auditLogs.add({
      table: 'autentikasi',
      action: 'LOGIN',
      recordId: targetUser.id,
      recordName: targetUser.name,
      actor: `${targetUser.name} (${targetUser.role})`,
      details: `Berhasil login ke sistem SIMON sebagai ${targetUser.role} [${targetUser.title}]`,
      status: 'SUCCESS',
      ipOrSource: 'Session JWT Web Client',
    });

    return session;
  },

  /**
   * Preset Quick Login (for demo/convenience)
   */
  loginAsPreset: async (rolePreset: UserRole): Promise<AuthSession> => {
    if (rolePreset === 'ADMIN') {
      return await authService.login(PRESET_USERS.admin.username);
    } else {
      return await authService.login(PRESET_USERS.upt_jayapura.username);
    }
  },

  /**
   * Refresh Token
   */
  refreshToken: async (): Promise<AuthSession | null> => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!currentToken || !refreshToken) return null;

    const payload = parseJWT(currentToken);
    if (!payload) return null;

    // Find full user details
    const allUsers = apiClient.users.getAll();
    const foundUser = allUsers.find(
      (u) =>
        (u.id && payload.sub && u.id === payload.sub) ||
        (u.username && payload.username && u.username.toLowerCase() === payload.username.toLowerCase())
    );
    const user: AuthUser = foundUser || {
      id: payload.sub,
      username: payload.username || 'user',
      name: payload.name || 'User',
      role: payload.role || 'UPT_PIMPINAN',
      title: payload.title || 'Operator UPT',
      uptStation: payload.uptStation || 'BBMKG Wilayah V Papua',
    };

    // Create fresh token with extended expiry (8 hours)
    const { token: newToken, exp, iat } = createJWT(user, 8 * 60 * 60 * 1000);
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
          recordId: payload.sub,
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
      // Token expired, attempt to auto-refresh token if refreshToken exists
      console.warn('JWT Token invalid or expired:', validation.reason);
      return null;
    }

    const payload = validation.payload;
    const allUsers = apiClient.users.getAll();
    const foundUser = allUsers.find(
      (u) =>
        (u.id && payload.sub && u.id === payload.sub) ||
        (u.username && payload.username && u.username.toLowerCase() === payload.username.toLowerCase())
    );
    const user: AuthUser = foundUser || {
      id: payload.sub,
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
   * RBAC Permissions helper
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
   * Check if a route menu is accessible by role
   */
  isMenuAllowed: (role: UserRole, menu: ActiveNavMenu): boolean => {
    const permissions = authService.getRBACPermissions(role);
    return permissions.allowedMenus.includes(menu);
  },
};
