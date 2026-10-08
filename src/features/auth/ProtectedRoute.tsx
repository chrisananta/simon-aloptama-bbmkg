import simonLogo from '../../assets/images/simonlogo.png';
import React from 'react';
import { useAuth } from './AuthContext';
import { ActiveNavMenu } from '../../shared/types';
import { LoginPage } from './LoginPage';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { UserRole } from './authTypes';

const ROLE_LABEL: Record<UserRole, string> = {
  TEKNISI_UPT: 'Teknisi UPT',
  KAUPT_KABBMKG: 'KaUPT / KaBBMKG',
  ADMIN_INSKAL: 'Admin Inskal',
  SUPER_ADMIN: 'Super Admin',
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  activeMenu: ActiveNavMenu;
  onRedirectToDashboard: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  activeMenu,
  onRedirectToDashboard,
}) => {
  const { isAuthenticated, isInitializing, user, isMenuAllowed } = useAuth();

  // Spinner cuma buat pengecekan sesi PERTAMA KALI pas app baru dibuka.
  // Setelah itu, walau login() sedang berjalan (isLoading di context),
  // JANGAN unmount LoginPage - biar state internalnya (pesan error, dst)
  // tidak ikut hilang di tengah proses submit.
  if (isInitializing) {
    return (
      // Tampilan sama dengan splash di index.html supaya peralihan dari splash awal mulus.
      <div className="fixed inset-0 bg-[#F5F7FA] flex flex-col items-center justify-center gap-4 p-4">
        <img src={simonLogo} alt="SIMON" className="h-24 w-24 object-contain animate-pulse" />
        <span className="font-heading font-bold text-[13px] tracking-[0.18em] text-[#003366]">SIMON BMKG</span>
        <p className="text-[11px] font-medium text-slate-500">Memverifikasi sesi...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  // Check RBAC Menu Permission
  if (!isMenuAllowed(activeMenu)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-rose-200 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-100 border border-rose-300 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
            <ShieldAlert size={32} />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-extrabold uppercase tracking-wider">
              Akses Ditolak • Restriksi Peran RBAC
            </span>
            <h3 className="font-heading font-bold text-lg text-slate-900 mt-2">
              Anda Tidak Memiliki Hak Akses Halaman Ini
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Peran Anda saat ini adalah <strong className="text-slate-900">[{ROLE_LABEL[user.role]}]</strong>. Halaman ini diproteksi dan hanya dapat diakses oleh Admin Inskal / Super Admin.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onRedirectToDashboard}
              className="px-5 py-2.5 bg-[#0052CC] hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Kembali ke Dashboard Monitoring</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};