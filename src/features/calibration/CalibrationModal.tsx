import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  Users,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  FileText,
  Check,
  Plus,
  Trash2,
  MapPin,
} from 'lucide-react';
import { CalibrationModalProps } from './CalibrationTypes';
import { isNotCalibrated } from '../../shared/utils/calibration';
import { isSameUpt } from '../../shared/utils/uptMatch';
import { petugasService, PetugasItem } from '../../shared/services/petugasService';
import type { UPTStation } from '../../shared/types';

const DEFAULT_NOTES = 'Telah dilakukan kalibrasi & pengujian fungsi sensor operasional.';
const MIN_PERSONEL_SLOTS = 2;
const MAX_PERSONEL_SLOTS = 6;

/** Masa berlaku = tanggal kalibrasi + 1 tahun. 29 Feb -> 28 Feb. */
const addOneYear = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  const day = m === 2 && d === 29 ? 28 : d;
  return `${String(y + 1).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  devices: allDevices,
  stations = [] as UPTStation[],
  onAddCalibrationRecord,
}) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Alat yang ditandai "Tidak Dikalibrasi" (mis. sirene) tidak bisa diinput kalibrasinya.
  const devices = useMemo(() => allDevices.filter((d) => !isNotCalibrated(d)), [allDevices]);

  // Pilihan stasiun: hanya stasiun yang punya alat yang bisa dikalibrasi.
  const stationOptions = useMemo(() => {
    if (stations.length > 0) {
      return stations
        .filter((s) => devices.some((d) => isSameUpt(d.uptStation, s.name, stations)))
        .map((s) => s.name)
        .sort((a, b) => a.localeCompare(b, 'id'));
    }
    return Array.from(new Set(devices.map((d) => d.uptStation).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, 'id')
    );
  }, [stations, devices]);

  const [station, setStation] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastCalibrated, setLastCalibrated] = useState('');
  const [status, setStatus] = useState<'VALID' | 'SEGERA_DIKALIBRASI'>('VALID');
  const [personel, setPersonel] = useState<string[]>(Array(MIN_PERSONEL_SLOTS).fill(''));
  const [notes, setNotes] = useState(DEFAULT_NOTES);
  const [masterPetugas, setMasterPetugas] = useState<PetugasItem[]>(() => petugasService.getAll());

  const validUntil = lastCalibrated ? addOneYear(lastCalibrated) : '';

  // Alat milik stasiun terpilih
  const stationDevices = useMemo(
    () =>
      devices
        .filter((d) =>
          stations.length > 0 ? isSameUpt(d.uptStation, station, stations) : d.uptStation === station
        )
        .sort((a, b) => (a.site || '').localeCompare(b.site || '', 'id')),
    [devices, stations, station]
  );

  // Reset form setiap kali dibuka
  useEffect(() => {
    if (!isOpen) return;
    setIsSubmitted(false);
    setIsSubmitting(false);
    setErrorMessage(null);
    setStation(stationOptions[0] || '');
    setSelectedIds(new Set());
    setLastCalibrated('');
    setStatus('VALID');
    setPersonel(Array(MIN_PERSONEL_SLOTS).fill(''));
    setNotes(DEFAULT_NOTES);
    petugasService.fetch().then((data) => setMasterPetugas(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Ganti stasiun -> pilihan alat dikosongkan
  const handleStationChange = (val: string) => {
    setStation(val);
    setSelectedIds(new Set());
  };

  const allSelected = stationDevices.length > 0 && stationDevices.every((d) => selectedIds.has(d.devicesId));

  const toggleDevice = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(stationDevices.map((d) => d.devicesId)));

  const setPersonelAt = (idx: number, val: string) =>
    setPersonel((prev) => prev.map((p, i) => (i === idx ? val : p)));
  const addPersonelSlot = () =>
    setPersonel((prev) => (prev.length < MAX_PERSONEL_SLOTS ? [...prev, ''] : prev));
  const removePersonelSlot = (idx: number) =>
    setPersonel((prev) => (prev.length > MIN_PERSONEL_SLOTS ? prev.filter((_, i) => i !== idx) : prev));

  if (!isOpen) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const chosen = stationDevices.filter((d) => selectedIds.has(d.devicesId));
    const team = personel.map((p) => p.trim()).filter(Boolean);

    if (!station) return setErrorMessage('Pilih stasiun UPT terlebih dahulu.');
    if (chosen.length === 0) return setErrorMessage('Centang minimal 1 peralatan yang dikalibrasi.');
    if (!lastCalibrated) return setErrorMessage('Tanggal kalibrasi wajib diisi.');
    if (team.length === 0) return setErrorMessage('Pilih minimal 1 personel kalibrasi dari data master.');

    setIsSubmitting(true);
    try {
      // Berurutan supaya data lokal & server tidak saling menimpa.
      for (const dev of chosen) {
        await onAddCalibrationRecord({
          deviceId: dev.devicesId,
          deviceName: dev.site,
          category: dev.category,
          uptStation: dev.uptStation,
          lastCalibrated,
          calibrationValidUntil: validUntil,
          calibrationStatus: status,
          calibrationAgency: team.join(', '),
          notes: notes.trim(),
          yearCreated: lastCalibrated.split('-')[0] || String(new Date().getFullYear()),
        });
      }
      setSavedCount(chosen.length);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
      }, 1400);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menyimpan data kalibrasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full bg-slate-50 border border-slate-300 rounded-lg sm:rounded-xl px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-[11px] sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white';
  const labelClass = 'block text-[11px] sm:text-xs font-bold text-slate-800 flex items-center gap-1.5';

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-2 sm:my-6 flex flex-col max-h-[95vh]">
        <div className="bg-[#0A203C] text-white p-3 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck size={18} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-heading text-sm sm:text-lg font-bold">Input Data Kalibrasi Lapang</h3>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-300 mt-0.5">
                Penambahan Keterangan & Pelaksanaan Kalibrasi Lapang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 sm:p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="p-5 sm:p-8 text-center space-y-2.5 sm:space-y-3 bg-blue-50">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto border border-blue-300">
              <Check size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h4 className="font-heading font-bold text-sm sm:text-lg text-blue-900">Data Kalibrasi Berhasil Disimpan!</h4>
            <p className="text-[11px] sm:text-xs text-blue-700">
              {savedCount} catatan kalibrasi telah ditambahkan ke Repository Histori Kalibrasi.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto">
            {/* 1. Stasiun UPT */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className={labelClass}>
                <MapPin size={13} className="text-[#0052CC] sm:w-[14px] sm:h-[14px]" />
                NAMA STASIUN UPT:
              </label>
              <select
                value={station}
                onChange={(e) => handleStationChange(e.target.value)}
                disabled={isSubmitting}
                className={`${inputClass} font-semibold`}
              >
                {stationOptions.length === 0 && <option value="">Belum ada stasiun dengan alat</option>}
                {stationOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Daftar alat (centang) sesuai stasiun */}
            <div className="space-y-1 sm:space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className={labelClass}>
                  <Wrench size={13} className="text-[#0052CC] sm:w-[14px] sm:h-[14px]" />
                  PERALATAN YANG DIKALIBRASI:
                </label>
                <span className="text-[10px] sm:text-[11px] font-bold text-[#0052CC] bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 shrink-0">
                  {selectedIds.size} dipilih
                </span>
              </div>

              {stationDevices.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] sm:text-xs text-slate-500">
                  Tidak ada peralatan yang dapat dikalibrasi di stasiun ini.
                </div>
              ) : (
                <div className="border border-slate-300 rounded-lg sm:rounded-xl overflow-hidden">
                  <label className="flex items-center gap-2.5 px-3 py-2 bg-slate-100 border-b border-slate-200 text-[11px] sm:text-xs font-bold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-[#0052CC] cursor-pointer"
                    />
                    Pilih semua 
                  </label>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {stationDevices.map((dev) => {
                      const checked = selectedIds.has(dev.devicesId);
                      return (
                        <label
                          key={dev.devicesId}
                          className={`flex items-center gap-2.5 px-3 py-2 text-[11px] sm:text-xs cursor-pointer select-none transition-colors ${
                            checked ? 'bg-blue-50/70' : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDevice(dev.devicesId)}
                            className="w-4 h-4 accent-[#0052CC] cursor-pointer shrink-0"
                          />
                          <span className="font-semibold text-slate-800 min-w-0 truncate">{dev.site}</span>
                          <span className="ml-auto shrink-0 text-[10px] sm:text-[11px] font-medium text-slate-500">
                            {dev.category}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Detail pelaksanaan */}
            <div className="p-2.5 sm:p-3.5 bg-blue-50/50 rounded-lg sm:rounded-xl border border-blue-200 space-y-2.5 sm:space-y-3">
              <span className="text-[11px] sm:text-xs font-bold text-blue-900 uppercase tracking-wide block">
                Detail Pelaksanaan Kalibrasi:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700">
                    Tanggal Kalibrasi:
                  </label>
                  <input
                    type="date"
                    value={lastCalibrated}
                    onChange={(e) => setLastCalibrated(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 sm:p-2 text-[11px] sm:text-xs font-medium text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700">
                    Masa Berlaku Sampai :
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    readOnly
                    tabIndex={-1}
                    className="w-full bg-slate-100 border border-slate-300 rounded-lg p-1.5 sm:p-2 text-[11px] sm:text-xs font-medium text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700">
                  Status Hasil Kalibrasi:
                </label>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('VALID')}
                    className={`py-1.5 px-1 sm:px-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all border flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer ${
                      status === 'VALID'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    <CheckCircle2 size={12} className="sm:w-[13px] sm:h-[13px]" />
                    <span className="whitespace-nowrap">🟢 Valid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('SEGERA_DIKALIBRASI')}
                    className={`py-1.5 px-1 sm:px-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all border flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer ${
                      status === 'SEGERA_DIKALIBRASI'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    <AlertTriangle size={12} className="sm:w-[13px] sm:h-[13px]" />
                    <span className="whitespace-nowrap">🟡 Segera</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Personel dari master petugas */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className={labelClass}>
                <Users size={13} className="text-[#0052CC] sm:w-[14px] sm:h-[14px]" />
                TIM / PERSONEL KALIBRASI INSKAL:
              </label>

              {masterPetugas.length === 0 ? (
                <div className="p-3 bg-amber-50/90 border border-amber-200 text-amber-900 rounded-xl text-[11px] sm:text-xs">
                  Data master petugas belum tersedia. Tambahkan petugas terlebih dahulu di menu Master Petugas.
                </div>
              ) : (
                <div className="space-y-2">
                  {personel.map((val, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 font-extrabold text-slate-400 text-center shrink-0 text-xs">{idx + 1}.</span>
                      <select
                        value={val}
                        onChange={(e) => setPersonelAt(idx, e.target.value)}
                        disabled={isSubmitting}
                        className={`${inputClass} flex-1 min-w-0 font-semibold truncate`}
                      >
                        <option value="">Pilih Personel</option>
                        {masterPetugas.map((p) => {
                          const usedElsewhere = personel.some((sp, i) => i !== idx && sp === p.name);
                          return (
                            <option key={p.id} value={p.name} disabled={usedElsewhere}>
                              {p.name}
                              {usedElsewhere ? ' - (Sudah Dipilih)' : ''}
                            </option>
                          );
                        })}
                      </select>
                      {idx >= MIN_PERSONEL_SLOTS && (
                        <button
                          type="button"
                          onClick={() => removePersonelSlot(idx)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Hapus personel"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {personel.length < Math.min(MAX_PERSONEL_SLOTS, masterPetugas.length) && (
                    <button
                      type="button"
                      onClick={addPersonelSlot}
                      className="ml-7 inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-[#0052CC] hover:underline cursor-pointer"
                    >
                      <Plus size={14} /> Tambah Personel
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1 sm:space-y-1.5">
              <label className={labelClass}>
                <FileText size={13} className="text-[#0052CC] sm:w-[14px] sm:h-[14px]" />
                KETERANGAN / SERTIFIKAT RESULT:
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Keterangan tambahan hasil verifikasi / penyimpangan sensor..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg sm:rounded-xl p-2.5 sm:p-3 text-[11px] sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white"
              />
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[11px] sm:text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <div className="pt-2 sm:pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3.5 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-md transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer disabled:opacity-60"
              >
                <Plus size={14} className="sm:w-[15px] sm:h-[15px]" />
                <span className="whitespace-nowrap">
                  {isSubmitting
                    ? 'Menyimpan...'
                    : selectedIds.size > 1
                      ? `Tambah ${selectedIds.size} Alat ke Repository`
                      : 'Tambah ke Repository'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};