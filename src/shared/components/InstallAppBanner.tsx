import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

// Event ini tidak ada di tipe bawaan TypeScript DOM, jadi didefinisikan manual.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "simon_install_banner_dismissed";

/**
 * Banner "Install Aplikasi" yang dismissible untuk halaman login.
 *
 * - Hanya muncul jika browser benar-benar bisa menawarkan instalasi PWA
 *   (Chrome/Edge Android & Desktop). Safari iOS tidak mendukung event ini
 *   sama sekali, jadi banner otomatis tidak tampil di iPhone.
 * - Kalau user tutup banner (tombol X), preferensi disimpan di
 *   localStorage supaya tidak muncul lagi di kunjungan berikutnya.
 * - Kalau app sudah ter-install (dibuka dalam mode standalone), banner
 *   tidak pernah ditampilkan sama sekali.
 */
export const InstallAppBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "1",
  );

  useEffect(() => {
    // Jika app sudah dibuka sebagai aplikasi ter-install (standalone),
    // tidak perlu tawarkan instalasi lagi.
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone;

    if (isStandalone) return;

    const handler = (e: Event) => {
      // Cegah mini-infobar otomatis Chrome supaya kita kontrol tampilannya sendiri.
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    // Event beforeinstallprompt hanya bisa dipakai sekali, apa pun hasilnya.
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="max-w-md w-full mx-auto mb-3 sm:mb-4 bg-white border border-[#0052CC]/20 rounded-xl sm:rounded-2xl shadow-md px-3.5 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3 animate-fade-in">
      <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#0052CC]/10 flex items-center justify-center">
        <Download size={18} className="text-[#0052CC]" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
          Install SIMON di perangkat ini
        </p>
        <p className="text-[10px] sm:text-[11px] text-slate-500 leading-tight">
          Akses lebih cepat langsung dari layar utama
        </p>
      </div>

      <button
        type="button"
        onClick={handleInstall}
        className="shrink-0 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-[#0052CC] hover:bg-blue-700 text-white text-[10px] sm:text-xs font-bold rounded-lg transition-colors cursor-pointer"
      >
        Install
      </button>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Tutup"
        title="Tutup"
        className="shrink-0 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
      >
        <X size={16} />
      </button>
    </div>
  );
};
