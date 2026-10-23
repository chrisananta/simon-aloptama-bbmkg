import React, { useState, useEffect } from 'react';
import {
  Building2,
  Radio,
  Database,
  ShieldCheck,
  Users,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  UPTStation,
  AloptamaDevice,
  EquipmentCategory,
  EquipmentStatus,
  CalibrationStatus
} from '../../shared/types';
import { AuthUser, UserRole } from '../auth/authTypes';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../../shared/api';
import { petugasService, PetugasItem } from '../../shared/services/petugasService';
import { SlaOlaLogRow } from './types';
import { getStationName } from '../../shared/utils/stations';
import { loadPapuaProvinces, findProvince, ProvinceShape } from '../../shared/utils/provinceLookup';

import { MasterStasiunTab } from './tabs/MasterStasiunTab';
import { MasterAlatTab } from './tabs/MasterAlatTab';
import { MonitoringSlaOlaTab } from './tabs/MonitoringSlaOlaTab';
import { MasterPetugasTab } from './tabs/MasterPetugasTab';
import { MasterAkunTab } from './tabs/MasterAkunTab';

import { StationFormModal } from './modals/StationFormModal';
import { DeviceFormModal } from './modals/DeviceFormModal';
import { DeleteConfirmModal } from './modals/DeleteConfirmModal';
import { EditSlaOlaLogModal } from './modals/EditSlaOlaLogModal';
import { DeleteSlaOlaLogModal } from './modals/DeleteSlaOlaLogModal';
import { UserFormModal } from './modals/UserFormModal';
import { DeleteUserModal } from './modals/DeleteUserModal';
import { PetugasFormModal } from './modals/PetugasFormModal';
import { DeletePetugasModal } from './modals/DeletePetugasModal';
import { PIC_TIDAK_DIKALIBRASI, isNotCalibrated } from '../../shared/utils/calibration';


interface AdminMasterViewProps {
  stations: UPTStation[];
  devices: AloptamaDevice[];
  onAddStation: (station: UPTStation, actor: string) => void;
  onUpdateStation: (station: UPTStation, changesDetail: string, actor: string) => void;
  onDeleteStation: (stationId: string, stationName: string, actor: string) => void;
  // Mengembalikan false jika gagal (undefined/true = sukses).
  onAddDevice: (device: AloptamaDevice, actor: string) => void | boolean | Promise<void | boolean>;
  onUpdateDevice: (device: AloptamaDevice, changesDetail: string, actor: string) => void | boolean | Promise<void | boolean>;
  onDeleteDevice: (deviceId: string, deviceName: string, actor: string) => void | boolean | Promise<void | boolean>;
  onSyncDevicesFromServer?: (devices: AloptamaDevice[]) => void;
}

type TabType = 'master_stasiun' | 'master_alat' | 'monitoring_sla_ola' | 'master_petugas' | 'master_akun';

