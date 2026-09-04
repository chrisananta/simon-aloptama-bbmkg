import React, { useState, useMemo } from 'react';
import { X, Printer, Filter } from 'lucide-react';
import { GensetRecord } from '../../shared/types';
import { getTodayIsoWIT } from '../../shared/utils/dateUtils';
import bmkgLogo from '../../assets/images/BMKGLogo.png';

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

  const handlePrint = () => {
    const printContent = document.getElementById('genset-report-printable');
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { window.print(); return; }
    printWindow.document.write(`
      <html><head><title>Laporan Rekapitulasi Genset BMKG</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 20px; font-family: ui-sans-serif, system-ui, sans-serif; background: #f1f5f9; }
        .page { background: white; padding: 12mm; max-width: 297mm; margin: auto; }
        @media print {
          body { padding: 0; background: white; }
          .page { padding: 0; max-width: none; margin: 0; box-shadow: none; }
        }
      </style></head><body><div class="page">${printContent.innerHTML}</div>
      <script>window.onload = function() { setTimeout(window.print, 500); }</script></body></html>
    `);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 animate-fade-in overflow-y-auto">
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
          <button onClick={handlePrint} className="sm:ml-auto w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[#0052CC] hover:bg-blue-800 text-white rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer">
            <Printer size={15}/> Cetak / Export PDF
          </button>
        </div>

        {/* Area Dokumen Cetak */}
        <div className="p-2 sm:p-6 overflow-y-auto flex-1 bg-slate-100">
          <p className="sm:hidden text-center text-[10px] font-semibold text-slate-500 mb-2">
            ↔ Geser dokumen ke samping untuk melihat tabel lengkap
          </p>
          <div className="overflow-x-auto rounded-lg">
          <div id="genset-report-printable" className="bg-white p-4 sm:p-8 border border-slate-300 shadow-sm mx-auto text-black min-w-[680px] sm:min-w-0">
            
            {/* Kop Surat Resmi BMKG */}
            <div className="border-b-4 border-slate-900 pb-3 mb-6 relative">
              <div className="flex items-center gap-4">
                <img 
                  src={bmkgLogo} 
                  alt="Logo BMKG" 
                  className="w-12 h-16 sm:w-16 sm:h-20 object-contain shrink-0"
                />
                <div className="text-center flex-1">
                  <h1 className="font-extrabold text-xs sm:text-base tracking-wide uppercase text-black">
                    BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA
                  </h1>
                  <h2 className="font-bold text-[11px] sm:text-sm tracking-wide uppercase text-black mt-0.5">
                    BALAI BESAR METEOROLOGI, KLIMATOLOGI DAN GEOFISIKA WILAYAH V
                  </h2>
                  <p className="text-[9px] sm:text-[10px] text-slate-800 font-medium mt-1">
                    Jl. Raya Abepura Entrop – Jayapura, Telp: (0967) 5165442, Kode Pos 99224
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-slate-800 font-medium">
                    Email: <span className="text-blue-800 underline">bbmkg5@bmkg.go.id</span> Website: <span className="text-blue-800 underline">bbmkg5.bmkg.go.id</span>
                  </p>
                </div>
              </div>
              <div className="border-b border-slate-900 mt-2" />
            </div>
            
            <h3 className="text-center font-black text-xs sm:text-sm uppercase mb-4 tracking-wide">
              LAPORAN REKAPITULASI PEMELIHARAAN &amp; MONITORING GENSET
            </h3>
            
            {/* Kotak Informasi dengan Tanda : Rapi & Sejajar */}
            <div className="mb-4 text-[11px] sm:text-xs font-bold bg-slate-50 p-3 border border-black/20 rounded-md">
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
                <tr className="bg-slate-100 font-bold border-b border-black text-center">
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
                    <td className="p-2 border border-black leading-tight">
                      {r.catatan || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Tanda Tangan & Footer TTE (tetap satu halaman, tidak terpisah saat cetak) */}
            <div className="mt-8 break-inside-avoid">
              <div className="flex justify-end">
                <div className="text-center text-xs font-bold space-y-1 min-w-[200px]">
                  <p>Jayapura, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p>Mengetahui,</p>
                  <p className="text-[10px] font-bold">Ketua Tim Kerja Instrumentasi dan Kalibrasi</p>
                  <div className="h-16 flex items-center justify-center italic text-slate-300 text-[10px]">
                    ( Tanda Tangan Digital )
                  </div>
                  <p className="underline font-black">Yessi Veronika Marpaung, S.Tr</p>
                </div>
              </div>

              {/* Footer TTE */}
              <div className="mt-6 text-center">
                <div className="border-t-[3px] border-black" />
                <div className="border-t border-black mt-[3px] mb-3" />
                <p className="text-[10px] sm:text-[11px] font-bold italic text-black leading-snug">
                  Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang<br className="hidden sm:block" /> diterbitkan oleh Balai Sertifikasi Elektronik (BSrE), Badan Siber dan Sandi Negara
                </p>
              </div>
            </div>

          </div>
          </div>
        </div>
      </div>
    </div>
  );
};