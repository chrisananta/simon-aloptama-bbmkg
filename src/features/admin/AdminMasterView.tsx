import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Radio, 
  History, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Filter, 
  X, 
  Check, 
  AlertTriangle, 
  Download, 
  ShieldCheck,
  MapPin,
  Calendar,
  Layers,
  Database,
  Key,
  KeyRound,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ShieldAlert,
  Activity,
  Users,
  UserPlus,
  UserCheck,
  FileText,
  User,
  Mail
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
import { OFFICIAL_SLA_OLA_REKAP, getMonthlyOverallRekap } from '../../shared/constants/slaOlaConstants';
import { petugasService, PetugasItem } from '../../shared/services/petugasService';

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
}

type TabType = 'master_stasiun' | 'master_alat' | 'master_sla_ola' | 'master_petugas' | 'master_akun' | 'Log_Perubahan';

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
  // 1. Ambil data secara eksplisit saat komponen dipasang
  petugasService.fetch().then(() => {
    refreshPetugas();
  });

  // 2. Pasang listener untuk update otomatis (misal setelah Tambah/Edit/Hapus)
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

  // --- MASTER AKUN / USER MANAGEMENT STATES ---
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
      // Check duplicate username
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
      // Check duplicate username
      const existing = users.find((u) => (u.username || '').toLowerCase() === cleanUsername);
      if (existing) {
        alert(`Username "@${cleanUsername}" sudah terdaftar.`);
        return;
      }

      const newUser: AuthUser = {
        id: userForm.id || `USR-${Date.now()}`,
        username: cleanUsername,
        // Kosongkan kalau admin tidak isi - backend akan generate password
        // acak & aman (menggantikan default lama "bmkg123" yang gampang ditebak).
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

  // Filtered Users List
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

  // Overrides map for custom edits per device per month/year
  const [monthlySlaOlaOverrides, setMonthlySlaOlaOverrides] = useState<Record<string, { sla: number; ola: number }>>({});

  // Edit SLA OLA Modal State
  const [isSlaOlaEditModalOpen, setIsSlaOlaEditModalOpen] = useState<boolean>(false);
  const [editingSlaDevice, setEditingSlaDevice] = useState<AloptamaDevice | null>(null);
  const [editSlaVal, setEditSlaVal] = useState<number>(0);
  const [editOlaVal, setEditOlaVal] = useState<number>(0);

  // Dynamic Year Generator starting from 2024 to future years automatically
  const currentYearNum = new Date().getFullYear();
  const maxYearNum = Math.max(2028, currentYearNum + 2);
  const dynamicYears: string[] = [];
  for (let y = 2024; y <= maxYearNum; y++) {
    dynamicYears.push(y.toString());
  }

  // Helper untuk mengambil SLA & OLA riil sesuai data SLA OLA ALOPTAMA
  const getSlaOlaForDevice = (dev: AloptamaDevice, month: string, year: string) => {
    const overrideKey = `${dev.id}_${month}_${year}`;
    if (monthlySlaOlaOverrides[overrideKey]) {
      return monthlySlaOlaOverrides[overrideKey];
    }

    // Jika tahun 2026 dan bulan merupakan data rekap resmi (Januari - Juli)
    if (year === '2026') {
      const monthItems = OFFICIAL_SLA_OLA_REKAP.filter(
        (item) => item.tahun === 2026 && item.bulan.toLowerCase() === month.toLowerCase()
      );

      if (monthItems.length > 0) {
        const devCat = (dev.category || '').toLowerCase();
        const devSub = (dev.subCategory || '').toLowerCase();
        const devName = (dev.name || '').toLowerCase();

        const matched = monthItems.find((item) => {
          const itemCat = item.peralatan.toLowerCase();
          if (devCat.includes('awos') || itemCat.includes('awos')) {
            if (devSub.includes('kat ii') || devSub.includes('kat iii') || devName.includes('kat ii') || devName.includes('kat iii')) {
              return itemCat.includes('kat ii & iii') || itemCat.includes('kat ii') || itemCat.includes('kat iii');
            }
            return itemCat.includes('kat. i') || itemCat.includes('kat i');
          }
          if (devCat.includes('radar') || itemCat.includes('radar')) return itemCat.includes('radar');
          if ((devCat === 'aws' || devCat.includes('aws')) && !devCat.includes('awos')) return itemCat === 'aws';
          if (devCat === 'arg' || devCat.includes('arg')) return itemCat === 'arg';
          if (devCat.includes('seismometer') || itemCat.includes('seismometer')) return itemCat.includes('seismometer');
          if (devCat.includes('lightning') || itemCat.includes('lightning')) return itemCat.includes('lightning');
          if (devCat.includes('accelerograph') || itemCat.includes('accelerograph')) return itemCat.includes('accelerograph');
          if (devCat.includes('wrs') || itemCat.includes('wrs')) return itemCat.includes('wrs');
          if (devCat.includes('sirene') || itemCat.includes('sirene')) return itemCat.includes('sirene');
          return false;
        });

        if (matched) {
          return {
            sla: Math.round(matched.sla ?? 100),
            ola: Math.round(matched.ola ?? 100),
          };
        }
      }
    }

    // Jika bulan baru / tidak ada datanya: buat 0
    return { sla: 0, ola: 0 };
  };

  const handleOpenEditSlaOla = (dev: AloptamaDevice) => {
    setEditingSlaDevice(dev);
    const currentVal = getSlaOlaForDevice(dev, selectedMonthSlaOla, selectedYearSlaOla);
    setEditSlaVal(currentVal.sla);
    setEditOlaVal(currentVal.ola);
    setIsSlaOlaEditModalOpen(true);
  };

  const handleSaveSlaOla = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlaDevice) return;

    const sla = Math.min(100, Math.max(0, Math.round(Number(editSlaVal))));
    const ola = Math.min(100, Math.max(0, Math.round(Number(editOlaVal))));

    const overrideKey = `${editingSlaDevice.id}_${selectedMonthSlaOla}_${selectedYearSlaOla}`;
    setMonthlySlaOlaOverrides((prev) => ({
      ...prev,
      [overrideKey]: { sla, ola },
    }));

    let newStatus: EquipmentStatus = 'NORMAL';
    if (sla === 0 || ola === 0) {
      newStatus = 'MATI';
    } else if (ola < 100) {
      newStatus = 'GANGGUAN';
    } else {
      newStatus = 'NORMAL';
    }

    const updatedDev: AloptamaDevice = {
      ...editingSlaDevice,
      slaScore: sla,
      olaScore: ola,
      conditionStatus: newStatus,
      lastReportedDate: new Date().toISOString().split('T')[0],
      issueDescription: newStatus === 'NORMAL' ? undefined : (newStatus === 'MATI' ? 'Mati Total (0%) - Diset Admin' : 'Kendala operasional dilaporkan Admin'),
    };

    const details = `Pembaruan Database SLA OLA [${selectedMonthSlaOla} ${selectedYearSlaOla}] pada alat "${editingSlaDevice.name}" (${editingSlaDevice.id}): SLA ${sla}%, OLA ${ola}% (Status ${newStatus})`;

    onUpdateDevice(updatedDev, details, adminActor);
    setIsSlaOlaEditModalOpen(false);
    setEditingSlaDevice(null);
  };

  const filteredSlaDevices = devices.filter((dev) => {
    const matchesSearch =
      (dev.name || '').toLowerCase().includes(slaOlaSearchQuery.toLowerCase()) ||
      (dev.id || '').toLowerCase().includes(slaOlaSearchQuery.toLowerCase()) ||
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
    code: '',
    name: '',
    regionGroup: 'Papua Barat Daya',
    location: '',
    latitude: 0,
    longitude: 0,
  });

  // --- FORM STATES FOR ALAT ---
  const [deviceForm, setDeviceForm] = useState<Partial<AloptamaDevice>>({
    id: '',
    name: '',
    category: 'AWS',
    subCategory: '',
    uptStation: stations[0]?.name || 'Stasiun Meteorologi DEO Sorong',
    locationName: '',
    latitude: 0,
    longitude: 0,
    conditionStatus: 'NORMAL',
    calibrationStatus: 'VALID',
    lastCalibrated: '2026-07-08',
    calibrationValidUntil: '2027-07-07',
    calibrationAgency: 'Balai Besar MKG Wilayah V',
  });

  // Unique region list for stations
  const regions = Array.from(new Set(stations.map((s) => s.regionGroup).filter(Boolean)));
  
  // Unique categories list for devices
  const categories: EquipmentCategory[] = ['AWOS Kat. I', 'AWOS Kat. II', 'AWOS Kat. III', 'AWS', 'ARG', 'Radar Cuaca', 'Lightning Detector', 'Seismometer', 'Accelerograph', 'WRS NG'];

  // Filtered stations
  const filteredStations = stations.filter((s) => {
    const matchesSearch = 
      (s.code || '').toLowerCase().includes(stasiunSearch.toLowerCase()) ||
      (s.name || '').toLowerCase().includes(stasiunSearch.toLowerCase()) ||
      (s.location || '').toLowerCase().includes(stasiunSearch.toLowerCase());
    const matchesRegion = stasiunRegionFilter === 'ALL' || s.regionGroup === stasiunRegionFilter;
    return matchesSearch && matchesRegion;
  });

  // Filtered devices
  const filteredDevices = devices.filter((d) => {
    const matchesSearch = 
      (d.id || '').toLowerCase().includes(alatSearch.toLowerCase()) ||
      (d.name || '').toLowerCase().includes(alatSearch.toLowerCase()) ||
      (d.locationName || '').toLowerCase().includes(alatSearch.toLowerCase());
    const matchesUpt = alatUptFilter === 'ALL' || d.uptStation === alatUptFilter;
    const matchesCat = alatCategoryFilter === 'ALL' || d.category === alatCategoryFilter;
    return matchesSearch && matchesUpt && matchesCat;
  });

  // Filtered logs
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

  // Open Modal for adding station
  const handleOpenAddStation = () => {
    setEditingStation(null);
    setStationForm({
      code: `MET0${stations.length + 1}`,
      name: '',
      regionGroup: 'Papua Barat Daya',
      location: '',
      latitude: -0.89,
      longitude: 131.28,
    });
    setIsStationModalOpen(true);
  };

  // Open Modal for editing station
  const handleOpenEditStation = (st: UPTStation) => {
    setEditingStation(st);
    setStationForm({ ...st });
    setIsStationModalOpen(true);
  };

  // Submit Station Form
  const handleSaveStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationForm.code || !stationForm.name) {
      alert('Kode dan Nama Stasiun UPT wajib diisi.');
      return;
    }

    if (editingStation) {
      // Update
      const updated: UPTStation = {
        ...editingStation,
        code: stationForm.code,
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
      // Add
      const newSt: UPTStation = {
        id: stationForm.code || `MET${Date.now()}`,
        code: stationForm.code || `MET${Date.now()}`,
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

  // Open Modal for adding device
  const handleOpenAddDevice = () => {
    setEditingDevice(null);
    const newId = `ALT0${(devices.length + 1).toString().padStart(3, '0')}`;
    setDeviceForm({
      id: newId,
      name: '',
      category: 'AWS',
      subCategory: '',
      uptStation: stations[0]?.name || 'Stasiun Meteorologi DEO Sorong',
      locationName: '',
      latitude: -0.89,
      longitude: 131.28,
      conditionStatus: 'NORMAL',
      calibrationStatus: 'VALID',
      lastCalibrated: '2026-07-08',
      calibrationValidUntil: '2027-07-07',
      calibrationAgency: 'Balai Besar MKG Wilayah V',
      slaScore: 100,
      olaScore: 100,
    });
    setIsDeviceModalOpen(true);
  };

  // Open Modal for editing device
  const handleOpenEditDevice = (dev: AloptamaDevice) => {
    setEditingDevice(dev);
    const existingPic = dev.picKalibrasi 
      || (dev.calibrationAgency?.toLowerCase().includes('pusat') ? 'Pusat' : 'Balai');

    setDeviceForm({
      ...dev,
      picKalibrasi: existingPic,
      slaScore: Math.round(dev.slaScore ?? 100),
      olaScore: Math.round(dev.olaScore ?? 100),
    });
    setIsDeviceModalOpen(true);
  };

  // Submit Device Form
  const handleSaveDevice = () => {
    if (!deviceForm.id || !deviceForm.name) {
      alert('ID Alat dan Nama Alat wajib diisi.');
      return;
    }

    const sla = Math.min(100, Math.max(0, Math.round(Number(deviceForm.slaScore ?? 100))));
    const ola = Math.min(100, Math.max(0, Math.round(Number(deviceForm.olaScore ?? 100))));

    // Auto calculate condition status based on SLA & OLA rules
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
        id: deviceForm.id,
        name: deviceForm.name,
        category: (deviceForm.category as EquipmentCategory) || 'AWS',
        subCategory: deviceForm.subCategory || '',
        uptStation: deviceForm.uptStation || stations[0]?.name || '',
        picKalibrasi: deviceForm.picKalibrasi || 'Balai',
        locationName: deviceForm.locationName || '',
        latitude: Number(deviceForm.latitude) || 0,
        longitude: Number(deviceForm.longitude) || 0,
        conditionStatus: autoStatus,
        calibrationStatus: (deviceForm.calibrationStatus as CalibrationStatus) || 'VALID',
        lastCalibrated: deviceForm.lastCalibrated || '2026-07-08',
        calibrationValidUntil: deviceForm.calibrationValidUntil || '2027-07-07',
        calibrationAgency: deviceForm.calibrationAgency || (deviceForm.picKalibrasi === 'Pusat' ? 'BMKG Pusat' : 'Balai Besar MKG Wilayah V'),
        slaScore: sla,
        olaScore: ola,
      };

      const changes: string[] = [];
      if (editingDevice.name !== updated.name) changes.push(`Nama: "${editingDevice.name}" -> "${updated.name}"`);
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
        id: deviceForm.id || `ALT${Date.now()}`,
        name: deviceForm.name || '',
        category: (deviceForm.category as EquipmentCategory) || 'AWS',
        subCategory: deviceForm.subCategory || '',
        uptStation: deviceForm.uptStation || stations[0]?.name || '',
        picKalibrasi: pic,
        locationName: deviceForm.locationName || '',
        latitude: Number(deviceForm.latitude) || 0,
        longitude: Number(deviceForm.longitude) || 0,
        conditionStatus: autoStatus,
        calibrationStatus: (deviceForm.calibrationStatus as CalibrationStatus) || 'VALID',
        lastCalibrated: deviceForm.lastCalibrated || '2026-07-08',
        calibrationValidUntil: deviceForm.calibrationValidUntil || '2027-07-07',
        calibrationAgency: deviceForm.calibrationAgency || defaultAgency,
        slaScore: sla,
        olaScore: ola,
      };

      onAddDevice(newDev, adminActor);
    }

    setIsDeviceModalOpen(false);
  };

  // Confirm deletion action
  const handleConfirmDelete = () => {
    if (!deleteConfirmTarget) return;

    if (deleteConfirmTarget.type === 'stasiun') {
      onDeleteStation(deleteConfirmTarget.id, deleteConfirmTarget.name, adminActor);
    } else {
      onDeleteDevice(deleteConfirmTarget.id, deleteConfirmTarget.name, adminActor);
    }

    setDeleteConfirmTarget(null);
  };

  // Export Log_Perubahan to CSV
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

        {/* Admin identity */}
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

      {/* 3. TAB CONTENT */}

      {/* ================= TAB 1: MASTER STASIUN ================= */}
      {activeTab === 'master_stasiun' && (
        <div className="space-y-4">
          {/* Controls & Search bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row gap-3 justify-between items-center shadow-2xs">
            <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari Kode, Nama Stasiun, atau Lokasi..."
                  value={stasiunSearch}
                  onChange={(e) => setStasiunSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0052CC] focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                <select
                  value={stasiunRegionFilter}
                  onChange={(e) => setStasiunRegionFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0052CC]"
                >
                  <option value="ALL">Semua Wilayah Provinsi</option>
                  {regions.map((reg) => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleOpenAddStation}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0052CC] hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>Tambah Stasiun UPT</span>
            </button>
          </div>

          {/* Table Stasiun */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3.5 pl-4">Kode UPT</th>
                    <th className="p-3.5">Nama Stasiun UPT</th>
                    <th className="p-3.5">Kelompok Wilayah</th>
                    <th className="p-3.5">Kabupaten / Kota</th>
                    <th className="p-3.5">Koordinat (Lat, Lng)</th>
                    <th className="p-3.5 text-center">Jumlah Alat</th>
                    <th className="p-3.5 pr-4 text-center">Aksi Master</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredStations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Tidak ada data stasiun UPT yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredStations.map((st) => {
                      const deviceCount = devices.filter((d) => {
                        if (!d.uptStation) return false;
                        const upt = (d.uptStation || '').trim().toLowerCase();
                        const stName = (st.name || '').trim().toLowerCase();
                        const stCode = st.code ? st.code.trim().toLowerCase() : '';
                        const stId = st.id ? st.id.trim().toLowerCase() : '';
                        return (stName && upt === stName) || (stCode && upt === stCode) || (stId && upt === stId);
                      }).length;

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 pl-4 font-bold text-[#0052CC] whitespace-nowrap">
                            {st.code}
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">
                            {st.name}
                          </td>
                          <td className="p-3.5">
                            <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 font-semibold text-[11px] rounded-md border border-blue-100">
                              {st.regionGroup}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-600">{st.location}</td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {typeof st.latitude === 'number' ? st.latitude.toFixed(3) : (st.latitude || 0)}, {typeof st.longitude === 'number' ? st.longitude.toFixed(3) : (st.longitude || 0)}
                          </td>
                          <td className="p-3.5 text-center font-bold">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-full text-[11px]">
                              {deviceCount} Alat
                            </span>
                          </td>
                          <td className="p-3.5 pr-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditStation(st)}
                                className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Data Stasiun Master"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmTarget({ type: 'stasiun', id: st.id, name: st.name })}
                                className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Data Stasiun Master"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: MASTER ALAT ================= */}
      {activeTab === 'master_alat' && (
        <div className="space-y-4">
          {/* Controls & Search bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row gap-3 justify-between items-center shadow-2xs">
            <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari ID Alat, Nama Peralatan, Lokasi..."
                  value={alatSearch}
                  onChange={(e) => setAlatSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0052CC] focus:bg-white"
                />
              </div>

              {/* Filter UPT */}
              <div className="flex items-center gap-1.5">
                <select
                  value={alatUptFilter}
                  onChange={(e) => setAlatUptFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0052CC] max-w-[180px] truncate"
                >
                  <option value="ALL">Semua Stasiun UPT</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Filter Category */}
              <div className="flex items-center gap-1.5">
                <select
                  value={alatCategoryFilter}
                  onChange={(e) => setAlatCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0052CC]"
                >
                  <option value="ALL">Semua Kategori Alat</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleOpenAddDevice}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0052CC] hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>Tambah Alat Master</span>
            </button>
          </div>

          {/* Table Master Alat */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3.5 pl-4">ID Alat</th>
                    <th className="p-3.5">Nama Peralatan</th>
                    <th className="p-3.5">Kategori</th>
                    <th className="p-3.5">Stasiun UPT Pengelola</th>
                    <th className="p-3.5 text-center">PIC Kalibrasi</th>
                    <th className="p-3.5 text-center">Status Kalibrasi</th>
                    <th className="p-3.5">Masa Berlaku</th>
                    <th className="p-3.5 pr-4 text-center">Aksi Master</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Tidak ada peralatan yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredDevices.slice(0, 100).map((dev) => (
                      <tr key={dev.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-4 font-mono font-bold text-[#0052CC] whitespace-nowrap">
                          {dev.id}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          <div>{dev.name}</div>
                          <span className="text-[10px] text-slate-400 font-normal">{dev.locationName}</span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[11px] rounded-md border border-slate-200">
                            {dev.category}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 max-w-[200px] truncate" title={dev.uptStation}>
                          {dev.uptStation}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {(dev.picKalibrasi === 'Pusat' || dev.picKalibrasi === 'PUSAT') ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded-full border border-emerald-200">
                              PUSAT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded-full border border-emerald-200">
                              BALAI
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {dev.calibrationStatus === 'VALID' && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-extrabold text-[10px] rounded-full border border-blue-200">
                              VALID
                            </span>
                          )}
                          {dev.calibrationStatus === 'SEGERA_DIKALIBRASI' && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-extrabold text-[10px] rounded-full border border-amber-200">
                              SEGERA
                            </span>
                          )}
                          {dev.calibrationStatus === 'KADALUWARSA' && (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-extrabold text-[10px] rounded-full border border-rose-200">
                              KADALUWARSA
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          s/d {dev.calibrationValidUntil}
                        </td>
                        <td className="p-3.5 pr-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditDevice(dev)}
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Data Master Alat"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmTarget({ type: 'alat', id: dev.id, name: dev.name })}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Data Master Alat"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredDevices.length > 100 && (
              <div className="p-3 text-center bg-slate-50 text-slate-500 text-xs border-t border-slate-200">
                Menampilkan 100 dari total {filteredDevices.length} peralatan. Gunakan filter untuk penyaringan lebih spesifik.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: MASTER SLA & OLA BULANAN ================= */}
      {activeTab === 'master_sla_ola' && (
        <div className="space-y-4">
          {/* Header Banner & Filters */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Activity size={18} className="text-[#0052CC]" />
                  Database Master SLA &amp; OLA Bulanan Peralatan
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Input, ubah, dan overwrite persentase SLA (Ketersediaan) serta OLA (Performa) secara khusus per bulan dan tahun acuan.
                </p>
              </div>

              {/* Month and Year Selector */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-900">
                  <span>Bulan Acuan:</span>
                  <select
                    value={selectedMonthSlaOla}
                    onChange={(e) => setSelectedMonthSlaOla(e.target.value)}
                    className="bg-transparent font-extrabold text-[#0052CC] focus:outline-none cursor-pointer"
                  >
                    {[
                      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                    ].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-900">
                  <span>Tahun Acuan:</span>
                  <select
                    value={selectedYearSlaOla}
                    onChange={(e) => setSelectedYearSlaOla(e.target.value)}
                    className="bg-transparent font-extrabold text-[#0052CC] focus:outline-none cursor-pointer"
                  >
                    {dynamicYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari ID Alat, Nama Peralatan, atau Stasiun UPT..."
                  value={slaOlaSearchQuery}
                  onChange={(e) => setSlaOlaSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0052CC] focus:bg-white font-medium"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={slaOlaUptFilter}
                  onChange={(e) => setSlaOlaUptFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#0052CC]"
                >
                  <option value="ALL">Semua Stasiun UPT ({stations.length})</option>
                  {stations.map((st) => (
                    <option key={st.id} value={st.name}>{st.name}</option>
                  ))}
                </select>

                <select
                  value={slaOlaCategoryFilter}
                  onChange={(e) => setSlaOlaCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#0052CC]"
                >
                  <option value="ALL">Semua Kategori Peralatan</option>
                  {Array.from(new Set([
                    'AWOS', 'AWS', 'ARG', 'Radar Cuaca', 'Lightning Detector', 'Seismometer', 'Accelerograph', 'WRS NG',
                    ...devices.map((d) => d.category)
                  ].filter(Boolean))).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

            {/* Metric Overview Cards for Selected Month & Year */}
            {(() => {
              const devScores = filteredSlaDevices.map(d => getSlaOlaForDevice(d, selectedMonthSlaOla, selectedYearSlaOla));
              
              // Hitung rata-rata riil langsung dari devScores per alat
              const avgSla = filteredSlaDevices.length > 0
                ? Math.round(devScores.reduce((sum, s) => sum + s.sla, 0) / filteredSlaDevices.length)
                : 0;

              const avgOla = filteredSlaDevices.length > 0
                ? Math.round(devScores.reduce((sum, s) => sum + s.ola, 0) / filteredSlaDevices.length)
                : 0;
              
              const normalCount = devScores.filter(s => s.sla > 0 && s.ola >= 97).length;
              const gangguanCount = devScores.filter(s => (s.sla > 0 || s.ola > 0) && s.ola < 97).length;
              const matiCount = devScores.filter(s => s.sla === 0 && s.ola === 0).length;
              
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Alat Terpantau</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">{filteredSlaDevices.length} Unit</span>
                  <span className="text-[10px] text-slate-400">Periode {selectedMonthSlaOla} {selectedYearSlaOla}</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/30">
                  <span className="text-[11px] font-bold text-blue-700 uppercase block">Rata-Rata SLA</span>
                  <span className="text-2xl font-black text-[#0052CC] mt-1 block">
                    {avgSla}%
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold">Ketersediaan Peralatan</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/30">
                  <span className="text-[11px] font-bold text-indigo-700 uppercase block">Rata-Rata OLA (Performa)</span>
                  <span className="text-2xl font-black text-indigo-800 mt-1 block">
                    {avgOla}%
                  </span>
                  <span className="text-[10px] text-indigo-600 font-semibold">Tingkat Unjuk Kerja Alat</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Kondisi Status Alat</span>
                  <div className="flex items-center gap-2 mt-2 text-[11px] font-bold">
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                      🟢 {normalCount}
                    </span>
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                      🟡 {gangguanCount}
                    </span>
                    <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded">
                      🔴 {matiCount}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* SLA OLA Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="p-3.5 pl-4">Nama Peralatan &amp; ID</th>
                    <th className="p-3.5">Kategori</th>
                    <th className="p-3.5">Stasiun UPT Pengelola</th>
                    <th className="p-3.5 text-center">Bulan &amp; Tahun</th>
                    <th className="p-3.5 text-center">SLA</th>
                    <th className="p-3.5 text-center">OLA</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 pr-4 text-center">Overwrite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredSlaDevices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Tidak ada data peralatan yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredSlaDevices.map((dev) => {
                      const { sla: slaVal, ola: olaVal } = getSlaOlaForDevice(dev, selectedMonthSlaOla, selectedYearSlaOla);
                      const isZero = slaVal === 0 && olaVal === 0;

                      return (
                        <tr key={dev.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 pl-4 font-bold text-slate-900">
                            <div>{dev.name}</div>
                            <span className="font-mono text-[10px] text-[#0052CC] font-bold">{dev.id}</span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[11px] rounded-md border border-slate-200">
                              {dev.category}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-600 max-w-[200px] truncate" title={dev.uptStation}>
                            {dev.uptStation}
                          </td>
                          <td className="p-3.5 text-center font-bold text-slate-800 whitespace-nowrap">
                            <span className="px-2 py-1 bg-slate-100 rounded-md text-[11px] border border-slate-200">
                              {selectedMonthSlaOla} {selectedYearSlaOla}
                            </span>
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap font-bold">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] border ${
                              slaVal >= 97 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : slaVal === 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {slaVal}%
                            </span>
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap font-bold">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] border ${
                              olaVal >= 97 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : olaVal === 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {olaVal}%
                            </span>
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            {isZero ? (
                              <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-extrabold text-[10px] rounded-full border border-rose-300">
                                🔴 MATI (0%)
                              </span>
                            ) : olaVal >= 97 ? (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full border border-emerald-300">
                                🟢 NORMAL ({olaVal}%)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-extrabold text-[10px] rounded-full border border-amber-300">
                                🟡 GANGGUAN ({olaVal}%)
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 pr-4 text-center">
                            <button
                              onClick={() => handleOpenEditSlaOla(dev)}
                              className="px-3 py-1.5 bg-[#0052CC] hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1.5 mx-auto cursor-pointer"
                            >
                              <Edit2 size={13} />
                              <span>Edit SLA/OLA</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: MASTER PETUGAS MONITORING ================= */}
      {activeTab === 'master_petugas' && (
        <div className="space-y-4">
          {/* Header Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row gap-3 justify-between items-center shadow-2xs">
            <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari Nama Petugas, NIP, Jabatan..."
                  value={petugasSearch}
                  onChange={(e) => setPetugasSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0052CC] focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={handleOpenAddPetugas}
                title="Tambah Personil Petugas Monitoring Baru"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm bg-[#0052CC] hover:bg-blue-800 text-white cursor-pointer"
              >
                <UserPlus size={16} />
                <span>Tambah Personil Petugas</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <UserCheck size={18} className="text-[#0052CC]" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Daftar Personil Petugas Monitoring ({filteredPetugas.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Personil tercatat secara resmi pada Laporan Mingguan Aloptama
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3.5 pl-4 w-12 text-center">No</th>
                    <th className="p-3.5">Nama Lengkap &amp; Gelar</th>
                    <th className="p-3.5">NIP</th>
                    <th className="p-3.5">Jabatan / Peran</th>
                    <th className="p-3.5 pr-4 text-center">Aksi (Admin)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredPetugas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Tidak ada data personil petugas monitoring.
                      </td>
                    </tr>
                  ) : (
                    filteredPetugas.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-[#0052CC] flex items-center justify-center font-black text-xs shrink-0">
                              {p.name.charAt(0)}
                            </div>
                            <div>
                              <span>{p.name}</span>
                              <div className="text-[10px] text-slate-400 font-mono font-normal">{p.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">
                          {p.nip ? p.nip : <span className="text-slate-300 italic">-</span>}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-1 bg-blue-50 text-[#0052CC] border border-blue-100 rounded-lg font-semibold text-[11px]">
                            {p.jabatan || 'Staf Operasional'}
                          </span>
                        </td>
                        <td className="p-3.5 pr-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditPetugas(p)}
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Personil Petugas"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmPetugas(p)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Personil Petugas"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB: MASTER AKUN PENGGUNA ================= */}
      {activeTab === 'master_akun' && (
        <div className="space-y-4">
          {/* Header Stats & Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row gap-3 justify-between items-center shadow-2xs">
            <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari Username, Nama, NIP, atau Stasiun UPT..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0052CC] focus:bg-white"
                />
              </div>

              {/* Filter Role */}
              <div className="flex items-center gap-1.5">
                <Filter size={15} className="text-slate-400" />
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0052CC]"
                >
                  <option value="ALL">Semua Peran Access Level</option>
                  <option value="ADMIN">ADMIN (Inskal & Balai)</option>
                  <option value="UPT_PIMPINAN">UPT & Pimpinan</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button
                onClick={handleOpenAddUser}
                title="Tambah Akun Pengguna Baru"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-sm bg-[#0052CC] hover:bg-blue-800 text-white cursor-pointer"
              >
                <Plus size={16} />
                <span>Tambah Akun Pengguna</span>
              </button>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#0052CC]" />
                <h3 className="font-bold text-slate-800 text-sm">Daftar Akun Pengguna Sistem SIMON ({filteredUsers.length})</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Autentikasi Hak Akses Role-Based (RBAC) &amp; Session Management
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3.5 pl-4">Pengguna</th>
                    <th className="p-3.5">Username (ID Login)</th>
                    <th className="p-3.5 text-center">Peran Access Level</th>
                    <th className="p-3.5">Jabatan &amp; NIP</th>
                    <th className="p-3.5">Stasiun UPT</th>
                    <th className="p-3.5">Email Kontak</th>
                    <th className="p-3.5 pr-4 text-center">Aksi (Admin)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Tidak ada akun pengguna yang memenuhi kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0052CC] flex items-center justify-center font-bold text-xs">
                                {u.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900">{u.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{u.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 whitespace-nowrap font-mono">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold text-xs border border-slate-200">
                            @{u.username}
                          </span>
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {u.role === 'ADMIN' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              <ShieldCheck size={12} /> ADMIN INSKAL
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <User size={12} /> UPT &amp; PIMPINAN
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{u.title}</div>
                          {u.nip && <div className="text-[10px] text-slate-400 font-mono">NIP: {u.nip}</div>}
                        </td>
                        <td className="p-3.5 font-medium text-slate-700">
                          {u.uptStation || '-'}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {u.email || '-'}
                        </td>
                        <td className="p-3.5 pr-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              title="Ubah Nama & Username"
                              className="p-1.5 rounded-lg border transition-all bg-blue-50 text-[#0052CC] border-blue-200 hover:bg-blue-100 cursor-pointer"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmUser(u)}
                              title="Hapus Akun Pengguna"
                              className="p-1.5 rounded-lg border transition-all bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: LOG PERUBAHAN ================= */}
      {activeTab === 'Log_Perubahan' && (
        <div className="space-y-4">
          {/* Controls & Action Buttons */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col md:flex-row gap-3 justify-between items-center shadow-2xs">
            <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari ID/Nama Record, Pengubah, atau Detail..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0052CC] focus:bg-white"
                />
              </div>

              {/* Filter Tabel Target */}
              <div className="flex items-center gap-1.5">
                <select
                  value={logTableFilter}
                  onChange={(e) => setLogTableFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0052CC]"
                >
                  <option value="ALL">Semua Tabel Target</option>
                  <option value="master_stasiun">master_stasiun</option>
                  <option value="master_alat">master_alat</option>
                  <option value="master_sla_ola">master_sla_ola</option>
                  <option value="master_akun">master_akun</option>
                </select>
              </div>

              {/* Filter Jenis Aksi */}
              <div className="flex items-center gap-1.5">
                <select
                  value={logActionFilter}
                  onChange={(e) => setLogActionFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0052CC]"
                >
                  <option value="ALL">Semua Jenis Aksi</option>
                  <option value="TAMBAH">TAMBAH</option>
                  <option value="EDIT">EDIT</option>
                  <option value="HAPUS">HAPUS</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportLogsCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all cursor-pointer"
              >
                <Download size={15} />
                <span>Ekspor CSV</span>
              </button>

              {onClearLogs && (
                <button
                  onClick={() => {
                    if (confirm('Apakah Anda yakin ingin mengosongkan seluruh riwayat Log Perubahan?')) {
                      onClearLogs();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-all cursor-pointer"
                >
                  <Trash2 size={15} />
                  <span>Bersihkan Log</span>
                </button>
              )}
            </div>
          </div>

          {/* Table Log_Perubahan */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3.5 pl-4">ID Log & Waktu</th>
                    <th className="p-3.5">Tabel Target</th>
                    <th className="p-3.5 text-center">Jenis Aksi</th>
                    <th className="p-3.5">ID / Nama Item Target</th>
                    <th className="p-3.5">Admin / Pengubah</th>
                    <th className="p-3.5 pr-4">Detail Perubahan Database</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Belum ada riwayat perubahan database yang terekam.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-800 text-[11px]">{log.id}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar size={11} />
                            <span>{log.timestamp}</span>
                          </div>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <code className="px-2 py-0.5 bg-blue-50 text-[#0052CC] font-bold text-[11px] rounded border border-blue-100">
                            {log.table}
                          </code>
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {log.action === 'TAMBAH' && (
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded-full border border-emerald-200">
                              + TAMBAH
                            </span>
                          )}
                          {log.action === 'EDIT' && (
                            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 font-extrabold text-[10px] rounded-full border border-amber-200">
                              ✎ EDIT
                            </span>
                          )}
                          {log.action === 'HAPUS' && (
                            <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 font-extrabold text-[10px] rounded-full border border-rose-200">
                              ✕ HAPUS
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{log.recordName}</div>
                          <code className="text-[10px] text-slate-400">{log.recordId}</code>
                        </td>
                        <td className="p-3.5 text-slate-800 font-medium whitespace-nowrap">
                          {log.actor}
                        </td>
                        <td className="p-3.5 pr-4 text-slate-600 max-w-xs md:max-w-md break-words">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT STASIUN ================= */}
      {isStationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-[#0052CC]" />
                <h3 className="font-extrabold text-slate-900 text-lg">
                  {editingStation ? 'Edit Master Stasiun UPT' : 'Tambah Stasiun UPT Baru'}
                </h3>
              </div>
              <button 
                onClick={() => setIsStationModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStation} className="space-y-4 text-xs text-slate-700">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Kode Stasiun UPT</label>
                <input
                  type="text"
                  required
                  value={stationForm.code || ''}
                  onChange={(e) => setStationForm({ ...stationForm, code: e.target.value })}
                  placeholder="Contoh: MET015"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0052CC] font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Nama Resmi Stasiun UPT</label>
                <input
                  type="text"
                  required
                  value={stationForm.name || ''}
                  onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                  placeholder="Contoh: Stasiun Meteorologi Nabire"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0052CC]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Kelompok Wilayah (Provinsi)</label>
                  <select
                    value={stationForm.regionGroup || 'Papua Barat Daya'}
                    onChange={(e) => setStationForm({ ...stationForm, regionGroup: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0052CC]"
                  >
                    <option value="Papua">Papua</option>
                    <option value="Papua Barat">Papua Barat</option>
                    <option value="Papua Barat Daya">Papua Barat Daya</option>
                    <option value="Papua Tengah">Papua Tengah</option>
                    <option value="Papua Selatan">Papua Selatan</option>
                    <option value="Papua Pegunungan">Papua Pegunungan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Lokasi Kabupaten / Kota</label>
                  <input
                    type="text"
                    value={stationForm.location || ''}
                    onChange={(e) => setStationForm({ ...stationForm, location: e.target.value })}
                    placeholder="Contoh: Nabire"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0052CC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Latitude (LS)</label>
                  <input
                    type="number"
                    step="any"
                    value={stationForm.latitude || 0}
                    onChange={(e) => setStationForm({ ...stationForm, latitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0052CC] font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Longitude (BT)</label>
                  <input
                    type="number"
                    step="any"
                    value={stationForm.longitude || 0}
                    onChange={(e) => setStationForm({ ...stationForm, longitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0052CC] font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-800">
                Setiap perubahan pada form ini akan dicatat otomatis ke dalam audit trail <strong className="font-bold">Log_Perubahan</strong>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStationModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0052CC] hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Simpan Stasiun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT ALAT ================= */}
      {isDeviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 space-y-5 animate-scaleUp my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Radio size={20} className="text-[#0052CC]" />
                <h3 className="font-extrabold text-slate-900 text-lg">
                  {editingDevice ? 'Edit Master Peralatan' : 'Tambah Peralatan Master Baru'}
                </h3>
              </div>
              <button 
                onClick={() => setIsDeviceModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDevice} className="space-y-4 text-xs text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">ID Alat (Kode Master)</label>
                  <input
                    type="text"
                    required
                    value={deviceForm.id || ''}
                    onChange={(e) => setDeviceForm({ ...deviceForm, id: e.target.value })}
                    placeholder="Contoh: ALT0191"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0052CC] font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Kategori Peralatan</label>
                  <select
                    value={deviceForm.category || 'AWS'}
                    onChange={(e) => setDeviceForm({ ...deviceForm, category: e.target.value as EquipmentCategory })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0052CC] font-bold"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Nama Lengkap Peralatan</label>
                <input
                  type="text"
                  required
                  value={deviceForm.name || ''}
                  onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                  placeholder="Contoh: AWOS KAT III Bandara Sentani"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0052CC] font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Stasiun UPT Pengelola</label>
                  <select
                    value={deviceForm.uptStation || ''}
                    onChange={(e) => setDeviceForm({ ...deviceForm, uptStation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0052CC]"
                  >
                    {stations.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Nama Spesifik Lokasi Pasang</label>
                  <input
                    type="text"
                    value={deviceForm.locationName || ''}
                    onChange={(e) => setDeviceForm({ ...deviceForm, locationName: e.target.value })}
                    placeholder="Contoh: Taman Alat Stamet Sentani"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0052CC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">PIC Kalibrasi</label>
                  <select
                    value={deviceForm.picKalibrasi || 'Balai'}
                    onChange={(e) => {
                      const selectedPic = e.target.value;
                      setDeviceForm({
                        ...deviceForm,
                        picKalibrasi: selectedPic,
                        calibrationAgency: selectedPic === 'Pusat' ? 'BMKG Pusat' : 'Balai Besar MKG Wilayah V'
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0052CC] font-bold"
                  >
                    <option value="Balai">Balai (BBMKG Wilayah V)</option>
                    <option value="Pusat">Pusat (BMKG Pusat)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Status Kalibrasi</label>
                  <select
                    value={deviceForm.calibrationStatus || 'VALID'}
                    onChange={(e) => setDeviceForm({ ...deviceForm, calibrationStatus: e.target.value as CalibrationStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0052CC] font-bold"
                  >
                    <option value="VALID">VALID (Sertifikat Berlaku)</option>
                    <option value="SEGERA_DIKALIBRASI">SEGERA_DIKALIBRASI</option>
                    <option value="KADALUWARSA">KADALUWARSA</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Tanggal Terakhir Kalibrasi</label>
                  <input
                    type="date"
                    value={deviceForm.lastCalibrated || '2026-07-08'}
                    onChange={(e) => setDeviceForm({ ...deviceForm, lastCalibrated: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0052CC]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Masa Berlaku Sertifikat Valid Until</label>
                  <input
                    type="date"
                    value={deviceForm.calibrationValidUntil || '2027-07-07'}
                    onChange={(e) => setDeviceForm({ ...deviceForm, calibrationValidUntil: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0052CC]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Latitude (LS)</label>
                  <input
                    type="number"
                    step="any"
                    value={deviceForm.latitude || 0}
                    onChange={(e) => setDeviceForm({ ...deviceForm, latitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0052CC] font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Longitude (BT)</label>
                  <input
                    type="number"
                    step="any"
                    value={deviceForm.longitude || 0}
                    onChange={(e) => setDeviceForm({ ...deviceForm, longitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0052CC] font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-800">
                Pembaruan alat ini akan langsung memperbarui pemetaan peta interaktif dan tercatat pada <strong className="font-bold">Log_Perubahan</strong>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeviceModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0052CC] hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Simpan Peralatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL CONFIRM DELETE ================= */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">Konfirmasi Hapus Data</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data master {deleteConfirmTarget.type === 'stasiun' ? 'Stasiun UPT' : 'Peralatan'}{' '}
              <strong className="text-slate-900 font-bold">"{deleteConfirmTarget.name}"</strong> (ID: {deleteConfirmTarget.id})? Tindakan ini akan dicatat ke audit log database.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MODAL EDIT SLA OLA KHUSUS TAB DATABASE SLA OLA */}
      {isSlaOlaEditModalOpen && editingSlaDevice && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-[#0A203C] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={20} className="text-blue-400" />
                <h3 className="font-bold text-sm">Input / Overwrite SLA &amp; OLA Bulanan</h3>
              </div>
              <button
                onClick={() => setIsSlaOlaEditModalOpen(false)}
                className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSlaOla} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <p className="font-bold text-slate-900">{editingSlaDevice.name}</p>
                <p className="text-slate-500">ID: <span className="font-mono text-blue-700 font-bold">{editingSlaDevice.id}</span> | UPT: {editingSlaDevice.uptStation}</p>
                <p className="text-[#0052CC] font-bold">Periode Acuan: {selectedMonthSlaOla} {selectedYearSlaOla}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  SLA Bulanan (% Ketersediaan / Alat ON):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editSlaVal}
                    onChange={(e) => setEditSlaVal(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-sm outline-none focus:border-[#0052CC]"
                    required
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditSlaVal(100)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${editSlaVal === 100 ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-100 text-slate-700'}`}
                    >
                      100% (ON)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditSlaVal(0);
                        setEditOlaVal(0);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${editSlaVal === 0 ? 'bg-rose-600 text-white border-rose-700' : 'bg-slate-100 text-slate-700'}`}
                    >
                      0% (OFF)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  OLA Bulanan (% Nilai Performa Operasional):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editOlaVal}
                  onChange={(e) => setEditOlaVal(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-sm outline-none focus:border-[#0052CC]"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">Acuan Status: 100% = Normal, 1-99% = Gangguan, 0% = Mati</p>
              </div>

              {/* Automatic Status Preview */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                <span className="text-slate-600 text-[11px] font-medium block">Prinjauan Hasil Status Alat:</span>
                {editSlaVal === 0 || editOlaVal === 0 ? (
                  <span className="inline-block px-2.5 py-1 bg-rose-100 text-rose-800 font-extrabold rounded-md border border-rose-300">
                    🔴 MATI (0%)
                  </span>
                ) : editOlaVal >= 100 ? (
                  <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-md border border-emerald-300">
                    🟢 NORMAL (100%)
                  </span>
                ) : (
                  <span className="inline-block px-2.5 py-1 bg-amber-100 text-amber-800 font-extrabold rounded-md border border-amber-300">
                    🟡 GANGGUAN ({editOlaVal}%)
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsSlaOlaEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0052CC] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Simpan SLA &amp; OLA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: TAMBAH / EDIT AKUN PENGGUNA ================= */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-[#0052CC] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} />
                <h3 className="font-bold text-sm">
                  {editingUser ? 'Edit Data Akun Pengguna' : 'Tambah Akun Pengguna Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Username ID Login <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">@</span>
                    <input
                      type="text"
                      placeholder="contoh: admin.kalibrasi"
                      value={userForm.username || ''}
                      onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900 outline-none focus:border-[#0052CC] focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Kata Sandi / Password {editingUser ? <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span> : <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="password"
                    placeholder={editingUser ? 'Kosongkan jika tidak diubah' : 'Kosongkan untuk generate password otomatis'}
                    value={userForm.password || ''}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900 outline-none focus:border-[#0052CC] focus:bg-white"
                    required={!editingUser}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="contoh: Ir. Ahmad Yani, M.T."
                  value={userForm.name || ''}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-[#0052CC] focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Peran Access Level (RBAC) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={userForm.role || 'UPT_PIMPINAN'}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#0052CC] focus:bg-white"
                  >
                    <option value="ADMIN">ADMIN (Inskal &amp; Kalibrasi Full Access)</option>
                    <option value="UPT_PIMPINAN">UPT &amp; PIMPINAN (Read-Only &amp; SLA/OLA)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    NIP / Nomor Identitas
                  </label>
                  <input
                    type="text"
                    placeholder="contoh: 19880101 201212 1 001"
                    value={userForm.nip || ''}
                    onChange={(e) => setUserForm({ ...userForm, nip: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 outline-none focus:border-[#0052CC] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Jabatan / Unit Kerja
                </label>
                <input
                  type="text"
                  placeholder="contoh: Teknisi Inskal / Kepala BBMKG Wilayah V"
                  value={userForm.title || ''}
                  onChange={(e) => setUserForm({ ...userForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 outline-none focus:border-[#0052CC] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Stasiun UPT Terkait
                  </label>
                  <select
                    value={userForm.uptStation || ''}
                    onChange={(e) => setUserForm({ ...userForm, uptStation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-[#0052CC] focus:bg-white"
                  >
                    <option value="BBMKG Wilayah V Papua">BBMKG Wilayah V Papua</option>
                    {stations.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Email Kontak
                  </label>
                  <input
                    type="email"
                    placeholder="contoh: user@bmkg.go.id"
                    value={userForm.email || ''}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 outline-none focus:border-[#0052CC] focus:bg-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 space-y-1">
                <span className="font-bold block">Catatan Keamanan Sesi:</span>
                <p>Pengguna dapat langsung login ke aplikasi menggunakan username ini tanpa memilih peran secara manual.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0052CC] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  {editingUser ? 'Simpan Perubahan Akun' : 'Tambah Akun Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: KONFIRMASI HAPUS AKUN ================= */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Hapus Akun Pengguna?</h3>
              <p className="text-xs text-slate-600 mt-1">
                Apakah Anda yakin ingin menghapus akun <span className="font-bold text-slate-900">{deleteConfirmUser.name}</span> (@{deleteConfirmUser.username})? Tindakan ini akan dicatat dalam audit log.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TAMBAH / EDIT PETUGAS MONITORING ================= */}
      {isPetugasModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <UserCheck size={18} className="text-[#0052CC]" />
                <span>{editingPetugas ? 'Edit Personil Petugas Monitoring' : 'Tambah Personil Petugas Monitoring'}</span>
              </h3>
              <button
                onClick={() => setIsPetugasModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePetugas} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap &amp; Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={petugasForm.name || ''}
                  onChange={(e) => setPetugasForm({ ...petugasForm, name: e.target.value })}
                  placeholder="Contoh: Asrul Sani Arifin, S.Tr"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#0052CC] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIP (Opsional)
                </label>
                <input
                  type="text"
                  value={petugasForm.nip || ''}
                  onChange={(e) => setPetugasForm({ ...petugasForm, nip: e.target.value })}
                  placeholder="Contoh: 19950312 201801 1 001"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#0052CC] focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jabatan / Peran Tim
                </label>
                <input
                  type="text"
                  value={petugasForm.jabatan || ''}
                  onChange={(e) => setPetugasForm({ ...petugasForm, jabatan: e.target.value })}
                  placeholder="Contoh: Staf Inskal &amp; Kalibrasi"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#0052CC] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPetugasModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#0052CC] hover:bg-blue-800 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Data Personil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: KONFIRMASI HAPUS PETUGAS ================= */}
      {deleteConfirmPetugas && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base mb-1">Konfirmasi Hapus Personil</h3>
              <p className="text-slate-600 text-xs">
                Apakah Anda yakin ingin menghapus petugas <strong className="text-slate-900">{deleteConfirmPetugas.name}</strong> dari daftar master database?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmPetugas(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeletePetugas}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Hapus Personil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
