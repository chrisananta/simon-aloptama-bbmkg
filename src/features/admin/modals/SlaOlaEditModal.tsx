import React from 'react';
import { X, Activity } from 'lucide-react';
import { AloptamaDevice } from '../../../shared/types';

interface SlaOlaEditModalProps {
  editingSlaDevice: AloptamaDevice;
  selectedMonthSlaOla: string;
  selectedYearSlaOla: string;
  editSlaVal: number;
  setEditSlaVal: (value: number) => void;
  editOlaVal: number;
  setEditOlaVal: (value: number) => void;
  setIsSlaOlaEditModalOpen: (open: boolean) => void;
  handleSaveSlaOla: (e: React.FormEvent) => void;
}

export const SlaOlaEditModal: React.FC<SlaOlaEditModalProps> = ({
  editingSlaDevice,
  selectedMonthSlaOla,
  selectedYearSlaOla,
  editSlaVal,
  setEditSlaVal,
  editOlaVal,
  setEditOlaVal,
  setIsSlaOlaEditModalOpen,
  handleSaveSlaOla,
}) => {
  return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-auto flex flex-col max-h-[92vh]">
            <div className="bg-[#0A203C] text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-blue-400 shrink-0" />
                <h3 className="font-bold text-xs sm:text-sm">Input / Overwrite SLA &amp; OLA Bulanan</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSlaOlaEditModalOpen(false)}
                className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSlaOla} className="p-3.5 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <p className="font-bold text-slate-900">{editingSlaDevice.site}</p>
                <p className="text-slate-500">ID: <span className="font-mono text-blue-700 font-bold">{editingSlaDevice.devicesId}</span> | UPT: {editingSlaDevice.uptStation}</p>
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-xs outline-none focus:border-[#0052CC]"
                    required
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditSlaVal(100)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${editSlaVal === 100 ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-100 text-slate-700'}`}
                    >
                      100% (ON)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditSlaVal(0);
                        setEditOlaVal(0);
                      }}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${editSlaVal === 0 ? 'bg-rose-600 text-white border-rose-700' : 'bg-slate-100 text-slate-700'}`}
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
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-xs outline-none focus:border-[#0052CC]"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">Acuan Status: 100% = Normal, 1-99% = Gangguan, 0% = Mati</p>
              </div>

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

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSlaOlaEditModalOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
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
  );
};
