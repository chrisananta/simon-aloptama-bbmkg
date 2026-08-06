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

// Export initial fallback types for backwards compatibility
export const INITIAL_USERS: AuthUser[] = [
  {
    id: "USR-ADMIN-001",
    username: "admin.inskal",
    name: "Ir. Fajar Nur, M.T.",
    role: "ADMIN",
    title: "Admin INSKAL & Kalibrasi BBMKG V",
    nip: "19850412 201012 1 001",
    email: "fajar.nur@bmkg.go.id",
    uptStation: "BBMKG Wilayah V Papua",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
  },
  {
    id: "USR-UPT-001",
    username: "upt.jayapura",
    name: "Agus Prasetyo, S.Tr.",
    role: "UPT_PIMPINAN",
    title: "Operator UPT Stamet Dok II Jayapura",
    nip: "19920815 201503 1 002",
    email: "stamet.jayapura@bmkg.go.id",
    uptStation: "Stasiun Meteorologi Dok II Jayapura",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
  },
  {
    id: "USR-PIMP-001",
    username: "pimpinan.balai",
    name: "Dr. Yosafat, M.Si.",
    role: "UPT_PIMPINAN",
    title: "Kepala BBMKG Wilayah V Papua",
    nip: "19760310 199903 1 001",
    email: "pimpinan.balai5@bmkg.go.id",
    uptStation: "BBMKG Wilayah V Papua",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80",
  },
];

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
      try {
        const response = await authFetch("/api/sla-ola", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (response.ok) {
          const resData = await response.json();
          if (resData?.devices && Array.isArray(resData.devices)) {
            memoryCache.devices = resData.devices;
            return {
              devices: resData.devices,
              lastSync: resData.lastSync || new Date().toLocaleString("id-ID"),
            };
          }
        }
      } catch (e) {
        console.warn("Backend API saveSlaOla error:", e);
      }

      // Fallback update in memory if network issue
      const updatedDevices = memoryCache.devices.map((dev) => {
        const isMatch = data.deviceId
          ? dev.id === data.deviceId
          : dev.uptStation === data.uptStation && dev.category === data.category;
        if (isMatch) {
          let newStatus: "NORMAL" | "GANGGUAN" | "MATI" = "NORMAL";
          if (!data.kondisiSla || data.kondisiOla === 0) {
            newStatus = "MATI";
          } else if (data.kondisiOla >= 100) {
            newStatus = "NORMAL";
          } else {
            newStatus = "GANGGUAN";
          }

          return {
            ...dev,
            conditionStatus: newStatus,
            olaScore: data.kondisiOla,
            slaScore: data.kondisiSla ? 100 : 0,
            issueDescription: data.kendala || (newStatus === "NORMAL" ? undefined : "Kendala operasional dilaporkan UPT"),
            downtimeDuration: newStatus === "NORMAL" ? undefined : newStatus === "MATI" ? "Mati Total (0%)" : "Dalam Penanganan Teknisi UPT",
            lastReportedDate: new Date().toISOString().split("T")[0],
          };
        }
        return dev;
      });

      memoryCache.devices = updatedDevices;
      return {
        devices: updatedDevices,
        lastSync: new Date().toLocaleString("id-ID"),
      };
    },

    add: (device: AloptamaDevice, actor = "Admin INSKAL"): AloptamaDevice => {
      memoryCache.devices = [...memoryCache.devices, device];

      apiClient.auditLogs.add({
        table: "master_alat",
        action: "TAMBAH",
        recordId: device.id,
        recordName: `${device.name} (${device.category})`,
        actor,
        details: `Penambahan unit aloptama baru di Stasiun ${device.uptStation} (${device.locationName}).`,
      });

      // Direct write to PostgreSQL backend
      authFetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...device, actor }),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data.data) {
              await apiClient.devices.fetch();
            }
          }
        })
        .catch((e) => console.warn("PostgreSQL create device API sync:", e));

      return device;
    },

    update: (
      device: AloptamaDevice,
      details: string,
      actor = "Admin INSKAL"
    ): AloptamaDevice => {
      memoryCache.devices = memoryCache.devices.map((d) => (d.id === device.id ? device : d));

      apiClient.auditLogs.add({
        table: "master_alat",
        action: "EDIT",
        recordId: device.id,
        recordName: `${device.name} (${device.category})`,
        actor,
        details,
      });

      // Direct write to PostgreSQL backend
      authFetch(`/api/devices/${device.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...device, details, actor }),
      })
        .then(async (res) => {
          if (res.ok) {
            await apiClient.devices.fetch();
          }
        })
        .catch((e) => console.warn("PostgreSQL update device API sync:", e));

      return device;
    },

    delete: (
      deviceId: string,
      deviceName: string,
      actor = "Admin INSKAL"
    ): boolean => {
      memoryCache.devices = memoryCache.devices.filter((d) => d.id !== deviceId);

      apiClient.auditLogs.add({
        table: "master_alat",
        action: "HAPUS",
        recordId: deviceId,
        recordName: deviceName,
        actor,
        details: "Penghapusan data master aloptama dari database.",
      });

      // Direct delete on PostgreSQL backend
      authFetch(`/api/devices/${deviceId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor }),
      })
        .then(async (res) => {
          if (res.ok) {
            await apiClient.devices.fetch();
          }
        })
        .catch((e) => console.warn("PostgreSQL delete device API sync:", e));

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

    add: (station: UPTStation, actor = "Admin INSKAL"): UPTStation => {
      memoryCache.stations = [...memoryCache.stations, station];

      apiClient.auditLogs.add({
        table: "master_stasiun",
        action: "TAMBAH",
        recordId: station.code,
        recordName: station.name,
        actor,
        details: `Penambahan master stasiun UPT baru di wilayah ${station.regionGroup} (${station.location}).`,
      });

      // Direct write to PostgreSQL backend
      authFetch("/api/stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...station, actor }),
      })
        .then(async (res) => {
          if (res.ok) {
            await apiClient.stations.fetch();
          }
        })
        .catch((e) => console.warn("PostgreSQL create station API sync:", e));

      return station;
    },

    update: (
      station: UPTStation,
      details: string,
      actor = "Admin INSKAL"
    ): UPTStation => {
      memoryCache.stations = memoryCache.stations.map((s) => (s.id === station.id ? station : s));

      apiClient.auditLogs.add({
        table: "master_stasiun",
        action: "EDIT",
        recordId: station.code,
        recordName: station.name,
        actor,
        details,
      });

      // Direct write to PostgreSQL backend
      authFetch(`/api/stations/${station.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...station, details, actor }),
      })
        .then(async (res) => {
          if (res.ok) {
            await apiClient.stations.fetch();
          }
        })
        .catch((e) => console.warn("PostgreSQL update station API sync:", e));

      return station;
    },

    delete: (
      stationId: string,
      stationName: string,
      actor = "Admin INSKAL"
    ): boolean => {
      memoryCache.stations = memoryCache.stations.filter((s) => s.id !== stationId);

      apiClient.auditLogs.add({
        table: "master_stasiun",
        action: "HAPUS",
        recordId: stationId,
        recordName: stationName,
        actor,
        details: "Penghapusan data master stasiun UPT dari database.",
      });

      // Direct delete on PostgreSQL backend
      authFetch(`/api/stations/${stationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor }),
      })
        .then(async (res) => {
          if (res.ok) {
            await apiClient.stations.fetch();
          }
        })
        .catch((e) => console.warn("PostgreSQL delete station API sync:", e));

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
            password: user.password || "bmkg123",
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
              password: user.password,
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
