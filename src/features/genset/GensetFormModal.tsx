import React, { useState, useEffect } from 'react';
import { X, Zap, Plus, Trash2, Clock, Building, CheckCircle, Users } from 'lucide-react';
import { apiClient } from '../../shared/api';
import { getTodayIsoWIT } from '../../shared/utils/dateUtils';
import { petugasService, PetugasItem } from '../../shared/services/petugasService';
import { GensetChecklist } from '../../shared/types';

const CHECKLIST_SECTIONS = {
  bahanBakar: {
    title: 'Kondisi Sistem Bahan Bakar',
    items: [
      'Kondisi Tangki Bahan Bakar',
      'Volume bahan bakar',
      'Pipa -pipa / sambungan bahan bakar',
      'Filter Bahan Bakar',
    ]
  },
  pelumasan: {
    title: 'Kondisi Sistem Pelumasan',
    items: [
      'Tinggi Level Oli',
      'Kondisi Tangki & Baut Penutup Oli',
      'Kondisi Oli (Warna & Kekentalan)',
      'Kondisi Filter Oli',
    ]
  },
  pendinginan: {
    title: 'Kondisi Sistem Pendinginan',
    items: [
      'Kondisi Level cairan pendingin',
      'Kondisi Fisik radiator',
      'Kondisi Filter Udara',
    ]
  },
  baterai: {
    title: 'Kondisi Sistem Baterai',
    items: [
      'Kondisi Level Cairan electrolit',
      'Kondisi Tegangan Accu >12v',
      'Kondisi Terminal dan Klem Accu',
      'Kondisi Kabel dan Skun kabel Accu',
      'Kondisi Charger Baterai',
    ]
  },
  pemanasan: {
    title: 'Kondisi Saat pemanasan genset tanpa beban ( 5 s/d 10 menit, 1 kali seminggu)',
    items: [
      'Tegangan Tiap Fase',
      'Arus Tiap Fase',
      'Frekuensi Listrik',
      'RPM Mesin',
      'Tekanan Oli',
      'Getaran Mesin',
    ]
  },
  ats: {
    title: 'Kondisi ATS',
    items: [
      'Kondisi Box ATS',
      'Kondisi Perkabelan Pada box ATS',
      'Status kontak dan indicator normal',
      'Fungsi Automatic Berfungsi normal',
    ]
  }
};

const getDefaultChecklist = (): GensetChecklist => {
  const init = {} as GensetChecklist;
  (Object.keys(CHECKLIST_SECTIONS) as Array<keyof typeof CHECKLIST_SECTIONS>).forEach(secKey => {
    init[secKey] = {};
    CHECKLIST_SECTIONS[secKey].items.forEach(item => {
      init[secKey][item] = 'Baik';
    });
  });
  return init;
};

