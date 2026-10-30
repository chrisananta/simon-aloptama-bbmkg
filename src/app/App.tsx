import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Activity } from 'lucide-react';
import { AloptamaDevice, UPTStation, ChangeLog } from '../shared/types';
import { Sidebar } from '../layouts/Sidebar';
import { Navbar } from '../layouts/Navbar';
import { ServerStatusModal } from '../shared/components/modals/ServerStatusModal';
import { useEverTrue } from '../shared/hooks/useEverTrue';
import { CalibrationRecord } from '../features/calibration/CalibrationTypes';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { apiClient } from '../shared/api';
import { isSameUpt } from '../shared/utils/uptMatch';
import { ServerFetchResult } from '../shared/api/serverDataService';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { DashboardFooter } from '../features/dashboard/DashboardFooter';
import { TimeBar } from '../layouts/TimeBar';
import { useMenuRoute } from './useMenuRoute';

// Code splitting: tiap halaman/modal besar jadi file JS terpisah yang baru diunduh saat
// pertama kali dibuka (bukan ikut bundle awal). Modul-modul ini memakai named export,
// jadi dibungkus agar sesuai bentuk { default } yang diminta React.lazy.
const DashboardView = lazy(() => import('../features/dashboard/DashboardView').then((m) => ({ default: m.DashboardView })));
const SlaOlaView = lazy(() => import('../features/sla-ola/SlaOlaView').then((m) => ({ default: m.SlaOlaView })));
const CalibrationView = lazy(() => import('../features/calibration/CalibrationView').then((m) => ({ default: m.CalibrationView })));
const CertificateRedirectView = lazy(() => import('../features/certificates/CertificateRedirectView').then((m) => ({ default: m.CertificateRedirectView })));
const AdminMasterView = lazy(() => import('../features/admin/AdminMasterView').then((m) => ({ default: m.AdminMasterView })));
const AuditLogView = lazy(() => import('../features/audit-log/AuditLogView').then((m) => ({ default: m.AuditLogView })));
const GensetPage = lazy(() => import('../features/genset/GensetPage').then((m) => ({ default: m.GensetPage })));
const PerbaikanView = lazy(() => import('../features/perbaikan/PerbaikanView').then((m) => ({ default: m.PerbaikanView })));
const PanduanView = lazy(() => import('../features/panduan/PanduanView').then((m) => ({ default: m.PanduanView })));
const SlaOlaInputModal = lazy(() => import('../features/sla-ola/SlaOlaInputModal').then((m) => ({ default: m.SlaOlaInputModal })));
const CalibrationInputModal = lazy(() => import('../features/calibration/CalibrationInputModal').then((m) => ({ default: m.CalibrationInputModal })));

const PageFallback = () => (
  <div className="flex items-center justify-center py-24 text-xs font-semibold text-slate-500" role="status">
    Memuat halaman…
  </div>
);

// Penanda sebelum sinkronisasi server pertama selesai (bukan tanggal palsu).
const BELUM_SINKRON = 'Belum sinkron';

