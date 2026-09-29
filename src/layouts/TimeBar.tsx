import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export const TimeBar: React.FC = () => {
  const [dateStr, setDateStr] = useState<string>("");
  const [timeWitStr, setTimeWitStr] = useState<string>("");
  const [timeUtcStr, setTimeUtcStr] = useState<string>("");
  const [showTimeDetail, setShowTimeDetail] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const day = now
        .toLocaleDateString("id-ID", {
          timeZone: "Asia/Jayapura",
          weekday: "long",
        })
        .toUpperCase();
      const date = now.toLocaleDateString("id-ID", {
        timeZone: "Asia/Jayapura",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const wit = now.toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jayapura",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const utc = now.toLocaleTimeString("id-ID", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setDateStr(`${day}, ${date}`);
      setTimeWitStr(`${wit} WIT`);
      setTimeUtcStr(`${utc} UTC`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Bar selebar layar penuh (seperti semula), tapi dibuat lebih TIPIS
  // (h-7, sebelumnya h-9) dengan font lebih kecil. Navbar & Sidebar ikut
  // disesuaikan ke top-7 supaya tetap menempel tepat di bawah bar ini.
  return (
    <div className="fixed top-0 left-0 right-0 z-40">
      <button
        type="button"
        onClick={() => setShowTimeDetail((v) => !v)}
        className="w-full h-7 flex items-center justify-center gap-1 sm:gap-2 bg-slate-100 border-b border-slate-200 text-slate-600 cursor-pointer active:bg-slate-200 sm:cursor-default"
      >
        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wide">
          {dateStr || "Memuat..."}
        </span>

        {/* Di layar sm ke atas, detail WIT/UTC langsung tampil inline di baris yang sama */}
        <span className="hidden sm:inline text-slate-300">•</span>
        <span className="hidden sm:inline text-[10px] font-bold text-emerald-600 tabular-nums">
          {timeWitStr || "--:--:--"}
          <span className="text-slate-300 font-normal mx-1">/</span>
          {timeUtcStr || "--:--:--"}
        </span>

        <ChevronDown
          size={12}
          className={`sm:hidden transition-transform duration-200 ${showTimeDetail ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown detail WIT/UTC — cuma dipakai di layar sempit (sm:hidden) */}
      {showTimeDetail && (
        <div className="sm:hidden absolute top-full left-0 right-0 bg-slate-100 border-b border-slate-200 shadow-md px-3 py-2 text-center">
          <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400">
            Standar Waktu Indonesia
          </p>
          <p className="text-xs font-bold text-emerald-600 tabular-nums leading-snug mt-0.5">
            {timeWitStr || "--:--:--"}{" "}
            <span className="text-slate-300 font-normal">|</span>{" "}
            {timeUtcStr || "--:--:--"}
          </p>
        </div>
      )}
    </div>
  );
};