/**
 * Splash awal SIMON (elemen #simon-splash di index.html) — satu-satunya layar loading
 * saat web dibuka. Ditahan minimal SPLASH_MIN_MS sejak halaman dibuka supaya identitas
 * SIMON BMKG sempat terlihat, lalu memudar setelah sesi login selesai diperiksa.
 */
export const SPLASH_MIN_MS = 3000;
// Pengaman: kalau karena suatu hal hideSplash() tidak pernah dipanggil, splash tetap hilang.
const SPLASH_FAILSAFE_MS = 12000;
const FADE_MS = 450;

declare global {
  interface Window {
    __simonSplashStart?: number;
  }
}

let scheduled = false;

export function hideSplash(): void {
  if (scheduled) return;
  scheduled = true;
  const el = document.getElementById('simon-splash');
  if (!el) return;
  const started = window.__simonSplashStart ?? Date.now();
  const wait = Math.max(0, SPLASH_MIN_MS - (Date.now() - started));
  window.setTimeout(() => {
    el.classList.add('simon-splash-hide');
    window.setTimeout(() => el.remove(), FADE_MS + 50);
  }, wait);
}

/** Dipanggil sekali saat aplikasi mulai, sebagai jaring pengaman. */
export function armSplashFailsafe(): void {
  window.setTimeout(hideSplash, SPLASH_FAILSAFE_MS);
}