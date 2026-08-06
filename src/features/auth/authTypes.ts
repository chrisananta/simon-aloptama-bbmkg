import { ActiveNavMenu } from '../../shared/types';

export type UserRole = 'ADMIN' | 'UPT_PIMPINAN';

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
  sub: string;
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
}
