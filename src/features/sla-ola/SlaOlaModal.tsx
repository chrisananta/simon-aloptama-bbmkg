import React, { useState, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiClient } from "../../shared/api";
import { useAuth } from "../auth/AuthContext";
import { slaOlaSchema, SLA_OLA_MAX_BACKDATE_DAYS } from "../../shared/schemas";
import { getYesterdayIsoWIT, getIsoDaysAgoWIT, formatDateIndo } from "../../shared/utils/dateUtils";
import { SlaOlaModalProps } from "./SlaOlaTypes";
import { OlaCalculator } from "./OlaCalculator";
import { isSameUpt } from "../../shared/utils/uptMatch";
import { isInCategory } from "../../shared/utils/slaOlaCategory";
import type { AloptamaDevice } from "../../shared/types";
import {
  X as XIcon,
  Percent as PercentIcon,
  Building2 as BuildingIcon,
  Wrench as WrenchIcon,
  Calculator as CalculatorIcon,
  ChevronUp,
  ChevronDown,
  Check,
  Info,
  CheckSquare,
  Square,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";

const EQUIPMENT_CATEGORIES: string[] = [
  "AWOS Kat. III",
  "AWOS Kat. II",
  "AWOS Kat. I",
  "AWS",
  "ARG",
  "Radar Cuaca",
  "Lightning Detector",
  "Seismometer",
  "Accelerograph",
  "WRS NG",
  "Sirine Tsunami",
];

// Apakah alat termasuk jenis peralatan yang dipilih di dropdown.
// Untuk AWOS, field `category` di database sudah memuat kategorinya ("AWOS Kat.I/II/III"),
// jadi dicocokkan persis; bila tidak memuat, jatuh ke pencocokan lama berdasarkan nama site.
const deviceMatchesCategory = (d: AloptamaDevice, category: string): boolean => {
  if (!category || category === "ALL") return true;

  const devCat = (d.category || "").toLowerCase();
  const devSite = (d.site || "").toLowerCase();
  const selCat = category.toLowerCase();

  if (selCat.startsWith("awos")) {
    if (!devCat.includes("awos")) return false;
    if (/kat/.test(devCat)) return isInCategory(d, category);
    if (category === "AWOS Kat. I")
      return devSite.includes("kat i") && !devSite.includes("kat iii");
    if (category === "AWOS Kat. II") return devSite.includes("kat ii");
    if (category === "AWOS Kat. III")
      return (
        devSite.includes("kat iii") ||
        (!devSite.includes("kat i") && !devSite.includes("kat ii"))
      );
    return true;
  }

  if (selCat.includes("sirine")) return devCat.includes("sirine") || devCat.includes("siren");
  if (selCat.includes("seismometer")) return devCat.includes("seismometer") || devCat.includes("seismo");
  if (selCat.includes("accelerograph")) return devCat.includes("accelerograph") || devCat.includes("akselero");
  if (selCat.includes("wrs")) return devCat.includes("wrs");
  if (selCat.includes("lightning")) return devCat.includes("lightning") || devCat.includes("petir");
  if (selCat.includes("radar")) return devCat.includes("radar");
  if (selCat.includes("aws")) {
    return (devCat.includes("aws") || devCat.includes("automatic weather")) && !devCat.includes("awos");
  }
  if (selCat.includes("arg")) return devCat.includes("arg") || devCat.includes("automatic rain");

  return devCat.includes(selCat) || selCat.includes(devCat);
};

// OLA selalu kelipatan 0,5 dan dibatasi 0-100.
const snapOla = (v: number): number =>
  Math.min(100, Math.max(0, Math.round((Number.isFinite(v) ? v : 0) * 2) / 2));

// Input OLA: tampil 1 desimal (mis. 95.0); saat diketik bebas, lalu dibulatkan
// ke kelipatan 0,5 setelah selesai (blur / Enter).
const OlaNumberInput: React.FC<{
  value: number;
  disabled?: boolean;
  onCommit: (v: number) => void;
}> = ({ value, disabled, onCommit }) => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft ?? value.toFixed(1)}
      disabled={disabled}
      onFocus={(e) => {
        setDraft(String(value));
        e.target.select();
      }}
      onChange={(e) => setDraft(e.target.value.replace(",", "."))}
      onBlur={() => {
        const n = parseFloat(draft ?? "");
        if (!Number.isNaN(n)) onCommit(snapOla(n));
        setDraft(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-11 text-center text-[11px] font-bold text-slate-800 bg-transparent focus:outline-none disabled:text-slate-500"
    />
  );
};

// Kotak OLA: angka + panah atas/bawah. Scroll mouse saat kursor di atas kotak
// juga menaikkan / menurunkan nilai (kelipatan 0,5).
const OlaStepper: React.FC<{
  value: number;
  dotClass: string;
  sla: boolean;
  disabled?: boolean;
  onChange: (v: number) => void;
}> = ({ value, dotClass, sla, disabled, onChange }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ value, sla, disabled, onChange });
  latest.current = { value, sla, disabled, onChange };

  // Listener native (non-passive) agar scroll halaman bisa dicegah saat kursor di kotak ini.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      const cur = latest.current;
      if (cur.disabled || !cur.sla) return;
      e.preventDefault();
      cur.onChange(snapOla(cur.value + (e.deltaY < 0 ? 0.5 : -0.5)));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const off = disabled || !sla;
  return (
    <div
      ref={boxRef}
      className={`flex items-stretch rounded-lg border border-slate-300 overflow-hidden ${
        sla ? "bg-white" : "bg-slate-100"
      }`}
    >
      <div className="flex items-center justify-center gap-1 px-2 min-w-[96px] whitespace-nowrap">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
        <span className="text-[11px] font-bold text-slate-700">OLA</span>
        <OlaNumberInput value={value} disabled={off} onCommit={onChange} />
        <span className="text-[11px] font-bold text-slate-700">%</span>
      </div>
      <div className="flex flex-col w-6">
        <button
          type="button"
          title="Naikkan OLA"
          disabled={off || value >= 100}
          onClick={() => onChange(snapOla(value + 0.5))}
          className="flex-1 flex items-center justify-center text-slate-600 cursor-pointer disabled:text-slate-300 disabled:cursor-not-allowed"
        >
          <ChevronUp size={12} />
        </button>
        <button
          type="button"
          title="Turunkan OLA"
          disabled={off || value <= 0}
          onClick={() => onChange(snapOla(value - 0.5))}
          className="flex-1 flex items-center justify-center text-slate-600 cursor-pointer disabled:text-slate-300 disabled:cursor-not-allowed"
        >
          <ChevronDown size={12} />
        </button>
      </div>
    </div>
  );
};

