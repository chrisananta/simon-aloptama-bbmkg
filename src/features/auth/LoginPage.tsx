import React, { useState } from 'react';
import { 
  KeyRound, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { SimonLogo } from '../../shared/components/ui/SimonLogo';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('Username atau NIP BMKG wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await login(username, password);
      if (!success) {
        setErrorMessage('Autentikasi gagal. Periksa kembali username/NIP dan kata sandi Anda.');
      }
    } catch (err) {
      setErrorMessage('Terjadi kesalahan koneksi autentikasi ke server BMKG.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between p-4 sm:p-6 font-['Inter',sans-serif]">
      {/* Top Header Bar */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <SimonLogo variant="image" height={42} />
          <div>
            <span className="text-[11px] font-extrabold text-[#0052CC] tracking-wide uppercase block">
              BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA
            </span>
            <span className="text-xs font-bold text-slate-700">
              BBMKG WILAYAH V PAPUA
            </span>
          </div>
        </div>
      </header>

      {/* Main Single Centered Card */}
      <div className="my-auto py-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden p-6 sm:p-10 space-y-6">
          
          {/* Header Section */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <SimonLogo variant="image" height={54} />
            </div>
            
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#0F2D52] tracking-tight">
              SIMON
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-600 font-semibold leading-relaxed px-2">
              Sistem Informasi Monitoring Aloptama &amp; Kalibrasi BBMKG Wilayah V
            </p>
          </div>

          <div className="border-t border-slate-100 my-2" />

          {/* Alert Message if Login Fails */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Autentikasi Gagal</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Form Login */}
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Username / NIP BMKG
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username atau NIP..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi akun..."
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full py-3.5 bg-[#0052CC] hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <span>Memproses Masuk...</span>
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>MASUK SISTEM</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer BMKG Style */}
      <footer className="max-w-5xl w-full mx-auto text-center py-4 text-xs text-slate-500 font-medium border-t border-slate-200/80">
        &copy; 2026 Balai Besar Meteorologi Klimatologi dan Geofisika Wilayah V Papua
      </footer>
    </div>
  );
};