export const GensetFormModal: React.FC<{ isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [tanggal, setTanggal] = useState(getTodayIsoWIT());
  const [jam, setJam] = useState('08:00');
  const [gedung, setGedung] = useState<'Operasional' | 'Administrasi'>('Operasional');
  
  // Master Petugas & State Pilihan
  const [masterPetugas, setMasterPetugas] = useState<PetugasItem[]>(() => petugasService.getAll());
  const [selectedPetugas, setSelectedPetugas] = useState<string[]>(['']);

  // Matriks Checklist & Kesimpulan
  const [checklist, setChecklist] = useState<GensetChecklist>(getDefaultChecklist);
  const [kesimpulan, setKesimpulan] = useState<'BAIK' | 'PERLU PERBAIKAN' | 'RUSAK'>('BAIK');
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    petugasService.fetch().then(data => {
      if (data && data.length > 0) {
        setMasterPetugas(data);
      }
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTanggal(getTodayIsoWIT());
      setJam('08:00');
      setGedung('Operasional');
      // Set default pilihan pertama dari master petugas jika ada
      const initialMaster = masterPetugas.length > 0 ? masterPetugas[0].name : '';
      setSelectedPetugas([initialMaster]);
      setChecklist(getDefaultChecklist());
      setKesimpulan('BAIK');
      setCatatan('');
    }
  }, [isOpen, masterPetugas]);

  if (!isOpen) return null;

  const handleAddPetugasSlot = () => {
    if (selectedPetugas.length < masterPetugas.length && selectedPetugas.length < 5) {
      // Otomatis cari petugas dari master yang belum terpilih
      const unselected = masterPetugas.find(p => !selectedPetugas.includes(p.name));
      setSelectedPetugas([...selectedPetugas, unselected ? unselected.name : '']);
    }
  };

  const handleRemovePetugasSlot = (index: number) => {
    if (selectedPetugas.length > 1) {
      setSelectedPetugas(selectedPetugas.filter((_, idx) => idx !== index));
    }
  };

  const handlePetugasChange = (index: number, val: string) => {
    const updated = [...selectedPetugas];
    updated[index] = val;
    setSelectedPetugas(updated);
  };

  const handleChecklistChange = (secKey: keyof GensetChecklist, item: string, status: 'Baik' | 'Buruk') => {
    setChecklist(prev => ({
      ...prev,
      [secKey]: {
        ...prev[secKey],
        [item]: status
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validPetugas = selectedPetugas.map(p => p.trim()).filter(Boolean);
    if (validPetugas.length === 0) {
      alert('Pilih minimal 1 petugas dari data master.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.genset.add({
        tanggal,
        jam: `${jam} WIT`,
        gedung,
        petugasList: validPetugas,
        petugas: validPetugas.join(', '),
        checklistData: checklist,
        kesimpulan,
        catatan,
      });
      onSaved();
      onClose();
    } catch (err) {
      alert('Gagal menyimpan data monitoring genset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-3xl my-auto flex flex-col max-h-[92vh] overflow-hidden shadow-2xl">
        
        {/* Header Modal */}
        <div className="bg-[#0A203C] text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Form Pengisian Monitoring Genset</h3>
              <p className="text-[11px] text-slate-300">BBMKG Wilayah V Papua</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="hover:bg-white/20 p-1.5 rounded-lg text-slate-300 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto text-xs text-slate-800 flex-1">
          
          {/* 1. Informasi Umum */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tanggal Monitoring *</label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={e => setTanggal(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold outline-none focus:border-[#0052CC]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock size={14} className="text-[#0052CC]" /> Jam Monitoring *
              </label>
              <input
                type="time"
                required
                value={jam}
                onChange={e => setJam(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold outline-none focus:border-[#0052CC]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building size={14} className="text-[#0052CC]" /> Genset Gedung *
              </label>
              <select
                value={gedung}
                onChange={e => setGedung(e.target.value as any)}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:border-[#0052CC]"
              >
                <option value="Operasional">Gedung Operasional</option>
                <option value="Administrasi">Gedung Administrasi</option>
              </select>
            </div>
          </div>

          {/* 2. Pilihan Petugas dari Master Data */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Users size={16} className="text-[#0052CC]" />
                Petugas Monitoring ({selectedPetugas.length} Personel) *
              </label>
              {selectedPetugas.length < masterPetugas.length && selectedPetugas.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddPetugasSlot}
                  className="text-xs font-bold text-[#0052CC] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} /> Tambah Slot Petugas
                </button>
              )}
            </div>

            {masterPetugas.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                Data master petugas belum tersedia. Tambahkan data petugas terlebih dahulu di menu Master Petugas.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedPetugas.map((petugasVal, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 font-extrabold text-slate-400 text-center shrink-0">{idx + 1}.</span>
                    <select
                      required
                      value={petugasVal}
                      onChange={e => handlePetugasChange(idx, e.target.value)}
                      className="flex-1 p-2 bg-white border border-slate-300 rounded-xl font-semibold outline-none focus:border-[#0052CC] cursor-pointer text-xs"
                    >
                      <option value="">-- Pilih Petugas dari Master Data --</option>
                      {masterPetugas.map(p => {
                        const isSelectedOther = selectedPetugas.some((sp, sIdx) => sIdx !== idx && sp === p.name);
                        return (
                          <option key={p.id} value={p.name} disabled={isSelectedOther}>
                            {p.name} {p.jabatan ? `(${p.jabatan})` : ''} {isSelectedOther ? '- (Sudah Dipilih)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {selectedPetugas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePetugasSlot(idx)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Hapus baris petugas"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Matriks Pengamatan */}
          <div className="space-y-4 pt-1">
            <h4 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center justify-between">
              <span>Matriks Hasil Pengamatan Fisik &amp; Fungsi</span>
              <span className="text-[11px] font-normal text-slate-500">Pilih kondisi komponen</span>
            </h4>

            {(Object.keys(CHECKLIST_SECTIONS) as Array<keyof typeof CHECKLIST_SECTIONS>).map((secKey) => {
              const sec = CHECKLIST_SECTIONS[secKey];
              return (
                <div key={secKey} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="bg-slate-100/80 px-4 py-2.5 font-bold text-slate-800 border-b border-slate-200">
                    {sec.title} <span className="text-rose-500">*</span>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100 text-[11px]">
                        <th className="py-2 px-4">Komponen Pengamatan</th>
                        <th className="py-2 px-4 text-center w-24">Baik</th>
                        <th className="py-2 px-4 text-center w-24">Buruk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sec.items.map((item) => {
                        const currentVal = checklist[secKey]?.[item] || 'Baik';
                        return (
                          <tr key={item} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-slate-700">{item}</td>
                            <td className="py-2.5 px-4 text-center">
                              <input
                                type="radio"
                                name={`chk-${secKey}-${item}`}
                                checked={currentVal === 'Baik'}
                                onChange={() => handleChecklistChange(secKey, item, 'Baik')}
                                className="w-4 h-4 accent-emerald-600 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <input
                                type="radio"
                                name={`chk-${secKey}-${item}`}
                                checked={currentVal === 'Buruk'}
                                onChange={() => handleChecklistChange(secKey, item, 'Buruk')}
                                className="w-4 h-4 accent-rose-600 cursor-pointer"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* 4. Kesimpulan & Catatan */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Kesimpulan Akhir Kondisi Genset *</label>
              <select
                value={kesimpulan}
                onChange={e => setKesimpulan(e.target.value as any)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-[#0052CC]"
              >
                <option value="BAIK">🟢 BAIK / SIAP OPERASI (NORMAL)</option>
                <option value="PERLU PERBAIKAN">🟡 PERLU PERAWATAN / PERBAIKAN</option>
                <option value="RUSAK">🔴 RUSAK / MATI TOTAL</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Catatan Pengamatan Tambahan</label>
              <textarea
                rows={2}
                value={catatan}
                onChange={e => setCatatan(e.target.value)}
                placeholder="Tuliskan catatan teknis jika ada temuan komponen buruk..."
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-[#0052CC] resize-none"
              />
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0052CC] hover:bg-blue-800 text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle size={16} />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Monitoring Genset'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};