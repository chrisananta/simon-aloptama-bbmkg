import React, { useState, useEffect } from 'react';
import {
  Building2,
  Radio,
  History,
  Database,
  ShieldCheck,
  Activity,
  Users,
  UserCheck,
} from 'lucide-react';
import {
  UPTStation,
  AloptamaDevice,
  ChangeLog,
  LogAction,
  LogTable,
  EquipmentCategory,
  EquipmentStatus,
  CalibrationStatus
} from '../../shared/types';
import { AuthUser, UserRole } from '../auth/authTypes';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../../shared/api';
import { petugasService, PetugasItem } from '../../shared/services/petugasService';
import { SlaOlaLogRow } from './types';

import { MasterStasiunTab } from './tabs/MasterStasiunTab';
import { MasterAlatTab } from './tabs/MasterAlatTab';
import { MasterSlaOlaTab } from './tabs/MasterSlaOlaTab';
import { MonitoringSlaOlaTab } from './tabs/MonitoringSlaOlaTab';
import { MasterPetugasTab } from './tabs/MasterPetugasTab';
import { MasterAkunTab } from './tabs/MasterAkunTab';
import { LogPerubahanTab } from './tabs/LogPerubahanTab';

import { StationFormModal } from './modals/StationFormModal';
import { DeviceFormModal } from './modals/DeviceFormModal';
import { DeleteConfirmModal } from './modals/DeleteConfirmModal';
import { SlaOlaEditModal } from './modals/SlaOlaEditModal';
import { EditSlaOlaLogModal } from './modals/EditSlaOlaLogModal';
import { DeleteSlaOlaLogModal } from './modals/DeleteSlaOlaLogModal';
import { UserFormModal } from './modals/UserFormModal';
import { DeleteUserModal } from './modals/DeleteUserModal';
import { PetugasFormModal } from './modals/PetugasFormModal';
import { DeletePetugasModal } from './modals/DeletePetugasModal';


interface AdminMasterViewProps {
  stations: UPTStation[];
  devices: AloptamaDevice[];
  changeLogs: ChangeLog[];
  onAddStation: (station: UPTStation, actor: string) => void;
  onUpdateStation: (station: UPTStation, changesDetail: string, actor: string) => void;
  onDeleteStation: (stationId: string, stationName: string, actor: string) => void;
  onAddDevice: (device: AloptamaDevice, actor: string) => void | Promise<void>;
  onUpdateDevice: (device: AloptamaDevice, changesDetail: string, actor: string) => void | Promise<void>;
  onDeleteDevice: (deviceId: string, deviceName: string, actor: string) => void | Promise<void>;
  onClearLogs?: () => void;
  onSyncDevicesFromServer?: (devices: AloptamaDevice[]) => void;
}

type TabType = 'master_stasiun' | 'master_alat' | 'master_sla_ola' | 'monitoring_sla_ola' | 'master_petugas' | 'master_akun' | 'Log_Perubahan';