export const SlaOlaModal: React.FC<SlaOlaModalProps> = ({
  isOpen,
  onClose,
  devices,
  onSaveSlaOla,
}) => {
  const { user, permissions } = useAuth();
  // Teknisi UPT & KaUPT hanya mengisi untuk UPT mereka sendiri 
  const isScopedToOwnUpt = permissions.isScopedToOwnUpt;

  // Melacak alat mana saja yang SUDAH diisi dalam sesi buka-modal ini.
  const [filledDeviceIds, setFilledDeviceIds] = useState<Set<string>>(new Set());

  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());

  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  // SLA (ON/OFF) + OLA (%) + pengaturan panel dimiliki tiap alat sendiri-sendiri.
  type DeviceRow = {
    sla: boolean;
    ola: number;
    mode: "KALKULATOR" | "MANUAL";
    open: boolean;
    opened: boolean; // sudah pernah dibuka -> kalkulator tetap ter-mount agar pilihannya tidak hilang
  };
  const DEFAULT_ROW: DeviceRow = { sla: true, ola: 100, mode: "KALKULATOR", open: false, opened: false };
  const [rowByDevice, setRowByDevice] = useState<Record<string, DeviceRow>>({});
  const getRow = (id: string): DeviceRow => rowByDevice[id] ?? DEFAULT_ROW;
  const patchRow = (id: string, patch: Partial<DeviceRow>) =>
    setRowByDevice((prev) => ({ ...(prev), [id]: { ...(prev[id] ?? DEFAULT_ROW), ...patch } }));
  // Nilai OLA efektif: SLA OFF otomatis 0%.
  const effOla = (id: string) => (getRow(id).sla ? getRow(id).ola : 0);
  const needKendalaFor = (id: string) => effOla(id) < 100;

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastBatchCount, setLastBatchCount] = useState<number>(0);
  // Kendala per alat (tampil di samping tiap alat yang dicentang). Isi di satu
  // alat otomatis disalin ke alat lain yang dicentang & belum diubah manual.
  const [kendalaByDevice, setKendalaByDevice] = useState<Record<string, string>>({});
  // Alat yang dicentang "sama dengan sebelumnya" (pakai kendala terakhirnya sendiri).
  const [samePrevByDevice, setSamePrevByDevice] = useState<Record<string, boolean>>({});

  const [stationsList, setStationsList] = useState<any[]>(() =>
    apiClient.stations.getAll()
  );

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      apiClient.stations.fetch().then((fresh) => {
        if (fresh && fresh.length > 0) {
          setStationsList(fresh);
        }
      });
    }
  }, [isOpen]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(slaOlaSchema),
    defaultValues: {
      uptStation: stationsList[0]?.name || "",
      category: "AWOS Kat. III",
      deviceId: "",
      kondisiSla: true,
      kondisiOla: 100,
      kendala: "",
      tanggal: getYesterdayIsoWIT(),
    },
  });

  const watchUptStation = watch("uptStation");
  const watchCategory = watch("category");
  const watchTanggal = watch("tanggal");

  // Tanggal default & maksimal = KEMARIN (pengisian hari ini untuk kondisi kemarin).
  const todayIsoWIT = useMemo(() => getYesterdayIsoWIT(), []);
  const minBackdateIsoWIT = useMemo(
    () => getIsoDaysAgoWIT(SLA_OLA_MAX_BACKDATE_DAYS),
    []
  );
  const isLateEntry = !!watchTanggal && watchTanggal !== todayIsoWIT;

  // Reset ke tanggal kemarin setiap kali modal dibuka
  useEffect(() => {
    if (isOpen) {
      setValue("tanggal", getYesterdayIsoWIT());
      setFilledDeviceIds(new Set());
      setSelectedDeviceIds(new Set());
      setKendalaByDevice({});
      setSamePrevByDevice({});
      setRowByDevice({});
    }
  }, [isOpen, setValue]);

  // Untuk Teknisi UPT/KaUPT: paksa nilai uptStation mengikuti UPT alat
  // yang mereka lihat (devices sudah difilter di App.tsx), karena dropdown
  // pemilihan stasiun disembunyikan untuk role ini.
  useEffect(() => {
    if (isOpen && isScopedToOwnUpt && devices.length > 0) {
      setValue("uptStation", devices[0].uptStation);
    }
  }, [isOpen, isScopedToOwnUpt, devices, setValue]);

  // Lookup objek stasiun terpilih untuk mencocokkan Nama Stasiun vs ID Stasiun
  const selectedStationObj = useMemo(() => {
    return stationsList.find(
      (s) => s.name === watchUptStation || s.stationid === watchUptStation || s.id === watchUptStation
    );
  }, [stationsList, watchUptStation]);

  const targetStationId = selectedStationObj?.stationid || selectedStationObj?.id;
  const targetStationName = selectedStationObj?.name || watchUptStation;

  // Semua alat milik stasiun terpilih (belum difilter jenis peralatan)
  const stationDevices = useMemo(() => {
    return devices.filter(
      (d) =>
        // Cocokkan berdasarkan ID Stasiun maupun Nama Stasiun
        isSameUpt(d.uptStation, watchUptStation, stationsList) ||
        d.uptStation === watchUptStation ||
        (targetStationId && d.uptStation === targetStationId) ||
        (targetStationName && d.uptStation === targetStationName)
    );
  }, [devices, stationsList, watchUptStation, targetStationId, targetStationName]);

  // Jenis peralatan yang benar-benar ada di stasiun terpilih. Bila stasiun belum punya alat tampilkan semua jenis supaya form
  const availableCategories = useMemo(() => {
    const present = EQUIPMENT_CATEGORIES.filter((cat) =>
      stationDevices.some((d) => deviceMatchesCategory(d, cat))
    );
    return present.length > 0 ? present : EQUIPMENT_CATEGORIES;
  }, [stationDevices]);

  // Jika jenis yang sedang dipilih tidak ada di stasiun ini, pindah ke jenis pertama yang tersedia.
  useEffect(() => {
    if (!availableCategories.includes(watchCategory)) {
      setValue("category", availableCategories[0]);
    }
  }, [availableCategories, watchCategory, setValue]);

  const matchingDevices = useMemo(
    () => stationDevices.filter((d) => deviceMatchesCategory(d, watchCategory)),
    [stationDevices, watchCategory]
  );

  useEffect(() => {
    setErrorMessage(null);

    setSelectedDeviceIds(new Set());
    setRowByDevice({});
    if (matchingDevices.length > 0) {
      setValue("deviceId", matchingDevices[0].devicesId);
      setValue("kondisiSla", true);
      setValue("kondisiOla", 100);
      setValue("kendala", "");
    } else {
      setValue("deviceId", "");
    }
  }, [matchingDevices, setValue]);

  // Kendala terakhir sebuah alat. Hanya dianggap ada bila alat masih
  // GANGGUAN/MATI dan keterangannya tidak kosong.
  const getPrevKendala = (d: AloptamaDevice): string =>
    d.conditionStatus !== "NORMAL" ? (d.issueDescription || "").trim() : "";

  const selectedDevices = useMemo(
    () => matchingDevices.filter((d) => selectedDeviceIds.has(d.devicesId)),
    [matchingDevices, selectedDeviceIds]
  );

  // Ubah kendala sebuah alat (tiap alat punya kendala sendiri).
  const handleKendalaChange = (deviceId: string, value: string) => {
    setKendalaByDevice((prev) => ({ ...prev, [deviceId]: value }));
  };

  // Centang "sama dengan sebelumnya" untuk satu alat.
  const toggleSamePrev = (d: AloptamaDevice, checked: boolean) => {
    setSamePrevByDevice((prev) => ({ ...prev, [d.devicesId]: checked }));
    setKendalaByDevice((prev) => ({
      ...prev,
      [d.devicesId]: checked ? getPrevKendala(d) : "",
    }));
  };


  if (!isOpen) return null;

  const onSubmit = async (data: any) => {
    setErrorMessage(null);

    // Validasi manual: minimal harus ada 1 alat yang dicentang
    const targetIds = Array.from(selectedDeviceIds).filter(
      (id) => !filledDeviceIds.has(id)
    );
    if (targetIds.length === 0) {
      setErrorMessage("Pilih (centang) minimal satu alat terlebih dahulu sebelum menyimpan.");
      return;
    }

    const missing = targetIds.filter(
      (id) => needKendalaFor(id) && !(kendalaByDevice[id] ?? "").trim()
    );
    if (missing.length > 0) {
      setErrorMessage("Kendala wajib diisi untuk setiap alat yang SLA-nya OFF / OLA < 100%.");
      return;
    }

    setIsSubmitting(true);

    try {
      for (const deviceId of targetIds) {
        const row = getRow(deviceId);
        const kendalaFinal = needKendalaFor(deviceId) ? (kendalaByDevice[deviceId] ?? "").trim() : "";
        await onSaveSlaOla({
          uptStation: data.uptStation,
          category: data.category.startsWith("AWOS") ? "AWOS" : data.category,
          deviceId,
          kondisiSla: row.sla,
          kondisiOla: row.sla ? row.ola : 0,
          kendala: kendalaFinal,
          tanggal: data.tanggal,
        });
      }

      // Tandai semua alat yang barusan disimpan sebagai "sudah diisi".
      const updatedFilled = new Set(filledDeviceIds);
      targetIds.forEach((id) => updatedFilled.add(id));
      setFilledDeviceIds(updatedFilled);
      setSelectedDeviceIds(new Set());
      setKendalaByDevice((prev) => {
        const next = { ...prev };
        targetIds.forEach((id) => delete next[id]);
        return next;
      });
      setSamePrevByDevice({});
      setRowByDevice((prev) => {
        const next = { ...prev };
        targetIds.forEach((id) => delete next[id]);
        return next;
      });
      setLastBatchCount(targetIds.length);

      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        // Reset kalkulator ke default netral untuk batch berikutnya
        setValue("kondisiSla", true);
        setValue("kondisiOla", 100);
        setValue("kendala", "");
      }, 1200);
    } catch (err: any) {
      console.error("Gagal menyimpan SLA/OLA:", err);
      setErrorMessage(
        err?.message || "Gagal menyimpan data SLA & OLA ke server."
      );
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[95vh] sm:max-h-[92vh]">
        {/* Header Modal */}
        <div className="bg-[#0A203C] text-white p-3.5 sm:p-5 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div>
              <h3 className="font-heading text-base sm:text-lg font-bold leading-tight">
                Form Pengisian SLA &amp; OLA UPT
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                Kalkulator Indikator Kinerja Operational Level Agreement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            disabled={isSubmitting}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <XIcon size={18} />
          </button>
        </div>

        {isSubmitted ? (
          <div className="p-6 sm:p-8 text-center space-y-3 bg-emerald-50">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-300">
              <Check size={24} />
            </div>
            <h4 className="font-heading font-bold text-base sm:text-lg text-emerald-900">
              {lastBatchCount > 1
                ? `Data ${lastBatchCount} Alat Berhasil Disimpan Sekaligus!`
                : "Data SLA & OLA Berhasil Disimpan!"}
            </h4>
            <p className="text-xs text-emerald-700">
              Kondisi operasional UPT {watchUptStation} ({watchCategory}) untuk{" "}
              tanggal <strong>{formatDateIndo(watchTanggal)}</strong> telah
              diperbarui{lastBatchCount > 1 ? ` untuk ${lastBatchCount} unit alat.` : "."}
            </p>
            {isLateEntry && (
              <p className="inline-flex items-center gap-1.5 justify-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
                <AlertTriangle size={12} />
                Tercatat sebagai pengisian susulan / terlambat
              </p>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 overflow-y-auto"
          >
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800 text-xs font-semibold animate-fade-in">
                <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-rose-900">Akses Ditolak / Gagal Menyimpan:</span>
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CalendarClock size={14} className="text-[#0052CC]" />
                TANGGAL KONDISI YANG DILAPORKAN:
              </label>
              <input
                type="date"
                {...register("tanggal")}
                disabled={isSubmitting}
                min={minBackdateIsoWIT}
                max={todayIsoWIT}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white disabled:opacity-50"
              />
              {errors.tanggal ? (
                <span className="text-[10px] text-rose-600 font-bold block">
                  {String(errors.tanggal.message)}
                </span>
              ) : isLateEntry ? (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300">
                  <AlertTriangle size={11} />
                  Diisi Terlambat — data susulan untuk {formatDateIndo(watchTanggal)}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 block">
                  Bisa diisi mundur maks. {SLA_OLA_MAX_BACKDATE_DAYS} hari jika ada data harian yang terlewat.
                </span>
              )}
            </div>

            <div className={`grid grid-cols-1 ${isScopedToOwnUpt ? '' : 'sm:grid-cols-2'} gap-3`}>
              {!isScopedToOwnUpt && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <BuildingIcon size={14} className="text-[#0052CC]" />
                  STASIUN BMKG / UPT:
                </label>
                <select
                  {...register("uptStation")}
                  disabled={isSubmitting}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white disabled:opacity-50"
                >
                  {stationsList.map((st) => (
                    <option key={st.id || st.stationid || st.name} value={st.name}>
                      {st.name} ({st.regionGroup || "Papua"})
                    </option>
                  ))}
                </select>
                {errors.uptStation && (
                  <span className="text-[10px] text-rose-600 font-bold">
                    {String(errors.uptStation.message)}
                  </span>
                )}
              </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <WrenchIcon size={14} className="text-[#0052CC]" />
                  JENIS PERALATAN:
                </label>
                <select
                  {...register("category")}
                  disabled={isSubmitting}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white disabled:opacity-50"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <span className="text-[10px] text-rose-600 font-bold">
                    {String(errors.category.message)}
                  </span>
                )}
              </div>
            </div>

            {/* Field Pemilihan Unit Alat Spesifik - List + Tombol Checklist,
                supaya UPT bisa mengisi banyak alat sekaligus dalam satu
                sesi buka modal, tanpa perlu buka-tutup berulang kali. */}
            {matchingDevices.length > 0 ? (
              <div className="space-y-1.5 p-3 rounded-xl border border-slate-300 animate-fade-in">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    CENTANG ALAT YANG AKAN DIISI:
                  </label>
                  {matchingDevices.some((d) => !filledDeviceIds.has(d.devicesId)) && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        const remainingIds = matchingDevices
                          .filter((d) => !filledDeviceIds.has(d.devicesId))
                          .map((d) => d.devicesId);
                        const allSelected = remainingIds.every((id) => selectedDeviceIds.has(id));
                        setSelectedDeviceIds(allSelected ? new Set() : new Set(remainingIds));
                      }}
                      className="text-[10px] font-bold text-[#0052CC] hover:underline cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      Pilih Semua
                    </button>
                  )}
                </div>
                <div className="space-y-1 max-h-[55vh] overflow-y-auto px-1 py-1 -mx-1">
                  {matchingDevices.map((d) => {
                    const isFilled = filledDeviceIds.has(d.devicesId);
                    const isChecked = selectedDeviceIds.has(d.devicesId);
                    const showCtl = isChecked && !isFilled;
                    const row = getRow(d.devicesId);
                    const ola = effOla(d.devicesId);
                    const kVal = kendalaByDevice[d.devicesId] ?? "";
                    const showK = showCtl && needKendalaFor(d.devicesId);
                    const kMissing = showK && !kVal.trim();
                    const olaDot =
                      ola >= 100 ? "bg-emerald-500" : ola >= 50 ? "bg-amber-500" : "bg-rose-500";
                    return (
                      <div key={d.devicesId} className="space-y-1">
                        <div className="flex flex-col lg:flex-row lg:items-stretch gap-1">
                          <button
                            type="button"
                            disabled={isSubmitting || isFilled}
                            onClick={() => {
                              setSelectedDeviceIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(d.devicesId)) next.delete(d.devicesId);
                                else next.add(d.devicesId);
                                return next;
                              });
                            }}
                            className={`flex-1 min-w-0 lg:min-w-[190px] flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs font-semibold transition-all cursor-pointer disabled:cursor-not-allowed ${
                              isFilled
                                ? "bg-emerald-50 border-emerald-300 text-emerald-800 opacity-70"
                                : isChecked
                                ? "bg-blue-50 border-blue-200  text-slate-900"
                                : "bg-white border-blue-200 text-slate-700 hover:bg-blue-50"
                            }`}
                          >
                            {isFilled ? (
                              <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                            ) : isChecked ? (
                              <CheckSquare size={16} className="text-[#0052CC] shrink-0" />
                            ) : (
                              <Square size={16} className="text-slate-400 shrink-0" />
                            )}
                            <span className="flex-1 min-w-0 break-words leading-snug">{d.site} ({d.devicesId})</span>
                            {isFilled && (
                              <span className="text-[9px] font-bold text-emerald-700 shrink-0">SUDAH DIISI</span>
                            )}
                          </button>

                          {showCtl && (
                            <div className="flex items-stretch gap-1 shrink-0">
                              {/* Kotak 1: SLA ON / OFF */}
                              <button
                                type="button"
                                disabled={isSubmitting}
                                title="Klik untuk ganti SLA ON / OFF"
                                onClick={() => {
                                  patchRow(d.devicesId, { sla: !row.sla, open: row.sla ? false : row.open });
                                }}
                                className={`w-[84px] min-h-[36px] whitespace-nowrap rounded-lg border text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                                  row.sla
                                    ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${row.sla ? "bg-emerald-500" : "bg-rose-500"}`}
                                />
                                SLA {row.sla ? "ON" : "OFF"}
                              </button>

                              {/* Kotak 2: OLA (angka, panah atas/bawah, scroll mouse) */}
                              <OlaStepper
                                value={ola}
                                dotClass={olaDot}
                                sla={row.sla}
                                disabled={isSubmitting}
                                onChange={(v) => patchRow(d.devicesId, { ola: v })}
                              />

                              {/* Tombol pakai kalkulator */}
                              <button
                                type="button"
                                disabled={isSubmitting || !row.sla}
                                title="Hitung OLA dengan kalkulator"
                                onClick={() => patchRow(d.devicesId, { open: !row.open, opened: true })}
                                className={`px-2.5 min-h-[36px] rounded-lg border text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                                  row.open
                                    ? "bg-blue-50 border-[#0052CC] text-[#0052CC]"
                                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <CalculatorIcon size={14} />
                              </button>
                            </div>
                          )}

                          {/* Kotak 3: Kendala (muncul bila SLA OFF atau OLA < 100) */}
                          {showK && (
                            <div className="lg:w-[34%] shrink-0 flex flex-col gap-1">
                              <input
                                type="text"
                                value={kVal}
                                disabled={isSubmitting || !!samePrevByDevice[d.devicesId]}
                                onChange={(e) => handleKendalaChange(d.devicesId, e.target.value)}
                                placeholder="Kendala (wajib diisi)"
                                className={`w-full min-h-[36px] bg-white border rounded-lg px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC] disabled:bg-slate-100 disabled:text-slate-600 ${
                                  kMissing ? "border-rose-400" : "border-slate-300"
                                }`}
                              />
                              <label
                                className={`flex items-center gap-1.5 text-[10px] ${
                                  getPrevKendala(d)
                                    ? "text-slate-700 cursor-pointer"
                                    : "text-slate-400 cursor-not-allowed"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={!!samePrevByDevice[d.devicesId]}
                                  disabled={isSubmitting || !getPrevKendala(d)}
                                  onChange={(e) => toggleSamePrev(d, e.target.checked)}
                                />
                                {getPrevKendala(d)
                                  ? "Kendala masih sama dengan sebelumnya"
                                  : "Belum ada riwayat"}
                              </label>
                            </div>
                          )}
                        </div>

                        {/* Panel kalkulator OLA untuk alat ini */}
                        {showCtl && row.sla && row.opened && (
                          <div
                            className={`${row.open ? "" : "hidden"} bg-white rounded-xl border border-slate-200 p-3 space-y-3`}
                          >
                            <OlaCalculator
                              category={watchCategory}
                              active={row.open}
                              onChange={(v) => patchRow(d.devicesId, { ola: snapOla(v) })}
                            />
                            <div className="flex items-center justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => patchRow(d.devicesId, { open: false })}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0052CC] text-white hover:bg-blue-700 cursor-pointer"
                              >
                                Selesai
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {matchingDevices.length > 0 && matchingDevices.every((d) => filledDeviceIds.has(d.devicesId)) && (
                  <div className="flex items-center gap-1.5 mt-1 px-2 py-1.5 bg-emerald-100 border border-emerald-300 rounded-lg text-[10px] font-bold text-emerald-800">
                    <Check size={12} /> Semua alat di kategori ini sudah diisi hari ini. Anda bisa ganti filter jenis peralatan atau tutup form ini.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium flex items-center gap-2">

                <span>⚠️</span>
                <span>
                  Tidak ada unit spesifik <strong>{watchCategory}</strong> yang terdaftar di <strong>{targetStationName}</strong>.
                </span>
              </div>
            )}

            <div className="pt-2 sm:pt-3 flex items-center justify-end gap-2 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedDeviceIds.size === 0}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold bg-[#0052CC] hover:bg-blue-700 text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check size={15} />
                {isSubmitting
                  ? "Menyimpan..."
                  : selectedDeviceIds.size > 0
                  ? `Simpan untuk ${selectedDeviceIds.size} Alat Terpilih`
                  : "Pilih Alat"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};