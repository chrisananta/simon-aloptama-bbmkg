# Panduan Pengembang & Konvensi Penamaan SIMON BBMKG V

## 1. Setup & Menjalankan Aplikasi Secara Lokal

### Prasyarat
- Node.js (LTS)
- PostgreSQL (lokal atau remote)

### Langkah setup

```bash
npm install
```

Buat **dua file `.env`** dengan isi **sama persis** — satu di root project, satu di `simon-backend/`:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/simon_bmkg?schema=public"
JWT_SECRET="<random string, generate dengan perintah di bawah>"
PORT=3000
```

Generate `JWT_SECRET` yang aman:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ **`JWT_SECRET` wajib ada.** Server sengaja menolak nyala (`process.exit(1)`) kalau env var ini kosong — lihat `simon-backend/src/config/env.ts`. Ini fail-fast by design, bukan bug.

Buat database & jalankan migration:
```bash
npx prisma migrate deploy --schema=simon-backend/prisma/schema.prisma
```

Jalankan:
```bash
npm run dev        # development, http://localhost:3000, hot-reload via Vite
npm run build       # build production ke dist/
npm run start        # jalankan hasil build (production mode)
```

### Auto-seed akun pertama kali

Jika tabel `users` masih kosong, `server.ts` otomatis membuat 3 akun awal (`admin.inskal`, `upt.jayapura`, `pimpinan.balai`) dengan **password acak yang di-generate saat itu juga** dan dicetak **sekali** ke log terminal — segera dicatat, tidak bisa dilihat ulang setelahnya (password disimpan dalam bentuk hash bcrypt, bukan teks polos).

### Cek koneksi database via Prisma Studio
```bash
npx prisma studio --schema=simon-backend/prisma/schema.prisma
```

---

## 2. Konvensi Penamaan Berkas Frontend

Setiap modul fitur di `src/features/` wajib menggunakan akhiran nama berkas berikut secara seragam:

| Jenis Berkas | Suffix / Naming Pattern | Contoh | Tanggung Jawab |
| :--- | :--- | :--- | :--- |
| **Page Component** | `*Page.tsx` | `DashboardPage.tsx`, `SlaOlaPage.tsx` | Komponen halaman utama untuk fitur |
| **Modal / Dialog** | `*Modal.tsx` | `SlaOlaModal.tsx`, `CalibrationModal.tsx` | Dialog popup / form input |
| **Table Component** | `*Table.tsx` | `DashboardTable.tsx`, `AuditLogTable.tsx` | Komponen visualisasi tabel & filter |
| **Card Component** | `*Card.tsx` | `DashboardCard.tsx` | Komponen statistik / KPI card |
| **Service Adapter** | `*Service.ts` | `DashboardService.ts` | Bridge panggilan ke `apiClient` |
| **Types Definition** | `*Types.ts` | `DashboardTypes.ts`, `SlaOlaTypes.ts` | Type definitions spesifik modul |

> **Catatan Backward Compatibility:** Komponen lama berakhiran `*InputModal.tsx` (mis. `SlaOlaInputModal.tsx`) tetap di-reexport dari file standar baru (`export { SlaOlaModal as SlaOlaInputModal }`) supaya tidak merusak import existing.

### Konvensi khusus modul Auth (`src/features/auth/`)

| Berkas | Tanggung Jawab |
| :--- | :--- |
| `LoginPage.tsx` | Form login & tampilan pesan error |
| `AuthContext.tsx` | State global sesi, token, RBAC permissions, `login()`/`logout()` |
| `authService.ts` | Panggilan `fetch('/api/login')` (`credentials: 'include'`); token JWT hidup di cookie `httpOnly`, **bukan** `localStorage` — `localStorage` hanya menyimpan metadata sesi non-rahasia (nama user, role, waktu kedaluwarsa) untuk keperluan tampilan UI |
| `ProtectedRoute.tsx` | Guard halaman: cek `isAuthenticated` & `isMenuAllowed` sebelum render konten |

**Penting soal `isLoading` vs `isInitializing` di `AuthContext`:** `isInitializing` HANYA `true` sekali saat aplikasi pertama kali dibuka (pengecekan sesi awal). `isLoading` dipakai berulang setiap kali `login()` dipanggil (termasuk saat submit gagal). `ProtectedRoute` **harus** memakai `isInitializing` (bukan `isLoading`) untuk memutuskan tampilkan spinner vs `<LoginPage />` — kalau tertukar, `LoginPage` akan ter-*unmount* setiap kali user submit login, menyebabkan state lokalnya (termasuk pesan error) hilang sebelum sempat terlihat.

---

## 3. Konvensi Backend (`simon-backend/src/`)

| Folder | Isi | Contoh |
| :--- | :--- | :--- |
| `routes/` | Definisi endpoint per entitas (method + path + middleware apa yang dipasang) | `deviceRoutes.ts` |
| `controllers/` | Logic bisnis tiap entitas, dipanggil dari routes | `deviceController.ts` |
| `middleware/` | Middleware lintas-entitas | `authMiddleware.ts` (`verifyToken`, `requireAdmin`), `rateLimiter.ts` |
| `config/` | Validasi & konstanta environment | `env.ts` (validasi `JWT_SECRET`) |
| `db/` | Koneksi database | `prisma.ts` (Prisma Client singleton) |

### Menambahkan endpoint baru

1. Tambahkan fungsi controller di `controllers/namaEntitasController.ts`.
2. Daftarkan route di `routes/namaEntitasRoutes.ts`, pasang middleware sesuai kebutuhan akses:
   - Publik (tanpa login): jarang dipakai, hanya untuk `/login` dan `/health`
   - `verifyToken` saja: user manapun yang sudah login boleh akses
   - `verifyToken, requireAdmin`: hanya role `ADMIN`
3. Import & mount router baru di `routes/index.ts`.
4. Kalau endpoint menulis ke `audit_logs`, pastikan field `recordId` **selalu diisi** (wajib di schema Prisma, tidak boleh kosong/undefined).

---

## 4. Standar Validasi Form (React Hook Form + Zod)

Semua form input wajib menggunakan **Zod Schema Validation** yang didefinisikan di `src/shared/schemas/index.ts`.

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { slaOlaSchema, SlaOlaFormData } from '../../shared/schemas';

const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<SlaOlaFormData>({
  resolver: zodResolver(slaOlaSchema),
  defaultValues: {
    kondisiSla: true,
    kondisiOla: 100,
  },
});
```

