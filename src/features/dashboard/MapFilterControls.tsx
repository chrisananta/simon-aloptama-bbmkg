import React, { useEffect, useRef, useState } from 'react';
import { Search, Building2, LayoutGrid, Activity, X, MapPin } from 'lucide-react';

type FilterKey = 'region' | 'upt' | 'category' | 'status';

interface MapFilterControlsProps {
  /** 'search' = hanya ikon cari (pojok kiri atas peta); 'filters' = UPT, jenis alat, status (di atas tombol layer). */
  part: 'search' | 'filters';
  searchQuery: string;
  onSearchChange: (value: string) => void;
  /** Filter wilayah (provinsi). Opsional supaya pemakai lama komponen ini tidak rusak. */
  selectedRegion?: string;
  onRegionChange?: (value: string) => void;
  regionOptions?: { name: string; count: number }[];
  selectedUpt: string;
  onUptChange: (value: string) => void;
  uptOptions: { id: string; name: string }[];
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  selectedStatus: string;
  onStatusChange: (value: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua Status Kondisi' },
  { value: 'NORMAL', label: '🟢 Normal' },
  { value: 'GANGGUAN', label: '🟡 Gangguan' },
  { value: 'MATI', label: '🔴 Mati' },
];

const iconButtonClass = (active: boolean, open: boolean) =>
  `relative flex items-center justify-center w-[34px] h-[34px] backdrop-blur-md rounded-lg shadow-md border transition-colors cursor-pointer ${
    open
      ? 'bg-[#0052CC] border-[#0052CC] text-white'
      : active
      ? 'bg-blue-50 border-[#0052CC] text-[#0052CC]'
      : 'bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
  }`;

const popoverClass =
  'absolute left-full top-0 ml-1.5 w-56 bg-white/95 backdrop-blur-md rounded-lg shadow-md border border-slate-200 overflow-hidden text-xs font-semibold text-slate-700';

const optionClass = (selected: boolean) =>
  `w-full text-left px-3 py-2 transition-colors cursor-pointer ${
    selected ? 'bg-[#0052CC]/10 text-[#0052CC]' : 'hover:bg-slate-100'
  }`;

export const MapFilterControls: React.FC<MapFilterControlsProps> = ({
  part,
  searchQuery,
  onSearchChange,
  selectedRegion = 'ALL',
  onRegionChange,
  regionOptions = [],
  selectedUpt,
  onUptChange,
  uptOptions,
  selectedCategory,
  onCategoryChange,
  categories,
  selectedStatus,
  onStatusChange,
}) => {
  const [openKey, setOpenKey] = useState<FilterKey | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tutup popover kalau klik di luar area tombol filter
  useEffect(() => {
    if (!openKey) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenKey(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [openKey]);

  const toggle = (key: FilterKey) => setOpenKey((prev) => (prev === key ? null : key));

  const pick = (apply: () => void) => {
    apply();
    setOpenKey(null);
  };

  const selectedUptName = uptOptions.find((u) => u.id === selectedUpt)?.name;

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      {/* Cari — kolom search kompak (bukan tombol), dipasang di pojok kiri atas peta */}
      {part === 'search' && (
        <div className="relative w-44 sm:w-56">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari alat, UPT, lokasi..."
            className="w-full h-[34px] pl-8 pr-7 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg shadow-md text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              title="Hapus pencarian"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* UPT */}
      {part === 'filters' && (
      <>
      {/* Wilayah (Provinsi) */}
      {onRegionChange && (
      <div className="relative">
        <button
          onClick={() => toggle('region')}
          title={selectedRegion === 'ALL' ? 'Filter wilayah' : `Wilayah: ${selectedRegion}`}
          className={iconButtonClass(selectedRegion !== 'ALL', openKey === 'region')}
        >
          <MapPin size={16} />
          {selectedRegion !== 'ALL' && openKey !== 'region' && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#0052CC] border border-white" />
          )}
        </button>
        {openKey === 'region' && (
          <div className={popoverClass}>
            <div className="max-h-56 overflow-y-auto">
              <button
                onClick={() => pick(() => onRegionChange('ALL'))}
                className={optionClass(selectedRegion === 'ALL')}
              >
                Semua Wilayah ({regionOptions.length} Provinsi)
              </button>
              {regionOptions.map((reg) => (
                <button
                  key={reg.name}
                  onClick={() => pick(() => onRegionChange(reg.name))}
                  className={`${optionClass(selectedRegion === reg.name)} flex items-center justify-between gap-2`}
                >
                  <span>{reg.name}</span>
                  <span className="text-[10px] font-bold text-slate-400">{reg.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      <div className="relative">
        <button
          onClick={() => toggle('upt')}
          title={selectedUpt === 'ALL' ? 'Filter UPT' : `UPT: ${selectedUptName || selectedUpt}`}
          className={iconButtonClass(selectedUpt !== 'ALL', openKey === 'upt')}
        >
          <Building2 size={16} />
          {selectedUpt !== 'ALL' && openKey !== 'upt' && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#0052CC] border border-white" />
          )}
        </button>
        {openKey === 'upt' && (
          <div className={popoverClass}>
            <div className="max-h-56 overflow-y-auto">
              <button
                onClick={() => pick(() => onUptChange('ALL'))}
                className={optionClass(selectedUpt === 'ALL')}
              >
                Semua UPT ({uptOptions.length} Station)
              </button>
              {uptOptions.map((upt) => (
                <button
                  key={upt.id}
                  onClick={() => pick(() => onUptChange(upt.id))}
                  className={optionClass(selectedUpt === upt.id)}
                >
                  {upt.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Jenis Alat */}
      <div className="relative">
        <button
          onClick={() => toggle('category')}
          title={selectedCategory === 'ALL' ? 'Filter jenis alat' : `Jenis alat: ${selectedCategory}`}
          className={iconButtonClass(selectedCategory !== 'ALL', openKey === 'category')}
        >
          <LayoutGrid size={16} />
          {selectedCategory !== 'ALL' && openKey !== 'category' && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#0052CC] border border-white" />
          )}
        </button>
        {openKey === 'category' && (
          <div className={popoverClass}>
            <div className="max-h-56 overflow-y-auto">
              <button
                onClick={() => pick(() => onCategoryChange('ALL'))}
                className={optionClass(selectedCategory === 'ALL')}
              >
                Semua Jenis Alat ({categories.length} Kategori)
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => pick(() => onCategoryChange(cat))}
                  className={optionClass(selectedCategory === cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Kondisi */}
      <div className="relative">
        <button
          onClick={() => toggle('status')}
          title={
            selectedStatus === 'ALL'
              ? 'Filter status kondisi'
              : `Status: ${STATUS_OPTIONS.find((s) => s.value === selectedStatus)?.label ?? selectedStatus}`
          }
          className={iconButtonClass(selectedStatus !== 'ALL', openKey === 'status')}
        >
          <Activity size={16} />
          {selectedStatus !== 'ALL' && openKey !== 'status' && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#0052CC] border border-white" />
          )}
        </button>
        {openKey === 'status' && (
          <div className={popoverClass}>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => pick(() => onStatusChange(opt.value))}
                className={optionClass(selectedStatus === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};