export const AdminMasterView: React.FC<AdminMasterViewProps> = ({
  stations: stationsProp,
  devices: devicesProp,
  onAddStation,
  onUpdateStation,
  onDeleteStation,
  onAddDevice,
  onUpdateDevice,
  onDeleteDevice,
  onSyncDevicesFromServer,
}) => {
  const { user, permissions } = useAuth();
  const isFullMasterAccess = permissions.masterDataScope === 'FULL';
  // Teknisi UPT: hanya melihat & MENGEDIT alat milik UPT sendiri (tanpa
  // tambah/hapus; ID alat & UPT terkunci). Dibatasi juga di backend.
  const isTeknisiAlatMode = permissions.masterDataScope === 'ALAT_OWN_UPT_EDIT_ONLY';

  const devices = React.useMemo(
    () =>
      isTeknisiAlatMode
        ? devicesProp.filter((d) => !!user?.stationId && d.stationId === user.stationId)
        : devicesProp,
    [devicesProp, isTeknisiAlatMode, user?.stationId]
  );
  const stations = React.useMemo(
    () =>
      isTeknisiAlatMode
        ? stationsProp.filter((st) => !!user?.stationId && st.id === user.stationId)
        : stationsProp,
    [stationsProp, isTeknisiAlatMode, user?.stationId]
  );

  const [activeTab, setActiveTab] = useState<TabType>(
    isTeknisiAlatMode ? 'master_alat' : isFullMasterAccess ? 'master_stasiun' : 'monitoring_sla_ola'
  );
  const [adminActor, setAdminActor] = useState<string>(
    isTeknisiAlatMode ? (user?.name || 'Teknisi UPT') : 'Admin INSKAL BBMKG V'
  );

  // Notifikasi sukses (toast) - hilang otomatis setelah 4 detik.
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  // --- MASTER PETUGAS MONITORING STATES ---
  const [petugasList, setPetugasList] = useState<PetugasItem[]>(() => petugasService.getAll());
  const [petugasSearch, setPetugasSearch] = useState<string>('');
  const [isPetugasModalOpen, setIsPetugasModalOpen] = useState<boolean>(false);
  const [editingPetugas, setEditingPetugas] = useState<PetugasItem | null>(null);
  const [petugasForm, setPetugasForm] = useState<Partial<PetugasItem>>({});
  const [deleteConfirmPetugas, setDeleteConfirmPetugas] = useState<PetugasItem | null>(null);

  const refreshPetugas = () => {
    setPetugasList(petugasService.getAll());
  };

  useEffect(() => {
    petugasService.fetch().then(() => {
      refreshPetugas();
    });

    window.addEventListener('petugas_list_updated', refreshPetugas);
    return () => window.removeEventListener('petugas_list_updated', refreshPetugas);
  }, []);

  const handleOpenAddPetugas = () => {
    setEditingPetugas(null);
    setPetugasForm({
      name: '',
      nip: '',
      jabatan: 'Staf Instrumentasi & Kalibrasi',
    });
    setIsPetugasModalOpen(true);
  };

  const handleOpenEditPetugas = (p: PetugasItem) => {
    setEditingPetugas(p);
    setPetugasForm({ ...p });
    setIsPetugasModalOpen(true);
  };

  const handleSavePetugas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petugasForm.name || !petugasForm.name.trim()) {
      alert('Nama Personil Petugas Wajib Diisi.');
      return;
    }

    try {
      if (editingPetugas) {
        await petugasService.update(
          editingPetugas.id,
          {
            name: petugasForm.name.trim(),
            nip: petugasForm.nip?.trim() || '',
            jabatan: petugasForm.jabatan?.trim() || 'Staf Operasional',
          },
          adminActor
        );
      } else {
        await petugasService.add(
          {
            name: petugasForm.name.trim(),
            nip: petugasForm.nip?.trim() || '',
            jabatan: petugasForm.jabatan?.trim() || 'Staf Operasional',
          },
          adminActor
        );
      }

      refreshPetugas();
      setIsPetugasModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan data petugas ke server.');
    }
  };

  const handleConfirmDeletePetugas = async () => {
    if (!deleteConfirmPetugas) return;
    try {
      await petugasService.delete(deleteConfirmPetugas.id, adminActor);
      refreshPetugas();
      setDeleteConfirmPetugas(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus data petugas di server.');
    }
  };

  const filteredPetugas = petugasList.filter(p => {
    const q = petugasSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.nip || '').toLowerCase().includes(q) ||
      (p.jabatan || '').toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  });

  // --- MASTER AKUN STATES ---
  const [users, setUsers] = useState<AuthUser[]>(() => apiClient.users.getAll());
  const [userSearch, setUserSearch] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [userForm, setUserForm] = useState<Partial<AuthUser>>({});
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AuthUser | null>(null);

  const refreshUsers = async () => {
    const fetched = await apiClient.users.fetch();
    setUsers(fetched);
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserForm({
      id: `USR-${Date.now()}`,
      username: '',
      password: '',
      name: '',
      role: 'TEKNISI_UPT',
      title: 'Operator UPT BMKG',
      nip: '',
      email: '',
      stationId: stations[0]?.id ?? null,
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: AuthUser) => {
    setEditingUser(u);
    setUserForm({ ...u, password: u.password || '' });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.username?.trim() || !userForm.name?.trim()) {
      alert('Username dan Nama Lengkap wajib diisi.');
      return;
    }

    const cleanUsername = userForm.username.trim().toLowerCase();

    try {    if (editingUser) {
      const existing = users.find((u) => u.id !== editingUser.id && (u.username || '').toLowerCase() === cleanUsername);
      if (existing) {
        alert(`Username "@${cleanUsername}" sudah digunakan oleh akun lain.`);
        return;
      }

      const updated: AuthUser = {
        ...editingUser,
        username: cleanUsername,
        password: userForm.password ? userForm.password.trim() : editingUser.password,
        name: userForm.name.trim(),
        role: (userForm.role as UserRole) || 'TEKNISI_UPT',
        title: userForm.title?.trim() || 'Operator / Pimpinan UPT',
        nip: userForm.nip?.trim() || '',
        email: userForm.email?.trim() || '',
        stationId: userForm.stationId || null,
      };

      const changes: string[] = [];
      if (editingUser.username !== updated.username) changes.push(`Username: "@${editingUser.username}" -> "@${updated.username}"`);
      if (editingUser.name !== updated.name) changes.push(`Nama: "${editingUser.name}" -> "${updated.name}"`);
      if (userForm.password) changes.push('Kata Sandi diperbarui');
      if (editingUser.role !== updated.role) changes.push(`Peran: "${editingUser.role}" -> "${updated.role}"`);
      if (editingUser.title !== updated.title) changes.push(`Jabatan: "${editingUser.title}" -> "${updated.title}"`);
      if (editingUser.nip !== updated.nip) changes.push(`NIP: "${editingUser.nip}" -> "${updated.nip}"`);

      const detailStr = changes.length > 0 ? changes.join('; ') : 'Pembaruan data akun pengguna.';
      await apiClient.users.update(updated, detailStr, adminActor);
      await refreshUsers();
    } else {
      const existing = users.find((u) => (u.username || '').toLowerCase() === cleanUsername);
      if (existing) {
        alert(`Username "@${cleanUsername}" sudah terdaftar.`);
        return;
      }

      const newUser: AuthUser = {
        id: userForm.id || `USR-${Date.now()}`,
        username: cleanUsername,
        password: userForm.password?.trim() || undefined,
        name: userForm.name.trim(),
        role: (userForm.role as UserRole) || 'TEKNISI_UPT',
        title: userForm.title?.trim() || 'Operator UPT BMKG',
        nip: userForm.nip?.trim() || '',
        email: userForm.email?.trim() || '',
        stationId: userForm.stationId || null,
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
      };

      const created = await apiClient.users.add(newUser, adminActor);
      await refreshUsers();

      if (!newUser.password && created?.password) {
        alert(
          `Akun "@${cleanUsername}" berhasil dibuat.\n\nPassword yang di-generate otomatis:\n${created.password}\n\nCatat sekarang - password ini tidak ditampilkan lagi setelah ini.`
        );
      }
    }

    setIsUserModalOpen(false);
    } catch (err: any) {
      // Tampilkan pesan error ASLI dari server (mis. hak akses tidak
      // cukup, username sudah dipakai) - modal TETAP terbuka supaya data
      // yang sudah diisi tidak hilang dan user bisa langsung perbaiki.
      console.error('Gagal menyimpan akun pengguna:', err);
      alert(err?.message || 'Gagal menyimpan akun pengguna. Silakan coba lagi.');
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    await apiClient.users.delete(deleteConfirmUser.id, `${deleteConfirmUser.name} (@${deleteConfirmUser.username})`, adminActor);
    await refreshUsers();
    setDeleteConfirmUser(null);
  };

  const filteredUsers = users.filter((u) => {
    const query = userSearch.toLowerCase();
    const matchSearch =
      (u.name || '').toLowerCase().includes(query) ||
      (u.username || '').toLowerCase().includes(query) ||
      (u.nip && u.nip.toLowerCase().includes(query)) ||
      getStationName(stationsProp, u.stationId, '').toLowerCase().includes(query);

    const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;

    return matchSearch && matchRole;
  });

  // --- STASIUN SEARCH & FILTERS ---
  const [stasiunSearch, setStasiunSearch] = useState('');
  const [stasiunRegionFilter, setStasiunRegionFilter] = useState('ALL');

  // --- ALAT SEARCH & FILTERS ---
  const [alatSearch, setAlatSearch] = useState('');
  const [alatUptFilter, setAlatUptFilter] = useState('ALL');
  const [alatCategoryFilter, setAlatCategoryFilter] = useState('ALL');
  const [alatRegionFilter, setAlatRegionFilter] = useState('ALL');

  // Provinsi alat ditentukan dari KOORDINAT (batas provinsi GeoJSON), sama seperti
  // filter wilayah di dashboard - bukan dari provinsi kantor UPT pengelolanya.
  const [provinceShapes, setProvinceShapes] = useState<ProvinceShape[]>([]);
  useEffect(() => {
    loadPapuaProvinces().then(setProvinceShapes);
  }, []);
  const deviceRegionMap = React.useMemo(() => {
    const map = new Map<string, string>();
    devices.forEach((d) => {
      const byCoord = provinceShapes.length > 0
        ? findProvince(Number(d.latitude), Number(d.longitude), provinceShapes)
        : null;
      const region = byCoord || stations.find((st) => st.id === d.stationId)?.regionGroup || '';
      if (region) map.set(d.devicesId, region);
    });
    return map;
  }, [devices, stations, provinceShapes]);
  const alatRegionOptions = React.useMemo(
    () => Array.from(new Set(deviceRegionMap.values())).sort((a, b) => a.localeCompare(b)),
    [deviceRegionMap]
  );
  const [alatSortOrder, setAlatSortOrder] = useState<'asc' | 'desc'>('asc');

  const currentYearNum = new Date().getFullYear();
  const maxYearNum = Math.max(2028, currentYearNum + 2);
  const dynamicYears: string[] = [];
  for (let y = 2024; y <= maxYearNum; y++) {
    dynamicYears.push(y.toString());
  }

  // ================= TAB MONITORING PENGISIAN SLA/OLA (per-entri log) =================
  const currentMonthNum1to12 = new Date().getMonth() + 1;
  const [monitoringMonth, setMonitoringMonth] = useState<number>(currentMonthNum1to12);
  const [monitoringYear, setMonitoringYear] = useState<number>(currentYearNum);
  const [monitoringLogs, setMonitoringLogs] = useState<SlaOlaLogRow[]>([]);
  const [isLoadingMonitoringLogs, setIsLoadingMonitoringLogs] = useState(false);
  const [monitoringSearch, setMonitoringSearch] = useState('');
  const [editingLog, setEditingLog] = useState<SlaOlaLogRow | null>(null);
  const [editLogSlaVal, setEditLogSlaVal] = useState<number>(0);
  const [editLogOlaVal, setEditLogOlaVal] = useState<number>(0);
  const [isEditLogModalOpen, setIsEditLogModalOpen] = useState(false);
  const [deleteConfirmLog, setDeleteConfirmLog] = useState<SlaOlaLogRow | null>(null);

  const fetchMonitoringLogs = async (bulan: number, tahun: number) => {
    setIsLoadingMonitoringLogs(true);
    try {
      const logs = await apiClient.slaOlaLogs.fetch(bulan, tahun);
      setMonitoringLogs(logs);
    } catch {
      setMonitoringLogs([]);
    } finally {
      setIsLoadingMonitoringLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'monitoring_sla_ola') {
      fetchMonitoringLogs(monitoringMonth, monitoringYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, monitoringMonth, monitoringYear]);

  const filteredMonitoringLogs = monitoringLogs.filter((log) => {
    const q = monitoringSearch.toLowerCase();
    return (
      log.kodeAlat.toLowerCase().includes(q) ||
      log.namaAlat.toLowerCase().includes(q)
    );
  });

  const handleOpenEditLog = (log: SlaOlaLogRow) => {
    setEditingLog(log);
    setEditLogSlaVal(log.kondisiSla ? 100 : 0);
    setEditLogOlaVal(log.kondisiOla);
    setIsEditLogModalOpen(true);
  };

  const handleSaveEditLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    const sla = Math.min(100, Math.max(0, Math.round(Number(editLogSlaVal))));
    const ola = Math.min(100, Math.max(0, Math.round(Number(editLogOlaVal))));
    try {
      const { devices: updatedDevices } = await apiClient.slaOlaLogs.update(
        editingLog.id,
        { kondisiSla: sla >= 100, kondisiOla: ola },
        adminActor
      );
      if (updatedDevices?.length) {
        onSyncDevicesFromServer?.(updatedDevices);
      }
      setIsEditLogModalOpen(false);
      setEditingLog(null);
      await fetchMonitoringLogs(monitoringMonth, monitoringYear);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal memperbarui entri SLA/OLA.');
    }
  };

  const handleConfirmDeleteLog = async () => {
    if (!deleteConfirmLog) return;
    try {
      const { devices: updatedDevices } = await apiClient.slaOlaLogs.delete(deleteConfirmLog.id, adminActor);
      if (updatedDevices?.length) {
        onSyncDevicesFromServer?.(updatedDevices);
      }
      setDeleteConfirmLog(null);
      await fetchMonitoringLogs(monitoringMonth, monitoringYear);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus entri SLA/OLA.');
    }
  };

  // --- MODAL STATES ---
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<UPTStation | null>(null);
  
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<AloptamaDevice | null>(null);

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'stasiun' | 'alat';
    id: string;
    name: string;
  } | null>(null);

  // --- FORM STATES FOR STASIUN ---
  const [stationForm, setStationForm] = useState<Partial<UPTStation>>({
    stationid: '',
    name: '',
    regionGroup: 'Papua Barat Daya',
    location: '',
    latitude: 0,
    longitude: 0,
  });

  // --- FORM STATES FOR ALAT ---
  const [deviceForm, setDeviceForm] = useState<Partial<AloptamaDevice>>({
    devicesId: '',
    site: '',
    category: 'AWS',
    merk: '',
    stationId: stations[0]?.id || '',
    locationName: '',
    latitude: 0,
    longitude: 0,
    conditionStatus: 'NORMAL',
    calibrationStatus: 'VALID',
    lastCalibrated: '2026-07-08',
    calibrationValidUntil: '2027-07-07',
    timkalibrasi: 'Balai Besar MKG Wilayah V',
  });

  const regions = Array.from(new Set(stations.map((s) => s.regionGroup).filter(Boolean)));
  const categories: EquipmentCategory[] = ['AWOS Kat.I', 'AWOS Kat.II', 'AWOS Kat.III', 'AWS', 'ARG', 'Radar Cuaca', 'Lightning Detector', 'Seismometer', 'Accelerograph', 'WRS NG', 'Sirene'];

  const filteredStations = stations.filter((s) => {
    const matchesSearch = 
      (s.stationid || '').toLowerCase().includes(stasiunSearch.toLowerCase()) ||
      (s.name || '').toLowerCase().includes(stasiunSearch.toLowerCase()) ||
      (s.location || '').toLowerCase().includes(stasiunSearch.toLowerCase());
    const matchesRegion = stasiunRegionFilter === 'ALL' || s.regionGroup === stasiunRegionFilter;
    return matchesSearch && matchesRegion;
  });

  const filteredDevices = devices.filter((d) => {
    const matchesSearch = 
      (d.devicesId || '').toLowerCase().includes(alatSearch.toLowerCase()) ||
      (d.site || '').toLowerCase().includes(alatSearch.toLowerCase()) ||
      (d.locationName || '').toLowerCase().includes(alatSearch.toLowerCase());
    const matchesUpt = alatUptFilter === 'ALL' || d.stationId === alatUptFilter;
    const matchesCat = alatCategoryFilter === 'ALL' || d.category === alatCategoryFilter;
    const matchesRegion = alatRegionFilter === 'ALL' || deviceRegionMap.get(d.devicesId) === alatRegionFilter;
    return matchesSearch && matchesUpt && matchesCat && matchesRegion;
  })
  .sort((a, b) => {
    const result = (a.devicesId || '').localeCompare(b.devicesId || '', undefined, { numeric: true, sensitivity: 'base' });
    return alatSortOrder === 'asc' ? result : -result;
  });

  const handleOpenAddStation = () => {
    setEditingStation(null);
    setStationForm({
      stationid: `MET0${stations.length + 1}`,
      name: '',
      regionGroup: 'Papua Barat Daya',
      location: '',
      latitude: -0.89,
      longitude: 131.28,
    });
    setIsStationModalOpen(true);
  };

  const handleOpenEditStation = (st: UPTStation) => {
    setEditingStation(st);
    setStationForm({ ...st });
    setIsStationModalOpen(true);
  };

  const handleSaveStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationForm.stationid || !stationForm.name) {
      alert('Kode dan Nama Stasiun UPT wajib diisi.');
      return;
    }

    if (editingStation) {
      const updated: UPTStation = {
        ...editingStation,
        stationid: stationForm.stationid,
        name: stationForm.name,
        regionGroup: stationForm.regionGroup || 'Papua',
        location: stationForm.location || '',
        latitude: Number(stationForm.latitude) || 0,
        longitude: Number(stationForm.longitude) || 0,
      };

      const changes: string[] = [];
      if (editingStation.name !== updated.name) changes.push(`Nama: "${editingStation.name}" -> "${updated.name}"`);
      if (editingStation.regionGroup !== updated.regionGroup) changes.push(`Wilayah: "${editingStation.regionGroup}" -> "${updated.regionGroup}"`);
      if (editingStation.location !== updated.location) changes.push(`Lokasi: "${editingStation.location}" -> "${updated.location}"`);
      if (editingStation.latitude !== updated.latitude || editingStation.longitude !== updated.longitude) {
        changes.push(`Koordinat: (${editingStation.latitude}, ${editingStation.longitude}) -> (${updated.latitude}, ${updated.longitude})`);
      }

      const detailStr = changes.length > 0 ? changes.join('; ') : 'Pembaruan atribut Stasiun UPT.';
      onUpdateStation(updated, detailStr, adminActor);
    } else {
      const newSt: UPTStation = {
        id: stationForm.stationid || `MET${Date.now()}`,
        stationid: stationForm.stationid || `MET${Date.now()}`,
        name: stationForm.name || '',
        regionGroup: stationForm.regionGroup || 'Papua',
        location: stationForm.location || '',
        latitude: Number(stationForm.latitude) || 0,
        longitude: Number(stationForm.longitude) || 0,
      };
      onAddStation(newSt, adminActor);
    }

    setIsStationModalOpen(false);
  };

  const handleOpenAddDevice = () => {
    setEditingDevice(null);
    const newId = `ALT0${(devices.length + 1).toString().padStart(3, '0')}`;
    setDeviceForm({
      devicesId: newId,
      site: '',
      category: 'AWS',
      merk: '',
      stationId: stations[0]?.id || '',
      locationName: '',
      latitude: -0.89,
      longitude: 131.28,
      conditionStatus: 'NORMAL',
      calibrationStatus: 'VALID',
      lastCalibrated: '2026-07-08',
      calibrationValidUntil: '2027-07-07',
      timkalibrasi: 'Balai Besar MKG Wilayah V',
      slaScore: 100,
      olaScore: 100,
    });
    setIsDeviceModalOpen(true);
  };

  const handleOpenEditDevice = (dev: AloptamaDevice) => {
    setEditingDevice(dev);
    const existingPic = isNotCalibrated(dev)
      ? PIC_TIDAK_DIKALIBRASI
      : dev.picKalibrasi
        || (dev.timkalibrasi?.toLowerCase().includes('pusat') ? 'Pusat' : 'Balai');

    setDeviceForm({
      ...dev, // stationId ikut terbawa; dropdown stasiun memakai ID
      picKalibrasi: existingPic,
      slaScore: Math.round(dev.slaScore ?? 100),
      olaScore: Math.round(dev.olaScore ?? 100),
    });
    setIsDeviceModalOpen(true);
  };

  const handleSaveDevice = async (e?: React.FormEvent) => {
    // Cegah submit bawaan form (akan me-reload halaman selagi modal masih terbuka).
    e?.preventDefault();
    if (!deviceForm.devicesId || !deviceForm.site) {
      alert('ID Alat dan Nama Alat wajib diisi.');
      return;
    }

    // Teknisi UPT hanya boleh mengedit alat yang sudah ada di UPT-nya sendiri.
    if (isTeknisiAlatMode && (!editingDevice || !user?.stationId || editingDevice.stationId !== user.stationId)) {
      alert('Anda hanya dapat mengedit alat milik UPT Anda sendiri.');
      return;
    }

    const sla = Math.min(100, Math.max(0, Math.round(Number(deviceForm.slaScore ?? 100))));
    const ola = Math.min(100, Math.max(0, Math.round(Number(deviceForm.olaScore ?? 100))));

    let autoStatus: EquipmentStatus = deviceForm.conditionStatus as EquipmentStatus || 'NORMAL';
    if (isTeknisiAlatMode && editingDevice) {
      // Status kondisi dikelola lewat pengisian SLA/OLA, bukan dari form master.
      autoStatus = editingDevice.conditionStatus;
    } else if (sla === 0 || ola === 0) {
      autoStatus = 'MATI';
    } else if (ola < 100) {
      autoStatus = 'GANGGUAN';
    } else if (ola >= 100 && sla > 0) {
      autoStatus = 'NORMAL';
    }

    const pic = deviceForm.picKalibrasi || 'Balai';
    const notCalibrated = pic === PIC_TIDAK_DIKALIBRASI;
    const defaultAgency = notCalibrated
      ? PIC_TIDAK_DIKALIBRASI
      : pic === 'Pusat' ? 'BMKG Pusat' : 'Balai Besar MKG Wilayah V';
    // Status kalibrasi yang dikirim: alat tidak dikalibrasi selalu TIDAK_DIKALIBRASI;
    // sebaliknya, status TIDAK_DIKALIBRASI tidak boleh "bocor" ke alat Balai/Pusat.
    const resolvedCalibrationStatus: CalibrationStatus = notCalibrated
      ? 'TIDAK_DIKALIBRASI'
      : deviceForm.calibrationStatus && deviceForm.calibrationStatus !== 'TIDAK_DIKALIBRASI'
        ? (deviceForm.calibrationStatus as CalibrationStatus)
        : 'VALID';

    if (editingDevice) {
      const updated: AloptamaDevice = {
        ...editingDevice,
        // ID alat tidak pernah berubah saat edit.
        devicesId: editingDevice.devicesId,
        site: deviceForm.site,
        category: (deviceForm.category as EquipmentCategory) || 'AWS',
        merk: deviceForm.merk || '',
        stationId: isTeknisiAlatMode ? editingDevice.stationId : (deviceForm.stationId || stations[0]?.id || ''),
        picKalibrasi: pic,
        locationName: deviceForm.locationName || '',
        latitude: Number(deviceForm.latitude) || 0,
        longitude: Number(deviceForm.longitude) || 0,
        conditionStatus: autoStatus,
        calibrationStatus: resolvedCalibrationStatus,
        lastCalibrated: notCalibrated ? null : (deviceForm.lastCalibrated || '2026-07-08'),
        calibrationValidUntil: notCalibrated
          ? null
          : isTeknisiAlatMode
            ? (deviceForm.calibrationValidUntil || editingDevice.calibrationValidUntil)
            : (deviceForm.calibrationValidUntil || '2027-07-07'),
        timkalibrasi: notCalibrated ? PIC_TIDAK_DIKALIBRASI : (deviceForm.timkalibrasi || defaultAgency),
        slaScore: isTeknisiAlatMode ? editingDevice.slaScore : sla,
        olaScore: isTeknisiAlatMode ? editingDevice.olaScore : ola,
      };

      const changes: string[] = [];
      if (editingDevice.site !== updated.site) changes.push(`Nama: "${editingDevice.site}" -> "${updated.site}"`);
      if (editingDevice.category !== updated.category) changes.push(`Kategori: "${editingDevice.category}" -> "${updated.category}"`);
      if (editingDevice.calibrationStatus !== updated.calibrationStatus) changes.push(`Status Kalibrasi: "${editingDevice.calibrationStatus}" -> "${updated.calibrationStatus}"`);
      if (editingDevice.lastCalibrated !== updated.lastCalibrated) changes.push(`Terakhir Kalibrasi: "${editingDevice.lastCalibrated}" -> "${updated.lastCalibrated}"`);
      if ((editingDevice.merk || '') !== (updated.merk || '')) changes.push(`Merk: "${editingDevice.merk || '-'}" -> "${updated.merk || '-'}"`);
      if ((editingDevice.locationName || '') !== (updated.locationName || '')) changes.push(`Lokasi: "${editingDevice.locationName || '-'}" -> "${updated.locationName || '-'}"`);
      if (editingDevice.picKalibrasi !== updated.picKalibrasi) changes.push(`PIC Kalibrasi: "${editingDevice.picKalibrasi || '-'}" -> "${updated.picKalibrasi || '-'}"`);
      if (editingDevice.stationId !== updated.stationId) changes.push(`UPT: "${getStationName(stationsProp, editingDevice.stationId)}" -> "${getStationName(stationsProp, updated.stationId)}"`);
      if (editingDevice.conditionStatus !== updated.conditionStatus) changes.push(`Status: "${editingDevice.conditionStatus}" -> "${updated.conditionStatus}"`);
      if (editingDevice.slaScore !== updated.slaScore) changes.push(`SLA: ${editingDevice.slaScore ?? 100}% -> ${updated.slaScore}%`);
      if (editingDevice.olaScore !== updated.olaScore) changes.push(`OLA: ${editingDevice.olaScore ?? 100}% -> ${updated.olaScore}%`);
      if (editingDevice.latitude !== updated.latitude || editingDevice.longitude !== updated.longitude) {
        changes.push(`Koordinat: (${editingDevice.latitude}, ${editingDevice.longitude}) -> (${updated.latitude}, ${updated.longitude})`);
      }

      const detailStr = changes.length > 0 ? changes.join('; ') : 'Pembaruan parameter data master alat & SLA OLA.';
      const ok = await onUpdateDevice(updated, detailStr, adminActor);
      // Gagal: alert error sudah tampil, modal dibiarkan terbuka agar isian tidak hilang.
      if (ok === false) return;
      setIsDeviceModalOpen(false);
      setNotice(`Data alat ${updated.site} (${updated.devicesId}) berhasil disimpan.`);
      return;
    } else {
      const newDev: AloptamaDevice = {
        devicesId: deviceForm.devicesId || `ALT${Date.now()}`,
        site: deviceForm.site || '',
        category: (deviceForm.category as EquipmentCategory) || 'AWS',
        merk: deviceForm.merk || '',
        stationId: deviceForm.stationId || stations[0]?.id || '',
        picKalibrasi: pic,
        locationName: deviceForm.locationName || '',
        latitude: Number(deviceForm.latitude) || 0,
        longitude: Number(deviceForm.longitude) || 0,
        conditionStatus: autoStatus,
        calibrationStatus: resolvedCalibrationStatus,
        lastCalibrated: notCalibrated ? null : (deviceForm.lastCalibrated || '2026-07-08'),
        calibrationValidUntil: notCalibrated ? null : (deviceForm.calibrationValidUntil || '2027-07-07'),
        timkalibrasi: notCalibrated ? PIC_TIDAK_DIKALIBRASI : (deviceForm.timkalibrasi || defaultAgency),
        slaScore: sla,
        olaScore: ola,
      };

      const ok = await onAddDevice(newDev, adminActor);
      if (ok === false) return;
      setIsDeviceModalOpen(false);
      setNotice(`Alat ${newDev.site} (${newDev.devicesId}) berhasil ditambahkan.`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTarget) return;
    if (isTeknisiAlatMode) {
      setDeleteConfirmTarget(null);
      return;
    }

    const target = deleteConfirmTarget;
    if (target.type === 'stasiun') {
      onDeleteStation(target.id, target.name, adminActor);
      setDeleteConfirmTarget(null);
      return;
    }

    const ok = await onDeleteDevice(target.id, target.name, adminActor);
    setDeleteConfirmTarget(null);
    if (ok !== false) setNotice(`Alat ${target.name} (${target.id}) berhasil dihapus.`);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-[88px] left-3 right-3 sm:left-auto sm:right-6 z-[4000] sm:max-w-sm flex items-start gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl shadow-emerald-900/20 text-xs font-bold animate-fadeIn"
        >
          <CheckCircle2 size={18} className="shrink-0 mt-px" />
          <span className="leading-snug flex-1">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-white/80 hover:text-white cursor-pointer leading-none text-base"
            aria-label="Tutup notifikasi"
          >
            ×
          </button>
        </div>
      )}
      {/* 1. TOP TITLE HEADER */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 bg-blue-50 text-[#0052CC] rounded-xl border border-blue-100 flex items-center justify-center shadow-xs shrink-0">
            <Database size={20} className="sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] sm:text-[10px] font-extrabold uppercase rounded-full tracking-wider flex items-center gap-1 shrink-0">
                <ShieldCheck size={11} className="sm:w-3 sm:h-3" />
                {isTeknisiAlatMode ? 'Akses Teknisi UPT' : 'Akses Hanya Admin'}
              </span>
              <span className="text-xs text-slate-400 hidden xs:inline">• BBMKG Wilayah V Papua</span>
            </div>
            <h1 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight mt-1 leading-snug">
              {isTeknisiAlatMode ? 'Master Alat' : 'Pengelolaan Database Master'}
            </h1>
            {isTeknisiAlatMode ? (
              <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5 leading-relaxed">
                Perbarui data master alat milik <span className="font-bold text-slate-700">{stations[0]?.name || 'UPT Anda'}</span> jika ada perubahan.
              </p>
            ) : (
            <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5 leading-relaxed">
              Ubah data <code className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded">master_stasiun</code>, <code className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded">master_alat</code>, serta data petugas dan akun. Jejak perubahan tercatat otomatis di menu <code className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">Audit Log</code>.
            </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0 sm:w-4.5 sm:h-4.5" />
            <div className="text-left">
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block">Status Pengubah:</span>
              <input 
                type="text" 
                value={adminActor} 
                onChange={(e) => setAdminActor(e.target.value)}
                readOnly={isTeknisiAlatMode}
                className="text-xs font-bold text-slate-800 bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-[#0052CC] w-32 sm:w-40"
                title="Nama Pengguna/Admin yang tercatat pada Audit Log"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 border-b border-slate-200 pb-2">
        {isTeknisiAlatMode && (
          <button
            onClick={() => setActiveTab('master_alat')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer bg-[#0052CC] text-white shadow-md shadow-blue-500/20"
          >
            <Radio size={16} />
            <span>master_alat</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white">
              {devices.length} Alat
            </span>
          </button>
        )}

        {isFullMasterAccess && (
        <>
        <button
          onClick={() => setActiveTab('master_stasiun')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'master_stasiun'
              ? 'bg-[#0052CC] text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 size={16} />
          <span>master_stasiun</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'master_stasiun' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {stations.length} UPT
          </span>
        </button>

        <button
          onClick={() => setActiveTab('master_alat')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'master_alat'
              ? 'bg-[#0052CC] text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Radio size={16} />
          <span>master_alat</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'master_alat' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {devices.length} Alat
          </span>
        </button>

        </>
        )}

        {!isTeknisiAlatMode && (
        <button
          onClick={() => setActiveTab('monitoring_sla_ola')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'monitoring_sla_ola'
              ? 'bg-[#0052CC] text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Radio size={16} />
          <span>monitoring_sla_ola</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'monitoring_sla_ola' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            Harian
          </span>
        </button>
        )}

        {isFullMasterAccess && (
        <>
        <button
          onClick={() => setActiveTab('master_petugas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'master_petugas'
              ? 'bg-[#0052CC] text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserCheck size={16} />
          <span>master_petugas</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'master_petugas' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {petugasList.length} Personil
          </span>
        </button>

        <button
          onClick={() => setActiveTab('master_akun')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'master_akun'
              ? 'bg-[#0052CC] text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users size={16} />
          <span>master_akun</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'master_akun' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {users.length} Akun
          </span>
        </button>

        </>
        )}
      </div>

      {activeTab === 'master_stasiun' && isFullMasterAccess && (
        <MasterStasiunTab
          devices={devices}
          filteredStations={filteredStations}
          regions={regions}
          stasiunSearch={stasiunSearch}
          setStasiunSearch={setStasiunSearch}
          stasiunRegionFilter={stasiunRegionFilter}
          setStasiunRegionFilter={setStasiunRegionFilter}
          handleOpenAddStation={handleOpenAddStation}
          handleOpenEditStation={handleOpenEditStation}
          setDeleteConfirmTarget={setDeleteConfirmTarget}
        />
      )}

      {activeTab === 'master_alat' && (isFullMasterAccess || isTeknisiAlatMode) && (
        <MasterAlatTab
          stations={stations}
          categories={categories}
          filteredDevices={filteredDevices}
          alatSearch={alatSearch}
          setAlatSearch={setAlatSearch}
          alatUptFilter={alatUptFilter}
          setAlatUptFilter={setAlatUptFilter}
          alatCategoryFilter={alatCategoryFilter}
          setAlatCategoryFilter={setAlatCategoryFilter}
          alatRegionFilter={alatRegionFilter}
          setAlatRegionFilter={setAlatRegionFilter}
          regionOptions={alatRegionOptions}
          handleOpenAddDevice={handleOpenAddDevice}
          handleOpenEditDevice={handleOpenEditDevice}
          setDeleteConfirmTarget={setDeleteConfirmTarget}
          canAdd={!isTeknisiAlatMode}
          canDelete={!isTeknisiAlatMode}
          showUptFilter={!isTeknisiAlatMode}
          showSearchAndCategory={!isTeknisiAlatMode}
        />
      )}

      {activeTab === 'monitoring_sla_ola' && !isTeknisiAlatMode && (
        <MonitoringSlaOlaTab
          filteredMonitoringLogs={filteredMonitoringLogs}
          isLoadingMonitoringLogs={isLoadingMonitoringLogs}
          monitoringMonth={monitoringMonth}
          setMonitoringMonth={setMonitoringMonth}
          monitoringYear={monitoringYear}
          setMonitoringYear={setMonitoringYear}
          monitoringSearch={monitoringSearch}
          setMonitoringSearch={setMonitoringSearch}
          dynamicYears={dynamicYears}
          handleOpenEditLog={handleOpenEditLog}
          setDeleteConfirmLog={setDeleteConfirmLog}
        />
      )}

      {activeTab === 'master_petugas' && isFullMasterAccess && (
        <MasterPetugasTab
          filteredPetugas={filteredPetugas}
          petugasSearch={petugasSearch}
          setPetugasSearch={setPetugasSearch}
          handleOpenAddPetugas={handleOpenAddPetugas}
          handleOpenEditPetugas={handleOpenEditPetugas}
          setDeleteConfirmPetugas={setDeleteConfirmPetugas}
        />
      )}

      {activeTab === 'master_akun' && isFullMasterAccess && (
        <MasterAkunTab
          filteredUsers={filteredUsers}
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          userRoleFilter={userRoleFilter}
          setUserRoleFilter={setUserRoleFilter}
          stations={stations}
          handleOpenAddUser={handleOpenAddUser}
          handleOpenEditUser={handleOpenEditUser}
          setDeleteConfirmUser={setDeleteConfirmUser}
        />
      )}

      {isStationModalOpen && (
        <StationFormModal
          editingStation={editingStation}
          stationForm={stationForm}
          setStationForm={setStationForm}
          setIsStationModalOpen={setIsStationModalOpen}
          handleSaveStation={handleSaveStation}
        />
      )}

      {isDeviceModalOpen && (
        <DeviceFormModal
          stations={stations}
          categories={categories}
          editingDevice={editingDevice}
          deviceForm={deviceForm}
          setDeviceForm={setDeviceForm}
          setIsDeviceModalOpen={setIsDeviceModalOpen}
          handleSaveDevice={handleSaveDevice}
          restrictedMode={isTeknisiAlatMode}
        />
      )}

      {deleteConfirmTarget && (
        <DeleteConfirmModal
          deleteConfirmTarget={deleteConfirmTarget}
          setDeleteConfirmTarget={setDeleteConfirmTarget}
          handleConfirmDelete={handleConfirmDelete}
        />
      )}

      {isEditLogModalOpen && editingLog && (
        <EditSlaOlaLogModal
          editingLog={editingLog}
          editLogSlaVal={editLogSlaVal}
          setEditLogSlaVal={setEditLogSlaVal}
          editLogOlaVal={editLogOlaVal}
          setEditLogOlaVal={setEditLogOlaVal}
          setIsEditLogModalOpen={setIsEditLogModalOpen}
          handleSaveEditLog={handleSaveEditLog}
        />
      )}

      {deleteConfirmLog && (
        <DeleteSlaOlaLogModal
          deleteConfirmLog={deleteConfirmLog}
          setDeleteConfirmLog={setDeleteConfirmLog}
          handleConfirmDeleteLog={handleConfirmDeleteLog}
        />
      )}

      {isUserModalOpen && (
        <UserFormModal
          stations={stations}
          editingUser={editingUser}
          userForm={userForm}
          setUserForm={setUserForm}
          setIsUserModalOpen={setIsUserModalOpen}
          handleSaveUser={handleSaveUser}
        />
      )}

      {deleteConfirmUser && (
        <DeleteUserModal
          deleteConfirmUser={deleteConfirmUser}
          setDeleteConfirmUser={setDeleteConfirmUser}
          handleConfirmDeleteUser={handleConfirmDeleteUser}
        />
      )}

      {isPetugasModalOpen && (
        <PetugasFormModal
          editingPetugas={editingPetugas}
          petugasForm={petugasForm}
          setPetugasForm={setPetugasForm}
          setIsPetugasModalOpen={setIsPetugasModalOpen}
          handleSavePetugas={handleSavePetugas}
        />
      )}

      {deleteConfirmPetugas && (
        <DeletePetugasModal
          deleteConfirmPetugas={deleteConfirmPetugas}
          setDeleteConfirmPetugas={setDeleteConfirmPetugas}
          handleConfirmDeletePetugas={handleConfirmDeletePetugas}
        />
      )}
    </div>
  );
};