import React from 'react';
import { Building2, X } from 'lucide-react';
import { UPTStation } from '../../../shared/types';

interface StationFormModalProps {
  editingStation: UPTStation | null;
  stationForm: Partial<UPTStation>;
  setStationForm: (form: Partial<UPTStation>) => void;
  setIsStationModalOpen: (open: boolean) => void;
  handleSaveStation: (e: React.FormEvent) => void;
}

export const StationFormModal: React.FC<StationFormModalProps> = ({
  editingStation,
  stationForm,
  setStationForm,
  setIsStationModalOpen,
  handleSaveStation,
}) => {
  return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg my-auto flex flex-col max-h-[95vh] sm:max-h-[92vh] overflow-hidden">
            <div className="bg-[#0A203C] text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0 gap-2">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-blue-400" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  {editingStation ? 'Edit Master Stasiun UPT' : 'Tambah Stasiun UPT Baru'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsStationModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStation} className="p-3.5 sm:p-5 overflow-y-auto space-y-3.5 text-xs text-slate-700 flex-1">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Kode Stasiun UPT (stationid)</label>
                <input
                  type="text"
                  required
                  value={stationForm.stationid || ''}
                  onChange={(e) => setStationForm({ ...stationForm, stationid: e.target.value })}
                  placeholder="Contoh: MET015"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] focus:bg-white font-mono font-bold"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] focus:bg-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Kelompok Wilayah (Provinsi)</label>
                  <select
                    value={stationForm.regionGroup || 'Papua Barat Daya'}
                    onChange={(e) => setStationForm({ ...stationForm, regionGroup: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] focus:bg-white font-semibold"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Latitude (LS)</label>
                  <input
                    type="number"
                    step="any"
                    value={stationForm.latitude || 0}
                    onChange={(e) => setStationForm({ ...stationForm, latitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Longitude (BT)</label>
                  <input
                    type="number"
                    step="any"
                    value={stationForm.longitude || 0}
                    onChange={(e) => setStationForm({ ...stationForm, longitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-800">
                Setiap perubahan pada form ini akan dicatat otomatis ke dalam audit trail <strong className="font-bold">Log_Perubahan</strong>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsStationModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0052CC] hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Simpan Stasiun
                </button>
              </div>
            </form>
          </div>
        </div>
  );
};
