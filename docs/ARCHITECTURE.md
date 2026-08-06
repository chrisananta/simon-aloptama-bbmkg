# Arsitektur Sistem SIMON BBMKG V

## 1. Konsep Arsitektur Utama

SIMON BBMKG V dirancang dengan pola **Modular Feature Architecture** yang menggabungkan:
1. **Centralized Data Layer (`apiClient`)**: Abstraksi tunggal untuk semua manipulasi data (Devices, Stations, Calibration Logs, Audit Logs).
2. **Robust Persistence & Synchronization**: Menyimpan data lokal secara otomatis di `localStorage` sekaligus menyediakan sinkronisasi real-time dengan server backend (`/api/sync`).
3. **Audit Log System**: Setiap aksi ubah/tambah/hapus dicatat secara otomatis ke dalam `Log_Perubahan` dengan detail aktor, timestamp, tabel, dan uraian aksi.
4. **Resilient UI Error Boundary**: Proteksi aplikasi dari crash tak terduga dengan fallback UI interaktif dan opsi pemicu ulang.

---

## 2. Alur Data & Centralized API Client

```
[ UI Component / Form ]
         │
         ▼ (React Hook Form + Zod)
[ Feature Service (e.g. SlaOlaService) ]
         │
         ▼
[ Centralized API Client (src/shared/api/index.ts) ]
    ├── Persistence Engine (LocalStorage)
    ├── Auto Audit Log Dispatcher
    └── Server Sync Proxy (/api/sync)
```

---

## 3. Fitur Utama SIMON BBMKG V

1. **Dashboard Monitoring**: Visualisasi status ALOPTAMA (Normal, Gangguan, Mati Total), skor SLA/OLA, serta Peta Sebaran Stasiun UPT di Wilayah V.
2. **Kalkulator & Pengisian SLA/OLA**: Perhitungan otomatis skor OLA berdasarkan bobot komponen (Logger, Kelistrikan, Komunikasi, Sensor Aktif).
3. **Repository Kalibrasi INSKAL**: Pencatatan riwayat kalibrasi bulanan/tahunan, masa berlaku sertifikat, dan penanggung jawab tim.
4. **Master Database Admin**: Fitur CRUD stasiun UPT BMKG dan peralatan master dengan proteksi konfirmasi dan log audit otomatis.
5. **Audit Log Aktivitas**: Pelacakan setiap riwayat perubahan data untuk integritas dan transparansi sistem.
