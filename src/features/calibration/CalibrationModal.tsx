import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  X, 
  ShieldCheck, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Wrench,
  FileText,
  Check,
  Plus
} from 'lucide-react';
import { calibrationSchema } from '../../shared/schemas';
import { CalibrationModalProps } from './CalibrationTypes';

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  devices,
  onAddCalibrationRecord,
}) => {
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const getNextYearDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    d.setFullYear(d.getFullYear() + 1);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(calibrationSchema),
    defaultValues: {
      deviceId: devices[0]?.devicesId || '',
      deviceName: devices[0]?.site || '',
      category: devices[0]?.category || '',
      uptStation: devices[0]?.uptStation || '',
      lastCalibrated: '',
      calibrationValidUntil: '',
      calibrationStatus: 'VALID' as const,
      calibrationAgency: 'Tim INSKAL BBMKG Wilayah V',
      notes: 'Telah dilakukan kalibrasi & pengujian fungsi sensor operasional.',
      yearCreated: new Date().getFullYear().toString(),
    },
  });

  const watchDeviceId = watch('deviceId');
  const watchLastCalibrated = watch('lastCalibrated');
  const watchStatus = watch('calibrationStatus');

  const selectedDevice = devices.find((d) => d.devicesId === watchDeviceId) || devices[0];

  useEffect(() => {
    if (selectedDevice) {
      setValue('deviceId', selectedDevice.devicesId);
      setValue('deviceName', selectedDevice.site);
      setValue('category', selectedDevice.category);
      setValue('uptStation', selectedDevice.uptStation);
    }
  }, [watchDeviceId, selectedDevice, setValue]);

  const handleTanggalChange = (val: string) => {
    setValue('lastCalibrated', val);
    setValue('calibrationValidUntil', getNextYearDate(val));
    if (val) {
      setValue('yearCreated', val.split('-')[0] || '2026');
    }
  };

  if (!isOpen) return null;

  const onSubmit = (data: any) => {
    onAddCalibrationRecord({
      deviceId: data.deviceId,
      deviceName: data.deviceName,
      category: data.category,
      uptStation: data.uptStation,
      lastCalibrated: data.lastCalibrated,
      calibrationValidUntil: data.calibrationValidUntil,
      calibrationStatus: data.calibrationStatus,
      calibrationAgency: (data.calibrationAgency || '').trim(),
      notes: (data.notes || '').trim(),
      yearCreated: data.yearCreated || '2026',
    });

    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-2 sm:my-6 flex flex-col max-h-[95vh]">
        <div className="bg-[#0A203C] text-white p-3 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400 shrink-0">
              <ShieldCheck size={18} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-heading text-sm sm:text-lg font-bold">Input Data Kalibrasi INSKAL</h3>
                <span className="bg-purple-500/20 text-purple-300 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border border-purple-400/30 shrink-0">
                  INSKAL BMKG
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-300 mt-0.5">
                Penambahan Keterangan & Pelaksanaan Kalibrasi Peralatan
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
          <div className="p-5 sm:p-8 text-center space-y-2.5 sm:space-y-3 bg-purple-50">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto border border-purple-300">
              <Check size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h4 className="font-heading font-bold text-sm sm:text-lg text-purple-900">Data Kalibrasi Berhasil Disimpan!</h4>
            <p className="text-[11px] sm:text-xs text-purple-700">
              Catatan kalibrasi {selectedDevice?.site} telah ditambahkan ke Repository Histori Kalibrasi.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto">
            <div className="space-y-1 sm:space-y-1.5">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Wrench size={13} className="text-[#0052CC] sm:w-[14px] sm:h-[14px]" />
                NAMA ALAT / PERALATAN (Dropdown):
              </label>
              <select
                value={watchDeviceId}
                onChange={(e) => setValue('deviceId', e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg sm:rounded-xl px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-[11px] sm:text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white"
              >
                {devices.map((dev) => (
                  <option key={dev.devicesId} value={dev.devicesId}>
                    {dev.site} ({dev.category}) — {dev.uptStation}
                  </option>
                ))}
              </select>
              {errors.deviceId && (
                <span className="text-[10px] text-rose-600 font-bold">{String(errors.deviceId.message)}</span>
              )}
            </div>

            {selectedDevice && (
              <div className="p-2.5 sm:p-3 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-200 text-[11px] sm:text-xs space-y-1">
                <div className="flex justify-between text-slate-700">
                  <span className="font-semibold">Stasiun UPT:</span>
                  <span className="font-bold text-slate-900 text-right">{selectedDevice.uptStation}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span className="font-semibold">ID Peralatan:</span>
                  <span className="font-mono text-blue-700">{selectedDevice.devicesId}</span>
                </div>
              </div>
            )}

            <div className="p-2.5 sm:p-3.5 bg-purple-50/50 rounded-lg sm:rounded-xl border border-purple-200 space-y-2.5 sm:space-y-3">
              <span className="text-[11px] sm:text-xs font-bold text-purple-900 uppercase tracking-wide block">
                Detail Pelaksanaan Kalibrasi:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700">
                    Tanggal Kalibrasi:
                  </label>
                  <input
                    type="date"
                    value={watchLastCalibrated}
                    onChange={(e) => handleTanggalChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 sm:p-2 text-[11px] sm:text-xs font-medium text-slate-800"
                  />
                  {errors.lastCalibrated && (
                    <span className="text-[10px] text-rose-600 font-bold">{String(errors.lastCalibrated.message)}</span>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700">
                    Masa Berlaku Sampai:
                  </label>
                  <input
                    type="date"
                    {...register('calibrationValidUntil')}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 sm:p-2 text-[11px] sm:text-xs font-medium text-slate-800"
                  />
                  {errors.calibrationValidUntil && (
                    <span className="text-[10px] text-rose-600 font-bold">{String(errors.calibrationValidUntil.message)}</span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700">
                  Status Hasil Kalibrasi:
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setValue('calibrationStatus', 'VALID')}
                    className={`py-1.5 px-1 sm:px-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all border flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer ${
                      watchStatus === 'VALID'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    <CheckCircle2 size={12} className="sm:w-[13px] sm:h-[13px]" />
                    <span className="whitespace-nowrap">🟢 Valid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('calibrationStatus', 'SEGERA_DIKALIBRASI')}
                    className={`py-1.5 px-1 sm:px-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all border flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer ${
                      watchStatus === 'SEGERA_DIKALIBRASI'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    <AlertTriangle size={12} className="sm:w-[13px] sm:h-[13px]" />
                    <span className="whitespace-nowrap">🟡 Segera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('calibrationStatus', 'KADALUWARSA')}
                    className={`py-1.5 px-1 sm:px-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all border flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer ${
                      watchStatus === 'KADALUWARSA'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    <XCircle size={12} className="sm:w-[13px] sm:h-[13px]" />
                    <span className="whitespace-nowrap">🔴 Kadaluwarsa</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1 sm:space-y-1.5">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users size={13} className="text-[#0052CC] sm:w-[14px] sm:h-[14px]" />
                TIM / PERSONEL KALIBRASI INSKAL:
              </label>
              <input
                type="text"
                {...register('calibrationAgency')}
                placeholder="Contoh: Tim INSKAL Balai V / Fajar Nur & Agus Prasetyo"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg sm:rounded-xl px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-[11px] sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white"
              />
              {errors.calibrationAgency && (
                <span className="text-[10px] text-rose-600 font-bold">{String(errors.calibrationAgency.message)}</span>
              )}
            </div>

            <div className="space-y-1 sm:space-y-1.5">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText size={13} className="text-[#0052CC] sm:w-[14px] sm:h-[14px]" />
                KETERANGAN / SERTIFIKAT RESULT:
              </label>
              <textarea
                rows={2}
                {...register('notes')}
                placeholder="Keterangan tambahan hasil verifikasi / penyimpangan sensor..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg sm:rounded-xl p-2.5 sm:p-3 text-[11px] sm:text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white"
              />
            </div>

            <div className="pt-2 sm:pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-3.5 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white shadow-md transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <Plus size={14} className="sm:w-[15px] sm:h-[15px]" />
                <span className="whitespace-nowrap">Tambah ke Repository</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
