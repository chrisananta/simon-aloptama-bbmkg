import React, { useState, useEffect } from 'react';
import { X, Wrench, Plus, Trash2, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { apiClient } from '../../shared/api';
import { getTodayIsoWIT } from '../../shared/utils/dateUtils';
import { petugasService, PetugasItem } from '../../shared/services/petugasService';
import { PerbaikanRecord } from '../../shared/types';

export const PerbaikanFormModal: React.FC<{ isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [formType, setFormType] = useState<'FORM_1_1' | 'FORM_1_2'>('FORM_1_1');
  const [jenisLaporan, setJenisLaporan] = useState<string[]>(['Perbaikan']);
  
  const [namaAlat, setNamaAlat] = useState('');
  const [merk, setMerk] = useState('');
  const [typeSn, setTypeSn] = useState('');
  const [lokasiAlat, setLokasiAlat] = useState('');
  
  // Jenis & Kategori Spesifik
  const [jenisPeralatan, setJenisPeralatan] = useState('Meteorologi');
  const [kategoriPeralatan, setKategoriPeralatan] = useState('Sederhana Elektronik');

  const [akarPenyebab, setAkarPenyebab] = useState('');
  const [analisisKerusakan, setAnalisisKerusakan] = useState('');
  const [rekomendasi, setRekomendasi] = useState('');
  const [kondisiAlat, setKondisiAlat] = useState<PerbaikanRecord['kondisiAlat']>('LAYAK_NORMAL');
  const [kondisiOtherDetail, setKondisiOtherDetail] = useState('');
  const [persentaseFungsi, setPersentaseFungsi] = useState<number>(100);
  const [tanggal, setTanggal] = useState(getTodayIsoWIT());

  // Petugas & Lampiran Foto Base64
  const [masterPetugas, setMasterPetugas] = useState<PetugasItem[]>(() => petugasService.getAll());
  const [selectedTeknisi, setSelectedTeknisi] = useState<string[]>(['']);
  const [fotoLampiran, setFotoLampiran] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    petugasService.fetch().then(data => { if (data) setMasterPetugas(data); });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFormType('FORM_1_1');
      setJenisLaporan(['Perbaikan']);
      setNamaAlat(''); setMerk(''); setTypeSn(''); setLokasiAlat('');
      setJenisPeralatan('Meteorologi'); setKategoriPeralatan('Sederhana Elektronik');
      setAkarPenyebab(''); setAnalisisKerusakan(''); setRekomendasi('');
      setKondisiAlat('LAYAK_NORMAL'); setKondisiOtherDetail(''); setPersentaseFungsi(100);
      setTanggal(getTodayIsoWIT());
      setSelectedTeknisi(masterPetugas.length > 0 ? [masterPetugas[0].name] : ['']);
      setFotoLampiran([]);
    }
  }, [isOpen, masterPetugas]);

  if (!isOpen) return null;

  const handleJenisLaporanToggle = (val: string) => {
    // Sebelumnya unek centang terakhir DIBLOKIR di sini (supaya minimal 1
    // selalu tercentang) - efeknya orang yang mau pindah dari "Perbaikan"
    // ke "Instalasi" saja jadi kesulitan (harus centang dulu yang baru,
    // baru bisa lepas yang lama). Sekarang toggle bebas; validasi "minimal
    // 1 harus dicentang" dipindah ke saat Simpan (lihat handleSubmit).
    if (jenisLaporan.includes(val)) {
      setJenisLaporan(jenisLaporan.filter(j => j !== val));
    } else {
      setJenisLaporan([...jenisLaporan, val]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setFotoLampiran(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jenisLaporan.length === 0) {
      alert('Pilih minimal 1 Jenis Laporan!');
      return;
    }
    const validTeknisi = selectedTeknisi.filter(Boolean);
    if (validTeknisi.length === 0) {
      alert('Pilih minimal 1 teknisi!');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.perbaikan.add({
        formType,
        jenisLaporan,
        namaAlat,
        merk,
        typeSn,
        lokasiAlat,
        jenisPeralatan,
        kategoriPeralatan: formType === 'FORM_1_1' ? kategoriPeralatan : undefined,
        akarPenyebab,
        analisisKerusakan,
        rekomendasi,
        kondisiAlat,
        kondisiOtherDetail,
        persentaseFungsi,
        tanggal,
        teknisiList: validTeknisi,
        fotoLampiran,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Gagal menyimpan laporan perbaikan:', err);
      alert(err?.message || 'Gagal menyimpan laporan perbaikan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl my-auto flex flex-col max-h-[92vh] overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="bg-[#0A203C] text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Wrench size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Form Laporan Perbaikan / Instalasi / Pengujian</h3>
              <p className="text-[11px] text-slate-300">Tim Kerja Instrumentasi dan Kalibrasi BBMKG V</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg text-slate-300 hover:text-white"><X size={18} /></button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto text-xs text-slate-800 flex-1">
          
          {/* Pilihan Tipe Form & Jenis Laporan */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold mb-1 text-slate-700">Tipe Kategori Peralatan *</label>
              <select
                value={formType}
                onChange={e => {
                  const val = e.target.value as any;
                  setFormType(val);
                  setJenisPeralatan(val === 'FORM_1_1' ? 'Meteorologi' : 'Kelistrikan');
                }}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
              >
                <option value="FORM_1_1">Form 1.1 - Peralatan MKG (Meteorologi, Klimatologi, Geofisika)</option>
                <option value="FORM_1_2">Form 1.2 - Peralatan Penunjang Operasional MKG</option>
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700">Jenis Laporan (Dapat Centang Banyak) *</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {['Perbaikan', 'Instalasi', 'Pengecekan Fungsi Alat', 'Pengujian Setelah Perbaikan'].map(item => (
                  <label key={item} className="flex items-center gap-1.5 font-semibold cursor-pointer bg-white px-2.5 py-1.5 border border-slate-300 rounded-lg">
                    <input
                      type="checkbox"
                      checked={jenisLaporan.includes(item)}
                      onChange={() => handleJenisLaporanToggle(item)}
                      className="accent-[#0052CC]"
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Detail Identitas Alat */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 border-b pb-1">Identitas Peralatan</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold mb-1">Nama Alat *</label>
                <input required value={namaAlat} onChange={e=>setNamaAlat(e.target.value)} placeholder="Misal: Display Pyranometer" className="w-full p-2 bg-white border rounded-xl font-semibold" />
              </div>
              <div>
                <label className="block font-bold mb-1">Merk *</label>
                <input required value={merk} onChange={e=>setMerk(e.target.value)} placeholder="Misal: Kipp & Zonen" className="w-full p-2 bg-white border rounded-xl font-semibold" />
              </div>
              <div>
                <label className="block font-bold mb-1">Type / SN *</label>
                <input required value={typeSn} onChange={e=>setTypeSn(e.target.value)} placeholder="Meteon / 1234" className="w-full p-2 bg-white border rounded-xl font-semibold" />
              </div>
              <div>
                <label className="block font-bold mb-1">Lokasi Alat *</label>
                <input required value={lokasiAlat} onChange={e=>setLokasiAlat(e.target.value)} placeholder="BBMKG 5 / Lab Kalibrasi" className="w-full p-2 bg-white border rounded-xl font-semibold" />
              </div>
            </div>

            {/* Classification Based on Form Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block font-bold mb-1">Jenis Peralatan *</label>
                <select value={jenisPeralatan} onChange={e=>setJenisPeralatan(e.target.value)} className="w-full p-2 bg-white border rounded-xl font-bold">
                  {formType === 'FORM_1_1' ? (
                    <>
                      <option value="Meteorologi">Meteorologi</option>
                      <option value="Klimatologi">Klimatologi</option>
                      <option value="Geofisika">Geofisika</option>
                    </>
                  ) : (
                    <>
                      <option value="Perangkat Keras Mekanik / Konvensional">Perangkat Keras Mekanik / Konvensional</option>
                      <option value="Perangkat Keras Digital">Perangkat Keras Digital</option>
                      <option value="Kelistrikan">Kelistrikan</option>
                      <option value="Mesin">Mesin</option>
                      <option value="Perangkat Keras Canggih">Perangkat Keras Canggih</option>
                      <option value="Perangkat Lunak / Virtual">Perangkat Lunak / Virtual</option>
                    </>
                  )}
                </select>
              </div>

              {formType === 'FORM_1_1' && (
                <div>
                  <label className="block font-bold mb-1">Kategori *</label>
                  <select value={kategoriPeralatan} onChange={e=>setKategoriPeralatan(e.target.value)} className="w-full p-2 bg-white border rounded-xl font-bold">
                    <option value="Sederhana Mekanik">Sederhana Mekanik</option>
                    <option value="Sederhana Elektronik">Sederhana Elektronik</option>
                    <option value="Canggih/Modern">Canggih / Modern</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Deskripsi Masalah & Analisis */}
          <div className="space-y-3">
            <div>
              <label className="block font-bold mb-1">Akar Penyebab / Kerusakan / Permasalahan / Kondisi Awal *</label>
              <textarea required rows={2} value={akarPenyebab} onChange={e=>setAkarPenyebab(e.target.value)} placeholder="Tuliskan temuan awal kerusakan..." className="w-full p-2.5 bg-white border rounded-xl resize-none" />
            </div>

            <div>
              <label className="block font-bold mb-1">Analisis Terhadap Kerusakan atau Permasalahan (Jika ada)</label>
              <textarea rows={2} value={analisisKerusakan} onChange={e=>setAnalisisKerusakan(e.target.value)} placeholder="Tuliskan langkah pengecekan/pembersihan yang telah dilakukan..." className="w-full p-2.5 bg-white border rounded-xl resize-none" />
            </div>

            <div>
              <label className="block font-bold mb-1">Rekomendasi *</label>
              <textarea required rows={2} value={rekomendasi} onChange={e=>setRekomendasi(e.target.value)} placeholder="Tuliskan saran penyimpanan atau perawatan selanjutnya..." className="w-full p-2.5 bg-white border rounded-xl resize-none" />
            </div>
          </div>

          {/* Result & Percentages */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="block font-bold mb-1">Kondisi Alat Setelah Pengecekan *</label>
              {[
                { key: 'LAYAK_NORMAL', label: 'Layak dan semua fungsi normal' },
                { key: 'LAYAK_SEBAGIAN', label: 'Layak dan ada beberapa fungsi tidak normal' },
                { key: 'LAYAK_MODIFIKASI', label: 'Layak dan beroperasi setelah dilakukan modifikasi' },
                { key: 'TIDAK_LAYAK', label: 'Tidak Layak dioperasikan' },
              ].map(opt => (
                <label key={opt.key} className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input type="radio" name="kondisiAlat" checked={kondisiAlat === opt.key} onChange={()=>setKondisiAlat(opt.key as any)} className="accent-[#0052CC]" />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Tanggal Pengecekan *</label>
                <input type="date" required value={tanggal} onChange={e=>setTanggal(e.target.value)} className="w-full p-2 bg-white border rounded-xl font-bold" />
              </div>
              <div>
                <label className="block font-bold mb-1">Persentase Fungsi Kerja (%) *</label>
                <input type="number" min={0} max={100} required value={persentaseFungsi} onChange={e=>setPersentaseFungsi(Number(e.target.value))} className="w-full p-2 bg-white border rounded-xl font-bold" />
              </div>
            </div>
          </div>

          {/* Teknisi (Max 3) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <label className="font-bold">Teknisi Yang Melakukan (Maks. 3 Orang) *</label>
              {selectedTeknisi.length < 3 && (
                <button type="button" onClick={()=>setSelectedTeknisi([...selectedTeknisi, ''])} className="text-[#0052CC] font-bold flex items-center gap-1 cursor-pointer">
                  <Plus size={14} /> Tambah Teknisi
                </button>
              )}
            </div>
            {selectedTeknisi.map((tekVal, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="font-extrabold text-slate-400 w-16">Teknisi {idx+1}:</span>
                <select
                  required
                  value={tekVal}
                  onChange={e => {
                    const copy = [...selectedTeknisi];
                    copy[idx] = e.target.value;
                    setSelectedTeknisi(copy);
                  }}
                  className="flex-1 p-2 bg-white border rounded-xl font-semibold"
                >
                  <option value="">-- Pilih Teknisi --</option>
                  {masterPetugas.map(p => (
                    <option key={p.id} value={p.name} disabled={selectedTeknisi.some((st, i) => i !== idx && st === p.name)}>
                      {p.name} ({p.jabatan || 'Teknisi'})
                    </option>
                  ))}
                </select>
                {selectedTeknisi.length > 1 && (
                  <button type="button" onClick={()=>setSelectedTeknisi(selectedTeknisi.filter((_, i) => i !== idx))} className="text-rose-500 p-2"><Trash2 size={16}/></button>
                )}
              </div>
            ))}
          </div>

          {/* Upload Lampiran Foto Documentation */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <label className="font-bold block flex items-center gap-1.5 text-slate-800">
              <ImageIcon size={16} className="text-[#0052CC]" /> Lampiran Foto Dokumentasi Pengerjaan
            </label>
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0052CC] hover:file:bg-blue-100" />
            
            {fotoLampiran.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {fotoLampiran.map((img, idx) => (
                  <div key={idx} className="relative group border rounded-lg overflow-hidden bg-white h-24">
                    <img src={img} alt="Lampiran" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFotoLampiran(fotoLampiran.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full opacity-90 hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t flex justify-end gap-2 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 font-bold text-slate-600">Batal</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 font-bold bg-[#0052CC] text-white rounded-xl flex items-center gap-1.5">
              <CheckCircle size={16} /> <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Laporan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};