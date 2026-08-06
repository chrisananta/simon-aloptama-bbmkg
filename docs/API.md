# Spesifikasi REST API SIMON BBMKG V

Backend SIMON BBMKG V berjalan pada Express (`server.ts`) dan menyediakan endpoint JSON berikut untuk sinkronisasi data dengan sistem terpusat BMKG.

---

## 1. GET `/api/health`
Mengecek status kesehatan server backend.

* **Response 200 OK**:
```json
{
  "status": "ok",
  "serverTime": "2026-07-31T00:30:00.000Z",
  "app": "SIMON BBMKG V API"
}
```

---

## 2. GET `/api/sync`
Mengambil data terbaru peralatan ALOPTAMA dan status stasiun.

* **Response 200 OK**:
```json
{
  "success": true,
  "source": "BMKG Server Wilayah V",
  "lastSync": "31 Juli 2026 07:30 WITA",
  "devices": [ ... ],
  "stations": [ ... ]
}
```

---

## 3. POST `/api/sla-ola`
Memperbarui kondisi operasional SLA/OLA peralatan UPT.

* **Payload Request**:
```json
{
  "uptStation": "Stasiun Meteorologi Sentani",
  "category": "AWOS",
  "deviceId": "AWOS-STN-01",
  "kondisiSla": true,
  "kondisiOla": 98.5,
  "kendala": "Pembersihan rutin sensor kelembapan"
}
```

* **Response 200 OK**:
```json
{
  "success": true,
  "message": "Data SLA & OLA berhasil disinkronkan ke server pusat",
  "lastSync": "31 Juli 2026 07:32 WITA",
  "devices": [ ... ]
}
```

---

## 4. POST `/api/calibration`
Menambahkan data histori kalibrasi INSKAL ke server.

* **Payload Request**:
```json
{
  "deviceId": "AWS-JAP-01",
  "lastCalibrated": "2026-07-15",
  "calibrationValidUntil": "2027-07-14",
  "calibrationStatus": "VALID",
  "calibrationAgency": "Tim INSKAL BBMKG Wilayah V"
}
```
