import { AloptamaDevice, UPTStation } from '../types';
import { authFetch } from './http';

export interface ServerFetchResult {
  devices: AloptamaDevice[];
  stations: UPTStation[];
  users?: any[];
  calibrationLogs?: any[];
  auditLogs?: any[];
  source: 'server_api' | 'fallback_local';
  lastSync: string;
  error?: string;
}

export async function fetchServerData(): Promise<ServerFetchResult> {
  const nowStr = new Date().toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jayapura',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' WIT';

  try {
    const [devRes, staRes, userRes, calRes, logRes] = await Promise.allSettled([
      authFetch('/api/devices'),
      authFetch('/api/stations'),
      authFetch('/api/users'),
      authFetch('/api/calibration'),
      authFetch('/api/audit-logs'),
    ]);

    let devices: AloptamaDevice[] = [];
    let stations: UPTStation[] = [];
    let users: any[] = [];
    let calibrationLogs: any[] = [];
    let auditLogs: any[] = [];
    let lastSync = nowStr;

    if (devRes.status === 'fulfilled' && devRes.value.ok) {
      const data = await devRes.value.json();
      if (data && (Array.isArray(data.devices) || Array.isArray(data.data))) {
        devices = data.devices || data.data;
        if (data.lastUpdate) lastSync = data.lastUpdate;
      }
    }

    if (staRes.status === 'fulfilled' && staRes.value.ok) {
      const data = await staRes.value.json();
      if (data && (Array.isArray(data.stations) || Array.isArray(data.data))) {
        stations = data.stations || data.data;
      }
    }

    if (userRes.status === 'fulfilled' && userRes.value.ok) {
      const data = await userRes.value.json();
      if (data && Array.isArray(data.data)) {
        users = data.data;
      }
    }

    if (calRes.status === 'fulfilled' && calRes.value.ok) {
      const data = await calRes.value.json();
      if (data && Array.isArray(data.data)) {
        calibrationLogs = data.data;
      }
    }

    if (logRes.status === 'fulfilled' && logRes.value.ok) {
      const data = await logRes.value.json();
      if (data && Array.isArray(data.data)) {
        auditLogs = data.data;
      }
    }

    return {
      devices,
      stations,
      users,
      calibrationLogs,
      auditLogs,
      source: 'server_api',
      lastSync,
    };
  } catch (err: any) {
    console.warn('BMKG Server API fetch error:', err);
  }

  return {
    devices: [],
    stations: [],
    source: 'fallback_local',
    lastSync: nowStr,
  };
}

export async function saveSlaOlaToServer(payload: {
  uptStation: string;
  category: string;
  deviceId: string;
  kondisiSla: boolean;
  kondisiOla: number;
  kendala: string;
}): Promise<ServerFetchResult | null> {
  try {
    const res = await authFetch('/api/sla-ola', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data && Array.isArray(data.devices)) {
      return {
        devices: data.devices,
        stations: [],
        source: 'server_api',
        lastSync: data.lastUpdate,
      };
    }
  } catch (err) {
    console.warn('Server SLA/OLA update fallback:', err);
  }
  return null;
}

export async function saveCalibrationToServer(payload: {
  deviceId: string;
  lastCalibrated: string;
  calibrationValidUntil: string;
  calibrationStatus: string;
  calibrationAgency: string;
}): Promise<ServerFetchResult | null> {
  try {
    const res = await authFetch('/api/calibration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data && Array.isArray(data.devices)) {
      return {
        devices: data.devices,
        stations: [],
        source: 'server_api',
        lastSync: data.lastUpdate,
      };
    }
  } catch (err) {
    console.warn('Server Calibration update fallback:', err);
  }
  return null;
}

export async function fetchServerHistoryLogs(params?: { year?: string; type?: string; upt?: string }) {
  try {
    const query = new URLSearchParams(params as any).toString();
    const res = await authFetch(`/api/history?${query}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.historyLogs || [];
  } catch (err) {
    console.warn('Unable to fetch history logs from server:', err);
    return [];
  }
}

export async function fetchMasterDevices(): Promise<AloptamaDevice[]> {
  try {
    const res = await authFetch('/api/master/devices');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.devices || [];
  } catch (err) {
    console.warn('Unable to fetch master devices:', err);
    return [];
  }
}
