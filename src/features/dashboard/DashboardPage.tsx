import React, { useState, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { EquipmentCategory, UPTStation } from '../../shared/types';
import { apiClient } from '../../shared/api';
import { MapContainer } from '../monitoring/MapContainer';
import { DashboardPageProps } from './DashboardTypes';
import { DashboardCard } from './DashboardCard';

interface ExtendedDashboardProps extends DashboardPageProps {
  stations?: UPTStation[];
}

export const DashboardPage: React.FC<ExtendedDashboardProps> = ({ devices, stations }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUpt, setSelectedUpt] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Map pencarian ID Stasiun -> Nama Stasiun
  const stationMap = useMemo(() => {
    const map = new Map<string, string>();
    const stationList = stations && stations.length > 0 ? stations : apiClient.stations.getAll();
    stationList.forEach((s) => {
      if (s.stationid) map.set(s.stationid, s.name);
      if (s.id) map.set(s.id, s.name);
    });
    return map;
  }, [stations]);

  // List opsi dropdown { id, name }
  const uptOptions = useMemo<{ id: string; name: string }[]>(() => {
    const stationIds = new Set<string>();
    devices.forEach((d) => {
      if (d.uptStation) {
        const idStr = typeof d.uptStation === 'string' 
          ? d.uptStation 
          : (d.uptStation as any).stationid || (d.uptStation as any).id;
        if (idStr) stationIds.add(idStr);
      }
    });
    return Array.from(stationIds).sort().map((id) => ({
      id: String(id),
      name: stationMap.get(String(id)) || String(id),
    }));
  }, [devices, stationMap]);

  const filteredDevices = devices.filter((dev) => {
    const matchesSearch =
      searchQuery === '' ||
      (dev.site || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dev.uptStation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dev.locationName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dev.category || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesUpt = selectedUpt === 'ALL' || dev.uptStation === selectedUpt;
    const matchesCategory = selectedCategory === 'ALL' || dev.category === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || dev.conditionStatus === selectedStatus;

    return matchesSearch && matchesUpt && matchesCategory && matchesStatus;
  });

  const totalCount = filteredDevices.length;
  const normalCount = filteredDevices.filter((d) => d.conditionStatus === 'NORMAL').length;
  const gangguanCount = filteredDevices.filter((d) => d.conditionStatus === 'GANGGUAN').length;
  const matiCount = filteredDevices.filter((d) => d.conditionStatus === 'MATI').length;

  const categoriesList: EquipmentCategory[] = [
    'AWOS Kat.I',
    'AWOS Kat.II',
    'AWOS Kat.III',
    'AWS',
    'ARG',
    'Radar Cuaca',
    'Lightning Detector',
    'Seismometer',
    'Accelerograph',
    'WRS NG',
    'Sirene',
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama peralatan, UPT, atau lokasi..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded-md cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="relative">
              <select
                value={selectedUpt}
                onChange={(e) => setSelectedUpt(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-[#0052CC] cursor-pointer"
              >
                <option value="ALL">Semua UPT ({uptOptions.length} Station)</option>
                {uptOptions.map((upt) => (
                  <option key={upt.id} value={upt.id}>
                    {upt.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-[#0052CC] cursor-pointer"
              >
                <option value="ALL">Semua Jenis Alat (11 Kategori)</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-[#0052CC] cursor-pointer"
              >
                <option value="ALL">Semua Status Kondisi</option>
                <option value="NORMAL">🟢 Normal</option>
                <option value="GANGGUAN">🟡 Gangguan</option>
                <option value="MATI">🔴 Mati</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <DashboardCard
        totalCount={totalCount}
        normalCount={normalCount}
        gangguanCount={gangguanCount}
        matiCount={matiCount}
      />

      <div className="w-full bg-white rounded-2xl p-2.5 sm:p-4 shadow-sm border border-slate-200 flex flex-col h-[380px] sm:h-[480px] md:h-[620px]">
        <div className="flex-1 w-full relative rounded-xl overflow-hidden">
          <MapContainer
            devices={filteredDevices}
            onSelectDevice={(device) => setSelectedDeviceId(device.devicesId)}
            selectedDeviceId={selectedDeviceId}
            uptLabel={
              selectedUpt === 'ALL'
                ? 'BALAI BESAR MKG WILAYAH V JAYAPURA'
                : (uptOptions.find((u) => u.id === selectedUpt)?.name || selectedUpt)
            }
          />
        </div>
      </div>
    </div>
  );
};