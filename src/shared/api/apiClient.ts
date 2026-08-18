import { authFetch } from './http';
import {
  AloptamaDevice,
  UPTStation,
  ChangeLog,
  CalibrationRecord,
  LogAction,
  LogTable,
} from "../types";
import { AuthUser } from "../../features/auth/authTypes";
import {
  fetchServerData,
  saveSlaOlaToServer,
  saveCalibrationToServer,
  ServerFetchResult,
} from "./serverDataService";

// Initial users list dikosongkan (sepenuhnya mengandalkan DB PostgreSQL)
export const INITIAL_USERS: AuthUser[] = [];

// In-Memory Live Cache connected directly to PostgreSQL Backend
const memoryCache = {
  devices: [] as AloptamaDevice[],
  stations: [] as UPTStation[],
  users: [] as AuthUser[],
  calibration: [] as CalibrationRecord[],
  auditLogs: [] as ChangeLog[],
};

// Internal helper to get formatted timestamp
export const getFormattedTimestamp = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Centralized API Service for SIMON Aloptama
 * Direct PostgreSQL Backend API Client (No LocalStorage reliance)
 */
export const apiClient = {

  // ----------------------------------------------------
  // AUDIT LOG API
  // ----------------------------------------------------
  auditLogs: {
    getAll: (): ChangeLog[] => {
      return memoryCache.auditLogs;
    },

    saveAll: (logs: ChangeLog[]): void => {
      memoryCache.auditLogs = logs;
    },

    fetch: async (): Promise<ChangeLog[]> => {
      try {
        const res = await authFetch("/api/audit-logs");
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.data)) {
            memoryCache.auditLogs = json.data;
            return json.data;
          }
        }
      } catch (e) {
        console.warn("apiClient.auditLogs.fetch failed:", e);
      }
      return memoryCache.auditLogs;
    },

    add: (entry: {
      table: LogTable;
      action: LogAction;
      recordId: string;
      recordName: string;
      actor?: string;
      details: string;
      status?: "SUCCESS" | "WARNING" | "FAILED";
      ipOrSource?: string;
    }): ChangeLog => {
      const newLog: ChangeLog = {
        id: `LOG-${Date.now().toString().slice(-8)}`,
        timestamp: getFormattedTimestamp(),
        table: entry.table,
        action: entry.action,
        recordId: entry.recordId,
        recordName: entry.recordName,
        actor: entry.actor || "Operator SIMON",
        details: entry.details,
        status: entry.status || "SUCCESS",
        ipOrSource: entry.ipOrSource || "Centralized API Client",
      };

      memoryCache.auditLogs = [newLog, ...memoryCache.auditLogs];

      // Direct write to PostgreSQL audit log endpoint
      authFetch("/api/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      }).catch((e) => console.warn("PostgreSQL audit log API sync:", e));

      return newLog;
    },

    clear: (actor = "Admin INSKAL"): boolean => {
      memoryCache.auditLogs = [];
      apiClient.auditLogs.add({
        table: "sistem",
        action: "RESET_DATA",
        recordId: "AUDIT_LOG_CLEAR",
        recordName: "Repository Log Aktivitas",
        actor,
        details: "Semua riwayat log aktivitas audit sistem dibersihkan oleh administrator.",
      });

      // Direct delete on PostgreSQL audit log endpoint
      authFetch("/api/audit-logs/clear", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor }),
      }).catch((e) => console.warn("PostgreSQL audit log clear API sync:", e));

      return true;
    },

    exportCsv: (): void => {
      const logs = apiClient.auditLogs.getAll();
      const headers = [
        "ID Log",
        "Timestamp",
        "Tabel/Modul",
        "Aksi",
        "ID Record",
        "Nama Record",
        "Aktor / Operator",
        "Detail Aktivitas",
        "Status",
      ];
      const rows = logs.map((l) => [
        l.id,
        l.timestamp,
        l.table,
        l.action,
        `"${l.recordId}"`,
        `"${l.recordName.replace(/"/g, '""')}"`,
        `"${l.actor.replace(/"/g, '""')}"`,
        `"${l.details.replace(/"/g, '""')}"`,
        l.status || "SUCCESS",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((r) => r.join(",")),
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `SIMON_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    exportJson: (): void => {
      const logs = apiClient.auditLogs.getAll();
      const jsonContent = JSON.stringify(logs, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `SIMON_Audit_Logs_${new Date().toISOString().slice(0, 10)}.json`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
  },

  // ----------------------------------------------------
  // DEVICES API
  // ----------------------------------------------------
  devices: {
    getAll: (): AloptamaDevice[] => {
      return memoryCache.devices;
    },

    saveAll: (devices: AloptamaDevice[]): void => {
      memoryCache.devices = devices;
    },

    fetch: async (): Promise<AloptamaDevice[]> => {
      try {
        const res = await authFetch("/api/devices");
        if (res.ok) {
          const json = await res.json();
          const list = json.devices || json.data || [];
          if (Array.isArray(list)) {
            memoryCache.devices = list;
            return list;
          }
        }
      } catch (e) {
        console.warn("apiClient.devices.fetch failed:", e);
      }
      return memoryCache.devices;
    },

    saveSlaOla: async (data: {
      uptStation: string;
      category: string;
      deviceId: string;
      kondisiSla: boolean;
      kondisiOla: number;
      kendala: string;
      actor?: string;
    }): Promise<{ devices: AloptamaDevice[]; lastSync: string }> => {
      const response = await authFetch("/api/sla-ola", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
      });

      // Mutasi data harus selalu dikonfirmasi server. Jangan memperlakukan
      // 401/403/5xx sebagai "offline", karena itu dapat membuat UI seolah
      // perubahan berhasil padahal server menolaknya.
      if (!response.ok) {
        let message = "Gagal menyimpan SLA/OLA ke server.";
        try {
          const errorData = await response.json();
          if (errorData?.message) message = errorData.message;
        } catch {
          // Respons error bukan JSON; gunakan pesan umum.
        }
        throw new Error(message);
      }

      const resData = await response.json();
      if (!resData?.devices || !Array.isArray(resData.devices)) {
        throw new Error(resData?.message || "Server tidak mengembalikan data perangkat yang valid.");
      }
      memoryCache.devices = resData.devices;
      return {
        devices: resData.devices,
        lastSync: resData.lastSync || new Date().toLocaleString("id-ID"),
      };
    },

    // Ambil nilai SLA/OLA per alat untuk 1 bulan & tahun tertentu (dipakai
    // AdminMasterView, dibaca dari database, bukan memori browser).
    getMonthlySlaOla: async (bulan: number, tahun: number): Promise<Record<string, { sla: number; ola: number }>> => {
      try {
        const res = await authFetch(`/api/sla-ola/monthly?bulan=${bulan}&tahun=${tahun}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.success) return json.data || {};
        }
      } catch (e) {
        console.warn("apiClient.devices.getMonthlySlaOla failed:", e);
      }
      return {};
    },

    // Simpan nilai SLA/OLA 1 alat untuk 1 bulan & tahun tertentu.
    saveMonthlySlaOla: async (data: {
      deviceId: string;
      uptStation: string;
      category: string;
      kondisiSla: boolean;
      ola: number;
      bulan: number;
      tahun: number;
      actor?: string;
    }): Promise<{ devices: AloptamaDevice[] }> => {
      const res = await authFetch("/api/sla-ola/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        let message = "Gagal menyimpan SLA/OLA bulanan ke server.";
        try {
          const errData = await res.json();
          if (errData?.message) message = errData.message;
        } catch { /* ignore */ }
        throw new Error(message);
      }
      const json = await res.json();
      if (json?.devices) memoryCache.devices = json.devices;
      return { devices: json.devices || memoryCache.devices };
    },

    add: async (device: AloptamaDevice, actor = "Admin INSKAL"): Promise<AloptamaDevice> => {
      // PENTING: tunggu konfirmasi server DULU sebelum update tampilan.
      const response = await authFetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...device, actor }),
      });

      if (!response.ok) {
        let message = "Gagal menyimpan alat ke server.";
        if (response.status === 401) {
          message = "Sesi login sudah tidak valid di perangkat/alamat ini. Silakan logout lalu login kembali, baru coba tambah alat lagi.";
        } else {
          try {
            const errData = await response.json();
            if (errData?.message) message = errData.message;
          } catch {
            // respons bukan JSON, biarkan pesan default
          }
        }
        throw new Error(message);
      }

      // Server konfirmasi berhasil - baru update cache lokal & audit log
      memoryCache.devices = [...memoryCache.devices, device];

      apiClient.auditLogs.add({
        table: "master_alat",
        action: "TAMBAH",
        recordId: device.id,
        recordName: `${device.name} (${device.category})`,
        actor,
        details: `Penambahan unit aloptama baru di Stasiun ${device.uptStation} (${device.locationName}).`,
      });

      await apiClient.devices.fetch();

      return device;
    },

    update: async (
      device: AloptamaDevice,
      details: string,
      actor = "Admin INSKAL"
    ): Promise<AloptamaDevice> => {
      const response = await authFetch(`/api/devices/${device.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...device, details, actor }),
      });

      if (!response.ok) {
        let message = "Gagal memperbarui alat di server.";
        if (response.status === 401) {
          message = "Sesi login sudah tidak valid di perangkat/alamat ini. Silakan logout lalu login kembali, baru coba lagi.";
        } else {
          try {
            const errData = await response.json();
            if (errData?.message) message = errData.message;
          } catch {
            // ignore
          }
        }
        throw new Error(message);
      }

      memoryCache.devices = memoryCache.devices.map((d) => (d.id === device.id ? device : d));

      apiClient.auditLogs.add({
        table: "master_alat",
        action: "EDIT",
        recordId: device.id,
        recordName: `${device.name} (${device.category})`,
        actor,
        details,
      });

      await apiClient.devices.fetch();

      return device;
    },

    delete: async (
      deviceId: string,
      deviceName: string,
      actor = "Admin INSKAL"
    ): Promise<boolean> => {
      const response = await authFetch(`/api/devices/${deviceId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor }),
      });

      if (!response.ok) {
        let message = "Gagal menghapus alat di server.";
        if (response.status === 401) {
          message = "Sesi login sudah tidak valid di perangkat/alamat ini. Silakan logout lalu login kembali, baru coba lagi.";
        } else if (response.status === 403) {
          message = "Aksi ini hanya diizinkan untuk Admin INSKAL.";
        } else {
          try {
            const errData = await response.json();
            if (errData?.message) message = errData.message;
          } catch {
            // ignore
          }
        }
        throw new Error(message);
      }

      memoryCache.devices = memoryCache.devices.filter((d) => d.id !== deviceId);

      apiClient.auditLogs.add({
        table: "master_alat",
        action: "HAPUS",
        recordId: deviceId,
        recordName: deviceName,
        actor,
        details: "Penghapusan data master aloptama dari database.",
      });

      await apiClient.devices.fetch();

      return true;
    },
  },

  // ----------------------------------------------------
  // CALIBRATION API
  // ----------------------------------------------------
  calibration: {
    getAll: (): CalibrationRecord[] => {
      return memoryCache.calibration;
    },

    saveAll: (records: CalibrationRecord[]): void => {
      memoryCache.calibration = records;
    },

    fetch: async (): Promise<CalibrationRecord[]> => {
      try {
        const res = await authFetch("/api/calibration");
        if (res.ok) {
          const json = await res.json();
          const list = json.data || json.records || [];
          if (Array.isArray(list)) {
            memoryCache.calibration = list;
            return list;
          }
        }
      } catch (e) {
        console.warn("apiClient.calibration.fetch failed:", e);
      }
      return memoryCache.calibration;
    },

    add: async (
      record: Omit<CalibrationRecord, "id" | "createdAt">,
      actor = "Tim INSKAL"
    ): Promise<{
      record: CalibrationRecord;
      updatedDevices: AloptamaDevice[];
    }> => {
      const newRecord: CalibrationRecord = {
        ...record,
        id: `cal-inskal-${Date.now()}`,
        createdAt: new Date().toISOString().split("T")[0],
      };

      memoryCache.calibration = [newRecord, ...memoryCache.calibration];

      // Update in-memory devices calibration status
      memoryCache.devices = memoryCache.devices.map((dev) => {
        if (dev.id === record.deviceId) {
          return {
            ...dev,
            lastCalibrated: record.lastCalibrated,
            calibrationValidUntil: record.calibrationValidUntil,
            calibrationStatus: record.calibrationStatus,
            calibrationAgency: record.calibrationAgency,
          };
        }
        return dev;
      });

      apiClient.auditLogs.add({
        table: "kalibrasi",
        action: "SIMPAN_KALIBRASI",
        recordId: record.deviceId,
        recordName: record.deviceName,
        actor: record.calibrationAgency || actor,
        details: `Kalibrasi INSKAL: Status=${record.calibrationStatus}, Berlaku ${record.lastCalibrated} s/d ${record.calibrationValidUntil}. Catatan: "${record.notes || "-"}"`,
      });

      // Call backend server save endpoint
      try {
        const response = await authFetch("/api/calibration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: record.deviceId,
            deviceName: record.deviceName,
            uptStation: record.uptStation,
            category: record.category,
            lastCalibrated: record.lastCalibrated,
            calibrationValidUntil: record.calibrationValidUntil,
            calibrationAgency: record.calibrationAgency,
            calibrationStatus: record.calibrationStatus,
            certificateNumber: record.certificateNumber,
            notes: record.notes,
            actor,
          }),
        });
        if (response.ok) {
          const resData = await response.json();
          if (resData?.devices && Array.isArray(resData.devices)) {
            memoryCache.devices = resData.devices;
            return { record: resData.data || newRecord, updatedDevices: resData.devices };
          }
        }
      } catch (e) {
        console.warn("Backend API saveCalibration error:", e);
      }

      return { record: newRecord, updatedDevices: memoryCache.devices };
    },
  },

  // ----------------------------------------------------
  // STATIONS API
  // ----------------------------------------------------
  stations: {
    getAll: (): UPTStation[] => {
      return memoryCache.stations;
    },

    saveAll: (stations: UPTStation[]): void => {
      memoryCache.stations = stations;
    },

    fetch: async (): Promise<UPTStation[]> => {
      try {
        const res = await authFetch("/api/stations");
        if (res.ok) {
          const json = await res.json();
          const list = json.stations || json.data || [];
          if (Array.isArray(list)) {
            memoryCache.stations = list;
            return list;
          }
        }
      } catch (e) {
        console.warn("apiClient.stations.fetch failed:", e);
      }
      return memoryCache.stations;
    },

    add: async (station: UPTStation, actor = "Admin INSKAL"): Promise<UPTStation> => {
      // 1. Kirim request ke backend PostgreSQL & tunggu konfirmasi
      const response = await authFetch("/api/stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...station, actor }),
      });

      if (!response.ok) {
        let message = "Gagal menyimpan stasiun ke server.";
        if (response.status === 401) {
          message = "Sesi login sudah tidak valid. Silakan logout lalu login kembali.";
        } else {
          try {
            const errData = await response.json();
            if (errData?.message) message = errData.message;
          } catch {
            // respons bukan JSON
          }
        }
        throw new Error(message);
      }

      // 2. Server sukses -> perbarui cache lokal & catat audit log
      memoryCache.stations = [...memoryCache.stations, station];

      apiClient.auditLogs.add({
        table: "master_stasiun",
        action: "TAMBAH",
        recordId: station.code,
        recordName: station.name,
        actor,
        details: `Penambahan master stasiun UPT baru di wilayah ${station.regionGroup} (${station.location}).`,
      });

      await apiClient.stations.fetch();

      return station;
    },

    update: async (
      station: UPTStation,
      details: string,
      actor = "Admin INSKAL"
    ): Promise<UPTStation> => {
      // 1. Kirim request update ke backend PostgreSQL & tunggu konfirmasi
      const response = await authFetch(`/api/stations/${station.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...station, details, actor }),
      });

      if (!response.ok) {
        let message = "Gagal memperbarui stasiun di server.";
        if (response.status === 401) {
          message = "Sesi login sudah tidak valid. Silakan logout lalu login kembali.";
        } else {
          try {
            const errData = await response.json();
            if (errData?.message) message = errData.message;
          } catch {
            // respons bukan JSON
          }
        }
        throw new Error(message);
      }

      // 2. Server sukses -> perbarui cache lokal & catat audit log
      memoryCache.stations = memoryCache.stations.map((s) => (s.id === station.id ? station : s));

      apiClient.auditLogs.add({
        table: "master_stasiun",
        action: "EDIT",
        recordId: station.code,
        recordName: station.name,
        actor,
        details,
      });

      await apiClient.stations.fetch();

      return station;
    },

    delete: async (
      stationId: string,
      stationName: string,
      actor = "Admin INSKAL"
    ): Promise<boolean> => {
      // 1. Kirim request hapus ke backend PostgreSQL & tunggu konfirmasi
      const response = await authFetch(`/api/stations/${stationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor }),
      });

      if (!response.ok) {
        let message = "Gagal menghapus stasiun di server.";
        if (response.status === 401) {
          message = "Sesi login sudah tidak valid. Silakan logout lalu login kembali.";
        } else if (response.status === 403) {
          message = "Aksi ini hanya diizinkan untuk Admin INSKAL.";
        } else {
          try {
            const errData = await response.json();
            if (errData?.message) message = errData.message;
          } catch {
            // respons bukan JSON
          }
        }
        throw new Error(message);
      }

      // 2. Server sukses -> hapus dari cache lokal & catat audit log
      memoryCache.stations = memoryCache.stations.filter((s) => s.id !== stationId);

      apiClient.auditLogs.add({
        table: "master_stasiun",
        action: "HAPUS",
        recordId: stationId,
        recordName: stationName,
        actor,
        details: "Penghapusan data master stasiun UPT dari database.",
      });

      await apiClient.stations.fetch();

      return true;
    },
  },

  // ----------------------------------------------------
  // SERVER API
  // ----------------------------------------------------
  server: {
    sync: async (actor = "Sistem Auto-Sync"): Promise<ServerFetchResult> => {
      const result = await fetchServerData();
      if (result.devices && Array.isArray(result.devices)) {
        memoryCache.devices = result.devices;
      }
      if (result.stations && Array.isArray(result.stations)) {
        memoryCache.stations = result.stations;
      }
      if (result.users && Array.isArray(result.users)) {
        memoryCache.users = result.users;
      }
      if (result.calibrationLogs && Array.isArray(result.calibrationLogs)) {
        memoryCache.calibration = result.calibrationLogs;
      }
      if (result.auditLogs && Array.isArray(result.auditLogs)) {
        memoryCache.auditLogs = result.auditLogs;
      }

      apiClient.auditLogs.add({
        table: "sistem",
        action: "SYNC_SERVER",
        recordId: "SERVER_API_SYNC",
        recordName: "BBMKG Wilayah V Server",
        actor,
        details: `Sinkronisasi server API berhasil. Sumber: ${result.source}, Total Aloptama: ${result.devices.length}.`,
      });

      return result;
    },
  },

  // ----------------------------------------------------
  // USERS / AKUN API
  // ----------------------------------------------------
  users: {
    getAll: (): AuthUser[] => {
      return memoryCache.users;
    },

    saveAll: (users: AuthUser[]): void => {
      memoryCache.users = users;
    },

    fetch: async (): Promise<AuthUser[]> => {
      try {
        const res = await authFetch("/api/users");
        if (res.ok) {
          const json = await res.json();
          const list = json.data || json.users || [];
          if (Array.isArray(list)) {
            memoryCache.users = list;
            return list;
          }
        }
      } catch (e) {
        console.warn("apiClient.users.fetch failed:", e);
      }
      return memoryCache.users;
    },

    add: async (user: AuthUser, actor = "Admin INSKAL"): Promise<AuthUser> => {
      let createdUser = user;
      try {
        const res = await authFetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: user.username,
            // Jangan isi default lemah di sini - kalau kosong, biarkan
            // backend yang generate password acak & aman.
            password: user.password || undefined,
            name: user.name,
            role: user.role,
            title: user.title,
            nip: user.nip,
            email: user.email,
            uptStation: user.uptStation,
            avatarUrl: user.avatarUrl,
            actor,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json && json.data) {
            createdUser = {
              id: json.data.id,
              username: json.data.username,
              name: json.data.name,
              role: json.data.role,
              title: json.data.title || user.title,
              nip: json.data.nip || user.nip,
              email: json.data.email || user.email,
              uptStation: json.data.uptStation || user.uptStation,
              avatarUrl: json.data.avatarUrl || user.avatarUrl,
              // Kalau admin tidak isi password, backend generate satu secara
              // acak dan kirim balik di sini (cuma sekali) - tampilkan ke admin.
              password: user.password || json.generatedPassword,
            };
          }
        }
      } catch (e) {
        console.warn("Backend createUser API error:", e);
      }

      // Update memoryCache after response from backend
      memoryCache.users = [...memoryCache.users.filter((u) => u.id !== createdUser.id), createdUser];

      apiClient.auditLogs.add({
        table: "master_akun",
        action: "TAMBAH",
        recordId: createdUser.id,
        recordName: `${createdUser.name} (@${createdUser.username})`,
        actor,
        details: `Penambahan akun pengguna baru (${createdUser.role}): "${createdUser.name}" dengan username "${createdUser.username}".`,
      });

      return createdUser;
    },

    update: async (
      user: AuthUser,
      details: string,
      actor = "Admin INSKAL"
    ): Promise<AuthUser> => {
      let updatedUser = user;
      try {
        const res = await authFetch(`/api/users/${user.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: user.username,
            password: user.password,
            name: user.name,
            role: user.role,
            title: user.title,
            nip: user.nip,
            email: user.email,
            uptStation: user.uptStation,
            avatarUrl: user.avatarUrl,
            actor,
            details,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json && json.data) {
            updatedUser = {
              id: json.data.id,
              username: json.data.username,
              name: json.data.name,
              role: json.data.role,
              title: json.data.title || user.title,
              nip: json.data.nip || user.nip,
              email: json.data.email || user.email,
              uptStation: json.data.uptStation || user.uptStation,
              avatarUrl: json.data.avatarUrl || user.avatarUrl,
              password: user.password || json.data.passwordHash,
            };
          }
        }
      } catch (e) {
        console.warn("Backend updateUser API error:", e);
      }

      // Update memoryCache after response from backend
      memoryCache.users = memoryCache.users.map((u) => (u.id === updatedUser.id ? updatedUser : u));

      apiClient.auditLogs.add({
        table: "master_akun",
        action: "EDIT",
        recordId: updatedUser.id,
        recordName: `${updatedUser.name} (@${updatedUser.username})`,
        actor,
        details,
      });

      return updatedUser;
    },

    delete: async (
      userId: string,
      userName: string,
      actor = "Admin INSKAL"
    ): Promise<boolean> => {
      try {
        await authFetch(`/api/users/${userId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actor }),
        });
      } catch (e) {
        console.warn("Backend deleteUser API error:", e);
      }

      // Update memoryCache after response from backend
      memoryCache.users = memoryCache.users.filter((u) => u.id !== userId);

      apiClient.auditLogs.add({
        table: "master_akun",
        action: "HAPUS",
        recordId: userId,
        recordName: userName,
        actor,
        details: "Penghapusan akun pengguna dari database master.",
      });

      return true;
    },
  },
};
