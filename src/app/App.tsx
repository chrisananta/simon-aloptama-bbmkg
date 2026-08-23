import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { ActiveNavMenu, AloptamaDevice, UPTStation, ChangeLog } from '../shared/types';
import { Sidebar } from '../layouts/Sidebar';
import { Navbar } from '../layouts/Navbar';
import { DashboardView } from '../features/dashboard/DashboardView';
import { SlaOlaView } from '../features/sla-ola/SlaOlaView';
import { CalibrationView } from '../features/calibration/CalibrationView';
import { CertificateRedirectView } from '../features/certificates/CertificateRedirectView';
import { AdminMasterView } from '../features/admin/AdminMasterView';
import { AuditLogView } from '../features/audit-log/AuditLogView';
import { ServerStatusModal } from '../shared/components/modals/ServerStatusModal';
import { SlaOlaInputModal } from '../features/sla-ola/SlaOlaInputModal';
import { CalibrationInputModal } from '../features/calibration/CalibrationInputModal';
import { CalibrationRecord } from '../features/calibration/CalibrationTypes';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { apiClient } from '../shared/api';
import { ServerFetchResult } from '../shared/api/serverDataService';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';

function AppContent() {
  const { user, permissions, isAuthenticated } = useAuth();
  const [activeMenu, setActiveMenu] = useState<ActiveNavMenu>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('28 Juli 2026, 10:30 WIT');
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  
  // Modals for UPT SLA OLA input and INSKAL Calibration input
  const [isSlaOlaModalOpen, setIsSlaOlaModalOpen] = useState(false);
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  
  // Initial state loaded via Centralized API Client
  const [devicesData, setDevicesData] = useState<AloptamaDevice[]>(() => apiClient.devices.getAll());
  const [calibrationLogs, setCalibrationLogs] = useState<CalibrationRecord[]>(() => apiClient.calibration.getAll());
  const [stationsData, setStationsData] = useState<UPTStation[]>(() => apiClient.stations.getAll());
  const [changeLogsData, setChangeLogsData] = useState<ChangeLog[]>(() => apiClient.auditLogs.getAll());

  // Helper to refresh audit logs from centralized storage
  const refreshAuditLogs = () => {
    setChangeLogsData(apiClient.auditLogs.getAll());
  };

  const [syncResult, setSyncResult] = useState<ServerFetchResult>({
    devices: [],
    stations: [],
    source: 'server_api',
    lastSync: '28 Juli 2026, 10:30 WIT',
  });

  // Calculate high-level totals
  const totalDevices = devicesData.length;
  const normalCount = devicesData.filter((d) => d.conditionStatus === 'NORMAL').length;
  const gangguanCount = devicesData.filter((d) => d.conditionStatus === 'GANGGUAN').length;
  const matiCount = devicesData.filter((d) => d.conditionStatus === 'MATI').length;

  // Current actor identifier for audit log tracking
  const currentActor = user ? `${user.name} (${user.role === 'ADMIN' ? 'Admin INSKAL' : 'UPT/Pimpinan'})` : 'Operator SIMON';

  // Handle Server API Data Fetch & Sync via Centralized API
  const handleSyncServer = async () => {
    setIsSyncing(true);
    try {
      const result = await apiClient.server.sync(currentActor);
      setSyncResult(result);
      if (result.devices) {
        setDevicesData(result.devices);
      }
      if (result.stations) {
        setStationsData(result.stations);
      }
      if (result.calibrationLogs) {
        setCalibrationLogs(result.calibrationLogs);
      }
      setLastUpdate(result.lastSync);
      refreshAuditLogs();
    } catch (err) {
      console.error('Server sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handler for UPT SLA & OLA Data Entry via Centralized API
  const handleSaveSlaOla = async (data: {
    uptStation: string;
    category: string;
    deviceId: string;
    kondisiSla: boolean;
    kondisiOla: number;
    kendala: string;
    tanggal: string;
  }) => {
    const res = await apiClient.devices.saveSlaOla({
      ...data,
      actor: currentActor,
    });
    setDevicesData(res.devices);
    setLastUpdate(res.lastSync);
    refreshAuditLogs();
  };

  // Handler for INSKAL Calibration Data Entry via Centralized API
  const handleAddCalibrationRecord = async (record: Omit<CalibrationRecord, 'id' | 'createdAt'>) => {
    const res = await apiClient.calibration.add(record, currentActor);
    setCalibrationLogs(apiClient.calibration.getAll());
    setDevicesData(res.updatedDevices);
    refreshAuditLogs();
  };

  // Handlers for Master Stasiun CRUD via Centralized API
  const handleAddStation = async (station: UPTStation, actor: string) => {
    try {
      await apiClient.stations.add(station, actor || currentActor);
      setStationsData(apiClient.stations.getAll()); 
      refreshAuditLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan stasiun ke server.');
    }
  };

  const handleUpdateStation = async (station: UPTStation, details: string, actor: string) => {
    try {
      await apiClient.stations.update(station, details, actor || currentActor);
      setStationsData(apiClient.stations.getAll());
      refreshAuditLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal memperbarui stasiun di server.');
    }
  };

  const handleDeleteStation = async (stationId: string, stationName: string, actor: string) => {
    try {
      await apiClient.stations.delete(stationId, stationName, actor || currentActor);
      setStationsData(apiClient.stations.getAll());
      refreshAuditLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus stasiun di server.');
    }
  };

  // Handlers for Master Alat CRUD via Centralized API
  const handleAddDevice = async (device: AloptamaDevice, actor: string) => {
    try {
      await apiClient.devices.add(device, actor || currentActor);
      setDevicesData(apiClient.devices.getAll());
      refreshAuditLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan alat ke server.');
    }
  };

  const handleUpdateDevice = async (device: AloptamaDevice, details: string, actor: string) => {
    try {
      await apiClient.devices.update(device, details, actor || currentActor);
      setDevicesData(apiClient.devices.getAll());
      refreshAuditLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal memperbarui alat di server.');
    }
  };

  const handleDeleteDevice = async (deviceId: string, deviceName: string, actor: string) => {
    try {
      await apiClient.devices.delete(deviceId, deviceName, actor || currentActor);
      setDevicesData(apiClient.devices.getAll());
      refreshAuditLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus alat di server.');
    }
  };

  const handleClearLogs = () => {
    apiClient.auditLogs.clear(currentActor);
    refreshAuditLogs();
  };

  // Ambil data dari server setiap kali status login berubah jadi TERAUTENTIKASI.
  // PENTING: AppContent ini mount SEKALI saat app dibuka (SEBELUM user sempat
  // login), jadi kalau cuma dependency [] di sini, sync pertama pasti gagal
  // (belum ada token -> semua request 401) dan TIDAK PERNAH dicoba ulang begitu
  // login berhasil, karena AppContent sendiri tidak remount saat transisi
  // login->dashboard (itu murni ProtectedRoute yang ganti tampilan di dalamnya).
  // Makanya dependency [isAuthenticated] wajib ada di sini.
  useEffect(() => {
    if (isAuthenticated) {
      handleSyncServer();
    }
  }, [isAuthenticated]);

  return (
    <ProtectedRoute activeMenu={activeMenu} onRedirectToDashboard={() => setActiveMenu('dashboard')}>
      <div className="min-h-screen bg-[#F5F7FA] font-['Inter',sans-serif] text-slate-800 flex flex-col">
        {/* Sidebar Navigation */}
        <Sidebar
          activeMenu={activeMenu}
          onSelectMenu={(menu) => setActiveMenu(menu)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          totalDevices={totalDevices}
          normalCount={normalCount}
          gangguanCount={gangguanCount}
          matiCount={matiCount}
          devices={devicesData}
        />

        {/* Top Navbar Header */}
        <Navbar
          activeMenu={activeMenu}
          collapsed={sidebarCollapsed}
          lastUpdate={lastUpdate}
          onOpenServerModal={() => setIsServerModalOpen(true)}
          onOpenSlaOlaModal={() => setIsSlaOlaModalOpen(true)}
          syncSource={syncResult.source}
          isSyncing={isSyncing}
        />

        {/* Main Content Workspace */}
        <main
          className={`flex-1 pt-18 sm:pt-20 pb-10 px-3 sm:px-4 md:px-6 transition-all duration-300 ${
            sidebarCollapsed ? 'ml-16 md:ml-20' : 'ml-0 md:ml-72'
          }`}
        >
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {activeMenu === 'dashboard' && (
            <DashboardView devices={devicesData} stations={stationsData} lastUpdate={lastUpdate} />
          )}

            {activeMenu === 'sla-ola' && <SlaOlaView devices={devicesData} stations={stationsData} />}

            {activeMenu === 'kalibrasi' && (
              <CalibrationView
                devices={devicesData}
                stations={stationsData}
                calibrationLogs={calibrationLogs}
                onOpenAddCalibrationModal={() => setIsCalibrationModalOpen(true)}
              />
            )}

            {activeMenu === 'sertifikat' && <CertificateRedirectView />}

            {activeMenu === 'admin-master' && permissions.canManageMasterData && (
              <AdminMasterView
                stations={stationsData}
                devices={devicesData}
                changeLogs={changeLogsData}
                onAddStation={handleAddStation}
                onUpdateStation={handleUpdateStation}
                onDeleteStation={handleDeleteStation}
                onAddDevice={handleAddDevice}
                onUpdateDevice={handleUpdateDevice}
                onDeleteDevice={handleDeleteDevice}
                onClearLogs={handleClearLogs}
                onSyncDevicesFromServer={setDevicesData}
              />
            )}

            {activeMenu === 'audit-log' && permissions.canViewAuditLogs && (
              <AuditLogView
                changeLogs={changeLogsData}
                onRefreshLogs={refreshAuditLogs}
                onClearLogs={handleClearLogs}
              />
            )}
          </div>
        </main>

        {/* BMKG Server Data Sync & Status Modal */}
        <ServerStatusModal
          isOpen={isServerModalOpen}
          onClose={() => setIsServerModalOpen(false)}
          syncState={syncResult}
          onTriggerSync={handleSyncServer}
          isSyncing={isSyncing}
        />

        {/* Form Modal Pengisian SLA & OLA UPT */}
        <SlaOlaInputModal
          isOpen={isSlaOlaModalOpen}
          onClose={() => setIsSlaOlaModalOpen(false)}
          devices={devicesData}
          onSaveSlaOla={handleSaveSlaOla}
        />

        {/* Form Modal Tambah Data Kalibrasi INSKAL (hanya jika diizinkan) */}
        {permissions.canAddCalibration && (
          <CalibrationInputModal
            isOpen={isCalibrationModalOpen}
            onClose={() => setIsCalibrationModalOpen(false)}
            devices={devicesData}
            onAddCalibrationRecord={handleAddCalibrationRecord}
          />
        )}

        {/* Floating Action Button for PENGISIAN SLA OLA (Bottom Right Corner) */}
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100]">
          <button
            onClick={() => setIsSlaOlaModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2.5 sm:px-4.5 sm:py-3.5 bg-[#0052CC] hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-[11px] sm:text-xs rounded-full shadow-2xl hover:shadow-blue-500/30 transition-all border-2 border-white/20 ring-4 ring-blue-500/20 cursor-pointer"
            title="Buka Form Popup Pengisian SLA & OLA UPT"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Activity size={14} className="text-white animate-pulse sm:w-4 sm:h-4" />
            </div>
            <span className="tracking-wide uppercase font-extrabold pr-0.5 whitespace-nowrap">
              <span className="hidden sm:inline">PENGISIAN SLA OLA</span>
              <span className="sm:hidden">ISI SLA OLA</span>
            </span>
          </button>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
