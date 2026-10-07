import React, { useState, useMemo, useEffect } from 'react';
import { EquipmentCategory, UPTStation } from '../../shared/types';
import { apiClient } from '../../shared/api';
import { MapContainer } from '../monitoring/MapContainer';
import { DashboardPageProps } from './DashboardTypes';
import { DashboardCard } from './DashboardCard';
import { MapFilterControls } from './MapFilterControls';
import { findStation } from '../../shared/utils/uptMatch';
import { loadPapuaProvinces, findProvince, ProvinceShape } from '../../shared/utils/provinceLookup';

interface ExtendedDashboardProps extends DashboardPageProps {
  stations?: UPTStation[];
}

export const DashboardPage: React.FC<ExtendedDashboardProps> = ({ devices, stations }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('ALL');
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

  const stationList = useMemo(
    () => (stations && stations.length > 0 ? stations : apiClient.stations.getAll()),
    [stations]
  );

  // Batas provinsi (GeoJSON) untuk menentukan wilayah dari KOORDINAT alat.
  const [provinceShapes, setProvinceShapes] = useState<ProvinceShape[]>([]);
  useEffect(() => {
    loadPapuaProvinces().then(setProvinceShapes);
  }, []);

  // Wilayah (provinsi) alat = lokasi fisik alat (titik koordinat di dalam batas
  // provinsi). Satu UPT bisa mengelola alat di banyak provinsi, jadi provinsi
  // kantor UPT TIDAK dipakai - kecuali GeoJSON belum termuat / koordinat tidak valid.
  const regionOfDevice = (dev: { uptStation?: string; latitude?: number; longitude?: number }): string => {
    if (provinceShapes.length > 0) {
      const byCoord = findProvince(Number(dev.latitude), Number(dev.longitude), provinceShapes);
      if (byCoord) return byCoord;
    }
    return findStation(dev.uptStation, stationList)?.regionGroup || '';
  };

  const regionOptions = useMemo(() => {
    const counts = new Map<string, number>();
    devices.forEach((d) => {
      const reg = regionOfDevice(d);
      if (reg) counts.set(reg, (counts.get(reg) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [devices, stationList, provinceShapes]);

  // List opsi dropdown { id, name }
  const uptOptions = useMemo<{ id: string; name: string }[]>(() => {
    const stationIds = new Set<string>();
    devices.forEach((d) => {
      if (selectedRegion !== 'ALL' && regionOfDevice(d) !== selectedRegion) return;
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
  }, [devices, stationMap, selectedRegion, stationList, provinceShapes]);

  const filteredDevices = devices.filter((dev) => {
    const matchesSearch =
      searchQuery === '' ||
      (dev.site || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dev.uptStation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dev.locationName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dev.category || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRegion = selectedRegion === 'ALL' || regionOfDevice(dev) === selectedRegion;
    const matchesUpt = selectedUpt === 'ALL' || dev.uptStation === selectedUpt;
    const matchesCategory = selectedCategory === 'ALL' || dev.category === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || dev.conditionStatus === selectedStatus;

    return matchesSearch && matchesRegion && matchesUpt && matchesCategory && matchesStatus;
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
            titleLabel={selectedCategory === 'ALL' ? 'ALOPTAMA' : selectedCategory}
            searchControl={
              <MapFilterControls
                part="search"
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedUpt={selectedUpt}
                onUptChange={setSelectedUpt}
                uptOptions={uptOptions}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                categories={categoriesList}
                selectedStatus={selectedStatus}
                onStatusChange={setSelectedStatus}
              />
            }
            filterControls={
              <MapFilterControls
                part="filters"
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedRegion={selectedRegion}
                onRegionChange={(region) => {
                  setSelectedRegion(region);
                  // UPT yang dipilih sebelumnya bisa jadi bukan di wilayah baru.
                  setSelectedUpt('ALL');
                }}
                regionOptions={regionOptions}
                selectedUpt={selectedUpt}
                onUptChange={setSelectedUpt}
                uptOptions={uptOptions}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                categories={categoriesList}
                selectedStatus={selectedStatus}
                onStatusChange={setSelectedStatus}
              />
            }
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