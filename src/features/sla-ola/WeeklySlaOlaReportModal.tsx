import React, { useState, useMemo, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import printlogobmkg from '../../assets/images/BMKGLogo.png';
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
  FileImage,
  Download,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { AloptamaDevice } from '../../shared/types';
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

    return CATEGORIES.map((cat) => {
      const catDevs = devices.filter(cat.matchFn);

      let jumlahLokasi = catDevs.length;
      let sla = 0;
      let ola = 0;
      let normal = 0;
      let gangguan = 0;
      let mati = 0;

      if (catDevs.length > 0) {
        const avgSla = catDevs.reduce((sum, d) => sum + (d.slaScore ?? 0), 0) / catDevs.length;
        const avgOla = catDevs.reduce((sum, d) => sum + (d.olaScore ?? 0), 0) / catDevs.length;
        sla = Number(avgSla.toFixed(1));
        ola = Number(avgOla.toFixed(1));
        sla = Math.min(100, Math.max(0, sla));
        ola = Math.min(100, Math.max(0, ola));

        normal = catDevs.filter(d => d.conditionStatus === 'NORMAL').length;
        gangguan = catDevs.filter(d => d.conditionStatus === 'GANGGUAN').length;
        mati = catDevs.filter(d => d.conditionStatus === 'MATI').length;
      }

      return {
        no: cat.no,
        name: cat.name,
        jumlahLokasi,
        sla,
        ola,
        normal,
        gangguan,
        mati
      };
    });
  }, [devices]);

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
  const totalMatiSum = useMemo(() => rekapData.reduce((acc, curr) => acc + curr.mati, 0), [rekapData]);

  const percentNormal = useMemo(() => totalLokasiSum > 0 ? ((totalNormalSum / totalLokasiSum) * 100).toFixed(2) : '0', [totalNormalSum, totalLokasiSum]);
  const percentGangguan = useMemo(() => totalLokasiSum > 0 ? ((totalGangguanSum / totalLokasiSum) * 100).toFixed(2) : '0', [totalGangguanSum, totalLokasiSum]);
  const percentMati = useMemo(() => totalLokasiSum > 0 ? ((totalMatiSum / totalLokasiSum) * 100).toFixed(2) : '0', [totalMatiSum, totalLokasiSum]);

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    const element = document.getElementById('printable-report-area');
    if (!element) {
      alert('Dokumen pratinjau tidak ditemukan.');
      return;
    }

    setIsExportingPdf(true);

    try {
      const sanitizedStart = startDate.replace(/[^a-zA-Z0-9]/g, '_');
      const sanitizedEnd = endDate.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Laporan_Mingguan_SLA_OLA_BMKG_${sanitizedStart}_sd_${sanitizedEnd}.pdf`;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      // @ts-ignore
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Download PDF Error:', error);
      handleOpenPrintWindow();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleOpenPrintWindow = () => {
    const element = document.getElementById('printable-report-area');
    if (!element) return;

    const printWindow = window.open('', '_blank', 'width=950,height=1000');
    if (!printWindow) {
      window.print();
      return;
    }

    const reportHtml = element.outerHTML;
    const docTitle = `Laporan Mingguan Monitoring Aloptama BMKG (${startDate} - ${endDate})`;

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8">
          <title>${docTitle}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; padding: 0; background: white; }
              .no-print { display: none !important; }
              .page-break { page-break-before: always !important; }
              #printable-report-area {
                border: none !important;
                box-shadow: none !important;
                padding: 10mm !important;
                width: 100% !important;
                max-width: 100% !important;
              }
            }
            body {
              background-color: #f1f5f9;
              padding: 24px;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
          </style>
        </head>
        <body>
          <div class="no-print max-w-4xl mx-auto mb-4 p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs font-bold shadow-xl">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
              <span>Dokumen Siap Dicetak atau Disimpan sebagai PDF (BMKG V Papua)</span>
            </div>
            <button onclick="window.print()" style="background:#0052CC; color:white; padding:8px 18px; border-radius:10px; border:none; cursor:pointer; font-weight:bold; display:flex; items-center; gap:6px;">
              🖨️ Cetak / Simpan PDF
            </button>
          </div>
          <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-2">
            ${reportHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 600);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-report-area, #printable-report-area * {
            visibility: visible !important;
          }
          #printable-report-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm 15mm !important;
            background: white !important;
            color: black !important;
            font-size: 11pt !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always !important;
          }
        }
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
                  Laporan BBMKG Wil. V
                </span>
              </div>
              <h2 className="text-sm sm:text-lg font-black tracking-tight text-white mt-0.5 leading-tight">
                Buat Laporan Mingguan Monitoring Aloptama
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
                <span>Input &amp; Param</span>
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
                    Periode &amp; Tanggal Monitoring
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

                <p className="text-[11px] text-slate-500 flex items-center gap-1.5 italic">
                  <Info size={13} className="text-blue-600 shrink-0" />
                  Seluruh data persentase pada tabel laporan dihitung secara otomatis sebagai rata-rata dari periode tanggal di atas.
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
                    <input
                      type="text"
                      value={jabatanMengetahui}
                      onChange={(e) => setJabatanMengetahui(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-[#0052CC] focus:bg-white"
                    />
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
                  <span>Pratinjau Hasil Cetak Laporan Mingguan. Silakan unduh PDF langsung atau cetak via jendela baru.</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isExportingPdf}
                    className="px-3.5 py-1.5 bg-[#0052CC] hover:bg-blue-800 disabled:bg-blue-400 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {isExportingPdf ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Mengunduh...</span>
                      </>
                    ) : (
                      <>
                        <Download size={14} />
                        <span>Unduh PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenPrintWindow}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>Cetak Jendela Baru</span>
                  </button>
                </div>
              </div>

              {/* Printable Wrapper */}
              <div className="w-full overflow-x-auto pb-6">
                <div 
                  id="printable-report-area"
                  className="bg-white p-6 sm:p-10 md:p-12 shadow-md border border-slate-300 min-w-[650px] max-w-4xl mx-auto text-slate-900 font-sans leading-normal text-xs"
                  style={{ minHeight: '297mm' }}
                >
                  <div className="border-b-4 border-slate-900 pb-3 mb-6 relative">
                    <div className="flex items-center gap-4">
                      <img 
                        src={printlogobmkg} 
                        alt="Logo BMKG" 
                        className="w-16 h-20 object-contain shrink-0"
                      />
                      <div className="text-center flex-1">
                        <h1 className="font-extrabold text-sm sm:text-base tracking-wide uppercase text-black">
                          BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA
                        </h1>
                        <h2 className="font-bold text-xs sm:text-sm tracking-wide uppercase text-black mt-0.5">
                          BALAI BESAR METEOROLOGI, KLIMATOLOGI DAN GEOFISIKA WILAYAH V
                        </h2>
                        <p className="text-[10px] text-slate-800 font-medium mt-1">
                          Jl. Raya Abepura Entrop - Jayapura, Telp : (0967) 5165442, Kode Pos 99224
                        </p>
                        <p className="text-[10px] text-slate-800 font-medium">
                          Email : <span className="text-blue-800 underline">bbmkg5@bmkg.go.id</span> Website : <span className="text-blue-800 underline">bbmkg5.bmkg.go.id</span>
                        </p>
                      </div>
                    </div>
                    <div className="border-b border-slate-900 mt-2" />
                  </div>

                  <div className="text-center my-6">
                    <h2 className="font-extrabold text-sm sm:text-base tracking-wide text-black uppercase">
                      LAPORAN MINGGUAN MONITORING 
                    </h2>
                    <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-black uppercase mt-0.5">
                      ALOPTAMA DI BBMKG WILAYAH V
                    </h3>
                  </div>

                  <div className="border border-black p-3 my-5 max-w-xl text-xs font-semibold text-black space-y-1">
                    <div className="flex">
                      <span className="w-36 shrink-0">Periode Pemantauan</span>
                      <span className="w-4 text-center shrink-0">:</span>
                      <span className="flex-1 font-bold">{startDate} - {endDate} ({calculatedPeriodDays} Hari / {calculatedPeriodDays * 24} Jam)</span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-36 shrink-0">Petugas Monitoring</span>
                      <span className="w-4 text-center shrink-0">:</span>
                      <div className="flex-1 space-y-0.5">
                        {petugasList.map((p, idx) => (
                          <div key={p.id}>{p.name}</div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="my-6">
                    <div className="font-extrabold text-xs uppercase mb-2 text-black">
                      <span>Rekapitulasi Kinerja Aloptama:</span>
                    </div>
                    <table className="w-full border-collapse border border-black text-center text-xs">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b border-black">
                          <th className="border border-black py-1.5 px-2 w-10">No.</th>
                          <th className="border border-black py-1.5 px-3 text-left">Peralatan</th>
                          <th className="border border-black py-1.5 px-2 w-28">Jumlah Lokasi</th>
                          <th className="border border-black py-1.5 px-2 w-24">SLA</th>
                          <th className="border border-black py-1.5 px-2 w-24">OLA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rekapData.map((row) => (
                          <tr key={row.no} className="border-b border-black font-medium">
                            <td className="border border-black py-1 px-2">{row.no}</td>
                            <td className="border border-black py-1 px-3 text-left font-bold">{row.name}</td>
                            <td className="border border-black py-1 px-2">{row.jumlahLokasi}</td>
                            <td className="border border-black py-1 px-2 font-bold">{row.sla.toFixed(1)}%</td>
                            <td className="border border-black py-1 px-2 font-bold">{row.ola.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-extrabold border-t-2 border-black">
                          <td colSpan={2} className="border border-black py-1.5 px-3 text-left uppercase">
                            TOTAL PERSENTASE
                          </td>
                          <td className="border border-black py-1.5 px-2">{totalLokasiSum}</td>
                          <td className="border border-black py-1.5 px-2">{avgSlaTotal.toFixed(1)}%</td>
                          <td className="border border-black py-1.5 px-2">{avgOlaTotal.toFixed(1)}%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="my-8">
                    <h4 className="font-extrabold text-xs uppercase mb-2 text-black">Kondisi Aloptama</h4>
                    <table className="w-full border-collapse border border-black text-center text-xs">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b border-black">
                          <th className="border border-black py-1.5 px-3 text-left">Peralatan</th>
                          <th className="border border-black py-1.5 px-2 w-32">Normal (100%)</th>
                          <th className="border border-black py-1.5 px-2 w-36">Gangguan (1-99%)</th>
                          <th className="border border-black py-1.5 px-2 w-40">Tidak Beroperasi (0%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rekapData.map((row) => (
                          <tr key={row.no} className="border-b border-black font-medium">
                            <td className="border border-black py-1 px-3 text-left font-bold">{row.name}</td>
                            <td className="border border-black py-1 px-2">{row.normal}</td>
                            <td className="border border-black py-1 px-2">{row.gangguan}</td>
                            <td className="border border-black py-1 px-2">{row.mati}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-extrabold border-t-2 border-black">
                          <td className="border border-black py-1.5 px-3 text-left uppercase">TOTAL</td>
                          <td className="border border-black py-1.5 px-2">{totalNormalSum}</td>
                          <td className="border border-black py-1.5 px-2">{totalGangguanSum}</td>
                          <td className="border border-black py-1.5 px-2">{totalMatiSum}</td>
                        </tr>
                        <tr className="bg-slate-200 font-extrabold border-t border-black">
                          <td className="border border-black py-1.5 px-3 text-left uppercase">PERSENTASE</td>
                          <td className="border border-black py-1.5 px-2">{percentNormal}%</td>
                          <td className="border border-black py-1.5 px-2">{percentGangguan}%</td>
                          <td className="border border-black py-1.5 px-2">{percentMati}%</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="my-8 pt-4 flex flex-col justify-between min-h-[160px]">
                    <div className="text-xs font-semibold text-black space-y-1">
                      <p className="font-bold">Catatan :</p>
                      <p className="pl-4">{catatanText}</p>
                    </div>

                    <div className="flex justify-end mt-8">
                      <div className="text-center min-w-[240px] text-xs font-semibold text-black space-y-1">
                        <p>Mengetahui,</p>
                        <p>{jabatanMengetahui},</p>
                        <div className="h-20 flex items-center justify-center my-1">
                          <div className="border border-slate-300 rounded px-3 py-1.5 bg-slate-50/50 text-[10px] text-slate-400 italic">
                            ( Tanda Tangan Digital )
                          </div>
                        </div>
                        <p className="font-extrabold underline text-sm">{namaMengetahui}</p>
                      </div>
                    </div>
                  </div>

                  {includeDocumentation && (
                    <div className="page-break pt-8 mt-12 border-t-2 border-dashed border-slate-300">
                      <div className="text-center mb-6">
                        <h2 className="font-extrabold text-sm sm:text-base tracking-wide text-black uppercase">
                          LAMPIRAN DOKUMENTASI MONITORING ALOPTAMA 
                        </h2>
                      </div>

                      <div className="space-y-8">
                        <div className="border border-slate-300 p-4 rounded-lg space-y-2">
                          <h3 className="font-bold text-xs text-black border-b border-slate-200 pb-1">
                            1. Monitoring AWS Center 
                          </h3>
                          {imgAwsCenter ? (
                            <div className="p-2 bg-slate-50 border border-slate-200 rounded text-center">
                              <img 
                                src={imgAwsCenter} 
                                alt="Tangkapan Layar AWS Center" 
                                className="w-full max-h-[400px] object-contain mx-auto rounded border border-slate-300 shadow-xs" 
                              />
                              <p className="text-[10px] text-slate-600 mt-1.5 font-semibold">
                                Tangkapan Layar Dashboard AWS Center BBMKG Wilayah V
                              </p>
                            </div>
                          ) : (
                            <div className="bg-slate-100 rounded p-4 text-center border border-slate-200 flex flex-col items-center justify-center min-h-[180px]">
                              <Building2 size={32} className="text-blue-600 mb-2" />
                              <p className="font-bold text-xs text-slate-800">Tangkapan Layar Dashboard AWS Center </p>
                              <p className="text-[10px] text-slate-500 mt-1">(Belum Diunggah)</p>
                            </div>
                          )}
                        </div>

                        <div className="border border-slate-300 p-4 rounded-lg space-y-2">
                          <h3 className="font-bold text-xs text-black border-b border-slate-200 pb-1">
                            2. Monitoring SLA dan OLA 
                          </h3>
                          {imgSlaOla ? (
                            <div className="p-2 bg-slate-50 border border-slate-200 rounded text-center">
                              <img 
                                src={imgSlaOla} 
                                alt="Matriks SLA dan OLA" 
                                className="w-full max-h-[400px] object-contain mx-auto rounded border border-slate-300 shadow-xs" 
                              />
                              <p className="text-[10px] text-slate-600 mt-1.5 font-semibold">
                                Tangkapan Layar Matriks SLA &amp; OLA Aloptama
                              </p>
                            </div>
                          ) : (
                            <div className="bg-slate-100 rounded p-4 text-center border border-slate-200 flex flex-col items-center justify-center min-h-[180px]">
                              <FileText size={32} className="text-indigo-600 mb-2" />
                              <p className="font-bold text-xs text-slate-800">Tangkapan Layar Rekapitulasi Web SLA dan OLA</p>
                              <p className="text-[10px] text-slate-500 mt-1">(Belum Diunggah)</p>
                            </div>
                          )}
                        </div>

                        <div className="border border-slate-300 p-4 rounded-lg space-y-2">
                          <h3 className="font-bold text-xs text-black border-b border-slate-200 pb-1">
                            3. Diseminasi Hasil Monitoring Aloptama (Grup Koordinasi Teknis)
                          </h3>
                          {imgDiseminasi ? (
                            <div className="p-2 bg-slate-50 border border-slate-200 rounded text-center">
                              <img 
                                src={imgDiseminasi} 
                                alt="Diseminasi WA" 
                                className="w-full max-h-[400px] object-contain mx-auto rounded border border-slate-300 shadow-xs" 
                              />
                              <p className="text-[10px] text-slate-600 mt-1.5 font-semibold">
                                Bukti Diseminasi Hasil Monitoring ke Grup WhatsApp UPT Lingkungan BBMKG V
                              </p>
                            </div>
                          ) : (
                            <div className="bg-slate-100 rounded p-4 text-center border border-slate-200 flex flex-col items-center justify-center min-h-[180px]">
                              <Users size={32} className="text-emerald-600 mb-2" />
                              <p className="font-bold text-xs text-slate-800">Laporan Diseminasi WhatsApp </p>
                              <p className="text-[10px] text-slate-500 mt-1">(Belum Diunggah)</p>
                            </div>
                          )}
                        </div>

                        {extraAttachments.length > 0 && (
                          <div className="space-y-6 pt-4 border-t border-slate-200">
                            {extraAttachments.map((att, idx) => (
                              <div key={att.id} className="border border-slate-300 p-4 rounded-lg space-y-2">
                                <h3 className="font-bold text-xs text-black border-b border-slate-200 pb-1">
                                  {4 + idx}. {att.title || `Lampiran Foto Tambahan #${idx + 1}`}
                                </h3>
                                {att.imageUrl ? (
                                  <div className="p-2 bg-slate-50 border border-slate-200 rounded text-center">
                                    <img 
                                      src={att.imageUrl} 
                                      alt={att.title} 
                                      className="w-full max-h-[400px] object-contain mx-auto rounded border border-slate-300 shadow-xs" 
                                    />
                                    <p className="text-[10px] text-slate-600 mt-1.5 font-semibold">
                                      {att.title}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="bg-slate-100 rounded p-4 text-center border border-slate-200 flex flex-col items-center justify-center min-h-[140px]">
                                    <FileImage size={28} className="text-slate-400 mb-2" />
                                    <p className="font-bold text-xs text-slate-700">{att.title}</p>
                                    <p className="text-[10px] text-slate-500 mt-1">(Gambar belum diunggah)</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};