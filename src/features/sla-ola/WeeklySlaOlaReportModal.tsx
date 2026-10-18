import React, { useState, useMemo, useEffect } from 'react';
import printlogobmkg from '../../assets/images/BMKGLogo.png';
import footerTte from '../../assets/images/FooterTTE.png';
import { 
  X, 
  Printer, 
  FileText, 
  Plus, 
  Trash2, 
  Calendar, 
  Users, 
  UserCheck, 
  CheckCircle2, 
  Info,
  ShieldCheck,
  Eye,
  Building2,
  Upload,
  Image as ImageIcon,
  Paperclip,
  ExternalLink
} from 'lucide-react';
import { AloptamaDevice, RangeScoreMap } from '../../shared/types';
import { apiClient } from '../../shared/api';
import { petugasService, PetugasItem } from '../../shared/services/petugasService';

interface WeeklySlaOlaReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: AloptamaDevice[];
}

export type { PetugasItem };

export interface ExtraAttachmentItem {
  id: string;
  title: string;
  imageUrl: string;
}

const REPORT_CSS = `
  @page { size: A4 portrait; margin: 0; }
  .wr-root { background: #e5e7eb; padding: 6mm 0; }
  .wr-sheet, .wr-sheet * { box-sizing: border-box; }
  .wr-sheet {
    position: relative; width: 210mm; height: 297mm; overflow: hidden;
    margin: 0 auto 6mm; background: #fff; color: #000;
    font-family: Arial, "Liberation Sans", Helvetica, sans-serif; font-size: 11pt; line-height: 1.2;
    box-shadow: 0 1px 6px rgba(0,0,0,.25);
  }
  .wr-footer { position: absolute; left: 25.4mm; top: 275.5mm; width: 159.2mm; height: 8.9mm; }
  .wr-footer img { display: block; width: 100%; height: 100%; }

  /* Kop (halaman 1) */
  .wr-kop { position: absolute; left: 0; top: 0; width: 210mm; height: 35.3mm; background: #d0d0d0; border-bottom: 0.8mm solid #000; }
  .wr-kop::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1.6mm; border-top: 0.25mm solid #000; }
  .wr-kop-logo { position: absolute; left: 7.3mm; top: 4.2mm; width: 25.4mm; height: 25.2mm; object-fit: contain; }
  .wr-kop-text { position: absolute; left: 32.7mm; right: 7mm; top: 5.9mm; text-align: center; font-weight: bold; }
  .wr-kop-1 { font-size: 16pt; line-height: 7mm; }
  .wr-kop-2 { font-size: 13pt; line-height: 6mm; }
  .wr-kop-3 { font-size: 12pt; line-height: 5.6mm; }
  .wr-link { color: #0563c1; text-decoration: underline; }

  .wr-title { position: absolute; left: 25.4mm; right: 25.4mm; top: 45.8mm; text-align: center; font-size: 14pt; font-weight: bold; line-height: 8.5mm; }
  .wr-flow { position: absolute; left: 25.4mm; width: 159.2mm; }
  .wr-flow-1 { top: 69.6mm; }
  .wr-flow-2 { top: 25.4mm; }
  .wr-flow-3 { top: 25.4mm; }

  .wr-info { border: 0.35mm solid #000; padding: 0 1.7mm; line-height: 6.7mm; }
  .wr-info-row { display: flex; }
  .wr-info-label { width: 35.3mm; flex: none; }
  .wr-info-colon { width: 4.6mm; flex: none; }
  .wr-info-value { flex: 1; }
  .wr-h2 { margin: 5.3mm 0 3.9mm; font-size: 12pt; font-weight: bold; line-height: 5mm; }

  .wr-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-family: Calibri, Carlito, Arial, sans-serif; font-size: 11pt; }
  .wr-table th, .wr-table td { border: 0.35mm solid #000; height: 6.07mm; padding: 0 1.2mm; text-align: center; vertical-align: middle; line-height: 1; font-weight: normal; white-space: nowrap; overflow: hidden; }
  .wr-t2 th, .wr-t2 td { height: 5.97mm; }
  .wr-table .wr-l { text-align: left; }
  .wr-table .wr-b th { font-weight: bold; }
  .wr-table .wr-total td { font-weight: bold; }

  .wr-notes-title { margin-top: 7.4mm; font-weight: bold; line-height: 5mm; }
  .wr-note { display: flex; padding-left: 6.35mm; margin-top: 2.6mm; line-height: 5mm; }
  .wr-note-no { width: 6.35mm; flex: none; }
  .wr-sign { width: 64mm; margin: 9.6mm 0 0 auto; text-align: center; line-height: 6.65mm; }
  .wr-sign-space { height: 18.8mm; display: flex; align-items: center; justify-content: center; }
  .wr-sign-hint { border: 0.3mm dashed #94a3b8; color: #94a3b8; font-size: 8pt; font-style: italic; padding: 1mm 3mm; border-radius: 1mm; }
  .wr-sign-name { font-weight: bold; position: relative; left: 1.7mm; }

  .wr-lamp-title { text-align: center; font-size: 14pt; font-weight: bold; line-height: 6mm; margin-bottom: 11mm; }
  .wr-lamp-item { margin-bottom: 5.6mm; }
  .wr-lamp-head { font-size: 12pt; font-weight: bold; font-style: italic; line-height: 4.2mm; }
  .wr-lamp-img { display: block; height: 67mm; width: auto; max-width: 100%; margin: 0 auto; object-fit: contain; }
  .wr-lamp-empty { height: 67mm; width: 128mm; max-width: 100%; margin: 0 auto; border: 0.3mm dashed #94a3b8; background: #f8fafc; color: #64748b; font-size: 10pt; display: flex; align-items: center; justify-content: center; }

  @media print {
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .wr-root { background: #fff !important; padding: 0 !important; margin: 0 !important; }
    .wr-sheet { margin: 0 !important; box-shadow: none !important; height: 296.4mm; break-after: page; page-break-after: always; }
    .wr-sheet:last-child { break-after: auto; page-break-after: auto; }
    .wr-noprint, .no-print { display: none !important; }
  }
`;

