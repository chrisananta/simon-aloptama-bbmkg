import React from 'react';
import { ExternalLink, ShieldCheck, FileText, Lock, Globe } from 'lucide-react';

export const CertificateRedirectView: React.FC = () => {
  const handleOpenCertificateWeb = () => {
    window.open('https://bbwv-api.mee.lt/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-slate-200 text-center flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0052CC] to-[#0F2D52] text-white flex items-center justify-center shadow-md mb-6 border border-blue-400/30">
          <FileText size={38} />
        </div>

        <span className="px-3.5 py-1 rounded-full bg-blue-50 text-[#0052CC] border border-blue-200 text-xs font-bold uppercase tracking-wider mb-3">
          SISTEM INTEGRASI REPOSITORI SERTIFIKAT
        </span>

        <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-slate-900 tracking-tight">
          Web Sertifikat Kalibrasi Lapang BBMKG V
        </h2>

        <p className="text-sm text-slate-600 max-w-xl mt-3 leading-relaxed">
          Arsip terenkripsi seluruh Sertifikat Kalibrasi Peralatan Operasional Meteorologi, Klimatologi, dan Geofisika milik BBMKG Wilayah V Papua.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full my-8 text-left">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <ShieldCheck className="text-[#0052CC] mb-2" size={20} />
            <h4 className="font-bold text-xs text-slate-900">Otentikasi Digital</h4>
            <p className="text-[11px] text-slate-500 mt-1">Dilengkapi QR-Code resmi verifikasi BBMKG Wilayah V Papua.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <Globe className="text-[#0052CC] mb-2" size={20} />
            <h4 className="font-bold text-xs text-slate-900">Portal Terpusat</h4>
            <p className="text-[11px] text-slate-500 mt-1">Akses cepat unduh e-Sertifikat format PDF resmi.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <Lock className="text-[#0052CC] mb-2" size={20} />
            <h4 className="font-bold text-xs text-slate-900">Repositori Aman</h4>
            <p className="text-[11px] text-slate-500 mt-1">Penyimpanan cloud terpusat untuk semua sertifikat dan riwayat kalibrasi peralatan MKG.</p>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleOpenCertificateWeb}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#0052CC] hover:bg-[#003D99] text-white font-heading font-bold text-base shadow-xl shadow-blue-600/25 transition-all hover:scale-105 active:scale-95 group cursor-pointer"
          >
            <span>Open Web Sertifikat Kalibrasi</span>
            <ExternalLink size={20} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