---

## 5. Menambahkan Fitur Baru (Frontend)

Saat menambahkan modul fitur baru di `src/features/nama-fitur/`:
1. Buat `NamaFiturTypes.ts` untuk tipe data khusus.
2. Buat `NamaFiturService.ts` untuk memanggil `apiClient` (gunakan `authFetch` dari `src/shared/api/http.ts`, bukan `fetch()` polos, supaya cookie sesi `httpOnly` ikut terkirim lewat `credentials: 'include'`).
3. Buat `NamaFiturPage.tsx` sebagai tampilan utama.
4. Jika butuh form, definisikan skema Zod di `src/shared/schemas/index.ts` dan buat `NamaFiturModal.tsx`.
5. **Ambil data list (mis. stasiun/device) selalu lewat props dari komponen induk** (yang sudah sinkron via `apiClient` + `App.tsx`), jangan baca cache module secara langsung di dalam modal — pola ini pernah menyebabkan dropdown kosong karena race condition saat data belum sempat ter-fetch.
6. Daftarkan menu baru di `src/layouts/Sidebar.tsx` dan `src/app/App.tsx`, sertakan di `RBACPermissions.allowedMenus` (`AuthContext.tsx`) kalau perlu dibatasi role tertentu.

---

## 6. Checklist Sebelum Deploy

- [ ] `JWT_SECRET` production **beda** dari yang dipakai saat development/testing
- [ ] Auto-seed sudah pernah jalan sekali & password awal sudah dicatat aman (bukan di chat/dokumen yang mudah bocor)
- [ ] `.env` **tidak** ikut ter-commit ke Git (`.gitignore` sudah mencakup `.env*`)
- [ ] `npm run build && npm run start` dicoba dulu secara lokal sebelum deploy ke server
- [ ] Endpoint terproteksi dicoba tanpa token (`curl http://.../api/devices`) → harus `401`