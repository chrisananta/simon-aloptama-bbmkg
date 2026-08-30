import React from 'react';
import { Radio, X } from 'lucide-react';
import { UPTStation, AloptamaDevice, EquipmentCategory, CalibrationStatus } from '../../../shared/types';

interface DeviceFormModalProps {
  stations: UPTStation[];
  categories: EquipmentCategory[];
  editingDevice: AloptamaDevice | null;
  deviceForm: Partial<AloptamaDevice>;
  setDeviceForm: (form: Partial<AloptamaDevice>) => void;
  setIsDeviceModalOpen: (open: boolean) => void;
  handleSaveDevice: () => void;
}

export const DeviceFormModal: React.FC<DeviceFormModalProps> = ({
  stations,
  categories,
  editingDevice,
  deviceForm,
  setDeviceForm,
  setIsDeviceModalOpen,
  handleSaveDevice,
}) => {
  return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-auto flex flex-col max-h-[95vh] sm:max-h-[92vh] overflow-hidden">
            <div className="bg-[#0A203C] text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0 gap-2">
              <div className="flex items-center gap-2">
                <Radio size={18} className="text-blue-400 shrink-0" />
                <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                  {editingDevice ? 'Edit Master Peralatan' : 'Tambah Peralatan Master Baru'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsDeviceModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDevice} className="p-3.5 sm:p-5 overflow-y-auto space-y-3.5 text-xs text-slate-700 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">ID Alat (devicesId)</label>
                  <input
                    type="text"
                    required
                    value={deviceForm.devicesId || ''}
                    onChange={(e) => setDeviceForm({ ...deviceForm, devicesId: e.target.value })}
                    placeholder="Contoh: ALT0191"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] focus:bg-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Kategori Peralatan</label>
                  <select
                    value={deviceForm.category || 'AWS'}
                    onChange={(e) => setDeviceForm({ ...deviceForm, category: e.target.value as EquipmentCategory })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] focus:bg-white font-bold"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Nama Site Peralatan</label>
                  <input
                    type="text"
                    required
                    value={deviceForm.site || ''}
                    onChange={(e) => setDeviceForm({ ...deviceForm, site: e.target.value })}
                    placeholder="Contoh: AWOS KAT III Bandara Sentani"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Merk Peralatan</label>
                  <input
                    type="text"
                    value={deviceForm.merk || ''}
                    onChange={(e) => setDeviceForm({ ...deviceForm, merk: e.target.value })}
                    placeholder="Contoh: Vaisala, AWI, dll."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Stasiun UPT Pengelola</label>
                  <select
                    value={deviceForm.uptStation || ''}
                    onChange={(e) => setDeviceForm({ ...deviceForm, uptStation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] focus:bg-white font-semibold"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] focus:bg-white"
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
                        timkalibrasi: selectedPic === 'Pusat' ? 'BMKG Pusat' : 'Balai Besar MKG Wilayah V'
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] focus:bg-white font-bold"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] focus:bg-white font-bold"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Masa Berlaku Sertifikat Valid Until</label>
                  <input
                    type="date"
                    value={deviceForm.calibrationValidUntil || '2027-07-07'}
                    onChange={(e) => setDeviceForm({ ...deviceForm, calibrationValidUntil: e.target.value })}
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
                    value={deviceForm.latitude || 0}
                    onChange={(e) => setDeviceForm({ ...deviceForm, latitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Longitude (BT)</label>
                  <input
                    type="number"
                    step="any"
                    value={deviceForm.longitude || 0}
                    onChange={(e) => setDeviceForm({ ...deviceForm, longitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-800">
                Pembaruan alat ini akan langsung memperbarui pemetaan peta interaktif dan tercatat pada <strong className="font-bold">Log_Perubahan</strong>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDeviceModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0052CC] hover:bg-blue-800 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Simpan Peralatan
                </button>
              </div>
            </form>
          </div>
        </div>
  );
};
