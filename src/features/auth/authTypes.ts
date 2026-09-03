import { ActiveNavMenu } from '../../shared/types';

export type UserRole = 'TEKNISI_UPT' | 'KAUPT_KABBMKG' | 'ADMIN_INSKAL' | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  title: string;
  uptStation?: string;
  nip?: string;
  email?: string;
  avatarUrl?: string;
}

export interface AuthSession {
  token: string;
  refreshToken: string;
  user: AuthUser;
  expiresAt: number; // Unix timestamp ms
  createdAt: number;
}

export interface JWTPayload {
  sub?: string; // dipakai token offline/lokal (createJWT)
  id?: string;  // dipakai token asli dari backend (jwt.sign di userController.ts)
  username: string;
  name: string;
  role: UserRole;
  title: string;
  uptStation?: string;
  iat: number;
  exp: number;
}

export interface LoginCredentials {
  username: string;
  password?: string;
  rolePreset?: UserRole;
}

export interface RBACPermissions {
  allowedMenus: ActiveNavMenu[];
  canAddCalibration: boolean;
  canManageMasterData: boolean;
  canViewAuditLogs: boolean;
  canClearAuditLogs: boolean;
  canInputSlaOla: boolean;
  canManageGenset: boolean;
  // Teknisi UPT & KaUPT hanya boleh melihat alat milik UPT mereka sendiri.
  isScopedToOwnUpt: boolean;
  // Sembunyikan panel "Daftar Aloptama Belum Dilaporkan" & laporan mingguan
  // di halaman SLA OLA untuk role non-admin.
  canViewUnreportedList: boolean;
  canViewWeeklyReport: boolean;
  // Admin Inskal: menu Database Master dipersempit hanya ke monitoring
  // SLA OLA harian (tab master data lain disembunyikan).
  masterDataScope: 'FULL' | 'SLA_OLA_HARIAN_ONLY';
}
