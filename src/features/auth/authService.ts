import { AuthUser, AuthSession, UserRole, RBACPermissions } from './authTypes';
import { ActiveNavMenu } from '../../shared/types';
import { SESSION_INFO_KEY, authFetch } from '../../shared/api/http';

// Kunci localStorage untuk METADATA sesi non-rahasia (user + waktu
// kedaluwarsa). Token JWT itu sendiri TIDAK PERNAH disimpan di sini atau di
// tempat lain yang bisa dibaca JavaScript - dia hidup di cookie httpOnly
// "simon_jwt" yang di-set backend saat login (lihat userController.ts) dan
// otomatis dikirim browser di setiap request lewat `credentials: 'include'`
// (lihat shared/api/http.ts authFetch). Ini sengaja dipisah dari nama kunci
// lama "simon_jwt_token" supaya sesi lama (yang masih menyimpan token mentah
// di localStorage dari sebelum perubahan ini) otomatis diabaikan, bukan
// disalahartikan sebagai session info baru.
interface StoredSessionInfo {
  user: AuthUser;
  expiresAt: number; // Unix timestamp ms
  createdAt: number;
}

function readStoredSession(): StoredSessionInfo | null {
  try {
    const raw = localStorage.getItem(SESSION_INFO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSessionInfo;
    if (!parsed?.user || typeof parsed.expiresAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredSession(info: StoredSessionInfo): void {
  try {
    localStorage.setItem(SESSION_INFO_KEY, JSON.stringify(info));
  } catch {
    // localStorage penuh/tidak tersedia - sesi tetap jalan lewat cookie,
    // hanya saja hitung-mundur & data user di UI tidak akan bertahan lewat
    // refresh halaman sampai login ulang.
  }
}

function clearStoredSession(): void {
  try {
    localStorage.removeItem(SESSION_INFO_KEY);
  } catch {
    // ignore
  }
}

// Mockup preset dinonaktifkan - Otentikasi murni via PostgreSQL
export const PRESET_USERS: Record<string, AuthUser & { defaultPass: string }> = {};

/**
 * Authentication Service (Terhubung Langsung ke PostgreSQL)
 *
 * CATATAN KEAMANAN: Token JWT dikirim & disimpan lewat cookie httpOnly,
 * BUKAN localStorage. JavaScript di aplikasi ini (termasuk skrip jahat yang
 * mungkin berhasil disuntikkan lewat celah XSS di masa depan) sama sekali
 * tidak bisa membaca atau menyalin token tsb, karena cookie httpOnly tidak
 * pernah terekspos ke `document.cookie` maupun API JS apa pun. Yang boleh
 * disimpan di localStorage di sini hanyalah metadata non-rahasia (nama user,
 * role, waktu kedaluwarsa) untuk keperluan tampilan UI semata.
 */
export const authService = {
  /**
   * Login user melalui Backend API PostgreSQL. Backend akan men-set cookie
   * httpOnly berisi JWT lewat header Set-Cookie pada response ini -
   * `credentials: 'include'` WAJIB supaya browser menyimpan cookie tsb.
   */
  login: async (username: string, password?: string): Promise<AuthSession> => {
    const cleanUser = username.trim().toLowerCase();

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // wajib: agar cookie httpOnly dari Set-Cookie tersimpan
        body: JSON.stringify({ username: cleanUser, password }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Respons bukan JSON valid
      }

      if (res.ok && data?.success && data?.user) {
        // Sesi hanya sah kalau backend juga mengembalikan expiresAt (dikirim
        // bersamaan dengan cookie httpOnly - lihat userController.ts).
        if (typeof data.expiresAt !== 'number') {
          throw new Error('Server tidak mengirim informasi kedaluwarsa sesi yang valid.');
        }

        const sessionInfo: StoredSessionInfo = {
          user: data.user,
          expiresAt: data.expiresAt,
          createdAt: Date.now(),
        };
        writeStoredSession(sessionInfo);

        return {
          // Token TIDAK pernah ada di sisi JS - field ini sengaja dikosongkan.
          // Semua request selanjutnya otomatis terautentikasi lewat cookie
          // httpOnly, tidak ada kode di app ini yang boleh bergantung pada
          // field `token` berisi nilai asli.
          token: '',
          refreshToken: '',
          user: data.user,
          expiresAt: data.expiresAt,
          createdAt: sessionInfo.createdAt,
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
  loginAsPreset: async (_rolePreset: UserRole): Promise<AuthSession> => {
    throw new Error('Mode preset login dinonaktifkan. Silakan login menggunakan akun terdaftar di PostgreSQL.');
  },

  /**
   * Aplikasi tidak membuat atau memperpanjang JWT sendiri. Token yang habis
   * harus diperbarui melalui login kembali sampai endpoint refresh server tersedia.
   */
  refreshToken: async (): Promise<AuthSession | null> => {
    return null;
  },

  /**
   * Logout: memanggil endpoint backend supaya SERVER yang mengirim instruksi
   * hapus cookie httpOnly (lewat header Set-Cookie kedaluwarsa). Frontend
   * tidak bisa menghapus cookie httpOnly sendiri lewat JavaScript - ini beda
   * dari perilaku lama yang cukup `localStorage.removeItem(...)`.
   */
  logout: (_actorName = 'Pengguna'): void => {
    clearStoredSession();
    // Fire-and-forget: tidak perlu ditunggu (await) karena UI harus langsung
    // kembali ke halaman login tanpa menunggu network round-trip. authFetch
    // otomatis menyertakan credentials, dan endpoint /logout backend sendiri
    // yang mencatat audit log dari identitas di dalam cookie (kalau valid).
    authFetch('/api/logout', { method: 'POST' }).catch(() => {
      // Kalaupun request logout gagal (mis. offline), sesi lokal di frontend
      // sudah dianggap berakhir lewat clearStoredSession() di atas. Cookie
      // di browser mungkin masih ada sampai kedaluwarsa alami (maks 24 jam),
      // tapi frontend sudah tidak menganggap user login.
    });
  },

  /**
   * Get Active Session if valid.
   *
   * PENTING: ini TIDAK memvalidasi token yang sebenarnya (tidak bisa - token
   * ada di cookie httpOnly yang tidak terbaca JS). Ini hanya membaca metadata
   * sesi non-rahasia yang disimpan saat login, untuk keperluan render UI awal
   * (siapa user-nya, kapan sesi berakhir) sebelum request API pertama
   * dikirim. Validitas SEBENARNYA selalu diputuskan oleh backend di setiap
   * request - kalau cookie ternyata sudah tidak valid, request API pertama
   * akan pulang dengan 401 dan authFetch akan memicu 'simon_session_expired'.
   */
  getCurrentSession: (): AuthSession | null => {
    const stored = readStoredSession();
    if (!stored) return null;

    if (stored.expiresAt <= Date.now()) {
      clearStoredSession();
      return null;
    }

    return {
      token: '',
      refreshToken: '',
      user: stored.user,
      expiresAt: stored.expiresAt,
      createdAt: stored.createdAt,
    };
  },

  /**
   *Pembagian Hak Akses RBAC - 4 Role (Sept 2026)
   */
  getRBACPermissions: (role: UserRole): RBACPermissions => {
    switch (role) {
      case 'SUPER_ADMIN':
        return {
          allowedMenus: ['dashboard', 'sla-ola', 'kalibrasi', 'sertifikat', 'admin-master', 'audit-log'],
          canAddCalibration: true,
          canManageMasterData: true,
          canViewAuditLogs: true,
          canClearAuditLogs: true,
          canInputSlaOla: true,
          isScopedToOwnUpt: false,
          canViewUnreportedList: true,
          canViewWeeklyReport: true,
          masterDataScope: 'FULL',
        };

      case 'ADMIN_INSKAL':
        return {
          allowedMenus: ['dashboard', 'sla-ola', 'kalibrasi', 'sertifikat', 'admin-master'],
          canAddCalibration: true,
          canManageMasterData: true,
          canViewAuditLogs: false,
          canClearAuditLogs: false,
          canInputSlaOla: true,
          isScopedToOwnUpt: false,
          canViewUnreportedList: true,
          canViewWeeklyReport: true,
          // Database Master dipersempit: hanya monitoring SLA OLA harian,
          // tanpa akses tab master data lain (alat, stasiun, akun, dst).
          masterDataScope: 'SLA_OLA_HARIAN_ONLY',
        };

      case 'KAUPT_KABBMKG':
        return {
          allowedMenus: ['dashboard', 'sla-ola', 'kalibrasi', 'sertifikat'],
          canAddCalibration: false,
          canManageMasterData: false,
          canViewAuditLogs: false,
          canClearAuditLogs: false,
          // Sama seperti Teknisi UPT, tapi TANPA tombol pengisian SLA OLA.
          canInputSlaOla: false,
          isScopedToOwnUpt: true,
          canViewUnreportedList: false,
          canViewWeeklyReport: false,
          masterDataScope: 'FULL',
        };

      case 'TEKNISI_UPT':
      default:
        return {
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
        };
    }
  },

  /**
   * Cek izin menu navigasi
   */
  isMenuAllowed: (role: UserRole, menu: ActiveNavMenu): boolean => {
    const permissions = authService.getRBACPermissions(role);
    return permissions.allowedMenus.includes(menu);
  },
};