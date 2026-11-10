// Helper terpusat untuk fetch ke endpoint /api/*.
// Otentikasi sekarang dikirim lewat cookie httpOnly "simon_jwt" (di-set oleh
// backend saat login - lihat simon-backend/src/controllers/userController.ts),
// BUKAN lagi lewat header "Authorization: Bearer <token>" yang disimpan di
// localStorage. Browser otomatis menyertakan cookie di setiap request asal
// opsi `credentials: 'include'` disertakan - JavaScript di halaman ini
// (termasuk skrip jahat lewat XSS) sama sekali tidak bisa membaca ATAU
// menyalin token itu sendiri, karena cookie httpOnly tidak pernah terekspos
// ke `document.cookie` maupun API JS apa pun.

// Nama kunci localStorage untuk info sesi NON-rahasia (nama user, expiry,
// dsb) yang dipakai UI (mis. hitung mundur sesi). Ini BUKAN token JWT -
// hanya metadata biasa yang aman dibaca ulang oleh frontend.
export const SESSION_INFO_KEY = 'simon_session_info';

// Dikirim saat fetch gagal TOTAL (jaringan putus / server tak terjangkau) atau server membalas 5xx
// (mis. 500 karena database putus). Didengarkan useConnectionStatus untuk langsung memeriksa
// koneksi & menampilkan banner tanpa menunggu siklus cek berkala.
export const NETWORK_ERROR_EVENT = 'simon_network_error';

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, { ...init, credentials: 'include' });
  } catch (err) {
    if (err instanceof TypeError) window.dispatchEvent(new Event(NETWORK_ERROR_EVENT));
    throw err;
  }

  if (response.status >= 500) window.dispatchEvent(new Event(NETWORK_ERROR_EVENT));

  // Kalau backend bilang token invalid/kedaluwarsa, paksa user login ulang
  if (response.status === 401) {
    try {
      localStorage.removeItem(SESSION_INFO_KEY);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event('simon_session_expired'));
  }

  return response;
}