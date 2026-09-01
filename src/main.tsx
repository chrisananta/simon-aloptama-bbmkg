import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Daftarkan service worker supaya SIMON terdeteksi sebagai PWA yang
// bisa di-"Install" penuh (bukan cuma shortcut/bookmark browser).
// Ini syarat wajib Chrome/Android untuk hilangkan badge browser di ikon.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Gagal mendaftarkan service worker:', err);
    });
  });
}
