import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiClient } from "../../shared/api";
import { slaOlaSchema } from "../../shared/schemas";
import { SlaOlaModalProps } from "./SlaOlaTypes";
import {
  X as XIcon,
  Percent as PercentIcon,
  Building2 as BuildingIcon,
  Wrench as WrenchIcon,
  Calculator as CalculatorIcon,
  Check,
  Info,
  CheckSquare,
  Square,
  AlertTriangle,
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

export const SlaOlaModal: React.FC<SlaOlaModalProps> = ({
  isOpen,
  onClose,
  devices,
  onSaveSlaOla,
}) => {
  const [awosCategory, setAwosCategory] = useState<
    "AWOS_I" | "AWOS_II" | "AWOS_III"
  >("AWOS_III");
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [modeInput, setModeInput] = useState<"KALKULATOR" | "MANUAL">(
    "KALKULATOR"
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
    },
  });

  const watchUptStation = watch("uptStation");
  const watchCategory = watch("category");
  const watchKondisiOla = watch("kondisiOla");
  const watchKondisiSla = watch("kondisiSla");

  const [calcLogger, setCalcLogger] = useState<number>(100);
  const [calcPower, setCalcPower] = useState<number>(100);
  const [calcComm, setCalcComm] = useState<number>(100);
  const [calcDisplay, setCalcDisplay] = useState<number>(100);
  const [calcLatency, setCalcLatency] = useState<number>(100);
  const [calcComponent, setCalcComponent] = useState<number>(100);
  const [calcSync, setCalcSync] = useState<number>(100);
  const [calcRadarData, setCalcRadarData] = useState<number>(100);
  const [calcArgSensor, setCalcArgSensor] = useState<number>(100);
  const [calcLdSensor, setCalcLdSensor] = useState<number>(100);
  const [calcSound, setCalcSound] = useState<number>(100);

  const [activeSensors, setActiveSensors] = useState<Record<string, boolean>>({
    tekanan: true,
    arahAngin: true,
    kecAngin: true,
    suhu: true,
    kelembapan: true,
    radiasiMatahari: true,
    curahHujan: true,
    waterLevel: true,
    celo: true,
    visibility: true,
    ld: true,
  });

  useEffect(() => {
    if (watchCategory === "AWOS Kat. I") {
      setAwosCategory("AWOS_I");
    } else if (watchCategory === "AWOS Kat. II") {
      setAwosCategory("AWOS_II");
    } else if (watchCategory.startsWith("AWOS")) {
      setAwosCategory("AWOS_III");
    }
  }, [watchCategory]);

  // Lookup objek stasiun terpilih untuk mencocokkan Nama Stasiun vs ID Stasiun
  const selectedStationObj = useMemo(() => {
    return stationsList.find(
      (s) => s.name === watchUptStation || s.stationid === watchUptStation || s.id === watchUptStation
    );
  }, [stationsList, watchUptStation]);

  const targetStationId = selectedStationObj?.stationid || selectedStationObj?.id;
  const targetStationName = selectedStationObj?.name || watchUptStation;

  const matchingDevices = useMemo(() => {
    return devices.filter((d) => {
      // Cocokkan berdasarkan ID Stasiun maupun Nama Stasiun
      const matchesUpt =
        d.uptStation === watchUptStation ||
        (targetStationId && d.uptStation === targetStationId) ||
        (targetStationName && d.uptStation === targetStationName);

      if (!matchesUpt) return false;
      if (!watchCategory || watchCategory === "ALL") return true;

      const devCat = (d.category || "").toLowerCase();
      const devSite = (d.site || "").toLowerCase();
      const selCat = watchCategory.toLowerCase();

      if (selCat.startsWith("awos")) {
        if (!devCat.includes("awos")) return false;
        if (watchCategory === "AWOS Kat. I")
          return devSite.includes("kat i") && !devSite.includes("kat iii");
        if (watchCategory === "AWOS Kat. II")
          return devSite.includes("kat ii");
        if (watchCategory === "AWOS Kat. III")
          return (
            devSite.includes("kat iii") ||
            (!devSite.includes("kat i") && !devSite.includes("kat ii"))
          );
        return true;
      }

      if (selCat.includes("sirine")) {
        return devCat.includes("sirine") || devCat.includes("siren");
      }
      if (selCat.includes("seismometer")) {
        return devCat.includes("seismometer") || devCat.includes("seismo");
      }
      if (selCat.includes("accelerograph")) {
        return devCat.includes("accelerograph") || devCat.includes("akselero");
      }
      if (selCat.includes("wrs")) {
        return devCat.includes("wrs");
      }
      if (selCat.includes("lightning")) {
        return devCat.includes("lightning") || devCat.includes("petir");
      }
      if (selCat.includes("radar")) {
        return devCat.includes("radar");
      }
      if (selCat.includes("aws")) {
        return (devCat.includes("aws") || devCat.includes("automatic weather")) && !devCat.includes("awos");
      }
      if (selCat.includes("arg")) {
        return devCat.includes("arg") || devCat.includes("automatic rain");
      }

      return devCat.includes(selCat) || selCat.includes(devCat);
    });
  }, [devices, watchUptStation, targetStationId, targetStationName, watchCategory]);

  useEffect(() => {
    setErrorMessage(null);
    if (matchingDevices.length > 0) {
      const dev = matchingDevices[0];
      setValue("deviceId", dev.devicesId);
      setValue("kondisiSla", dev.conditionStatus === "NORMAL");
      setValue("kondisiOla", dev.olaScore ?? 100);
      setValue("kendala", dev.issueDescription || "");
    } else {
      setValue("deviceId", "");
    }
  }, [matchingDevices, setValue]);

  useEffect(() => {
    if (!watchKondisiSla) {
      setValue("kondisiOla", 0);
      return;
    }

    if (modeInput !== "KALKULATOR") return;

    let computedOla = 100;

    if (watchCategory === "AWS") {
      const loggerContrib = 0.35 * calcLogger;
      const powerContrib = 0.15 * calcPower;
      const commContrib = 0.2 * calcComm;
      const sensorKeys = [
        "tekanan",
        "arahAngin",
        "kecAngin",
        "suhu",
        "kelembapan",
        "radiasiMatahari",
        "curahHujan",
        "waterLevel",
      ];
      let sensorContrib = 0;
      sensorKeys.forEach((key) => {
        if (activeSensors[key]) sensorContrib += 3.75;
      });
      computedOla = loggerContrib + powerContrib + commContrib + sensorContrib;
    } else if (watchCategory.startsWith("AWOS")) {
      const loggerContrib = 0.35 * calcLogger;
      const powerContrib = 0.15 * calcPower;
      const commContrib = 0.2 * calcComm;
      let sensorContrib = 0;

      if (awosCategory === "AWOS_III") {
        if (activeSensors.tekanan) sensorContrib += 5.0;
        if (activeSensors.arahAngin) sensorContrib += 5.0;
        if (activeSensors.kecAngin) sensorContrib += 5.0;
        if (activeSensors.suhu) sensorContrib += 2.14;
        if (activeSensors.kelembapan) sensorContrib += 2.14;
        if (activeSensors.radiasiMatahari) sensorContrib += 2.14;
        if (activeSensors.curahHujan) sensorContrib += 2.14;
        if (activeSensors.celo) sensorContrib += 2.14;
        if (activeSensors.visibility) sensorContrib += 2.14;
        if (activeSensors.ld) sensorContrib += 2.14;
      } else if (awosCategory === "AWOS_II") {
        if (activeSensors.tekanan) sensorContrib += 5.0;
        if (activeSensors.arahAngin) sensorContrib += 5.0;
        if (activeSensors.kecAngin) sensorContrib += 5.0;
        if (activeSensors.suhu) sensorContrib += 3.0;
        if (activeSensors.kelembapan) sensorContrib += 3.0;
        if (activeSensors.curahHujan) sensorContrib += 3.0;
        if (activeSensors.celo) sensorContrib += 3.0;
        if (activeSensors.visibility) sensorContrib += 3.0;
      } else {
        if (activeSensors.tekanan) sensorContrib += 5.0;
        if (activeSensors.arahAngin) sensorContrib += 5.0;
        if (activeSensors.kecAngin) sensorContrib += 5.0;
        if (activeSensors.suhu) sensorContrib += 3.75;
        if (activeSensors.kelembapan) sensorContrib += 3.75;
        if (activeSensors.curahHujan) sensorContrib += 3.75;
        if (activeSensors.radiasiMatahari) sensorContrib += 3.75;
      }

      computedOla = loggerContrib + powerContrib + commContrib + sensorContrib;
    } else if (watchCategory === "WRS NG" || watchCategory === "WRS") {
      computedOla = 0.25 * calcDisplay + 0.35 * calcComm + 0.4 * calcPower;
    } else if (
      watchCategory === "Sirine Tsunami" ||
      watchCategory === "Sirine"
    ) {
      computedOla = 0.25 * calcSound + 0.25 * calcComm + 0.5 * calcPower;
    } else if (
      watchCategory === "Accelerograph" ||
      watchCategory === "Seismometer"
    ) {
      computedOla = 0.4 * calcLatency + 0.35 * calcComponent + 0.25 * calcSync;
    } else if (watchCategory === "Lightning Detector") {
      computedOla = 0.4 * calcLogger + 0.3 * calcPower + 0.3 * calcLdSensor;
    } else if (
      watchCategory === "Radar Cuaca" ||
      watchCategory === "Radar Weather"
    ) {
      computedOla = 0.4 * calcRadarData + 0.3 * calcComm + 0.3 * calcPower;
    } else if (watchCategory === "ARG") {
      computedOla =
        0.35 * calcArgSensor +
        0.2 * calcLogger +
        0.25 * calcComm +
        0.2 * calcPower;
    }

    const rounded = Math.min(
      100,
      Math.max(0, Math.round(computedOla * 10) / 10)
    );
    setValue("kondisiOla", rounded);
  }, [
    modeInput,
    watchKondisiSla,
    watchCategory,
    awosCategory,
    calcLogger,
    calcPower,
    calcComm,
    calcDisplay,
    calcLatency,
    calcComponent,
    calcSync,
    calcRadarData,
    calcArgSensor,
    calcLdSensor,
    calcSound,
    activeSensors,
    setValue,
  ]);

  const toggleSensor = (key: string) => {
    setActiveSensors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isOpen) return null;

  const onSubmit = async (data: any) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await onSaveSlaOla({
        uptStation: data.uptStation,
        category: data.category.startsWith("AWOS") ? "AWOS" : data.category,
        deviceId: data.deviceId,
        kondisiSla: data.kondisiSla,
        kondisiOla: data.kondisiOla,
        kendala: (data.kendala || "").trim(),
      });

      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
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

  const getSensorList = () => {
    if (watchCategory === "AWS") {
      return [
        { key: "tekanan", label: "Sensor Tekanan", weight: "3.75%" },
        { key: "arahAngin", label: "Sensor Arah Angin", weight: "3.75%" },
        { key: "kecAngin", label: "Sensor Kecepatan Angin", weight: "3.75%" },
        { key: "suhu", label: "Sensor Suhu Udara", weight: "3.75%" },
        { key: "kelembapan", label: "Sensor Kelembapan Udara", weight: "3.75%" },
        { key: "radiasiMatahari", label: "Sensor Radiasi Matahari", weight: "3.75%" },
        { key: "curahHujan", label: "Sensor Curah Hujan", weight: "3.75%" },
        { key: "waterLevel", label: "Sensor Water Level / Suhu Tanah", weight: "3.75%" },
      ];
    }
    if (watchCategory === "AWOS Kat. III") {
      return [
        { key: "tekanan", label: "Sensor Tekanan", weight: "5.00%" },
        { key: "arahAngin", label: "Sensor Arah Angin", weight: "5.00%" },
        { key: "kecAngin", label: "Sensor Kecepatan Angin", weight: "5.00%" },
        { key: "suhu", label: "Sensor Suhu Udara", weight: "2.14%" },
        { key: "kelembapan", label: "Sensor Kelembapan Udara", weight: "2.14%" },
        { key: "radiasiMatahari", label: "Sensor Radiasi Matahari", weight: "2.14%" },
        { key: "curahHujan", label: "Sensor Curah Hujan", weight: "2.14%" },
        { key: "celo", label: "Sensor Ceilometer (Celo)", weight: "2.14%" },
        { key: "visibility", label: "Sensor Visibility (RVR)", weight: "2.14%" },
        { key: "ld", label: "Sensor Lightning Detector (LD)", weight: "2.14%" },
      ];
    }
    if (watchCategory === "AWOS Kat. II") {
      return [
        { key: "tekanan", label: "Sensor Tekanan", weight: "5.00%" },
        { key: "arahAngin", label: "Sensor Arah Angin", weight: "5.00%" },
        { key: "kecAngin", label: "Sensor Kecepatan Angin", weight: "5.00%" },
        { key: "suhu", label: "Sensor Suhu Udara", weight: "3.00%" },
        { key: "kelembapan", label: "Sensor Kelembapan Udara", weight: "3.00%" },
        { key: "curahHujan", label: "Sensor Curah Hujan", weight: "3.00%" },
        { key: "celo", label: "Sensor Ceilometer (Celo)", weight: "3.00%" },
        { key: "visibility", label: "Sensor Visibility", weight: "3.00%" },
      ];
    }
    if (watchCategory === "AWOS Kat. I") {
      return [
        { key: "tekanan", label: "Sensor Tekanan", weight: "5.00%" },
        { key: "arahAngin", label: "Sensor Arah Angin", weight: "5.00%" },
        { key: "kecAngin", label: "Sensor Kecepatan Angin", weight: "5.00%" },
        { key: "suhu", label: "Sensor Suhu Udara", weight: "3.75%" },
        { key: "kelembapan", label: "Sensor Kelembapan Udara", weight: "3.75%" },
        { key: "curahHujan", label: "Sensor Curah Hujan", weight: "3.75%" },
        { key: "radiasiMatahari", label: "Sensor Solar Radiasi", weight: "3.75%" },
      ];
    }
    return [];
  };

  const sensorList = getSensorList();

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[95vh] sm:max-h-[92vh]">
        {/* Header Modal */}
        <div className="bg-[#0A203C] text-white p-3.5 sm:p-5 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
              <CalculatorIcon size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-heading text-base sm:text-lg font-bold leading-tight">
                Form Pengisian SLA &amp; OLA UPT
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                Kalkulator Indikator Kinerja Operational Level Agreement BBMKG V
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
              Data SLA &amp; OLA Berhasil Disimpan!
            </h4>
            <p className="text-xs text-emerald-700">
              Kondisi operasional UPT {watchUptStation} ({watchCategory}) telah
              diperbarui dengan Skor OLA <strong>{watchKondisiOla}%</strong>.
            </p>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <WrenchIcon size={14} className="text-[#0052CC]" />
                  JENIS PERALATAN ALOPTAMA:
                </label>
                <select
                  {...register("category")}
                  disabled={isSubmitting}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white disabled:opacity-50"
                >
                  {EQUIPMENT_CATEGORIES.map((cat) => (
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

            {/* Field Pemilihan Unit Alat Spesifik */}
            {matchingDevices.length > 0 ? (
              <div className="space-y-1 bg-blue-50/60 p-3 rounded-xl border border-blue-200 animate-fade-in">
                <label className="block text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                  <WrenchIcon size={13} className="text-[#0052CC]" />
                  PILIH SPESIFIK UNIT PERALATAN ({matchingDevices.length} Unit Terdeteksi):
                </label>
                <select
                  {...register("deviceId")}
                  disabled={isSubmitting}
                  className="w-full bg-white border border-blue-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0052CC] disabled:opacity-50"
                >
                  {matchingDevices.map((d) => (
                    <option key={d.devicesId} value={d.devicesId}>
                      {d.site} ({d.devicesId})
                    </option>
                  ))}
                </select>
                {errors.deviceId && (
                  <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                    {String(errors.deviceId.message)}
                  </span>
                )}
              </div>
            ) : (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-medium flex items-center gap-2">
                <span>⚠️</span>
                <span>
                  Tidak ada unit spesifik <strong>{watchCategory}</strong> yang terdaftar di <strong>{targetStationName}</strong>.
                </span>
              </div>
            )}

            {/* Toggle Switch Mode */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-slate-100 p-1 sm:p-1.5 rounded-xl border border-slate-200 gap-1 sm:gap-0">
              <button
                type="button"
                onClick={() => setModeInput("KALKULATOR")}
                className={`flex-1 py-1.5 sm:py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  modeInput === "KALKULATOR"
                    ? "bg-[#0052CC] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CalculatorIcon size={14} />
                Kalkulator Persentase OLA
              </button>
              <button
                type="button"
                onClick={() => setModeInput("MANUAL")}
                className={`flex-1 py-1.5 sm:py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  modeInput === "MANUAL"
                    ? "bg-[#0052CC] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <PercentIcon size={14} />
                Slider Manual Persentase OLA
              </button>
            </div>

            {modeInput === "KALKULATOR" && (
              <div className="bg-slate-50/80 rounded-2xl p-3 sm:p-4 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-2 gap-1.5 sm:gap-0">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Info size={14} className="text-[#0052CC] shrink-0" />
                    Pilih Kondisi Kelayakan Aspek Peralatan ({watchCategory}):
                  </h4>
                  <span className="text-[11px] font-bold text-[#0052CC] bg-blue-100 px-2.5 py-0.5 rounded-lg border border-blue-200 shrink-0">
                    Kalkulasi OLA: {watchKondisiOla}%
                  </span>
                </div>

                {(watchCategory === "AWS" ||
                  watchCategory.startsWith("AWOS")) && (
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        1. Logger &amp; Data
                      </label>
                      <select
                        value={calcLogger}
                        onChange={(e) =>
                          setCalcLogger(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          Logger ON penuh, data masuk normal &amp; sesuai (100%)
                        </option>
                        <option value={80}>
                          ON, ada sedikit delay/data gap kecil (80%)
                        </option>
                        <option value={60}>
                          ON, data sering hilang sebagian / anomali &gt;30% (60%)
                        </option>
                        <option value={50}>
                          ON, data sering error/tidak stabil (50%)
                        </option>
                        <option value={0}>
                          Logger OFF, tidak ada data sama sekali (0%)
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        2. Kelistrikan &amp; Power
                      </label>
                      <select
                        value={calcPower}
                        onChange={(e) =>
                          setCalcPower(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          Baterai penuh, tegangan stabil (100%)
                        </option>
                        <option value={80}>
                          Tegangan drop ringan, masih aman (80%)
                        </option>
                        <option value={70}>Baterai mulai lemah (70%)</option>
                        <option value={50}>
                          Baterai drop, logger restart otomatis (50%)
                        </option>
                        <option value={0}>
                          Tidak ada suplai daya, alat mati total (0%)
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        3. Komunikasi Network
                      </label>
                      <select
                        value={calcComm}
                        onChange={(e) =>
                          setCalcComm(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          Data terkirim real-time, tidak ada delay (100%)
                        </option>
                        <option value={80}>
                          Delay dibawah 1 jam / kecil (80%)
                        </option>
                        <option value={60}>
                          Delay 1–3 jam, data masih lengkap (60%)
                        </option>
                        <option value={50}>Data hilang sebagian (50%)</option>
                        <option value={0}>Tidak ada data terkirim (0%)</option>
                      </select>
                    </div>

                    {sensorList.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800">
                            4. Checklist Komponen Sensor
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 text-xs">
                          {sensorList.map((s) => {
                            const isChecked = Boolean(activeSensors[s.key]);
                            return (
                              <button
                                key={s.key}
                                type="button"
                                onClick={() => toggleSensor(s.key)}
                                className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all cursor-pointer ${
                                  isChecked
                                    ? "bg-blue-50/80 border-blue-300 text-blue-900 font-semibold"
                                    : "bg-slate-50 border-slate-200 text-slate-500"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isChecked ? (
                                    <CheckSquare
                                      size={15}
                                      className="text-blue-600 shrink-0"
                                    />
                                  ) : (
                                    <Square
                                      size={15}
                                      className="text-slate-400 shrink-0"
                                    />
                                  )}
                                  <span className="text-xs">{s.label}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(watchCategory === "WRS NG" || watchCategory === "WRS") && (
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        1. Tampilan Display
                      </label>
                      <select
                        value={calcDisplay}
                        onChange={(e) =>
                          setCalcDisplay(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          Layar aktif Tampilan Update (100%)
                        </option>
                        <option value={0}>
                          Layar mati total / Blue Screen (0%)
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        2. Komunikasi Jaringan
                      </label>
                      <select
                        value={calcComm}
                        onChange={(e) =>
                          setCalcComm(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          Komunikasi Internet Stabil dan lancar 24 jam On (100%)
                        </option>
                        <option value={0}>
                          Tidak ada internet / komunikasi terputus (0%)
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        3. Kelistrikan &amp; Power
                      </label>
                      <select
                        value={calcPower}
                        onChange={(e) =>
                          setCalcPower(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          Tegangan &amp; UPS stabil (100%)
                        </option>
                        <option value={0}>
                          UPS tidak berfungsi, alat mati total (0%)
                        </option>
                      </select>
                    </div>
                  </div>
                )}

                {(watchCategory === "Sirine Tsunami" ||
                  watchCategory === "Sirine") && (
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        1. Sistem Sound &amp; Audio
                      </label>
                      <select
                        value={calcSound}
                        onChange={(e) =>
                          setCalcSound(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          Sirine berbunyi normal sesuai trigger (100%)
                        </option>
                        <option value={0}>
                          Sirine mati total / tidak berbunyi (0%)
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        2. Komunikasi &amp; Receiver
                      </label>
                      <select
                        value={calcComm}
                        onChange={(e) =>
                          setCalcComm(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          Sinyal/trigger masuk normal (100%)
                        </option>
                        <option value={0}>
                          Tidak ada komunikasi / sinyal gagal (0%)
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        3. Kelistrikan &amp; Power
                      </label>
                      <select
                        value={calcPower}
                        onChange={(e) =>
                          setCalcPower(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          Tegangan stabil, UPS/genset baik (100%)
                        </option>
                        <option value={0}>
                          Tidak ada suplai daya (0%)
                        </option>
                      </select>
                    </div>
                  </div>
                )}

                {(watchCategory === "Accelerograph" ||
                  watchCategory === "Seismometer") && (
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        1. Data Availability &amp; Latency
                      </label>
                      <select
                        value={calcLatency}
                        onChange={(e) =>
                          setCalcLatency(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>Latency &lt; 1 menit (100%)</option>
                        <option value={70}>Latency 1–3 menit (70%)</option>
                        <option value={40}>Latency &gt; 3 menit (40%)</option>
                        <option value={0}>Data tidak terkirim (0%)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        2. Komponen Terkirim
                      </label>
                      <select
                        value={calcComponent}
                        onChange={(e) =>
                          setCalcComponent(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          3 Komponen (Z, N, E) terkirim utuh (100%)
                        </option>
                        <option value={50}>
                          Data komponen hilang sebagian (50%)
                        </option>
                        <option value={0}>
                          Tidak ada data (0%)
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        3. Waktu Data Tersinkron
                      </label>
                      <select
                        value={calcSync}
                        onChange={(e) =>
                          setCalcSync(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          Sinkron penuh dengan UTC / GNSS (100%)
                        </option>
                        <option value={0}>
                          Tidak sinkron (0%)
                        </option>
                      </select>
                    </div>
                  </div>
                )}

                {watchCategory === "Lightning Detector" && (
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        1. Logger &amp; Server Data
                      </label>
                      <select
                        value={calcLogger}
                        onChange={(e) =>
                          setCalcLogger(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          Logger ON penuh, PC Server normal (100%)
                        </option>
                        <option value={80}>
                          ON, ada sedikit delay (80%)
                        </option>
                        <option value={60}>
                          ON, data sering hilang (60%)
                        </option>
                        <option value={50}>
                          ON, data tidak stabil (50%)
                        </option>
                        <option value={0}>
                          Logger OFF (0%)
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        2. Kelistrikan &amp; Power
                      </label>
                      <select
                        value={calcPower}
                        onChange={(e) =>
                          setCalcPower(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          Tegangan listrik stabil, UPS Normal (100%)
                        </option>
                        <option value={70}>
                          Listrik Sering Mati, UPS Lemah (70%)
                        </option>
                        <option value={50}>
                          Listrik Sering Mati (50%)
                        </option>
                        <option value={0}>
                          Alat mati total (0%)
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        3. Sensor &amp; Antena
                      </label>
                      <select
                        value={calcLdSensor}
                        onChange={(e) =>
                          setCalcLdSensor(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          Sensor &amp; Antena Normal (100%)
                        </option>
                        <option value={80}>
                          Sensor &amp; Antena Penurunan Ringan (80%)
                        </option>
                        <option value={60}>
                          Sensor Error Sebagian (60%)
                        </option>
                        <option value={50}>
                          Sinyal Lemah (50%)
                        </option>
                        <option value={0}>
                          Mati Total (0%)
                        </option>
                      </select>
                    </div>
                  </div>
                )}

                {(watchCategory === "Radar Cuaca" ||
                  watchCategory === "Radar Weather") && (
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        1. Radar ON &amp; Data
                      </label>
                      <select
                        value={calcRadarData}
                        onChange={(e) =>
                          setCalcRadarData(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          Radar aktif penuh, tanpa anomali (100%)
                        </option>
                        <option value={80}>
                          Radar ON, data &gt;70% (80%)
                        </option>
                        <option value={60}>
                          Radar ON, data 50–70% (60%)
                        </option>
                        <option value={50}>
                          Radar ON/OFF, data &lt;50% (50%)
                        </option>
                        <option value={0}>Radar OFF (0%)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        2. Komunikasi Jaringan
                      </label>
                      <select
                        value={calcComm}
                        onChange={(e) =>
                          setCalcComm(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          Data masuk ke client &amp; pusat (100%)
                        </option>
                        <option value={70}>
                          Data ke pusat terkendala (70%)
                        </option>
                        <option value={50}>
                          Komunikasi terganggu (50%)
                        </option>
                        <option value={0}>Komunikasi OFF (0%)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        3. Kelistrikan &amp; Power
                      </label>
                      <select
                        value={calcPower}
                        onChange={(e) =>
                          setCalcPower(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          Tegangan stabil, UPS/genset baik (100%)
                        </option>
                        <option value={80}>
                          Sesekali tegangan drop (80%)
                        </option>
                        <option value={60}>
                          Baterai UPS melemah (60%)
                        </option>
                        <option value={50}>
                          Sering mati listrik (50%)
                        </option>
                        <option value={0}>
                          Radar mati total (0%)
                        </option>
                      </select>
                    </div>
                  </div>
                )}

                {watchCategory === "ARG" && (
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        1. Sensor Hujan / Tipping Bucket
                      </label>
                      <select
                        value={calcArgSensor}
                        onChange={(e) =>
                          setCalcArgSensor(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>Data konsisten (100%)</option>
                        <option value={80}>Tip kadang delay (80%)</option>
                        <option value={60}>Banyak anomali (60%)</option>
                        <option value={50}>Sering tidak tercatat (50%)</option>
                        <option value={0}>Macet total (0%)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        2. Data Logger
                      </label>
                      <select
                        value={calcLogger}
                        onChange={(e) =>
                          setCalcLogger(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>Rutin kirim data (100%)</option>
                        <option value={80}>
                          Timestamp terlambat sesekali (80%)
                        </option>
                        <option value={60}>Gap data 1–2 jam/hari (60%)</option>
                        <option value={50}>Data harian tidak utuh (50%)</option>
                        <option value={0}>Logger mati total (0%)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        3. Komunikasi
                      </label>
                      <select
                        value={calcComm}
                        onChange={(e) =>
                          setCalcComm(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>
                          Terkirim sesuai interval (100%)
                        </option>
                        <option value={80}>Delay &lt;1 jam (80%)</option>
                        <option value={70}>Delay &gt;1 jam (70%)</option>
                        <option value={50}>Data hilang sebagian (50%)</option>
                        <option value={0}>Tidak ada data (0%)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        4. Kelistrikan &amp; Power
                      </label>
                      <select
                        value={calcPower}
                        onChange={(e) =>
                          setCalcPower(parseFloat(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value={100}>Tegangan stabil (100%)</option>
                        <option value={80}>Tegangan turun sesekali (80%)</option>
                        <option value={60}>Baterai drop malam hari (60%)</option>
                        <option value={50}>Solar panel lemah (50%)</option>
                        <option value={0}>Alat mati total (0%)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {modeInput === "MANUAL" && (
              <div className="space-y-1.5 bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <PercentIcon size={14} className="text-[#0052CC]" />
                    KONDISI OLA (Operational Level Agreement):
                  </label>
                </div>
                <div className="flex items-center gap-2.5">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.5"
                    value={watchKondisiOla}
                    onChange={(e) =>
                      setValue("kondisiOla", parseFloat(e.target.value))
                    }
                    className="w-full accent-[#0052CC] cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={watchKondisiOla}
                    onChange={(e) =>
                      setValue(
                        "kondisiOla",
                        Math.min(
                          100,
                          Math.max(0, parseFloat(e.target.value) || 0)
                        )
                      )
                    }
                    className="w-16 sm:w-20 px-1.5 py-1 text-xs font-mono font-bold text-slate-800 border border-slate-300 rounded-lg text-center"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5 bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    KONDISI SLA (Service Level Agreement):
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Keberadaan/ketersediaan peralatan dalam kondisi ON (aktif)
                  </p>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setValue("kondisiSla", true)}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      watchKondisiSla
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    🟢 ON
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setValue("kondisiSla", false);
                      setValue("kondisiOla", 0);
                    }}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      !watchKondisiSla
                        ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                        : "bg-white text-slate-700 border-slate-300"
                    }`}
                  >
                    🔴 OFF
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl bg-white border border-slate-200/80 text-slate-800 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 sm:p-2 rounded-lg ${
                    !watchKondisiSla || watchKondisiOla === 0
                      ? "bg-rose-50 text-rose-600"
                      : watchKondisiOla >= 80
                        ? "bg-emerald-50 text-emerald-600"
                        : watchKondisiOla >= 50
                          ? "bg-amber-50 text-amber-600"
                          : "bg-rose-50 text-rose-600"
                  }`}
                >
                  <PercentIcon size={16} className="sm:w-4 sm:h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Total Persentase OLA
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    {!watchKondisiSla
                      ? "Kondisi SLA OFF — OLA otomatis 0%"
                      : modeInput === "KALKULATOR"
                        ? "Hasil kalkulasi matriks aspek"
                        : "Hasil input manual slider OLA"}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={`text-base sm:text-lg font-black font-mono px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-xl border ${
                    !watchKondisiSla || watchKondisiOla === 0
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : watchKondisiOla >= 80
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : watchKondisiOla >= 50
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {!watchKondisiSla ? 0 : watchKondisiOla}%
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                KENDALA OPERASIONAL / CATATAN{" "}
                {!watchKondisiSla || watchKondisiOla < 100 ? (
                  <span className="text-rose-600 font-bold">(Wajib Isi)</span>
                ) : (
                  <span className="text-slate-400 font-normal">(Opsional)</span>
                )}
                :
              </label>
              <textarea
                {...register("kendala")}
                disabled={isSubmitting}
                rows={2}
                placeholder={
                  !watchKondisiSla || watchKondisiOla < 100
                    ? "Wajib diisi: jelaskan penyebab alat OFF atau OLA < 100%..."
                    : "Tuliskan jika ada kendala sensor, jaringan, atau suplai daya..."
                }
                className={`w-full bg-slate-50 border rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white disabled:opacity-50 ${
                  errors.kendala
                    ? "border-rose-400 bg-rose-50/30"
                    : "border-slate-300"
                }`}
              />
              {errors.kendala && (
                <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                  {String(errors.kendala.message)}
                </span>
              )}
            </div>

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
                disabled={isSubmitting}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold bg-[#0052CC] hover:bg-blue-700 text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check size={15} />
                {isSubmitting ? "Menyimpan..." : "Simpan & Perbarui Data"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