function AppContent() {
  const { user, permissions, isAuthenticated } = useAuth();
  // Menu aktif mengikuti URL (/sla-ola, /kalibrasi, ...): refresh tetap di halaman yang sama,
  // tombol Back/Forward berfungsi, dan halaman tertentu bisa dibagikan lewat link.
  const [activeMenu, navigateMenu] = useMenuRoute();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Setelah LOGOUT, URL dikembalikan ke Dashboard supaya pengguna berikutnya tidak mendarat dihalaman milik sesi sebelumnya. 
  const wasAuthenticated = React.useRef(false);
  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated) navigateMenu('dashboard', { replace: true });
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, navigateMenu]);
  // Khusus tampilan HP: sidebar (bahkan rail ikonnya) tersembunyi total
  const [mobileSidebarHidden, setMobileSidebarHidden] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(BELUM_SINKRON);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  
  // Modals for UPT SLA OLA input and INSKAL Calibration input
  const [isSlaOlaModalOpen, setIsSlaOlaModalOpen] = useState(false);
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const slaOlaModalLoaded = useEverTrue(isSlaOlaModalOpen);
  const calibrationModalLoaded = useEverTrue(isCalibrationModalOpen);
  
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
    lastSync: BELUM_SINKRON,
  });

  const ownUptInputDevices = React.useMemo(() => {
    if (permissions.isScopedToOwnUpt && user?.uptStation) {
      // isSameUpt: UPT bisa tersimpan sebagai KODE (GEO001) atau NAMA stasiun.
      return devicesData.filter((d) => isSameUpt(d.uptStation, user.uptStation, stationsData));
    }
    return devicesData;
  }, [devicesData, stationsData, permissions.isScopedToOwnUpt, user?.uptStation]);

  // Calculate high-level totals (data NASIONAL - semua UPT, untuk semua role)
  const totalDevices = devicesData.length;
  const normalCount = devicesData.filter((d) => d.conditionStatus === 'NORMAL').length;
  const gangguanCount = devicesData.filter((d) => d.conditionStatus === 'GANGGUAN').length;
  const matiCount = devicesData.filter((d) => d.conditionStatus === 'MATI').length;

  // Current actor identifier for audit log tracking
  const currentActor = user ? `${user.name} (${user.role})` : 'Operator SIMON';

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
  const handleAddDevice = async (device: AloptamaDevice, actor: string): Promise<boolean> => {
    try {
      await apiClient.devices.add(device, actor || currentActor);
      setDevicesData(apiClient.devices.getAll());
      refreshAuditLogs();
      return true;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan alat ke server.');
      return false;
    }
  };

  const handleUpdateDevice = async (device: AloptamaDevice, details: string, actor: string): Promise<boolean> => {
    try {
      await apiClient.devices.update(device, details, actor || currentActor);
      setDevicesData(apiClient.devices.getAll());
      refreshAuditLogs();
      return true;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal memperbarui alat di server.');
      return false;
    }
  };

  const handleDeleteDevice = async (deviceId: string, deviceName: string, actor: string): Promise<boolean> => {
    try {
      await apiClient.devices.delete(deviceId, deviceName, actor || currentActor);
      setDevicesData(apiClient.devices.getAll());
      refreshAuditLogs();
      return true;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus alat di server.');
      return false;
    }
  };

  const handleClearLogs = () => {
    apiClient.auditLogs.clear(currentActor);
    refreshAuditLogs();
  };

  // Ambil data dari server setiap kali status login berubah jadi TERAUTENTIKASI.
  useEffect(() => {
    if (isAuthenticated) {
      handleSyncServer();
    }
  }, [isAuthenticated]);

  return (
    <ProtectedRoute activeMenu={activeMenu} onRedirectToDashboard={() => navigateMenu('dashboard')}>
      <div className="min-h-screen bg-white font-['Inter',sans-serif] text-slate-800 flex flex-col">
        {/* Bar tanggal & jam — full-width dari ujung ke ujung, di atas Sidebar & Navbar */}
        <TimeBar />

        {/* Sidebar Navigation */}       
        <Sidebar
          activeMenu={activeMenu}
          onSelectMenu={(menu) => navigateMenu(menu)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileHidden={mobileSidebarHidden}
          onHideMobile={() => setMobileSidebarHidden(true)}
          onRevealMobile={() => setMobileSidebarHidden(false)}
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
          mobileSidebarHidden={mobileSidebarHidden}
          onRevealMobileSidebar={() => setMobileSidebarHidden(false)}
          lastUpdate={lastUpdate}
          onOpenServerModal={() => setIsServerModalOpen(true)}
          onOpenSlaOlaModal={permissions.canInputSlaOla ? () => setIsSlaOlaModalOpen(true) : undefined}
          syncSource={syncResult.source}
          isSyncing={isSyncing}
        />

        {/* Main Content Workspace */}
        <main
          className={`flex-1 flex flex-col pt-[108px] sm:pt-[116px] pb-10 px-3 sm:px-4 md:px-6 transition-all duration-300 ${
            mobileSidebarHidden ? 'ml-0 sm:ml-16' : !sidebarCollapsed ? 'ml-0' : 'ml-16'
          } ${mobileSidebarHidden ? 'md:ml-0' : 'md:ml-20'}
          }`}
        >
          <div className="w-full flex-1 max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <Suspense fallback={<PageFallback />}>
            {activeMenu === 'dashboard' && (
            <DashboardView devices={devicesData} stations={stationsData} lastUpdate={lastUpdate} onNavigate={(menu) => navigateMenu(menu)} />
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

            {activeMenu === 'panduan' && <PanduanView devices={devicesData} />}

            {activeMenu === 'admin-master' && permissions.canManageMasterData && (
              <AdminMasterView
                stations={stationsData}
                devices={devicesData}
                onAddStation={handleAddStation}
                onUpdateStation={handleUpdateStation}
                onDeleteStation={handleDeleteStation}
                onAddDevice={handleAddDevice}
                onUpdateDevice={handleUpdateDevice}
                onDeleteDevice={handleDeleteDevice}
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

            {activeMenu === 'genset' && permissions.canManageGenset && (
              <GensetPage />
            )}

            {activeMenu === 'perbaikan' && permissions.canManagePerbaikan && (
              <PerbaikanView />
            )}
            </Suspense>
          </div>

          <DashboardFooter />

        </main>

        {/* BMKG Server Data Sync & Status Modal */}
        <ServerStatusModal
          isOpen={isServerModalOpen}
          onClose={() => setIsServerModalOpen(false)}
          syncState={syncResult}
          onTriggerSync={handleSyncServer}
          isSyncing={isSyncing}
        />

        {/* Form Modal Pengisian SLA & OLA UPT*/}
        {slaOlaModalLoaded && (
          <Suspense fallback={null}>
            <SlaOlaInputModal
              isOpen={isSlaOlaModalOpen}
              onClose={() => setIsSlaOlaModalOpen(false)}
              devices={ownUptInputDevices}
              onSaveSlaOla={handleSaveSlaOla}
            />
          </Suspense>
        )}

        {/* Form Modal Tambah Data Kalibrasi INSKAL (hanya jika diizinkan) */}
        {permissions.canAddCalibration && calibrationModalLoaded && (
          <Suspense fallback={null}>
            <CalibrationInputModal
              isOpen={isCalibrationModalOpen}
              onClose={() => setIsCalibrationModalOpen(false)}
              devices={devicesData}
              stations={stationsData}
              onAddCalibrationRecord={handleAddCalibrationRecord}
            />
          </Suspense>
        )}

        {/* Floating Action Button for PENGISIAN SLA OLA (Bottom Right Corner)
            Disembunyikan untuk KaUPT/KaBBMKG - role ini tidak berwenang
            mengisi SLA OLA, hanya memantau. */}
        {permissions.canInputSlaOla && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+2rem)] right-4 sm:bottom-6 sm:right-6 z-[100]">
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
        )}
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