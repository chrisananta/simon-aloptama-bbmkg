import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { execSync } from 'child_process';
import pkg from './package.json';

// Ambil hash commit git terakhir (7 karakter) supaya versi build bisa
// dibedakan antar deploy walau nomor versi di package.json belum berubah.
// Kalau bukan repo git (mis. saat build di Docker tanpa folder .git), fallback ke "local".
function getGitCommitHash(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'local';
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Konstanta global yang di-inject saat build/dev, dipakai di footer Sidebar
  // supaya nomor versi & tanggal build tidak perlu diedit manual tiap rilis.
  // PENTING: setiap kali blok "define" ini diubah, dev server (npm run dev)
  // harus di-restart manual — perubahan di vite.config.ts tidak ikut ter-HMR.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __GIT_COMMIT__: JSON.stringify(getGitCommitHash()),
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },

    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
});