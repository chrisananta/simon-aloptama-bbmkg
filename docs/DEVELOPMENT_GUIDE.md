# Panduan Pengembang & Konvensi Penamaan SIMON BBMKG V

## 1. Konvensi Penamaan Berkas (Standardized Naming Convention)

Untuk menjaga konsistensi codebase, setiap modul fitur wajib menggunakan akhiran nama berkas berikut secara seragam:

| Jenis Berkas | Suffix / Naming Pattern | Contoh | Tanggung Jawab |
| :--- | :--- | :--- | :--- |
| **Page Component** | `*Page.tsx` | `DashboardPage.tsx`, `SlaOlaPage.tsx` | Komponen halaman utama untuk fitur |
| **Modal / Dialog** | `*Modal.tsx` | `SlaOlaModal.tsx`, `CalibrationModal.tsx` | Dialog popup / form input |
| **Table Component** | `*Table.tsx` | `DashboardTable.tsx`, `AuditLogTable.tsx` | Komponen visualisasi tabel & filter |
| **Card Component** | `*Card.tsx` | `DashboardCard.tsx` | Komponen statistik / KPI card |
| **Service Adapter** | `*Service.ts` | `DashboardService.ts`, `SlaOlaService.ts` | Bridge panggilan ke `apiClient` |
| **Types Definition** | `*Types.ts` | `DashboardTypes.ts`, `SlaOlaTypes.ts` | Type definitions spesifik modul |

> **Catatan Backward Compatibility:** Komponen lama berakhiran `*View.tsx` dan `*InputModal.tsx` tetap di-reexport dari file-file standar baru ini sehingga tidak merusak import existing.

---

## 2. Standar Validasi Form (React Hook Form + Zod)

Semua form input wajib menggunakan **Zod Schema Validation** yang didefinisikan di `src/shared/schemas/index.ts`.

### Contoh Implementasi Zod + React Hook Form:

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

## 3. Menambahkan Fitur Baru

Saat menambahkan modul fitur baru di `src/features/nama-fitur/`:
1. Buat `NamaFiturTypes.ts` untuk tipe data khusus.
2. Buat `NamaFiturService.ts` untuk memanggil `apiClient`.
3. Buat `NamaFiturPage.tsx` sebagai tampilan utama.
4. Jika membutuhkan form, definisikan skema Zod di `src/shared/schemas/index.ts` dan buat `NamaFiturModal.tsx`.
5. Daftarkan menu baru di `src/layouts/Sidebar.tsx` dan `src/app/App.tsx`.
