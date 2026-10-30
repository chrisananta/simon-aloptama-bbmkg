import React from 'react';
import { ArrowUp } from 'lucide-react';

/** Footer gelap ala bmkg.go.id. Dipasang di App.tsx sehingga tampil di semua halaman. */
export const DashboardFooter: React.FC = () => {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="mt-16 sm:mt-24 -mx-3 sm:-mx-4 md:-mx-6 -mb-10 bg-[#0E1729]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pt-10 sm:pt-12 pb-10 sm:pb-12">
        <div className="border-t border-white/15" />
        <div className="pt-8 sm:pt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            © {new Date().getFullYear()} - Badan Meteorologi, Klimatologi, dan Geofisika
          </p>
          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 hover:bg-slate-100 active:scale-95 transition"
          >
            <ArrowUp size={16} />
            Kembali ke atas
          </button>
        </div>
      </div>
    </footer>
  );
};