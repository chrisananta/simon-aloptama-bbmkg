import React from 'react';
import { X, Printer } from 'lucide-react';
import { PerbaikanRecord } from '../../shared/types';
import bmkgLogo from '../../assets/images/BMKGLogo.png';

export const PerbaikanPrintModal: React.FC<{ isOpen: boolean; onClose: () => void; record: PerbaikanRecord | null }> = ({
  isOpen,
  onClose,
  record,
}) => {
  if (!isOpen || !record) return null;

  const isForm11 = record.formType === 'FORM_1_1';

  const handlePrint = () => {
    const printContent = document.getElementById('perbaikan-printable');
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { window.print(); return; }
    printWindow.document.write(`
      <html><head><title>Form Laporan ${record.namaAlat}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @media print { body { padding: 0; background: white; } .page-break { page-break-before: always; } }
        body { padding: 20px; font-family: ui-sans-serif, system-ui, sans-serif; background: #f1f5f9; }
        .page { background: white; padding: 30px; border-radius: 8px; max-width: 900px; margin: auto; }
      </style></head><body><div class="page">${printContent.innerHTML}</div>
      <script>window.onload = function() { setTimeout(window.print, 500); }</script></body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden shadow-2xl my-auto">
        <div className="bg-[#0A203C] text-white p-4 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-sm sm:text-base">Pratinjau Dokumen PDF Resmi</h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="px-3 py-1.5 bg-[#0052CC] text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer">
              <Printer size={15}/> Cetak PDF
            </button>
            <button onClick={onClose} className="p-1 text-slate-300 hover:text-white"><X size={18}/></button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 text-black text-xs">
          <div id="perbaikan-printable" className="bg-white p-8 border border-slate-300 shadow-sm mx-auto">
            
            {/* HALAMAN 1: FORM UTAMA */}
            <div className="border border-black p-4 space-y-3">
              
              {/* Header Box */}
              <div className="flex border-b-2 border-black pb-2 items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={bmkgLogo} alt="BMKG" className="w-12 h-14 object-contain" />
                  <div>
                    <h2 className="font-extrabold text-[11px] uppercase">BALAI BESAR METEOROLOGI KLIMATOLOGI DAN GEOFISIKA</h2>
                    <h3 className="font-bold text-[10px] uppercase">WILAYAH V JAYAPURA</h3>
                    <p className="text-[9px] font-bold">SUB BIDANG INSTRUMENTASI DAN KALIBRASI</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="border border-black px-2 py-0.5 text-[9px] font-bold">
                    {isForm11 ? 'Form 1.1 Peralatan MKG' : 'Form 1.2 Peralatan Penunjang Operasional'} [source: 1]
                  </span>
                  <p className="text-[9px] font-semibold mt-1">Halaman 1 dari {record.fotoLampiran && record.fotoLampiran.length > 0 ? '2' : '1'}</p> [source: 1]
                </div>
              </div>

              {/* Title & Type Checkboxes */}
              <div className="text-center font-bold uppercase text-xs py-1 border-b border-black">
                Laporan {isForm11 ? 'Peralatan Meteorologi Klimatologi dan Geofisika' : 'Peralatan Penunjang Operasional MKG'} [source: 1]
              </div>

              {/* Checkboxes jenis laporan */}
              <div className="grid grid-cols-2 gap-1 text-[10px] font-semibold border-b border-black pb-2">
                {['Perbaikan', 'Instalasi', 'Pengecekan Fungsi Alat', 'Pengujian Setelah Perbaikan'].map(item => (
                  <div key={item} className="flex items-center gap-1.5">
                    <span>{record.jenisLaporan.includes(item) ? '☑' : '☐'}</span> [source: 1]
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Table Data Identitas */}
              <table className="w-full border-collapse text-[10px] border border-black">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="p-1.5 border-r border-black font-bold w-28">Nama Alat</td>
                    <td className="p-1.5 border-r border-black">{record.namaAlat}</td>
                    <td className="p-1.5 border-r border-black font-bold w-28">Jenis Peralatan</td>
                    <td className="p-1.5">{record.jenisPeralatan}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-1.5 border-r border-black font-bold">Merk</td>
                    <td className="p-1.5 border-r border-black">{record.merk}</td>
                    {isForm11 && (
                      <>
                        <td className="p-1.5 border-r border-black font-bold">Kategori</td>
                        <td className="p-1.5">{record.kategoriPeralatan || '-'}</td>
                      </>
                    )}
                  </tr>
                  <tr className="border-b border-black">
                    <td className="p-1.5 border-r border-black font-bold">Type/SN</td>
                    <td className="p-1.5 border-r border-black">{record.typeSn}</td>
                    <td className="p-1.5 border-r border-black font-bold">**Lokasi Alat</td>
                    <td className="p-1.5">{record.lokasiAlat}</td>
                  </tr>
                </tbody>
              </table>

              {/* Akar Penyebab */}
              <div className="border border-black p-2 space-y-1">
                <span className="font-bold block text-[10px]">Akar Penyebab / Kerusakan/Permasalahan / Kondisi Awal Peralatan:</span> [source: 1]
                <p className="text-[10px] leading-tight min-h-[30px]">{record.akarPenyebab}</p>
              </div>

              {/* Analisis */}
              <div className="border border-black p-2 space-y-1">
                <span className="font-bold block text-[10px]">Analisis Terhadap Kerusakan atau Permasalahan: (jika ada)</span> [source: 1]
                <p className="text-[10px] leading-tight min-h-[30px]">{record.analisisKerusakan || '-'}</p>
              </div>

              {/* Rekomendasi */}
              <div className="border border-black p-2 space-y-1">
                <span className="font-bold block text-[10px]">Rekomendasi:</span> [source: 1]
                <p className="text-[10px] leading-tight min-h-[30px]">{record.rekomendasi}</p>
              </div>

              {/* Status Kondisi & Tanggal */}
              <div className="border border-black p-2 space-y-1.5 text-[10px]">
                <span className="font-bold block">Kondisi alat yang telah dilakukan pengecekan</span> [source: 1]
                <div className="space-y-0.5">
                  <div>{record.kondisiAlat === 'LAYAK_NORMAL' ? '☑' : '☐'} Layak dan semua fungsi normal</div> [source: 1]
                  <div>{record.kondisiAlat === 'LAYAK_SEBAGIAN' ? '☑' : '☐'} Layak dan ada beberapa fungsi tidak normal</div> [source: 1]
                  <div>{record.kondisiAlat === 'LAYAK_MODIFIKASI' ? '☑' : '☐'} Layak dan beroperasi setelah dilakukan modifikasi</div> [source: 1]
                  <div>{record.kondisiAlat === 'TIDAK_LAYAK' ? '☑' : '☐'} Tidak Layak dioperasikan</div> [source: 1]
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-slate-300">
                  <span>Tanggal: {record.tanggal}</span> [source: 1]
                  <span>Persentase fungsi kerja alat: {record.persentaseFungsi}%</span> [source: 1]
                </div>
              </div>

              {/* Tanda Tangan Teknisi & Subkor */}
              <div className="border border-black p-2 pt-1 text-[10px]">
                <p className="font-bold text-center mb-1">Kolom Paraf dan Tanda Tangan Teknisi Yang Melakukan</p> [source: 1]
                <div className="grid grid-cols-4 text-center border border-black min-h-[75px]">
                  <div className="border-r border-black p-1 flex flex-col justify-between">
                    <span className="font-bold">Teknisi I</span> [source: 1]
                    <span className="underline font-bold mt-8">{record.teknisiList[0] || '-'}</span>
                  </div>
                  <div className="border-r border-black p-1 flex flex-col justify-between">
                    <span className="font-bold">Teknisi II</span> [source: 1]
                    <span className="underline font-bold mt-8">{record.teknisiList[1] || '-'}</span>
                  </div>
                  <div className="border-r border-black p-1 flex flex-col justify-between">
                    <span className="font-bold">Teknisi III</span> [source: 1]
                    <span className="underline font-bold mt-8">{record.teknisiList[2] || '-'}</span>
                  </div>
                  <div className="p-1 flex flex-col justify-between">
                    <span className="font-bold">Sub Koordinator Inskal</span> [source: 1]
                    <span className="underline font-bold mt-8">Suroto, S.T.</span> [source: 1]
                  </div>
                </div>
              </div>

            </div>

            {/* HALAMAN 2: LAMPIRAN FOTO DOKUMENTASI (JIKA ADA) */}
            {record.fotoLampiran && record.fotoLampiran.length > 0 && (
              <div className="page-break pt-8">
                <div className="border border-black p-4 space-y-4">
                  <div className="flex justify-between items-center border-b border-black pb-2">
                    <span className="font-bold text-xs uppercase">LAMPIRAN DOKUMENTASI PENGERJAAN</span> [source: 1]
                    <span className="text-[10px] font-bold">Halaman 2 dari 2</span> [source: 1]
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {record.fotoLampiran.map((img, i) => (
                      <div key={i} className="border border-black p-1 text-center bg-slate-50">
                        <img src={img} alt={`Dokumentasi ${i+1}`} className="w-full h-64 object-contain" /> [source: 1]
                        <span className="text-[9px] font-bold block mt-1">Dokumentasi Foto {i+1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