export const AdminMasterView: React.FC<AdminMasterViewProps> = ({
  stations,
  devices,
  changeLogs,
  onAddStation,
  onUpdateStation,
  onDeleteStation,
  onAddDevice,
  onUpdateDevice,
  onDeleteDevice,
  onClearLogs,
  onSyncDevicesFromServer,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<TabType>('master_stasiun');
  const [adminActor, setAdminActor] = useState<string>('Admin INSKAL BBMKG V');

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
      role: 'UPT_PIMPINAN',
      title: 'Operator UPT BMKG',
      nip: '',
      email: '',
      uptStation: stations[0]?.name || 'Stasiun Meteorologi Dok II Jayapura',
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

    if (editingUser) {
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
        role: (userForm.role as UserRole) || 'UPT_PIMPINAN',
        title: userForm.title?.trim() || 'Operator / Pimpinan UPT',
        nip: userForm.nip?.trim() || '',
        email: userForm.email?.trim() || '',
        uptStation: userForm.uptStation || 'BBMKG Wilayah V Papua',
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
        role: (userForm.role as UserRole) || 'UPT_PIMPINAN',
        title: userForm.title?.trim() || 'Operator UPT BMKG',
        nip: userForm.nip?.trim() || '',
        email: userForm.email?.trim() || '',
        uptStation: userForm.uptStation || 'BBMKG Wilayah V Papua',
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
      (u.uptStation && u.uptStation.toLowerCase().includes(query));

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
  const [alatSortOrder, setAlatSortOrder] = useState<'asc' | 'desc'>('asc');

  // --- LOG SEARCH & FILTERS ---
  const [logSearch, setLogSearch] = useState('');
  const [logTableFilter, setLogTableFilter] = useState<'ALL' | LogTable>('ALL');
  const [logActionFilter, setLogActionFilter] = useState<'ALL' | LogAction>('ALL');

  // --- MASTER SLA OLA TAB STATES ---
  const [selectedMonthSlaOla, setSelectedMonthSlaOla] = useState<string>('Juli');
  const [selectedYearSlaOla, setSelectedYearSlaOla] = useState<string>('2026');
  const [slaOlaSearchQuery, setSlaOlaSearchQuery] = useState<string>('');
  const [slaOlaUptFilter, setSlaOlaUptFilter] = useState<string>('ALL');
  const [slaOlaCategoryFilter, setSlaOlaCategoryFilter] = useState<string>('ALL');

  const [monthlySlaOlaData, setMonthlySlaOlaData] = useState<Record<string, { sla: number; ola: number }>>({});
  const [isLoadingMonthlySlaOla, setIsLoadingMonthlySlaOla] = useState<boolean>(false);

  const MONTH_NAME_TO_NUMBER: Record<string, number> = {
    'Januari': 1, 'Februari': 2, 'Maret': 3, 'April': 4, 'Mei': 5, 'Juni': 6,
    'Juli': 7, 'Agustus': 8, 'September': 9, 'Oktober': 10, 'November': 11, 'Desember': 12,
  };

  useEffect(() => {
    const bulanNum = MONTH_NAME_TO_NUMBER[selectedMonthSlaOla];
    const tahunNum = Number(selectedYearSlaOla);
    if (!bulanNum || !tahunNum) return;

    let cancelled = false;
    setIsLoadingMonthlySlaOla(true);
    apiClient.devices.getMonthlySlaOla(bulanNum, tahunNum)
      .then((data) => {
        if (!cancelled) setMonthlySlaOlaData(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMonthlySlaOla(false);
      });

    return () => { cancelled = true; };
  }, [selectedMonthSlaOla, selectedYearSlaOla]);

  const [isSlaOlaEditModalOpen, setIsSlaOlaEditModalOpen] = useState<boolean>(false);
  const [editingSlaDevice, setEditingSlaDevice] = useState<AloptamaDevice | null>(null);
  const [editSlaVal, setEditSlaVal] = useState<number>(0);
  const [editOlaVal, setEditOlaVal] = useState<number>(0);

  const currentYearNum = new Date().getFullYear();
  const maxYearNum = Math.max(2028, currentYearNum + 2);
  const dynamicYears: string[] = [];
  for (let y = 2024; y <= maxYearNum; y++) {
    dynamicYears.push(y.toString());
  }

  const getSlaOlaForDevice = (dev: AloptamaDevice) => {
    return monthlySlaOlaData[dev.devicesId] ?? { sla: 0, ola: 0 };
  };

  const handleOpenEditSlaOla = (dev: AloptamaDevice) => {
    setEditingSlaDevice(dev);
    const currentVal = getSlaOlaForDevice(dev);
    setEditSlaVal(currentVal.sla);
    setEditOlaVal(currentVal.ola);
    setIsSlaOlaEditModalOpen(true);
  };

  const handleSaveSlaOla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlaDevice) return;

    const sla = Math.min(100, Math.max(0, Math.round(Number(editSlaVal))));
    const ola = Math.min(100, Math.max(0, Math.round(Number(editOlaVal))));
    const bulanNum = MONTH_NAME_TO_NUMBER[selectedMonthSlaOla];
    const tahunNum = Number(selectedYearSlaOla);

    try {
      const { devices: updatedDevices } = await apiClient.devices.saveMonthlySlaOla({
        deviceId: editingSlaDevice.devicesId,
        uptStation: editingSlaDevice.uptStation,
        category: editingSlaDevice.category,
        kondisiSla: sla >= 100,
        ola,
        bulan: bulanNum,
        tahun: tahunNum,
        actor: adminActor,
      });

      setMonthlySlaOlaData((prev) => ({
        ...prev,
        [editingSlaDevice.devicesId]: { sla: sla >= 100 ? 100 : 0, ola },
      }));

      if (updatedDevices?.length) {
        onSyncDevicesFromServer?.(updatedDevices);
      }

      setIsSlaOlaEditModalOpen(false);
      setEditingSlaDevice(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan data SLA/OLA.');
    }
  };

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

  const filteredSlaDevices = devices.filter((dev) => {
    const matchesSearch =
      (dev.site || '').toLowerCase().includes(slaOlaSearchQuery.toLowerCase()) ||
      (dev.devicesId || '').toLowerCase().includes(slaOlaSearchQuery.toLowerCase()) ||
      (dev.uptStation || '').toLowerCase().includes(slaOlaSearchQuery.toLowerCase());

    const matchesUpt = slaOlaUptFilter === 'ALL' || dev.uptStation === slaOlaUptFilter;
    const matchesCategory = slaOlaCategoryFilter === 'ALL' || dev.category === slaOlaCategoryFilter;

    return matchesSearch && matchesUpt && matchesCategory;
  });

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
    uptStation: stations[0]?.name || 'Stasiun Meteorologi DEO Sorong',
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
  const categories: EquipmentCategory[] = ['AWOS Kat.I', 'AWOS Kat.II', 'AWOS Kat.III', 'AWS', 'ARG', 'Radar Cuaca', 'Lightning Detector', 'Seismometer', 'Accelerograph', 'WRS NG'];

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
    const matchesUpt = alatUptFilter === 'ALL' || d.uptStation === alatUptFilter;
    const matchesCat = alatCategoryFilter === 'ALL' || d.category === alatCategoryFilter;
    return matchesSearch && matchesUpt && matchesCat;
  })
  .sort((a, b) => {
    const result = (a.devicesId || '').localeCompare(b.devicesId || '', undefined, { numeric: true, sensitivity: 'base' });
    return alatSortOrder === 'asc' ? result : -result;
  });

  const filteredLogs = changeLogs.filter((log) => {
    const matchesSearch = 
      (log.recordName || '').toLowerCase().includes(logSearch.toLowerCase()) ||
      (log.recordId || '').toLowerCase().includes(logSearch.toLowerCase()) ||
      (log.actor || '').toLowerCase().includes(logSearch.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(logSearch.toLowerCase());
    const matchesTable = logTableFilter === 'ALL' || log.table === logTableFilter;
    const matchesAction = logActionFilter === 'ALL' || log.action === logActionFilter;
    return matchesSearch && matchesTable && matchesAction;
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
      uptStation: stations[0]?.name || 'Stasiun Meteorologi DEO Sorong',
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
    const existingPic = dev.picKalibrasi 
      || (dev.timkalibrasi?.toLowerCase().includes('pusat') ? 'Pusat' : 'Balai');

    setDeviceForm({
      ...dev,
      picKalibrasi: existingPic,
      slaScore: Math.round(dev.slaScore ?? 100),
      olaScore: Math.round(dev.olaScore ?? 100),
    });
    setIsDeviceModalOpen(true);
  };

  const handleSaveDevice = () => {
    if (!deviceForm.devicesId || !deviceForm.site) {
      alert('ID Alat dan Nama Alat wajib diisi.');
      return;
    }

    const sla = Math.min(100, Math.max(0, Math.round(Number(deviceForm.slaScore ?? 100))));
    const ola = Math.min(100, Math.max(0, Math.round(Number(deviceForm.olaScore ?? 100))));

    let autoStatus: EquipmentStatus = deviceForm.conditionStatus as EquipmentStatus || 'NORMAL';
    if (sla === 0 || ola === 0) {
      autoStatus = 'MATI';
    } else if (ola < 100) {
      autoStatus = 'GANGGUAN';
    } else if (ola >= 100 && sla > 0) {
      autoStatus = 'NORMAL';
    }

    const pic = deviceForm.picKalibrasi || 'Balai';
    const defaultAgency = pic === 'Pusat' ? 'BMKG Pusat' : 'Balai Besar MKG Wilayah V';

    if (editingDevice) {
      const updated: AloptamaDevice = {
        ...editingDevice,
        devicesId: deviceForm.devicesId,
        site: deviceForm.site,
        category: (deviceForm.category as EquipmentCategory) || 'AWS',
        merk: deviceForm.merk || '',
        uptStation: deviceForm.uptStation || stations[0]?.name || '',
        picKalibrasi: deviceForm.picKalibrasi || 'Balai',
        locationName: deviceForm.locationName || '',
        latitude: Number(deviceForm.latitude) || 0,
        longitude: Number(deviceForm.longitude) || 0,
        conditionStatus: autoStatus,
        calibrationStatus: (deviceForm.calibrationStatus as CalibrationStatus) || 'VALID',
        lastCalibrated: deviceForm.lastCalibrated || '2026-07-08',
        calibrationValidUntil: deviceForm.calibrationValidUntil || '2027-07-07',
        timkalibrasi: deviceForm.timkalibrasi || (deviceForm.picKalibrasi === 'Pusat' ? 'BMKG Pusat' : 'Balai Besar MKG Wilayah V'),
        slaScore: sla,
        olaScore: ola,
      };

      const changes: string[] = [];
      if (editingDevice.site !== updated.site) changes.push(`Nama: "${editingDevice.site}" -> "${updated.site}"`);
      if (editingDevice.category !== updated.category) changes.push(`Kategori: "${editingDevice.category}" -> "${updated.category}"`);
      if (editingDevice.uptStation !== updated.uptStation) changes.push(`UPT: "${editingDevice.uptStation}" -> "${updated.uptStation}"`);
      if (editingDevice.conditionStatus !== updated.conditionStatus) changes.push(`Status: "${editingDevice.conditionStatus}" -> "${updated.conditionStatus}"`);
      if (editingDevice.slaScore !== updated.slaScore) changes.push(`SLA: ${editingDevice.slaScore ?? 100}% -> ${updated.slaScore}%`);
      if (editingDevice.olaScore !== updated.olaScore) changes.push(`OLA: ${editingDevice.olaScore ?? 100}% -> ${updated.olaScore}%`);
      if (editingDevice.latitude !== updated.latitude || editingDevice.longitude !== updated.longitude) {
        changes.push(`Koordinat: (${editingDevice.latitude}, ${editingDevice.longitude}) -> (${updated.latitude}, ${updated.longitude})`);
      }

      const detailStr = changes.length > 0 ? changes.join('; ') : 'Pembaruan parameter data master alat & SLA OLA.';
      onUpdateDevice(updated, detailStr, adminActor);
    } else {
      const newDev: AloptamaDevice = {
        devicesId: deviceForm.devicesId || `ALT${Date.now()}`,
        site: deviceForm.site || '',
        category: (deviceForm.category as EquipmentCategory) || 'AWS',
        merk: deviceForm.merk || '',
        uptStation: deviceForm.uptStation || stations[0]?.name || '',
        picKalibrasi: pic,
        locationName: deviceForm.locationName || '',
        latitude: Number(deviceForm.latitude) || 0,
        longitude: Number(deviceForm.longitude) || 0,
        conditionStatus: autoStatus,
        calibrationStatus: (deviceForm.calibrationStatus as CalibrationStatus) || 'VALID',
        lastCalibrated: deviceForm.lastCalibrated || '2026-07-08',
        calibrationValidUntil: deviceForm.calibrationValidUntil || '2027-07-07',
        timkalibrasi: deviceForm.timkalibrasi || defaultAgency,
        slaScore: sla,
        olaScore: ola,
      };

      onAddDevice(newDev, adminActor);
    }

    setIsDeviceModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmTarget) return;

    if (deleteConfirmTarget.type === 'stasiun') {
      onDeleteStation(deleteConfirmTarget.id, deleteConfirmTarget.name, adminActor);
    } else {
      onDeleteDevice(deleteConfirmTarget.id, deleteConfirmTarget.name, adminActor);
    }

    setDeleteConfirmTarget(null);
  };

  const handleExportLogsCSV = () => {
    if (changeLogs.length === 0) {
      alert('Tidak ada log perubahan untuk diekspor.');
      return;
    }

    const headers = ['ID_LOG', 'TIMESTAMP', 'TABEL_MASTER', 'AKSI', 'RECORD_ID', 'NAMA_RECORD', 'ADMIN_PENGUBAH', 'DETAIL_PERUBAHAN'];
    const rows = changeLogs.map((log) => [
      log.id,
      `"${log.timestamp}"`,
      log.table,
      log.action,
      log.recordId,
      `"${log.recordName.replace(/"/g, '""')}"`,
      `"${log.actor}"`,
      `"${log.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Log_Perubahan_MasterDB_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. TOP TITLE HEADER */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-blue-50 text-[#0052CC] rounded-xl border border-blue-100 flex items-center justify-center shadow-xs shrink-0">
            <Database size={24} className="sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase rounded-full tracking-wider flex items-center gap-1">
                <ShieldCheck size={12} />
                Akses Hanya Admin
              </span>
              <span className="text-xs text-slate-400 hidden xs:inline">• BBMKG Wilayah V Papua</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Pengelolaan Database Master
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Ubah data <code className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded">master_stasiun</code>, <code className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded">master_alat</code>, serta audit jejak perubahan pada <code className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">Log_Perubahan</code>.
            </p>
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
                className="text-xs font-bold text-slate-800 bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-[#0052CC] w-32 sm:w-40"
                title="Nama Pengguna/Admin yang tercatat pada Log_Perubahan"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 border-b border-slate-200 pb-2">
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

        <button
          onClick={() => setActiveTab('master_sla_ola')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'master_sla_ola'
              ? 'bg-[#0052CC] text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Activity size={16} />
          <span>master_sla_ola</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'master_sla_ola' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            Bulanan
          </span>
        </button>

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

        <button
          onClick={() => setActiveTab('Log_Perubahan')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === 'Log_Perubahan'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History size={16} />
          <span>Log_Perubahan</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'Log_Perubahan' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {changeLogs.length} Log
          </span>
        </button>
      </div>

      {activeTab === 'master_stasiun' && (
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

      {activeTab === 'master_alat' && (
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
          handleOpenAddDevice={handleOpenAddDevice}
          handleOpenEditDevice={handleOpenEditDevice}
          setDeleteConfirmTarget={setDeleteConfirmTarget}
        />
      )}

      {activeTab === 'master_sla_ola' && (
        <MasterSlaOlaTab
          stations={stations}
          devices={devices}
          filteredSlaDevices={filteredSlaDevices}
          dynamicYears={dynamicYears}
          selectedMonthSlaOla={selectedMonthSlaOla}
          setSelectedMonthSlaOla={setSelectedMonthSlaOla}
          selectedYearSlaOla={selectedYearSlaOla}
          setSelectedYearSlaOla={setSelectedYearSlaOla}
          slaOlaSearchQuery={slaOlaSearchQuery}
          setSlaOlaSearchQuery={setSlaOlaSearchQuery}
          slaOlaUptFilter={slaOlaUptFilter}
          setSlaOlaUptFilter={setSlaOlaUptFilter}
          slaOlaCategoryFilter={slaOlaCategoryFilter}
          setSlaOlaCategoryFilter={setSlaOlaCategoryFilter}
          getSlaOlaForDevice={getSlaOlaForDevice}
          handleOpenEditSlaOla={handleOpenEditSlaOla}
        />
      )}

      {activeTab === 'monitoring_sla_ola' && (
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

      {activeTab === 'master_petugas' && (
        <MasterPetugasTab
          filteredPetugas={filteredPetugas}
          petugasSearch={petugasSearch}
          setPetugasSearch={setPetugasSearch}
          handleOpenAddPetugas={handleOpenAddPetugas}
          handleOpenEditPetugas={handleOpenEditPetugas}
          setDeleteConfirmPetugas={setDeleteConfirmPetugas}
        />
      )}

      {activeTab === 'master_akun' && (
        <MasterAkunTab
          filteredUsers={filteredUsers}
          userSearch={userSearch}
          setUserSearch={setUserSearch}
          userRoleFilter={userRoleFilter}
          setUserRoleFilter={setUserRoleFilter}
          handleOpenAddUser={handleOpenAddUser}
          handleOpenEditUser={handleOpenEditUser}
          setDeleteConfirmUser={setDeleteConfirmUser}
        />
      )}

      {activeTab === 'Log_Perubahan' && (
        <LogPerubahanTab
          filteredLogs={filteredLogs}
          logSearch={logSearch}
          setLogSearch={setLogSearch}
          logTableFilter={logTableFilter}
          setLogTableFilter={setLogTableFilter}
          logActionFilter={logActionFilter}
          setLogActionFilter={setLogActionFilter}
          handleExportLogsCSV={handleExportLogsCSV}
          onClearLogs={onClearLogs}
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
        />
      )}

      {deleteConfirmTarget && (
        <DeleteConfirmModal
          deleteConfirmTarget={deleteConfirmTarget}
          setDeleteConfirmTarget={setDeleteConfirmTarget}
          handleConfirmDelete={handleConfirmDelete}
        />
      )}

      {isSlaOlaEditModalOpen && editingSlaDevice && (
        <SlaOlaEditModal
          editingSlaDevice={editingSlaDevice}
          selectedMonthSlaOla={selectedMonthSlaOla}
          selectedYearSlaOla={selectedYearSlaOla}
          editSlaVal={editSlaVal}
          setEditSlaVal={setEditSlaVal}
          editOlaVal={editOlaVal}
          setEditOlaVal={setEditOlaVal}
          setIsSlaOlaEditModalOpen={setIsSlaOlaEditModalOpen}
          handleSaveSlaOla={handleSaveSlaOla}
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
