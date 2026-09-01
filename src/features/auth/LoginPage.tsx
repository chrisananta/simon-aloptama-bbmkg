import React, { useState } from "react";
import { KeyRound, Lock, User, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "./AuthContext";
import { InstallAppBanner } from "../../shared/components/InstallAppBanner";

// 1. Import Logo BMKG untuk Header Atas
import bmkgLogo from "../../assets/images/BMKGLogo.png";

// 2. Import Logo SIMON untuk Card Form
import simonLogo from "../../assets/images/simonlogo.png";

export const LoginPage: React.FC = () => {
  const { login, isLoading, getLastAuthError } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!username.trim()) {
      setErrorMessage("Username wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await login(username, password);
      if (!success) {
        setErrorMessage(
          getLastAuthError() ||
            "Autentikasi gagal. Periksa kembali username/NIP dan kata sandi Anda.",
        );
      }
    } catch (err) {
      setErrorMessage("Terjadi kesalahan koneksi autentikasi ke server BMKG.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col p-4 sm:p-6 font-['Inter',sans-serif]">
      {/* Top Header Bar */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-1.5 sm:py-2 border-b border-slate-200/80 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Logo BMKG untuk Header Atas */}
          <img
            src={bmkgLogo}
            alt="Logo BMKG"
            className="h-7 sm:h-10 w-auto object-contain shrink-0"
          />
          <div>
            <span className="text-[8px] sm:text-[11px] font-extrabold text-[#0052CC] tracking-wide uppercase block leading-tight">
              BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA
            </span>
            <span className="text-[9px] sm:text-xs font-bold text-slate-700">
              BBMKG WILAYAH V JAYAPURA
            </span>
          </div>
        </div>
      </header>

      {/* Main Single Centered Card */}
      <div className="flex-1 flex flex-col items-center justify-center py-4 sm:py-6 px-2 sm:px-0 min-h-0">
        {/* Banner ajakan install PWA - hanya tampil kalau browser mendukung & belum ditutup */}
        <InstallAppBanner />

        <div className="max-w-md w-full bg-white rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl border border-slate-200 overflow-hidden p-4 sm:p-10 space-y-3 sm:space-y-6 my-auto max-h-full overflow-y-auto">
          {/* Header Section */}
          <div className="text-center space-y-1 sm:space-y-2">
            <div className="flex justify-center mb-1 sm:mb-2">
              {/* Logo SIMON di Atas Form Login Card */}
              <img
                src={simonLogo}
                alt="Logo SIMON"
                className="h-9 sm:h-14 w-auto object-contain shrink-0"
              />
            </div>

            <h1 className="font-heading font-extrabold text-lg sm:text-3xl text-[#0F2D52] tracking-tight">
              SIMON
            </h1>

            <p className="text-[10px] sm:text-sm text-slate-600 font-semibold leading-snug px-2">
              Sistem Informasi Monitoring Aloptama &amp; Kalibrasi
            </p>
          </div>

          <div className="border-t border-slate-100 my-1 sm:my-2" />

          {/* Alert Message if Login Fails */}
          {errorMessage && (
            <div className="p-2.5 sm:p-3.5 bg-rose-50 border border-rose-200 rounded-xl sm:rounded-2xl text-rose-800 text-[11px] sm:text-xs flex items-start gap-2 sm:gap-2.5 animate-shake">
              <AlertCircle
                size={16}
                className="text-rose-600 shrink-0 mt-0.5 sm:w-[18px] sm:h-[18px]"
              />
              <div>
                <span className="font-bold block">Autentikasi Gagal</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Form Login */}
          <form
            onSubmit={handleManualSubmit}
            className="space-y-2.5 sm:space-y-4"
          >
            <div className="space-y-1 sm:space-y-1.5">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
                Username / NIP BMKG
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 sm:w-[18px] sm:h-[18px]"
                />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username atau NIP"
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 bg-slate-50 border border-slate-300 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="space-y-1 sm:space-y-1.5">
              <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 sm:w-[18px] sm:h-[18px]"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi akun"
                  className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 sm:py-3 bg-slate-50 border border-slate-300 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={16} className="sm:w-[18px] sm:h-[18px]" />
                  ) : (
                    <Eye size={16} className="sm:w-[18px] sm:h-[18px]" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full py-2.5 sm:py-3.5 bg-[#0052CC] hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs sm:text-sm rounded-lg sm:rounded-xl shadow-md hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1 sm:mt-2"
            >
              {isSubmitting ? (
                <span>Memproses Masuk...</span>
              ) : (
                <>
                  <KeyRound size={15} className="sm:w-4 sm:h-4" />
                  <span>Login</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer BMKG Style */}
      <footer className="max-w-5xl w-full mx-auto text-center py-1.5 sm:py-4 text-[10px] sm:text-xs text-slate-500 font-medium border-t border-slate-200/80 leading-snug shrink-0">
        <span className="sm:hidden">&copy; 2026 BBMKG Wilayah V Papua</span>
        <span className="hidden sm:inline">
          &copy; 2026 Balai Besar Meteorologi Klimatologi dan Geofisika Wilayah
          V Papua
        </span>
      </footer>
    </div>
  );
};
