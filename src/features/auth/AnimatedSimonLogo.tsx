import React, { useEffect, useState } from "react";
import simonLogo from "../../assets/images/simonlogo.png";

interface AnimatedSimonLogoProps {
  /** true saat proses login berjalan: logo berdenyut & kilau dipercepat. */
  loading?: boolean;
  /** Ukuran logo, mis. "h-9 w-9 sm:h-14 sm:w-14". */
  className?: string;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Logo "S" SIMON beranimasi untuk halaman login.
 *
 * 1. Intro: separuh atas (biru) meluncur masuk dari kiri-atas dan separuh
 *    bawah (hijau) dari kanan-bawah, lalu menyatu jadi huruf S.
 * 2. Setelah menyatu: logo melayang pelan + kilau cahaya menyapu bentuk S
 *    tiap beberapa detik.
 * 3. Saat `loading`: logo berdenyut dan kilau lebih cepat.
 *
 * Semua animasi CSS ada di src/index.css (kelas .simon-logo*). Untuk pengguna
 * dengan "reduce motion", logo langsung tampil diam tanpa animasi.
 */
export const AnimatedSimonLogo: React.FC<AnimatedSimonLogoProps> = ({
  loading = false,
  className = "h-14 w-14",
}) => {
  const [assembled, setAssembled] = useState<boolean>(prefersReducedMotion);

  // Intro selesai (0.9s + delay 0.15s) -> ganti dua separuh dengan satu gambar utuh
  // supaya tidak ada garis sambungan.
  useEffect(() => {
    if (assembled) return;
    const timer = setTimeout(() => setAssembled(true), 1150);
    return () => clearTimeout(timer);
  }, [assembled]);

  const maskStyle: React.CSSProperties = {
    WebkitMaskImage: `url(${simonLogo})`,
    maskImage: `url(${simonLogo})`,
  };

  return (
    <div
      className={`simon-logo ${loading ? "simon-logo--loading" : ""} ${className}`}
      role="img"
      aria-label="Logo SIMON"
    >
      <div className={`simon-logo__stage ${assembled ? "simon-logo__stage--ready" : ""}`}>
        {assembled ? (
          <img src={simonLogo} alt="" draggable={false} className="simon-logo__img" />
        ) : (
          <>
            <img
              src={simonLogo}
              alt=""
              draggable={false}
              className="simon-logo__img simon-logo__top"
            />
            <img
              src={simonLogo}
              alt=""
              draggable={false}
              className="simon-logo__img simon-logo__bottom"
            />
          </>
        )}
        {assembled && <div className="simon-logo__shine" style={maskStyle} />}
      </div>
    </div>
  );
};