import React, { useState, useMemo } from 'react';
import { X, Download, Loader2, Filter } from 'lucide-react';
import { GensetRecord } from '../../shared/types';
import { getTodayIsoWIT } from '../../shared/utils/dateUtils';
import bmkgLogo from '../../assets/images/BMKGLogo.png';
import footerTte from '../../assets/images/FooterTTE.png';
import { downloadFlowAsPdf } from '../../shared/print/downloadPagesAsPdf';

export const GensetReportModal: React.FC<{ isOpen: boolean; onClose: () => void; records: GensetRecord[] }> = ({
  isOpen,
  onClose,
  records,
}) => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(getTodayIsoWIT());
  const [selectedPetugas, setSelectedPetugas] = useState('ALL');

  // Daftar unik seluruh petugas dari master/riwayat
  const petugasOptions = useMemo(() => {
    const setP = new Set<string>();
    records.forEach(r => {
      if (Array.isArray(r.petugasList)) {
        r.petugasList.forEach(p => p && setP.add(p));
      } else if (r.petugas) {
        r.petugas.split(',').forEach(p => p.trim() && setP.add(p.trim()));
      }
    });
    return Array.from(setP).sort();
  }, [records]);

  // Filter berdasarkan Tanggal & Petugas
  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchDate = r.tanggal >= startDate && r.tanggal <= endDate;
      
      let matchPetugas = selectedPetugas === 'ALL';
      if (!matchPetugas) {
        if (Array.isArray(r.petugasList)) {
          matchPetugas = r.petugasList.includes(selectedPetugas);
        } else if (r.petugas) {
          matchPetugas = r.petugas.includes(selectedPetugas);
        }
      }

      return matchDate && matchPetugas;
    }).sort((a,b) => a.tanggal.localeCompare(b.tanggal));
  }, [records, startDate, endDate, selectedPetugas]);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  /** Unduh PDF langsung (tanpa dialog cetak). Footer TTE diulang di bawah tiap halaman. */
  const handleDownload = async () => {
    const element = document.getElementById('genset-report-printable');
    if (!element || isDownloading) return;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await downloadFlowAsPdf({
        element,
        filename: 'Laporan Rekapitulasi Genset BMKG.pdf',
        orientation: 'landscape',
        marginMm: 10,
        cloneCss: 'width:100%;min-width:0;max-width:none;padding:0;margin:0;border:none;box-shadow:none;--gr-pad:0px;',
        footerSelector: '.tte-footer',
        headerSelector: '.gr-kop-wrap',
      });
    } catch (err) {
      console.error('Gagal membuat PDF:', err);
      setDownloadError('Gagal membuat PDF. Coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 animate-fade-in overflow-y-auto">
      <style>{`
        .gr-kop-wrap { width: 100%; background: #fff; }
        .gr-kop { position: relative; width: 100%; height: 35.3mm; box-sizing: border-box; background: #d0d0d0; border-bottom: 0.8mm solid #000; color: #000; font-family: Arial, "Liberation Sans", Helvetica, sans-serif; }
        .gr-kop-rule { width: 100%; height: 0; margin-top: 0.8mm; border-top: 0.25mm solid #000; }
        .gr-kop-logo { position: absolute; left: 7.3mm; top: 4.2mm; width: 25.4mm; height: 25.2mm; object-fit: contain; }
        .gr-kop-text { position: absolute; left: 32.7mm; right: 7mm; top: 5.9mm; text-align: center; font-weight: bold; }
        .gr-kop-1 { font-size: 16pt; line-height: 7mm; }
        .gr-kop-2 { font-size: 13pt; line-height: 6mm; }
        .gr-kop-3 { font-size: 12pt; line-height: 5.6mm; }
        .gr-link { color: #0563c1; text-decoration: underline; }
        .gr-inner { padding: 8mm var(--gr-pad, 2rem) 2rem; }
        .tte-footer { width: 159.2mm; max-width: 100%; height: 8.9mm; margin-left: auto; margin-right: auto; }
        .tte-footer img { display: block; width: 100%; height: 100%; }
      `}</style>
      <div className="bg-white rounded-2xl w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden shadow-2xl my-auto">
        
        {/* Header Modal */}
        <div className="bg-[#0A203C] text-white p-3 sm:p-4 flex justify-between items-center shrink-0 gap-2">
          <h3 className="font-bold text-xs sm:text-base leading-snug">Laporan Rekapitulasi Pemeliharaan Genset</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg text-slate-300 hover:text-white cursor-pointer shrink-0"><X size={18}/></button>
        </div>
        
        {/* Toolbar Filter */}
        <div className="p-3 sm:p-3.5 bg-slate-50 border-b flex flex-col sm:flex-row gap-2.5 sm:gap-3 sm:items-center sm:flex-wrap text-xs font-bold text-slate-700 shrink-0">
          <div className="hidden sm:flex items-center text-[#0052CC]">
            <Filter size={15} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-14 shrink-0 sm:w-auto">Dari:</span>
            <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="flex-1 sm:flex-none p-2 sm:p-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0052CC] text-xs" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-14 shrink-0 sm:w-auto">Sampai:</span>
            <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="flex-1 sm:flex-none p-2 sm:p-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0052CC] text-xs" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-14 shrink-0 sm:w-auto">Petugas:</span>
            <select value={selectedPetugas} onChange={e=>setSelectedPetugas(e.target.value)} className="flex-1 sm:flex-none p-2 sm:p-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-[#0052CC] cursor-pointer text-xs">
              <option value="ALL">Semua Petugas ({petugasOptions.length})</option>
              {petugasOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {downloadError && <span className="sm:ml-auto text-[11px] font-semibold text-rose-600">{downloadError}</span>}
          <button onClick={handleDownload} disabled={isDownloading} className={`${downloadError ? '' : 'sm:ml-auto '}w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[#0052CC] hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer`}>
            {isDownloading ? <Loader2 size={15} className="animate-spin"/> : <Download size={15}/>} {isDownloading ? 'Membuat PDF...' : 'Unduh PDF'}
          </button>
        </div>

        {/* Area Dokumen Cetak */}
        <div className="p-2 sm:p-6 overflow-y-auto flex-1 bg-slate-100">
          <p className="sm:hidden text-center text-[10px] font-semibold text-slate-500 mb-2">
            ↔ Geser dokumen ke samping untuk melihat tabel lengkap
          </p>
          <div className="overflow-x-auto rounded-lg">
          <div id="genset-report-printable" className="bg-white border border-slate-300 shadow-sm mx-auto text-black min-w-[680px] sm:min-w-0">
            
            {/* Kop Surat Resmi BMKG (sama dengan Laporan Rekapitulasi Kalibrasi) */}
            <div className="gr-kop-wrap">
            <header className="gr-kop">
              <img className="gr-kop-logo" src={bmkgLogo} alt="Logo BMKG" />
              <div className="gr-kop-text">
                <div className="gr-kop-1">BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA</div>
                <div className="gr-kop-2">BALAI BESAR METEOROLOGI, KLIMATOLOGI DAN GEOFISIKA WILAYAH V</div>
                <div className="gr-kop-3">Jl. Raya Abepura Entrop - Jayapura, Telp : (0967) 5165442, Kode Pos 99224</div>
                <div className="gr-kop-3">
                  Email : <span className="gr-link">bbmkg5@bmkg.go.id</span> Website : <span className="gr-link">bbmkg5.bmkg.go.id</span>
                </div>
              </div>
            </header>
            <div className="gr-kop-rule" />
            </div>

            <div className="gr-inner">
            <h3 className="text-center font-black text-xs sm:text-sm uppercase mb-4 tracking-wide">
              LAPORAN REKAPITULASI PEMELIHARAAN &amp; MONITORING GENSET
            </h3>
            
            {/* Kotak Informasi dengan Tanda : Rapi & Sejajar */}
            <div className="mb-4 text-[11px] sm:text-xs font-bold bg-white p-3 border border-black/20 rounded-md">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                <div className="space-y-1 flex-1">
                  <div className="flex items-start">
                    <span className="w-44 shrink-0">Periode Pemantauan</span>
                    <span className="w-3 text-center shrink-0">:</span>
                    <span className="flex-1">{startDate} s/d {endDate}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-44 shrink-0">Petugas Terkait</span>
                    <span className="w-3 text-center shrink-0">:</span>
                    <span className="flex-1">{selectedPetugas === 'ALL' ? 'Seluruh Personel Inskal' : selectedPetugas}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-44 shrink-0">Total Kegiatan Terdata</span>
                    <span className="w-3 text-center shrink-0">:</span>
                    <span className="flex-1">{filtered.length} Kali Monitoring</span>
                  </div>
                </div>
                <div className="shrink-0 mt-1 sm:mt-0">
                  <div className="flex items-start sm:justify-end">
                    <span className="w-16 shrink-0 sm:text-right">Gedung</span>
                    <span className="w-3 text-center shrink-0">:</span>
                    <span className="font-bold">Gedung Operasional &amp; Administrasi</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabel Laporan */}
            <table className="w-full text-[10px] text-left border-collapse border border-black">
              <thead>
                <tr className="bg-[#c6e0b4] font-bold border-b border-black text-center">
                  <th className="p-2 border border-black w-24">Tanggal &amp; Jam</th>
                  <th className="p-2 border border-black w-24">Gedung</th>
                  <th className="p-2 border border-black">Petugas Monitoring</th>
                  <th className="p-2 border border-black w-28">Kesimpulan Kondisi</th>
                  <th className="p-2 border border-black">Catatan &amp; Temuan Pengamatan</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center italic">Tidak ada catatan data monitoring yang sesuai filter.</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="border-b border-black">
                    <td className="p-2 border border-black font-bold whitespace-nowrap text-center">
                      {r.tanggal}<br/>
                      <span className="text-[9px] font-mono text-slate-600">{r.jam}</span>
                    </td>
                    <td className="p-2 border border-black text-center font-semibold">{r.gedung}</td>
                    <td className="p-2 border border-black font-semibold">
                      {Array.isArray(r.petugasList) ? r.petugasList.join(', ') : r.petugas}
                    </td>
                    <td className="p-2 border border-black font-bold text-center">
                      <span className={r.kesimpulan === 'BAIK' ? 'text-emerald-700' : 'text-rose-700'}>
                        {r.kesimpulan}
                      </span>
                    </td>
                    <td className="p-2 border border-black leading-tight text-center align-middle">
                      {r.catatan || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Tanda Tangan & Footer TTE */}
            <div className="mt-8 break-inside-avoid">
              <div className="flex justify-end pr-2">
                <div className="w-[260px] text-center text-xs font-bold leading-tight">

                  {/* Tanggal */}
                  <div className="mb-1">
                    Jayapura, {new Date().toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>

                  {/* Mengetahui */}
                  <div className="mb-2">
                    Mengetahui,
                  </div>

                  {/* Jabatan */}
                  <div className="mb-1">
                    Ketua Tim Kerja Instrumentasi<br />
                    dan Kalibrasi
                  </div>

                  {/* Ruang tanda tangan */}
                  <div className="h-16 flex items-center justify-center italic font-normal text-[10px] text-slate-300">
                  </div>

                  {/* Nama */}
                  <div className="underline font-black whitespace-nowrap">
                    Yessi Veronika Marpaung, S.Tr
                  </div>

                </div>
              </div>
            </div>

            {/* Footer TTE (gambar sama dengan Laporan Rekapitulasi Kalibrasi) */}
            <div className="tte-footer mt-6">
              <img src={footerTte} alt="Dokumen ini telah ditandatangani secara elektronik" />
            </div>

            </div>
          </div> 
        </div>  
      </div> 
    </div>       
  </div>         
  );
};