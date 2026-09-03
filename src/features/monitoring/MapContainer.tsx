import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Maximize2, Minimize2, Layers } from 'lucide-react';
import { AloptamaDevice } from '../../shared/types';
import { formatDateIndo } from '../../shared/utils/dateUtils';

interface MapContainerProps {
  devices: AloptamaDevice[];
  onSelectDevice?: (device: AloptamaDevice) => void;
  selectedDeviceId?: string | null;
  uptLabel?: string;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  devices,
  onSelectDevice,
  selectedDeviceId,
  uptLabel = 'BALAI BESAR MKG WILAYAH V JAYAPURA',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const provinceLayerRef = useRef<L.GeoJSON | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapTheme, setMapTheme] = useState<'osm' | 'satellite'>('osm');
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [showProvinceBorders, setShowProvinceBorders] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);

  const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
  const osmTileUrl = MAPTILER_KEY
    ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'; // fallback darurat kalau key belum diisi - AKAN sering diblokir

  const BASEMAPS: Record<'osm' | 'satellite', { label: string; url: string; attribution: string; maxZoom: number }> = {
    osm: {
      label: 'OpenStreetMap',
      url: osmTileUrl,
      attribution: MAPTILER_KEY
        ? '&copy; MapTiler &copy; OpenStreetMap contributors | BMKG Wilayah V Papua'
        : '&copy; OpenStreetMap contributors | BMKG Wilayah V Papua',
      maxZoom: 18,
    },
    satellite: {
      label: 'Satelit',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri | BMKG Wilayah V Papua',
      maxZoom: 19,
    },
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === mapWrapperRef.current;
      setIsFullscreen(active);
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 100);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const config = BASEMAPS[mapTheme];

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = L.tileLayer(config.url, {
      maxZoom: config.maxZoom,
      attribution: config.attribution,
    }).addTo(map);
  }, [mapTheme]);

  // Muat garis batas provinsi (GeoJSON) sekali saat peta pertama kali dibuat
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || provinceLayerRef.current) return;

    let isCancelled = false;

    fetch('/geo/provinsi-indonesia.geojson')
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat data batas provinsi');
        return res.json();
      })
      .then((geojson: GeoJSON.FeatureCollection) => {
        if (isCancelled || !mapInstanceRef.current) return;

        const layer = L.geoJSON(geojson, {
          style: {
            color: '#475569', // slate-600 - warna garis batas
            weight: 1.2,
            opacity: 0.8,
            fillOpacity: 0, // tanpa isi warna, hanya garis
            dashArray: '4 3',
          },
          onEachFeature: (feature, layer) => {
            const name = feature.properties?.PROVINSI;
            if (name) {
              layer.bindTooltip(name, { sticky: true, className: 'text-xs font-semibold' });
            }
          },
        });

        provinceLayerRef.current = layer;
        if (showProvinceBorders) {
          layer.addTo(mapInstanceRef.current);
        }
      })
      .catch((err) => {
        console.error('Gagal memuat batas provinsi:', err);
      });

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapReady]);

  // Tampilkan / sembunyikan layer batas provinsi
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = provinceLayerRef.current;
    if (!map || !layer) return;

    if (showProvinceBorders) {
      if (!map.hasLayer(layer)) layer.addTo(map);
    } else {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    }
  }, [showProvinceBorders]);

  const toggleFullscreen = () => {
    if (!mapWrapperRef.current) return;
    if (!document.fullscreenElement) {
      mapWrapperRef.current.requestFullscreen().catch(() => {
        // Browser menolak permintaan fullscreen (mis. tidak didukung) - abaikan secara diam-diam
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-3.8, 138.0],
        zoom: 6,
        zoomControl: false,
        attributionControl: false,
      });

      tileLayerRef.current = L.tileLayer(BASEMAPS.osm.url, {
        maxZoom: BASEMAPS.osm.maxZoom,
        attribution: BASEMAPS.osm.attribution,
      }).addTo(map);

      L.control.zoom({ position: 'bottomleft' }).addTo(map);
      mapInstanceRef.current = map;
      setIsMapReady(true);
    }

    const map = mapInstanceRef.current;

    Object.values(markersRef.current).forEach((marker) => {
      if (marker) (marker as L.Marker).remove();
    });
    markersRef.current = {};

    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'NORMAL':
          return { color: '#16A34A', bg: 'bg-emerald-600', text: '🟢 Normal' };
        case 'GANGGUAN':
          return { color: '#D97706', bg: 'bg-amber-500', text: '🟡 Gangguan' };
        case 'MATI':
          return { color: '#DC2626', bg: 'bg-rose-600', text: '🔴 Mati' };
        default:
          return { color: '#16A34A', bg: 'bg-emerald-600', text: '🟢 Normal' };
      }
    };

    const getCalibrationText = (calibStatus: string) => {
      switch (calibStatus) {
        case 'VALID':
          return '🟢 Valid';
        case 'SEGERA_DIKALIBRASI':
          return '🟡 Segera Dikalibrasi';
        case 'KADALUWARSA':
          return '🔴 Kadaluwarsa';
        default:
          return '🟢 Valid';
      }
    };

    const getCategorySvg = (categoryStr: string) => {
      const cat = categoryStr.toLowerCase();

      if (cat.includes('radar')) {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"/><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M12 12l5-5"/></svg>`;
      }
      if (cat.includes('awos')) {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.7 5.2c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"/></svg>`;
      }
      if (cat.includes('aws')) {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"/></svg>`;
      }
      if (cat.includes('arg') || cat.includes('rain')) {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>`;
      }
      if (cat.includes('lightning') || cat.includes('petir')) {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;
      }
      if (cat.includes('seismo')) {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h3l2-6 4 12 3-9 2 5 2-2h4"/></svg>`;
      }
      if (cat.includes('accel')) {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 6 5-4"/></svg>`;
      }
      if (cat.includes('wrs') || cat.includes('warning')) {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
      }
      if (cat.includes('sirene') || cat.includes('siren')) {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18v-6a5 5 0 0 1 10 0v6"/><path d="M4 18h16"/><path d="M12 2v3"/><path d="M4.2 21h15.6"/></svg>`;
      }

      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`;
    };

    devices.forEach((device) => {
      const style = getStatusStyle(device.conditionStatus);
      const isSelected = selectedDeviceId === device.devicesId;
      const categoryIconSvg = getCategorySvg(device.category);

      const customHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          ${
            device.conditionStatus !== 'NORMAL'
              ? `<div class="absolute w-9 h-9 rounded-full marker-ring" style="background-color: ${style.color}"></div>`
              : ''
          }
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md transition-transform hover:scale-125 border-2 ${
            isSelected ? 'border-amber-300 ring-4 ring-blue-500/50 scale-125 z-20' : 'border-white'
          }" style="background-color: ${style.color}" title="${device.category} - ${device.site}">
            ${categoryIconSvg}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: customHtml,
        className: 'custom-leaflet-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
      });

      const popupHtml = `
        <div class="p-3.5 min-w-[220px] max-w-[260px] font-['Inter',sans-serif]">
          <div class="border-b border-slate-200 pb-2 mb-2.5">
            <h3 class="font-bold text-sm text-slate-900 leading-tight">${device.site}</h3>
            <p class="text-xs text-slate-600 mt-1 flex items-start gap-1">
              <span>📍</span>
              <span class="font-medium">${device.locationName}</span>
            </p>
          </div>

          <div class="space-y-1.5 text-xs text-slate-700">
            <div class="flex justify-between items-center">
              <span class="text-slate-500">Status Kondisi:</span>
              <span class="font-semibold">${style.text}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-500">Status Kalibrasi:</span>
              <span class="font-semibold">${getCalibrationText(device.calibrationStatus)}</span>
            </div>
            <div class="flex justify-between items-center pt-1 border-t border-slate-100 mt-1">
              <span class="text-slate-500">Kalibrasi Terakhir:</span>
              <span class="font-semibold text-slate-800">${formatDateIndo(device.lastCalibrated)}</span>
            </div>
          </div>

          <div class="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span class="flex items-center gap-1 text-slate-400">
              <span>🕒</span> Updated:
            </span>
            <span class="font-bold text-[#0052CC] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
              ${formatDateIndo(device.lastReportedDate || device.lastCalibrated || '28 Juli 2026')}
            </span>
          </div>
        </div>
      `;

      const marker = L.marker([device.latitude, device.longitude], {
        icon: customIcon,
      }).addTo(map);

      marker.bindPopup(popupHtml, {
        className: 'custom-popup',
        closeButton: true,
        autoPan: true,
      });

      marker.on('click', () => {
        if (onSelectDevice) {
          onSelectDevice(device);
        }
      });

      markersRef.current[device.devicesId] = marker;
    });

    if (selectedDeviceId && markersRef.current[selectedDeviceId]) {
      const selectedDev = devices.find((d) => d.devicesId === selectedDeviceId);
      if (selectedDev) {
        map.setView([selectedDev.latitude, selectedDev.longitude], 8, {
          animate: true,
        });
        markersRef.current[selectedDeviceId].openPopup();
      }
    }
  }, [devices, selectedDeviceId, onSelectDevice]);

  const statusCounts = {
    normal: devices.filter((d) => d.conditionStatus === 'NORMAL').length,
    gangguan: devices.filter((d) => d.conditionStatus === 'GANGGUAN').length,
    mati: devices.filter((d) => d.conditionStatus === 'MATI').length,
  };

  return (
    <div
      ref={mapWrapperRef}
      className={`relative w-full h-full min-h-[460px] rounded-xl overflow-hidden shadow-md border border-slate-200 ${
        isFullscreen ? 'bg-white' : ''
      }`}
    >
      <div ref={mapContainerRef} className="w-full h-full" />

    {isFullscreen && (
      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-md px-8 py-3.5 rounded-2xl shadow-lg border border-slate-200 text-center">
        <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-wide leading-tight">
          DASHBOARD MONITORING ALOPTAMA
        </p>
        <p className="text-sm sm:text-base md:text-lg font-bold text-slate-600 leading-tight mt-0.5">
          {uptLabel.toUpperCase()}
        </p>
      </div>
    )}

      <button
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Keluar dari tampilan penuh' : 'Tampilan penuh'}
        className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-md p-2 rounded-lg shadow-md border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>

      <div className="absolute left-[28px] bottom-28 z-[1100]">
        <button
          onClick={() => setIsThemeMenuOpen((prev) => !prev)}
          title="Pilih tema peta"
          className="flex items-center justify-center w-[34px] h-[34px] bg-white/95 backdrop-blur-md rounded-lg shadow-md border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <Layers size={16} />
        </button>

        {isThemeMenuOpen && (
          <div className="absolute left-full bottom-0 ml-1.5 w-40 bg-white/95 backdrop-blur-md rounded-lg shadow-md border border-slate-200 overflow-hidden text-xs font-semibold text-slate-700">
            {(Object.keys(BASEMAPS) as Array<'osm' | 'satellite'>).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setMapTheme(key);
                  setIsThemeMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 transition-colors cursor-pointer ${
                  mapTheme === key ? 'bg-[#0052CC]/10 text-[#0052CC]' : 'hover:bg-slate-100'
                }`}
              >
                {BASEMAPS[key].label}
              </button>
            ))}
            <div className="border-t border-slate-200">
              <button
                onClick={() => setShowProvinceBorders((prev) => !prev)}
                className={`w-full text-left px-3 py-2 transition-colors cursor-pointer flex items-center justify-between ${
                  showProvinceBorders ? 'bg-[#0052CC]/10 text-[#0052CC]' : 'hover:bg-slate-100'
                }`}
              >
                <span>Batas Provinsi</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    showProvinceBorders ? 'bg-[#0052CC]' : 'bg-slate-300'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        className={`absolute z-[1000] bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 text-xs font-semibold text-slate-800 transition-all ${
          isFullscreen
            ? 'bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 text-sm sm:text-base rounded-xl shadow-lg'
            : 'bottom-4 right-4 px-3.5 py-2 text-xs'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 shadow-sm inline-block"></span>
            <span>Normal{isFullscreen && <span className="text-emerald-600 font-bold"> ({statusCounts.normal})</span>}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm inline-block"></span>
            <span>Gangguan{isFullscreen && <span className="text-amber-600 font-bold"> ({statusCounts.gangguan})</span>}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-600 shadow-sm inline-block"></span>
            <span>Mati{isFullscreen && <span className="text-rose-600 font-bold"> ({statusCounts.mati})</span>}</span>
          </div>
        </div>
      </div>
    </div>
  );
};