import React, { useEffect, useMemo, useRef, useState } from 'react';
import printlogobmkg from '../../assets/images/BMKGLogo.png';
import { X, Printer, FileText, Eye } from 'lucide-react';
import { AloptamaDevice } from '../../shared/types';

export interface UptRekapRow {
  no: number;
  name: string;
  jumlahLokasi: number;
  sla: number;
  ola: number;
  normalCount: number;
  gangguanCount: number;
  matiCount: number;
}

interface UptSlaOlaReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: AloptamaDevice[];
  uptName: string;
  month: string;
  year: string;
  rekapRows: UptRekapRow[];
  totalLokasi: number;
  avgSla: number;
  avgOla: number;
  totalNormal: number;
  totalGangguan: number;
  totalMati: number;
}

const MONTH_INDEX_MAP: Record<string, number> = {
  Januari: 0, Februari: 1, Maret: 2, April: 3, Mei: 4, Juni: 5,
  Juli: 6, Agustus: 7, September: 8, Oktober: 9, November: 10, Desember: 11,
};

const PREVIEW_DESIGN_WIDTH_PX = 1100;
const PAGE_MARGIN_MM = 12;
const ROWS_PER_LANDSCAPE_PAGE = 20;

export const UptSlaOlaReportModal: React.FC<UptSlaOlaReportModalProps> = ({
  isOpen,
  onClose,
  devices,
  uptName,
  month,
  year,
  rekapRows,
  totalLokasi,
  avgSla,
  avgOla,
  totalNormal,
  totalGangguan,
  totalMati,
}) => {
  const [jabatanMengetahui, setJabatanMengetahui] = useState<string>('Kepala UPT');
  const [namaMengetahui, setNamaMengetahui] = useState<string>('');
  const [namaPembuat, setNamaPembuat] = useState<string>('');

  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewContentHeight, setPreviewContentHeight] = useState<number | null>(null);

  const todayLabel = useMemo(() => {
    const d = new Date();
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  const daysInMonth = useMemo(() => {
    const idx = MONTH_INDEX_MAP[month] ?? new Date().getMonth();
    return new Date(Number(year) || new Date().getFullYear(), idx + 1, 0).getDate();
  }, [month, year]);

  const dayColumns = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const sortedDevices = useMemo(
    () => [...devices].sort((a, b) => {
      const catCmp = (a.category || '').localeCompare(b.category || '');
      if (catCmp !== 0) return catCmp;
      return (a.site || '').localeCompare(b.site || '');
    }),
    [devices]
  );

  useEffect(() => {
    const measure = () => {
      const wrapperEl = previewWrapperRef.current;
      const contentEl = previewRef.current;
      if (!wrapperEl || !contentEl) return;
      const availableWidth = wrapperEl.clientWidth;
      const nextScale = availableWidth > 0 ? Math.min(1, availableWidth / PREVIEW_DESIGN_WIDTH_PX) : 1;
      setPreviewScale(nextScale);
      setPreviewContentHeight(contentEl.scrollHeight);
    };
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [rekapRows, sortedDevices.length, dayColumns.length, isOpen]);

  const deviceChunks = useMemo(() => {
    if (sortedDevices.length === 0) return [[] as AloptamaDevice[]];
    const chunks: AloptamaDevice[][] = [];
    for (let i = 0; i < sortedDevices.length; i += ROWS_PER_LANDSCAPE_PAGE) {
      chunks.push(sortedDevices.slice(i, i + ROWS_PER_LANDSCAPE_PAGE));
    }
    return chunks;
  }, [sortedDevices]);

  const renderLampiranTable = (chunk: AloptamaDevice[], startIndex: number) => (
    <table className="w-full border border-black text-[9px] border-collapse">
      <thead>
        <tr className="bg-slate-100 font-bold uppercase text-center">
          <th className="border border-black py-1 px-1 w-6">NO</th>
          <th className="border border-black py-1 px-1.5 text-left w-[140px]">NAMA ALAT</th>
          <th className="border border-black py-1 px-1 w-[90px] text-left">KATEGORI</th>
          {dayColumns.map((d) => (
            <th key={d} className="border border-black py-1 px-0.5 text-center">{d}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {chunk.map((dev, idx) => (
          <tr key={dev.devicesId || idx}>
            <td className="border border-black py-1 px-1 text-center font-semibold">{startIndex + idx + 1}</td>
            <td className="border border-black py-1 px-1.5 font-semibold">{dev.site}</td>
            <td className="border border-black py-1 px-1">{dev.category}</td>
            {dayColumns.map((d) => (
              <td key={d} className="border border-black py-1 px-0.5">&nbsp;</td>
            ))}
          </tr>
        ))}
        {chunk.length === 0 && (
          <tr>
            <td colSpan={3 + dayColumns.length} className="border border-black py-3 text-center text-slate-400">
              Tidak ada alat pada UPT ini.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const handleOpenPrintWindow = () => {
    const element = document.getElementById('upt-printable-report-area');
    if (!element) return;

    const printWindow = window.open('', '_blank', 'width=1100,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const reportHtml = element.outerHTML;
    const docTitle = `Laporan Kinerja Aloptama - ${uptName} (${month} ${year})`;

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8">
          <title>${docTitle}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              margin: ${PAGE_MARGIN_MM}mm;
            }
            @page page-portrait {
              size: A4 portrait;
            }
            @page page-landscape {
              size: A4 landscape;
            }

            .page-portrait {
              page: page-portrait;
            }
            .page-landscape {
              page: page-landscape;
              break-before: page;
            }

            /* Kompatibilitas Ekspor MS Word */
            @page SectionLandscape {
              size: 297mm 210mm;
              mso-page-orientation: landscape;
              margin: ${PAGE_MARGIN_MM}mm;
            }
            div.SectionLandscape {
              page: SectionLandscape;
            }

            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; background: #f1f5f9; font-family: ui-sans-serif, system-ui, sans-serif; }
            .print-container { background: white; margin: 0 auto; }
            table { border-collapse: collapse; }
            #upt-printable-report-area { transform: none !important; width: auto !important; }

            @media print {
              body { padding: 0; background: white; }
              .no-print { display: none !important; }
              .print-container { padding: 0; margin: 0; box-shadow: none; }
              .page-portrait, .page-landscape {
                min-height: auto !important;
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 auto !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print max-w-5xl mx-auto my-4 p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs font-bold shadow-xl">
            <div class="flex items-center gap-2">
              <span>Dokumen Siap Cetak.</span>
            </div>
            <button onclick="window.print()" style="background:#0052CC; color:white; padding:8px 18px; border-radius:10px; border:none; cursor:pointer; font-weight:bold;">
              Cetak / Simpan PDF
            </button>
          </div>
          <div class="print-container">${reportHtml}</div>
          <script>
            window.onload = function () {
              setTimeout(function () { window.print(); }, 600);
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
        @page {
          margin: ${PAGE_MARGIN_MM}mm;
        }
        @page page-portrait {
          size: A4 portrait;
        }
        @page page-landscape {
          size: A4 landscape;
        }

        .page-portrait {
          page: page-portrait;
        }
        .page-landscape {
          page: page-landscape;
          break-before: page;
        }

        @media print {
          body * { visibility: hidden !important; }
          #upt-printable-report-area, #upt-printable-report-area * { visibility: visible !important; }
          #upt-printable-report-area {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; margin: 0 !important; background: white !important;
            color: black !important; box-shadow: none !important; border: none !important;
            transform: none !important;
          }
          .page-portrait, .page-landscape {
            min-height: auto !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 auto !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl my-auto overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[92vh]">

        {/* Header Modal */}
        <div className="no-print bg-slate-900 text-white p-3.5 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-black tracking-tight text-white mt-0.5 leading-tight">
                Laporan Kinerja Aloptama — {uptName}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">{month} {year}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Modal */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 bg-slate-50/50">
          <div className="no-print bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs mb-4 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Jabatan Mengetahui</label>
              <input
                type="text"
                value={jabatanMengetahui}
                onChange={(e) => setJabatanMengetahui(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-[#0052CC] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama yang Mengetahui</label>
              <input
                type="text"
                value={namaMengetahui}
                onChange={(e) => setNamaMengetahui(e.target.value)}
                placeholder="Nama Kepala UPT"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-[#0052CC] focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Dibuat Oleh (Teknisi UPT)</label>
              <input
                type="text"
                value={namaPembuat}
                onChange={(e) => setNamaPembuat(e.target.value)}
                placeholder="Nama Teknisi"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-[#0052CC] focus:bg-white"
              />
            </div>
          </div>

          <div className="no-print mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-blue-900 font-medium max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <Eye size={18} className="text-[#0052CC] shrink-0" />
              <span>Preview Dokumen.</span>
            </div>
            <button
              type="button"
              onClick={handleOpenPrintWindow}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>

          {/* Printable Report Area */}
          <div
            ref={previewWrapperRef}
            className="w-full overflow-hidden"
            style={{ height: previewContentHeight ? previewContentHeight * previewScale : undefined }}
          >
            <div
              ref={previewRef}
              id="upt-printable-report-area"
              style={{
                width: `${PREVIEW_DESIGN_WIDTH_PX}px`,
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
              }}
              className="w-full"
            >
              {/* HALAMAN 1 — PORTRAIT */}
              <div className="page-portrait bg-white p-6 sm:p-10 shadow-md border border-slate-300 max-w-4xl mx-auto text-slate-900 font-sans leading-normal text-xs mb-8 print:mb-0">
                <div className="border-b-4 border-slate-900 pb-3 mb-6">
                  <div className="flex items-center gap-4">
                    <img src={printlogobmkg} alt="Logo BMKG" className="w-16 h-20 object-contain shrink-0" />
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
                    </div>
                  </div>
                  <div className="border-b border-slate-900 mt-2" />
                </div>

                <div className="text-center my-6">
                  <h2 className="font-extrabold text-sm sm:text-base tracking-wide text-black uppercase">
                    REKAPITULASI KINERJA ALOPTAMA
                  </h2>
                  <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-black uppercase mt-0.5">
                    {uptName}
                  </h3>
                </div>

                <div className="border border-black p-3 my-5 max-w-xl text-xs font-semibold text-black space-y-1">
                  <div className="flex">
                    <span className="w-40 shrink-0">Stasiun UPT</span>
                    <span className="w-4 text-center shrink-0">:</span>
                    <span className="flex-1 font-bold">{uptName}</span>
                  </div>
                  <div className="flex">
                    <span className="w-40 shrink-0">Periode Laporan</span>
                    <span className="w-4 text-center shrink-0">:</span>
                    <span className="flex-1 font-bold">{month} {year}</span>
                  </div>
                  <div className="flex">
                    <span className="w-40 shrink-0">Jumlah Aloptama</span>
                    <span className="w-4 text-center shrink-0">:</span>
                    <span className="flex-1 font-bold">{totalLokasi} Unit</span>
                  </div>
                  <div className="flex">
                    <span className="w-40 shrink-0">Tanggal Laporan</span>
                    <span className="w-4 text-center shrink-0">:</span>
                    <span className="flex-1 font-bold">{todayLabel}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 my-5 max-w-xl">
                  <div className="border border-black rounded p-2 text-center">
                    <p className="text-[9px] font-bold uppercase text-slate-600">SLA Bulanan</p>
                    <p className="text-lg font-black">{avgSla.toFixed(1)}%</p>
                  </div>
                  <div className="border border-black rounded p-2 text-center">
                    <p className="text-[9px] font-bold uppercase text-slate-600">OLA Bulanan</p>
                    <p className="text-lg font-black">{avgOla.toFixed(1)}%</p>
                  </div>
                  <div className="border border-black rounded p-2 text-center">
                    <p className="text-[9px] font-bold uppercase text-slate-600">Normal / Total</p>
                    <p className="text-lg font-black">{totalNormal}/{totalLokasi}</p>
                  </div>
                </div>

                <table className="w-full border border-black text-[10.5px] mb-6 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold uppercase text-center">
                      <th className="border border-black py-1.5 px-1 w-8">NO</th>
                      <th className="border border-black py-1.5 px-2 text-left">PERALATAN</th>
                      <th className="border border-black py-1.5 px-1 w-20">JUMLAH LOKASI</th>
                      <th className="border border-black py-1.5 px-1 w-16">SLA</th>
                      <th className="border border-black py-1.5 px-1 w-16">OLA</th>
                      <th className="border border-black py-1.5 px-1 w-20">NORMAL</th>
                      <th className="border border-black py-1.5 px-1 w-20">GANGGUAN</th>
                      <th className="border border-black py-1.5 px-1 w-24">TIDAK BEROPERASI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekapRows.map((row) => (
                      <tr key={row.no} className="text-center">
                        <td className="border border-black py-1 px-1 font-bold">{row.no}</td>
                        <td className="border border-black py-1 px-2 text-left font-semibold">{row.name}</td>
                        <td className="border border-black py-1 px-1 font-bold">{row.jumlahLokasi}</td>
                        <td className="border border-black py-1 px-1 font-bold">{row.sla.toFixed(1)}%</td>
                        <td className="border border-black py-1 px-1 font-bold">{row.ola.toFixed(1)}%</td>
                        <td className="border border-black py-1 px-1 font-bold">{row.normalCount}</td>
                        <td className="border border-black py-1 px-1 font-bold">{row.gangguanCount}</td>
                        <td className="border border-black py-1 px-1 font-bold">{row.matiCount}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-extrabold text-center border-t-2 border-black">
                      <td colSpan={2} className="border border-black py-1.5 px-2 text-left uppercase">TOTAL</td>
                      <td className="border border-black py-1.5 px-1">{totalLokasi}</td>
                      <td className="border border-black py-1.5 px-1">{avgSla.toFixed(1)}%</td>
                      <td className="border border-black py-1.5 px-1">{avgOla.toFixed(1)}%</td>
                      <td className="border border-black py-1.5 px-1">{totalNormal}</td>
                      <td className="border border-black py-1.5 px-1">{totalGangguan}</td>
                      <td className="border border-black py-1.5 px-1">{totalMati}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="flex justify-end mt-10">
                  <div className="text-center min-w-[240px] text-xs font-semibold text-black space-y-1">
                    <p>Mengetahui,</p>
                    <p>{jabatanMengetahui}</p>
                    <div className="h-20" />
                    <p className="font-extrabold underline text-sm">{namaMengetahui || '(...........................)'}</p>
                  </div>
                </div>
              </div>

              {/* HALAMAN 2 DST — LANDSCAPE */}
              {deviceChunks.map((chunk, chunkIdx) => {
                const startIndex = chunkIdx * ROWS_PER_LANDSCAPE_PAGE;
                const isFirst = chunkIdx === 0;
                const isLastChunk = chunkIdx === deviceChunks.length - 1;

                return (
                  <div
                    key={chunkIdx}
                    className="page-landscape SectionLandscape bg-white p-6 sm:p-8 shadow-md border border-slate-300 w-full max-w-[297mm] mx-auto text-slate-900 font-sans leading-normal text-xs"
                  >
                    {isFirst && (
                      <div className="text-center mb-4">
                        <h2 className="font-extrabold text-base tracking-wide text-black uppercase">
                          LAMPIRAN — TABEL PENGISIAN SLA &amp; OLA HARIAN
                        </h2>
                        <h3 className="font-bold text-xs sm:text-sm tracking-wide text-black uppercase mt-0.5">
                          {uptName} — {month} {year}
                        </h3>
                      </div>
                    )}

                    {renderLampiranTable(chunk, startIndex)}

                    {isLastChunk && (
                      <div className="flex justify-between mt-8 max-w-4xl mx-auto">
                        <div className="text-center min-w-[180px] text-xs font-semibold text-black space-y-1">
                          <p>Diisi Oleh,</p>
                          <p>Teknisi UPT</p>
                          <div className="h-14" />
                          <p className="font-extrabold underline text-sm">{namaPembuat || '(...........................)'}</p>
                        </div>
                        <div className="text-center min-w-[180px] text-xs font-semibold text-black space-y-1">
                          <p>Diperiksa Oleh,</p>
                          <p>{jabatanMengetahui}</p>
                          <div className="h-14" />
                          <p className="font-extrabold underline text-sm">{namaMengetahui || '(...........................)'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};