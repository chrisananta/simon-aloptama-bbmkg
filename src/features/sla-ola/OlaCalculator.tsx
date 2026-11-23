import React, { useEffect, useRef, useState } from "react";
import { CheckSquare, Square } from "lucide-react";

interface OlaCalculatorProps {
  category: string;
  /** Hanya saat aktif kalkulator mengirim hasilnya ke OLA alat. */
  active: boolean;
  onChange: (ola: number) => void;
}

/**
 * Kalkulator persentase OLA untuk SATU alat. Tiap alat punya instance sendiri
 * sehingga pilihan kondisi tidak saling menimpa.
 */
export const OlaCalculator: React.FC<OlaCalculatorProps> = ({
  category,
  active,
  onChange,
}) => {
  const awosCategory: "AWOS_I" | "AWOS_II" | "AWOS_III" =
    category === "AWOS Kat. I"
      ? "AWOS_I"
      : category === "AWOS Kat. II"
      ? "AWOS_II"
      : "AWOS_III";

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

  let computedOla = 100;


    if (category === "AWS") {
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
    } else if (category.startsWith("AWOS")) {
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
    } else if (category === "WRS NG" || category === "WRS") {
      computedOla = 0.25 * calcDisplay + 0.35 * calcComm + 0.4 * calcPower;
    } else if (
      category === "Sirine Tsunami" ||
      category === "Sirine"
    ) {
      computedOla = 0.25 * calcSound + 0.25 * calcComm + 0.5 * calcPower;
    } else if (
      category === "Accelerograph" ||
      category === "Seismometer"
    ) {
      computedOla = 0.4 * calcLatency + 0.35 * calcComponent + 0.25 * calcSync;
    } else if (category === "Lightning Detector") {
      computedOla = 0.4 * calcLogger + 0.3 * calcPower + 0.3 * calcLdSensor;
    } else if (
      category === "Radar Cuaca" ||
      category === "Radar Weather"
    ) {
      computedOla = 0.4 * calcRadarData + 0.3 * calcComm + 0.3 * calcPower;
    } else if (category === "ARG") {
      computedOla =
        0.35 * calcArgSensor +
        0.2 * calcLogger +
        0.25 * calcComm +
        0.2 * calcPower;
    }
  const ola = Math.min(100, Math.max(0, Math.round(computedOla * 10) / 10));

  // Kirim hasil hanya saat pilihan kalkulator diubah (bukan saat panel dibuka),
  // supaya nilai yang sudah diatur manual lewat tombol +/- tidak tertimpa.
  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (active) onChange(ola);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ola]);

  const toggleSensor = (key: string) => {
    setActiveSensors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getSensorList = () => {
    if (category === "AWS") {
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
    if (category === "AWOS Kat. III") {
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
    if (category === "AWOS Kat. II") {
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
    if (category === "AWOS Kat. I") {
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
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <h4 className="text-xs font-bold text-slate-800">
          Pilih Kondisi Kelayakan Peralatan ({category}):
        </h4>
        <span className="text-[11px] font-bold text-slate-800">
          Kalkulasi OLA: {ola}%
        </span>
      </div>
                {(category === "AWS" ||
                  category.startsWith("AWOS")) && (
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

                {(category === "WRS NG" || category === "WRS") && (
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

                {(category === "Sirine Tsunami" ||
                  category === "Sirine") && (
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

                {(category === "Accelerograph" ||
                  category === "Seismometer") && (
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

                {category === "Lightning Detector" && (
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

                {(category === "Radar Cuaca" ||
                  category === "Radar Weather") && (
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

                {category === "ARG" && (
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
  );
};