export const WeeklySlaOlaReportModal: React.FC<WeeklySlaOlaReportModalProps> = ({
  isOpen,
  onClose,
  devices
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'preview'>('config');

  const [startDateIso, setStartDateIso] = useState<string>('2026-06-15');
  const [endDateIso, setEndDateIso] = useState<string>('2026-06-19');
  const [startDate, setStartDate] = useState<string>('15 Juni 2026');
  const [endDate, setEndDate] = useState<string>('19 Juni 2026');

  // Nilai SLA/OLA per alat untuk rentang tanggal terpilih, dari isian harian (sla_ola_logs).
  const [rangeScores, setRangeScores] = useState<RangeScoreMap>({});
  const [isRangeLoading, setIsRangeLoading] = useState(false);
  const [rangeLoadFailed, setRangeLoadFailed] = useState(false);
  const isRangeValid = !!startDateIso && !!endDateIso && startDateIso <= endDateIso;

  useEffect(() => {
    if (!isOpen || !isRangeValid) return;
    let cancelled = false;
    setIsRangeLoading(true);
    setRangeLoadFailed(false);
    apiClient.slaOlaRange.fetch(startDateIso, endDateIso).then((result) => {
      if (cancelled) return;
      if (result === null) {
        setRangeScores({});
        setRangeLoadFailed(true);
      } else {
        setRangeScores(result);
      }
      setIsRangeLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, isRangeValid, startDateIso, endDateIso]);

  const formatDateToIndonesian = (dateIsoStr: string) => {
    if (!dateIsoStr) return '';
    const d = new Date(dateIsoStr);
    if (isNaN(d.getTime())) return dateIsoStr;
    const day = d.getDate();
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleStartDateIsoChange = (isoVal: string) => {
    setStartDateIso(isoVal);
    if (isoVal) {
      setStartDate(formatDateToIndonesian(isoVal));
    }
  };

  const handleEndDateIsoChange = (isoVal: string) => {
    setEndDateIso(isoVal);
    if (isoVal) {
      setEndDate(formatDateToIndonesian(isoVal));
    }
  };

  const calculatedPeriodDays = useMemo(() => {
    if (!startDateIso || !endDateIso) return 5;
    const s = new Date(startDateIso);
    const e = new Date(endDateIso);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 5;
    const diff = Math.abs(e.getTime() - s.getTime());
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, days);
  }, [startDateIso, endDateIso]);

  const [masterPetugas, setMasterPetugas] = useState<PetugasItem[]>(() => petugasService.getAll());
  const [petugasList, setPetugasList] = useState<PetugasItem[]>([]);
  const [inputPersonel, setInputPersonel] = useState<string>('');

  useEffect(() => {
    petugasService.fetch().then((data) => {
      if (data && data.length > 0) {
        setMasterPetugas(data);
        setPetugasList((prev) => (prev.length === 0 ? data.slice(0, 3) : prev));
      }
    });

    const handlePetugasUpdate = () => {
      setMasterPetugas(petugasService.getAll());
    };

    window.addEventListener('petugas_list_updated', handlePetugasUpdate);
    return () => window.removeEventListener('petugas_list_updated', handlePetugasUpdate);
  }, []);

  const unselectedMasterPetugas = useMemo(() => {
    return masterPetugas.filter(
      (master) =>
        master?.name &&
        !petugasList.some(
          (p) => p.id === master.id || (p?.name || '').toLowerCase() === (master?.name || '').toLowerCase()
        )
    );
  }, [masterPetugas, petugasList]);

  const handleAddPersonelFromMaster = () => {
    const trimmed = inputPersonel.trim();
    if (!trimmed) return;

    const matchedMaster = masterPetugas.find(
      (p) =>
        (p?.name || '').toLowerCase() === trimmed.toLowerCase() ||
        p.id === trimmed
    );

    if (matchedMaster) {
      if (!petugasList.some((p) => p.id === matchedMaster.id)) {
        setPetugasList((prev) => [...prev, matchedMaster]);
      }
    } else {
      const newCustomPetugas: PetugasItem = {
        id: `CUSTOM-${Date.now()}`,
        name: trimmed,
        jabatan: 'Staf Operasional',
      };
      setPetugasList((prev) => [...prev, newCustomPetugas]);
    }

    setInputPersonel('');
  };

  const handleRemovePersonel = (id: string) => {
    setPetugasList((prev) => prev.filter((p) => p.id !== id));
  };

  const [jabatanMengetahui, setJabatanMengetahui] = useState<string>(
    'Ketua Tim Kerja Instrumentasi dan Kalibrasi'
  );
  const [namaMengetahui, setNamaMengetahui] = useState<string>(
    'Yessi Veronika Marpaung, S.Tr'
  );

  const [catatanText, setCatatanText] = useState<string>('-');

  const [imgAwsCenter, setImgAwsCenter] = useState<string | null>(null);
  const [imgSlaOla, setImgSlaOla] = useState<string | null>(null);
  const [imgDiseminasi, setImgDiseminasi] = useState<string | null>(null);

  const [extraAttachments, setExtraAttachments] = useState<ExtraAttachmentItem[]>([]);

  const [includeDocumentation, setIncludeDocumentation] = useState<boolean>(true);

  const handleSingleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setter(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddExtraAttachment = () => {
    setExtraAttachments([
      ...extraAttachments,
      {
        id: `extra-img-${Date.now()}`,
        title: `Lampiran Foto #${extraAttachments.length + 1}`,
        imageUrl: ''
      }
    ]);
  };

  const handleExtraImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    id: string
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setExtraAttachments(prev => prev.map(item => item.id === id ? { ...item, imageUrl: evt.target?.result as string } : item));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateExtraTitle = (id: string, newTitle: string) => {
    setExtraAttachments(prev => prev.map(item => item.id === id ? { ...item, title: newTitle } : item));
  };

  const handleRemoveExtraAttachment = (id: string) => {
    setExtraAttachments(prev => prev.filter(item => item.id !== id));
  };

  const rekapData = useMemo(() => {
    // Kategori resmi sesuai field `category` di database. Pencocokan
    // exact-match (bukan substring) supaya "AWOS Kat.II" dan "AWOS Kat.III"
    // tidak pernah saling tertukar, konsisten dengan SlaOlaView.tsx.
    const normalizeCategory = (s: string) =>
      (s || '').toLowerCase().replace(/[.\s]/g, '');

    const makeExactMatcher = (canonicalCategory: string) => {
      const target = normalizeCategory(canonicalCategory);
      return (d: AloptamaDevice) => normalizeCategory(d.category) === target;
    };

    const CATEGORIES = [
      {
        no: 1,
        key: 'AWOS Kat.I',
        name: 'AWOS KAT. I',
        matchFn: makeExactMatcher('AWOS Kat.I'),
      },
      {
        no: 2,
        key: 'AWOS Kat.II',
        name: 'AWOS KAT II',
        matchFn: makeExactMatcher('AWOS Kat.II'),
      },
      {
        no: 3,
        key: 'AWOS Kat.III',
        name: 'AWOS KAT III',
        matchFn: makeExactMatcher('AWOS Kat.III'),
      },
      {
        no: 4,
        key: 'Radar Cuaca',
        name: 'RADAR CUACA',
        matchFn: makeExactMatcher('Radar Cuaca'),
      },
      {
        no: 5,
        key: 'AWS',
        name: 'AWS',
        matchFn: makeExactMatcher('AWS'),
      },
      {
        no: 6,
        key: 'ARG',
        name: 'ARG',
        matchFn: makeExactMatcher('ARG'),
      },
      {
        no: 7,
        key: 'Seismometer',
        name: 'SEISMOMETER',
        matchFn: makeExactMatcher('Seismometer'),
      },
      {
        no: 8,
        key: 'Lightning Detector',
        name: 'LIGHTNING DETECTOR',
        matchFn: makeExactMatcher('Lightning Detector'),
      },
      {
        no: 9,
        key: 'Accelerograph',
        name: 'ACCELEROGRAPH NC',
        matchFn: makeExactMatcher('Accelerograph'),
      },
      {
        no: 10,
        key: 'WRS NG',
        name: 'WRS NEW GENERATION',
        matchFn: makeExactMatcher('WRS NG'),
      },
      {
        no: 11,
        key: 'Sirene',
        name: 'SIRENE',
        matchFn: makeExactMatcher('Sirene'),
      }
    ];

    return CATEGORIES.map((cat, idx) => {
      const catDevs = devices.filter(cat.matchFn);

      let jumlahLokasi = catDevs.length;
      let sla = 0;
      let ola = 0;
      let normal = 0;
      let gangguan = 0;
      let mati = 0;

      // Nilai dari isian harian UPT pada rentang tanggal. Alat tanpa isian sama sekali di
      // rentang itu tetap dihitung di pembagi (jumlah lokasi) dan masuk "Tidak Beroperasi".
      let totalSla = 0;
      let totalOla = 0;
      let tanpaIsian = 0;
      for (const d of catDevs) {
        const sc = rangeScores[d.devicesId];
        if (!sc) {
          tanpaIsian += 1;
          continue;
        }
        totalSla += sc.sla;
        totalOla += sc.ola;
        // Aturan klasifikasi sama dengan halaman SLA & OLA.
        if (sc.sla <= 0 || sc.ola <= 0) mati += 1;
        else if (sc.sla >= 100 && sc.ola >= 100) normal += 1;
        else gangguan += 1;
      }
      mati += tanpaIsian;
      if (jumlahLokasi > 0) {
        sla = Math.min(100, Math.max(0, Number((totalSla / jumlahLokasi).toFixed(1))));
        ola = Math.min(100, Math.max(0, Number((totalOla / jumlahLokasi).toFixed(1))));
      }

      return {
        no: idx + 1,
        name: cat.name,
        jumlahLokasi,
        sla,
        ola,
        normal,
        gangguan,
        mati,
        tanpaIsian
      };
    });
  }, [devices, rangeScores]);

  const totalLokasiSum = useMemo(() => rekapData.reduce((acc, curr) => acc + curr.jumlahLokasi, 0), [rekapData]);
  const avgSlaTotal = useMemo(() => {
    if (totalLokasiSum === 0) return 0;
    const weighted = rekapData.reduce((acc, curr) => acc + curr.sla * curr.jumlahLokasi, 0);
    return Number((weighted / totalLokasiSum).toFixed(1));
  }, [rekapData, totalLokasiSum]);

  const avgOlaTotal = useMemo(() => {
    if (totalLokasiSum === 0) return 0;
    const weighted = rekapData.reduce((acc, curr) => acc + curr.ola * curr.jumlahLokasi, 0);
    return Number((weighted / totalLokasiSum).toFixed(1));
  }, [rekapData, totalLokasiSum]);

  const totalNormalSum = useMemo(() => rekapData.reduce((acc, curr) => acc + curr.normal, 0), [rekapData]);
  const totalGangguanSum = useMemo(() => rekapData.reduce((acc, curr) => acc + curr.gangguan, 0), [rekapData]);
  const totalTanpaIsian = useMemo(() => rekapData.reduce((acc, curr) => acc + curr.tanpaIsian, 0), [rekapData]);
  const totalMatiSum = useMemo(() => rekapData.reduce((acc, curr) => acc + curr.mati, 0), [rekapData]);

  const handleOpenPrintWindow = () => {
    if (isRangeLoading || rangeLoadFailed || !isRangeValid) return;
    const element = document.getElementById('printable-report-area');
    if (!element) return;

    const printWindow = window.open('', '_blank', 'width=950,height=1000');
    if (!printWindow) {
      window.print();
      return;
    }

    const reportHtml = element.outerHTML;
    // Nama berkas PDF mengikuti kebiasaan: DDMMYYYY (tanggal akhir)_Laporan_Mingguan_Monitoring
    const [yy, mm, dd] = endDateIso.split('-');
    const docTitle = yy && mm && dd
      ? `${dd}${mm}${yy}_Laporan_Mingguan_Monitoring`
      : `Laporan_Mingguan_Monitoring (${startDate} - ${endDate})`;

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8">
          <title>${docTitle}</title>
          <style>
            body { margin: 0; background: #e5e7eb; }
            .print-bar { max-width: 210mm; margin: 12px auto; padding: 12px 16px; background: #0f172a; color: #fff; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; font: 700 12px Arial, sans-serif; }
            .print-bar button { background: #0052CC; color: #fff; padding: 8px 18px; border-radius: 10px; border: 0; cursor: pointer; font-weight: 700; }
            ${REPORT_CSS}
          </style>
        </head>
        <body>
          <div class="print-bar no-print">
            <span>Dokumen siap dicetak atau disimpan sebagai PDF (BBMKG Wilayah V)</span>
            <button onclick="window.print()">Cetak / Simpan PDF</button>
          </div>
          ${reportHtml}
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 600);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  // ---- Bahan halaman laporan (mengikuti contoh laporan manual) ----
  const catatanItems = (() => {
    const items = catatanText.split('\n').map((t) => t.trim()).filter(Boolean);
    return items.length > 0 ? items : ['-'];
  })();
  const jabatanLine = jabatanMengetahui.replace(/\s*\n\s*/g, ' ').trim().replace(/,?$/, ',');

  const lampiranItems: { key: string; title: string; src: string | null }[] = [
    { key: 'aws', title: 'Monitoring AWS Center', src: imgAwsCenter },
    { key: 'slaola', title: 'Monitoring SLA dan OLA', src: imgSlaOla },
    { key: 'diseminasi', title: 'Diseminasi Hasil Monitoring Aloptama', src: imgDiseminasi },
    ...extraAttachments.map((att, idx) => ({
      key: att.id,
      title: att.title || `Lampiran Foto Tambahan #${idx + 1}`,
      src: att.imageUrl || null,
    })),
  ];
  const lampiranSheets: (typeof lampiranItems)[] = [];
  for (let i = 0; i < lampiranItems.length; i += 3) {
    lampiranSheets.push(lampiranItems.slice(i, i + 3));
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-report-area, #printable-report-area * { visibility: visible !important; }
          #printable-report-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 210mm !important; }
        }
        ${REPORT_CSS}
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-auto overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[92vh] animate-scaleUp">

        {/* Modal Header */}
        <div className="no-print bg-slate-900 text-white p-3.5 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
              <FileText size={20} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-md border border-emerald-500/30">
                  Laporan
                </span>
              </div>
              <h2 className="text-sm sm:text-lg font-black tracking-tight text-white mt-0.5 leading-tight">
                Buat Laporan Monitoring Aloptama
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end border-t border-slate-800/80 md:border-t-0 pt-2.5 md:pt-0">
            <div className="bg-slate-800 p-1 rounded-xl flex items-center border border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('config')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'config'
                    ? 'bg-[#0052CC] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users size={14} />
                <span>Input</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-[#0052CC] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye size={14} />
                <span>Pratinjau PDF</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 bg-slate-50/50">
          {activeTab === 'config' && (
            <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto no-print">
              
              {/* Periode Tanggal */}
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <Calendar size={18} className="text-[#0052CC]" />
                    Periode &amp; Monitoring
                  </h3>
                  <span className="text-[11px] font-bold text-[#0052CC] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 shrink-0">
                    {calculatedPeriodDays} Hari Operasional ({calculatedPeriodDays * 24} Jam)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tanggal Mulai Monitoring <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={startDateIso}
                      onChange={(e) => handleStartDateIsoChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#0052CC] focus:bg-white transition-all cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tanggal Selesai Monitoring <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={endDateIso}
                      onChange={(e) => handleEndDateIsoChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#0052CC] focus:bg-white transition-all cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-3 sm:p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs font-extrabold text-[#0052CC] gap-1">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>Rata-Rata SLA &amp; OLA Berdasarkan Periode Input:</span>
                    </span>
                    <span className="font-bold text-[#0052CC] text-[11px] sm:text-xs">{startDate} s.d. {endDate}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-0.5">
                    <div className="bg-white p-2.5 rounded-lg border border-blue-100 flex justify-between items-center shadow-2xs">
                      <span className="text-slate-600 font-bold">Rata-Rata SLA :</span>
                      <span className="font-black text-[#0052CC] text-sm sm:text-base">{avgSlaTotal.toFixed(1)}%</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-blue-100 flex justify-between items-center shadow-2xs">
                      <span className="text-slate-600 font-bold">Rata-Rata OLA :</span>
                      <span className="font-black text-emerald-700 text-sm sm:text-base">{avgOlaTotal.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {!isRangeValid && (
                  <p className="text-[11px] font-bold text-red-600">Tanggal selesai tidak boleh sebelum tanggal mulai.</p>
                )}
                {isRangeValid && isRangeLoading && (
                  <p className="text-[11px] font-bold text-slate-500">Memuat isian SLA/OLA harian untuk periode ini…</p>
                )}
                {isRangeValid && rangeLoadFailed && (
                  <p className="text-[11px] font-bold text-red-600">
                    Gagal memuat isian SLA/OLA harian. Laporan tidak bisa dicetak sampai data berhasil dimuat — coba ubah tanggal atau buka ulang.
                  </p>
                )}
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5 italic">
                  <Info size={13} className="text-blue-600 shrink-0" />
                  Persentase dihitung dari isian harian UPT pada periode di atas (rata-rata per hari yang terisi).
                  {!isRangeLoading && !rangeLoadFailed && totalTanpaIsian > 0 &&
                    ` ${totalTanpaIsian} alat tanpa isian di periode ini dihitung Tidak Beroperasi.`}
                </p>
              </div>

              {/* Petugas Monitoring */}
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <Users size={16} className="text-[#0052CC]" />
                    Petugas Monitoring
                  </h3>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-600 hidden sm:inline">Jumlah Personel:</span>
                    <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-200 rounded-lg font-extrabold text-xs text-[#0052CC]">
                      {petugasList.length} Personel
                    </span>
                  </div>
                </div>

                <datalist id="master-petugas-suggestions">
                  {unselectedMasterPetugas.map((master) => (
                    <option key={master.id} value={master.name}>
                      {master.jabatan || 'Staf BMKG'}
                    </option>
                  ))}
                </datalist>

                {petugasList.length === 0 ? (
                  <div className="py-3 text-center text-xs text-slate-400">
                    Memuat data petugas dari database...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {petugasList.map((petugas, index) => (
                      <div key={petugas.id || index} className="flex items-center gap-2 animate-fadeIn">
                        <span className="w-5 text-center text-xs font-extrabold text-slate-400 shrink-0">
                          {index + 1}.
                        </span>
                        <span className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 truncate">
                          {petugas.name}
                        </span>
                        {petugasList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePersonel(petugas.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer shrink-0"
                            title="Hapus personil ini"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3 border-t border-dashed border-slate-200 space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Tambah Personel
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      list="master-petugas-suggestions"
                      value={inputPersonel}
                      onChange={(e) => setInputPersonel(e.target.value)}
                      placeholder="Pilih Nama Personel"
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#0052CC] focus:bg-white"
                    />

                    <button
                      type="button"
                      onClick={handleAddPersonelFromMaster}
                      disabled={!inputPersonel.trim()}
                      className="px-3.5 py-2 bg-[#0052CC] hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Tambah</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Penanggung Jawab */}
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                  <UserCheck size={16} className="text-[#0052CC]" />
                  Penanggung Jawab &amp; Catatan Laporan
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Jabatan Penanggung Jawab (Mengetahui)
                    </label>
                    <textarea
                      value={jabatanMengetahui}
                      onChange={(e) => setJabatanMengetahui(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#0052CC] focus:bg-white resize-none"
                    />
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Tekan Enter untuk baris baru pada hasil cetak.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Pejabat Penanggung Jawab
                    </label>
                    <input
                      type="text"
                      value={namaMengetahui}
                      onChange={(e) => setNamaMengetahui(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#0052CC] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Tambahan Laporan
                  </label>
                  <textarea
                    rows={2}
                    value={catatanText}
                    onChange={(e) => setCatatanText(e.target.value)}
                    placeholder="Contoh: 1. - atau Terdapat pemeliharaan berkala pada Seismometer Jayapura."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-[#0052CC] focus:bg-white resize-none"
                  />
                </div>
              </div>

              {/* Lampiran Gambar */}
              <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-3 gap-1.5 sm:gap-0">
                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <ImageIcon size={16} className="text-[#0052CC]" />
                    Lampiran Gambar Dokumentasi Monitoring
                  </h3>
                  <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    Dapat Diunggah Foto / Tangkapan Layar
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Building2 size={14} className="text-blue-600 shrink-0" />
                        <span>AWS Center</span>
                      </label>
                      {imgAwsCenter && (
                        <button
                          type="button"
                          onClick={() => setImgAwsCenter(null)}
                          className="text-[10px] text-rose-600 font-bold hover:underline"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                    {imgAwsCenter ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-300 group">
                        <img src={imgAwsCenter} alt="AWS Center" className="w-full h-28 sm:h-32 object-cover" />
                        <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-xs font-bold gap-1">
                          <Upload size={16} /> Ganti
                          <input type="file" accept="image/*" onChange={(e) => handleSingleImageUpload(e, setImgAwsCenter)} className="hidden" />
                        </label>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-28 sm:h-32 border-2 border-dashed border-slate-300 hover:border-[#0052CC] rounded-lg bg-white cursor-pointer transition-colors p-2 text-center">
                        <Upload size={20} className="text-slate-400 mb-1" />
                        <span className="text-[11px] font-bold text-slate-700">Foto AWS Center</span>
                        <span className="text-[9px] text-slate-400">Klik / Drag file</span>
                        <input type="file" accept="image/*" onChange={(e) => handleSingleImageUpload(e, setImgAwsCenter)} className="hidden" />
                      </label>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText size={14} className="text-indigo-600 shrink-0" />
                        <span>SLA &amp; OLA</span>
                      </label>
                      {imgSlaOla && (
                        <button
                          type="button"
                          onClick={() => setImgSlaOla(null)}
                          className="text-[10px] text-rose-600 font-bold hover:underline"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                    {imgSlaOla ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-300 group">
                        <img src={imgSlaOla} alt="SLA OLA" className="w-full h-28 sm:h-32 object-cover" />
                        <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-xs font-bold gap-1">
                          <Upload size={16} /> Ganti
                          <input type="file" accept="image/*" onChange={(e) => handleSingleImageUpload(e, setImgSlaOla)} className="hidden" />
                        </label>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-28 sm:h-32 border-2 border-dashed border-slate-300 hover:border-[#0052CC] rounded-lg bg-white cursor-pointer transition-colors p-2 text-center">
                        <Upload size={20} className="text-slate-400 mb-1" />
                        <span className="text-[11px] font-bold text-slate-700">Matriks SLA &amp; OLA</span>
                        <span className="text-[9px] text-slate-400">Klik / Drag file</span>
                        <input type="file" accept="image/*" onChange={(e) => handleSingleImageUpload(e, setImgSlaOla)} className="hidden" />
                      </label>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Users size={14} className="text-emerald-600 shrink-0" />
                        <span>Diseminasi WA</span>
                      </label>
                      {imgDiseminasi && (
                        <button
                          type="button"
                          onClick={() => setImgDiseminasi(null)}
                          className="text-[10px] text-rose-600 font-bold hover:underline"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                    {imgDiseminasi ? (
                      <div className="relative rounded-lg overflow-hidden border border-slate-300 group">
                        <img src={imgDiseminasi} alt="Diseminasi" className="w-full h-28 sm:h-32 object-cover" />
                        <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-xs font-bold gap-1">
                          <Upload size={16} /> Ganti
                          <input type="file" accept="image/*" onChange={(e) => handleSingleImageUpload(e, setImgDiseminasi)} className="hidden" />
                        </label>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-28 sm:h-32 border-2 border-dashed border-slate-300 hover:border-[#0052CC] rounded-lg bg-white cursor-pointer transition-colors p-2 text-center">
                        <Upload size={20} className="text-slate-400 mb-1" />
                        <span className="text-[11px] font-bold text-slate-700">Diseminasi WA</span>
                        <span className="text-[9px] text-slate-400">Klik / Drag file</span>
                        <input type="file" accept="image/*" onChange={(e) => handleSingleImageUpload(e, setImgDiseminasi)} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Paperclip size={14} className="text-slate-600" />
                      <span>Lampiran Foto Tambahan</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAddExtraAttachment}
                      className="px-2.5 py-1 bg-[#0052CC]/10 hover:bg-[#0052CC]/20 text-[#0052CC] text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Tambah Foto</span>
                    </button>
                  </div>

                  {extraAttachments.length > 0 && (
                    <div className="space-y-2.5">
                      {extraAttachments.map((item, idx) => (
                        <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-xs font-bold text-slate-500 w-6">#{idx + 1}</span>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleUpdateExtraTitle(item.id, e.target.value)}
                            placeholder="Judul / Keterangan Lampiran"
                            className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-[#0052CC]"
                          />
                          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                            {item.imageUrl ? (
                              <div className="flex items-center gap-2">
                                <img src={item.imageUrl} alt="Extra" className="w-9 h-9 object-cover rounded border border-slate-300" />
                                <label className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded cursor-pointer">
                                  Ganti
                                  <input type="file" accept="image/*" onChange={(e) => handleExtraImageUpload(e, item.id)} className="hidden" />
                                </label>
                              </div>
                            ) : (
                              <label className="px-3 py-1.5 bg-[#0052CC] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-blue-800 transition-colors flex items-center gap-1">
                                <Upload size={13} />
                                <span>Unggah</span>
                                <input type="file" accept="image/*" onChange={(e) => handleExtraImageUpload(e, item.id)} className="hidden" />
                              </label>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveExtraAttachment(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              title="Hapus lampiran ini"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeDocumentation}
                      onChange={(e) => setIncludeDocumentation(e.target.checked)}
                      className="w-4 h-4 text-[#0052CC] rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span>Sertakan Halaman Lampiran</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className="w-full sm:w-auto px-4 py-2 bg-[#0052CC] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Eye size={15} />
                    <span>Pratinjau Dokumen</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB PREVIEW */}
          {(activeTab === 'preview' || activeTab === 'config') && (
            <div className={activeTab === 'config' ? 'hidden' : 'block'}>
              <div className="no-print mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-blue-900 font-medium">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#0052CC] shrink-0" />
                  <span>Pratinjau Hasil Cetak Laporan.</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleOpenPrintWindow}
                    disabled={isRangeLoading || rangeLoadFailed || !isRangeValid}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer size={14} />
                    <span>Cetak / Simpan PDF</span>
                  </button>
                </div>
              </div>

              {/* Printable Wrapper — susunan mengikuti contoh Laporan Mingguan Monitoring */}
              <div className="w-full overflow-x-auto pb-6">
                <div id="printable-report-area" className="wr-root">

                  {/* ===== Halaman 1: kop, judul, info, tabel Kondisi Aloptama ===== */}
                  <section className="wr-sheet">
                    <header className="wr-kop">
                      <img className="wr-kop-logo" src={printlogobmkg} alt="Logo BMKG" />
                      <div className="wr-kop-text">
                        <div className="wr-kop-1">BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA</div>
                        <div className="wr-kop-2">BALAI BESAR METEOROLOGI, KLIMATOLOGI DAN GEOFISIKA WILAYAH V</div>
                        <div className="wr-kop-3">Jl. Raya Abepura Entrop - Jayapura, Telp : (0967) 5165442, Kode Pos 99224</div>
                        <div className="wr-kop-3">
                          Email : <span className="wr-link">bbmkg5@bmkg.go.id</span> Website : <span className="wr-link">bbmkg5.bmkg.go.id</span>
                        </div>
                      </div>
                    </header>

                    <div className="wr-title">
                      LAPORAN REKAPITULASI MONITORING KONDISI<br />ALOPTAMA DI BBMKG WILAYAH V
                    </div>

                    <div className="wr-flow wr-flow-1">
                      <div className="wr-info">
                        <div className="wr-info-row">
                          <span className="wr-info-label">Tanggal</span>
                          <span className="wr-info-colon">:</span>
                          <span className="wr-info-value">{startDate} - {endDate}</span>
                        </div>
                        <div className="wr-info-row">
                          <span className="wr-info-label">Petugas</span>
                          <span className="wr-info-colon">:</span>
                          <span className="wr-info-value">
                            {petugasList.map((p) => (
                              <div key={p.id}>{p.name}</div>
                            ))}
                          </span>
                        </div>
                      </div>

                      <div className="wr-h2">Kondisi Aloptama</div>
                      <table className="wr-table">
                        <colgroup>
                          <col style={{ width: '12.9mm' }} />
                          <col style={{ width: '66.6mm' }} />
                          <col style={{ width: '43mm' }} />
                          <col style={{ width: '18.4mm' }} />
                          <col style={{ width: '18.3mm' }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>NO.</th>
                            <th>PERALATAN</th>
                            <th>JUMLAH LOKASI</th>
                            <th>SLA</th>
                            <th>OLA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rekapData.map((row) => (
                            <tr key={row.no}>
                              <td>{row.no}</td>
                              <td className="wr-l">{row.name}</td>
                              <td>{row.jumlahLokasi}</td>
                              <td>{row.sla.toFixed(1)}%</td>
                              <td>{row.ola.toFixed(1)}%</td>
                            </tr>
                          ))}
                          <tr className="wr-total">
                            <td colSpan={2} className="wr-l">TOTAL PERSENTASE</td>
                            <td>{totalLokasiSum}</td>
                            <td>{avgSlaTotal.toFixed(1)}%</td>
                            <td>{avgOlaTotal.toFixed(1)}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="wr-footer"><img src={footerTte} alt="Dokumen ini telah ditandatangani secara elektronik" /></div>
                  </section>

                  {/* ===== Halaman 2: tabel kondisi, catatan, pengesahan ===== */}
                  <section className="wr-sheet">
                    <div className="wr-flow wr-flow-2">
                      <table className="wr-table wr-t2">
                        <colgroup>
                          <col style={{ width: '48.8mm' }} />
                          <col style={{ width: '29.6mm' }} />
                          <col style={{ width: '37mm' }} />
                          <col style={{ width: '43.8mm' }} />
                        </colgroup>
                        <thead>
                          <tr className="wr-b">
                            <th>Peralatan</th>
                            <th>Normal (100%)</th>
                            <th>Gangguan (1-99%)</th>
                            <th>Tidak Beroperasi (0%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rekapData.map((row) => (
                            <tr key={row.no}>
                              <td>{row.name}</td>
                              <td>{row.normal}</td>
                              <td>{row.gangguan}</td>
                              <td>{row.mati}</td>
                            </tr>
                          ))}
                          <tr className="wr-total">
                            <td>TOTAL</td>
                            <td>{totalNormalSum}</td>
                            <td>{totalGangguanSum}</td>
                            <td>{totalMatiSum}</td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="wr-notes-title">Catatan :</div>
                      {catatanItems.map((item, idx) => (
                        <div className="wr-note" key={idx}>
                          <span className="wr-note-no">{idx + 1}.</span>
                          <span>{item === '-' ? '–' : item}</span>
                        </div>
                      ))}

                      <div className="wr-sign">
                        <div>Mengetahui,</div>
                        <div>{jabatanLine}</div>
                        <div className="wr-sign-space">
                          <span className="wr-sign-hint wr-noprint">( Tanda Tangan Digital )</span>
                        </div>
                        <div className="wr-sign-name">{namaMengetahui}</div>
                      </div>
                    </div>

                    <div className="wr-footer"><img src={footerTte} alt="Dokumen ini telah ditandatangani secara elektronik" /></div>
                  </section>

                  {/* ===== Halaman 3 dst.: lampiran dokumentasi (3 gambar per halaman) ===== */}
                  {includeDocumentation && lampiranSheets.map((group, sheetIdx) => (
                    <section className="wr-sheet" key={sheetIdx}>
                      <div className="wr-flow wr-flow-3">
                        {sheetIdx === 0 && (
                          <div className="wr-lamp-title">LAMPIRAN. MONITORING ALOPTAMA</div>
                        )}
                        {group.map((item) => (
                          <div className="wr-lamp-item" key={item.key}>
                            <div className="wr-lamp-head">{item.title}</div>
                            {item.src ? (
                              <img className="wr-lamp-img" src={item.src} alt={item.title} />
                            ) : (
                              <div className="wr-lamp-empty">(Belum Diunggah)</div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="wr-footer"><img src={footerTte} alt="Dokumen ini telah ditandatangani secara elektronik" /></div>
                    </section>
                  ))}

                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};