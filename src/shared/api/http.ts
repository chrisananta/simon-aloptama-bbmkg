// Helper terpusat untuk fetch yang otomatis menyisipkan JWT token
// Dipakai menggantikan `fetch()` biasa di semua pemanggilan endpoint /api/*
// yang butuh login (hampir semuanya, kecuali /api/login).

const TOKEN_KEY = 'simon_jwt_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });

  // Kalau backend bilang token invalid/kedaluwarsa, paksa user login ulang
  if (response.status === 401) {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event('simon_session_expired'));
  }

  return response;
}
