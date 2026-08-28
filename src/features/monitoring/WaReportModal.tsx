import React, { useState, useEffect, useMemo } from 'react';
import { X, Copy, Check, Share2, MessageSquare, Calendar, RefreshCw } from 'lucide-react';
import { AloptamaDevice, UPTStation } from '../../shared/types';
import { apiClient } from '../../shared/api';

interface WaReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: AloptamaDevice[];
  stations?: UPTStation[];
}

export const WaReportModal: React.FC<WaReportModalProps> = ({
  isOpen,
  onClose,
  devices,
  stations,
}) => {
  const [copied, setCopied] = useState(false);
  const [reportText, setReportText] = useState('');

  // Map lookup pencarian Kode/ID Stasiun -> Nama Stasiun Resmi
  const stationMap = useMemo(() => {
    const map = new Map<string, string>();
    const stationList = stations && stations.length > 0 ? stations : apiClient.stations.getAll();
    stationList.forEach((s) => {
      if (s.stationid) map.set(s.stationid, s.name);
      if (s.id) map.set(s.id, s.name);
    });
    return map;
  }, [stations]);

  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  const day = d.getUTCDate();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = monthNames[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const dateStrUTC = `${day} ${month} ${year}`;

  const formatUptName = (uptName: string) => {
    if (!uptName) return '';
    let cleaned = uptName.trim();
    cleaned = cleaned
      .replace(/^Stasiun Meteorologi DEO/i, 'Stamet DEO')
      .replace(/^Stasiun Meteorologi/i, 'Stamet')
      .replace(/^Stasiun Geofisika/i, 'Stageof')
      .replace(/^Stasiun Klimatologi/i, 'Staklim')
      .replace(/^Stasiun Maritim/i, 'Stamar')
      .replace(/^Stamet Torea\s*-\s*Fakfak/i, 'Stamet Fakfak')
      .replace(/^Stamet Utarom\s*-\s*Kaimana/i, 'Stamet Kaimana')
      .replace(/^Stamet Frans Kaisiepo\s*Biak/i, 'Stamet Biak')
      .replace(/^Stamet Mopah\s*Merauke/i, 'Stamet Merauke')
      .replace(/^Stamet Rendani\s*Manokwari/i, 'Stamet Manokwari')
      .trim();
    return cleaned;
  };

  const getUptLabel = (dev: AloptamaDevice) => {
    const rawUpt = dev.uptStation || '';
    const fullName = stationMap.get(rawUpt) || rawUpt || dev.site || '';
    return formatUptName(fullName);
  };

  const formatDateIndo = (dateStr?: string) => {
    if (!dateStr) return '28 Juli 2026';
    if (dateStr.includes('Juli') || dateStr.includes('Agustus') || dateStr.includes('Januari') || dateStr.includes('Februari')) return dateStr;
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const dayNum = parseInt(parts[2], 10);
        const realMonths = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return `${dayNum} ${realMonths[monthIdx] || ''} ${year}`;
      }
    } catch (e) {}
    return dateStr;
  };

  const buildDefaultTemplate = () => {
    const getUptsForCategory = (filterFn: (dev: AloptamaDevice) => boolean) => {
      const match = devices.filter(filterFn);
      if (match.length > 0) {
        const uniqueItems = new Map<string, string>();
        match.forEach((dev) => {
          const siteLabel = getUptLabel(dev);
          const updatedDate = formatDateIndo(dev.lastReportedDate || dev.lastCalibrated);
          uniqueItems.set(siteLabel, `${siteLabel} (terakhir update ${updatedDate})`);
        });
        return Array.from(uniqueItems.values());
      }
      return [];
    };

    // Pencocokan exact-match ke field `category`, konsisten dengan SlaOlaView.tsx
    const normalizeCategory = (s: string) =>
      (s || '').toLowerCase().replace(/[.\s]/g, '');
    const isCategory = (dev: AloptamaDevice, canonical: string) =>
      normalizeCategory(dev.category) === normalizeCategory(canonical);

    const awosKat1 = getUptsForCategory((dev) => isCategory(dev, 'AWOS Kat.I'));
    const awosKat2 = getUptsForCategory((dev) => isCategory(dev, 'AWOS Kat.II'));
    const awosKat3 = getUptsForCategory((dev) => isCategory(dev, 'AWOS Kat.III'));

    const radar = getUptsForCategory((dev) => isCategory(dev, 'Radar Cuaca'));

    const aws = getUptsForCategory((dev) => isCategory(dev, 'AWS'));

    const arg = getUptsForCategory((dev) => isCategory(dev, 'ARG'));

    const seismo = getUptsForCategory((dev) => isCategory(dev, 'Seismometer'));

    const lightning = getUptsForCategory((dev) => isCategory(dev, 'Lightning Detector'));

    const accel = getUptsForCategory((dev) => isCategory(dev, 'Accelerograph'));

    const wrs = getUptsForCategory((dev) => isCategory(dev, 'WRS NG'));

    const sirene = getUptsForCategory((dev) => isCategory(dev, 'Sirene'));

    const formatSection = (title: string, list: string[]) => {
      let res = `${title}:\n`;
      if (list.length === 0) {
        res += `1. -\n\n`;
      } else {
        list.forEach((item, idx) => {
          res += `${idx + 1}. ${item}\n`;
        });
        res += `\n`;
      }
      return res;
    };

    let text = `Selamat Pagi Bapak/Ibu KUPT, Mohon izin menyampaikan hasil monitoring SLA dan OLA terhadap unit kerja yang belum melaporkan kondisi peralatan operasional sampai dengan ${dateStrUTC} :\n\n`;
    text += `Reminder\n\n`;
    text += `SERVICE LEVEL AGREEMENT (SLA)\n`;
    text += formatSection('AWOS KAT I', awosKat1);
    text += formatSection('AWOS KAT II', awosKat2);
    text += formatSection('AWOS KAT III', awosKat3);
    text += formatSection('RADAR CUACA', radar);
    text += formatSection('AWS', aws);
    text += formatSection('ARG', arg);
    text += formatSection('SEISMO', seismo);
    text += formatSection('LIGHTNING DETECTOR', lightning);
    text += formatSection('ACCELEROGRAPH', accel);
    text += formatSection('WRS NG', wrs);
    text += formatSection('SIRENE', sirene);
    text += `Dimohon kepada UPT untuk dapat melaporkan kondisi peralatan setiap hari, serta tidak lupa melakukan pengisian pada OLA sesuai dengan kondisi operasional peralatan yang dikelola.\n\n`;
    text += `Apabila terdapat peralatan yang OFF atau mengalami kendala, mohon dapat diisi pada kolom Keterangan disertai dengan penjelasan penyebab gangguan serta langkah mitigasi yang telah atau akan dilakukan.\n\n`;
    text += `Kami juga mengucapkan terima kasih kepada UPT yang secara rutin telah melakukan pelaporan SLA dan OLA setiap harinya.`;

    return text;
  };

  useEffect(() => {
    if (isOpen) {
      setReportText(buildDefaultTemplate());
    }
  }, [isOpen, devices, stationMap]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResetTemplate = () => {
    setReportText(buildDefaultTemplate());
  };

  const handleOpenWhatsApp = () => {
    const encodedText = encodeURIComponent(reportText);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        <div className="bg-[#0A203C] text-white p-4 sm:p-5 flex items-start justify-between shrink-0 gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <MessageSquare size={20} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="font-heading text-base sm:text-lg font-bold">Format Laporan WA Grup</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                  <Calendar size={11} />
                  UTC Kemarin: {dateStrUTC}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                Format laporan pengingat SLA/OLA peralatan operasional untuk WhatsApp Group
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-semibold text-slate-700 gap-2">
            <span className="flex items-center gap-1.5">
              <MessageSquare size={14} className="text-[#0052CC]" />
              Teks Laporan Monitoring (Dapat Diedit):
            </span>
            <button
              onClick={handleResetTemplate}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw size={11} />
              Reset ke Format Default
            </button>
          </div>

          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            className="w-full h-64 sm:h-80 p-3 sm:p-4 bg-slate-900 text-emerald-300 font-mono text-xs sm:text-sm rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none leading-relaxed shadow-inner"
          />
        </div>

        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <button
            onClick={handleOpenWhatsApp}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Share2 size={15} />
            Buka WhatsApp Direct
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-md cursor-pointer ${
                copied
                  ? 'bg-emerald-600'
                  : 'bg-[#0052CC] hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {copied ? (
                <>
                  <Check size={16} />
                  Berhasil Disalin!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Salin Teks WA
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};