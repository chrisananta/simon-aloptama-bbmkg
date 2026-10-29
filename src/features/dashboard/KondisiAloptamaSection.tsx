import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { AloptamaDevice, YearlyScoreMap } from '../../shared/types';
import { apiClient } from '../../shared/api';
import { CATEGORY_DEFS, categoryPercentsForMonth } from '../../shared/utils/slaOlaCategory';
import { useCarousel } from './useCarousel';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

interface KondisiAloptamaSectionProps {
  devices: AloptamaDevice[];
  /** "Lihat Semuanya" diklik (mis. pindah ke halaman SLA & OLA). */
  onViewAll?: () => void;
}

const fmt = (v: number) => `${v.toFixed(1).replace('.', ',')}%`;

export const KondisiAloptamaSection: React.FC<KondisiAloptamaSectionProps> = ({ devices, onViewAll }) => {
  const now = new Date();
  const monthIdx = now.getMonth();
  const year = now.getFullYear();

  const [scores, setScores] = useState<YearlyScoreMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    apiClient.slaOlaSummary.fetch(year).then((result) => {
      if (cancelled) return;
      if (result === null) {
        setScores({});
        setLoadFailed(true);
      } else {
        setScores(result);
        setLoadFailed(false);
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [year]);

  const cards = useMemo(() => {
    const rows = categoryPercentsForMonth(devices, scores, monthIdx + 1);
    return CATEGORY_DEFS.map((cat, i) => ({ key: cat.key, name: cat.key, ...rows[i] }))
      // Kategori yang belum punya alat terdaftar tidak ditampilkan.
      .filter((c) => c.jumlahLokasi > 0);
  }, [devices, scores, monthIdx]);

  // Carousel: geser dengan swipe/scroll atau tombol panah
  const { trackRef, canPrev, canNext, updateArrows, slide } = useCarousel([cards.length, isLoading]);

  const arrowClass =
    'hidden sm:flex absolute top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-700 hover:bg-slate-50 disabled:opacity-0 disabled:pointer-events-none transition';

  return (
    <section className="pt-6 sm:pt-12 lg:pt-16">

      <div className="mb-6 sm:mb-10">
        {/* Judul dan "Lihat Semuanya" satu baris, sejajar secara vertikal */}
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
            Kondisi Aloptama
          </h2>
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0052CC] hover:underline"
            >
              Lihat Semuanya <ArrowRight size={16} />
            </button>
          )}
        </div>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
          Rata-rata SLA &amp; OLA bulan {MONTH_NAMES[monthIdx]} {year}
        </p>
      </div>

      {loadFailed ? (
        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 text-amber-800/80 text-xs sm:text-sm font-medium px-4 py-5">
          Data SLA &amp; OLA bulan ini gagal dimuat. Muat ulang halaman untuk mencoba lagi.
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            aria-label="Geser ke kiri"
            onClick={() => slide(-1)}
            disabled={!canPrev}
            className={`${arrowClass} -left-4`}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Geser ke kanan"
            onClick={() => slide(1)}
            disabled={!canNext}
            className={`${arrowClass} -right-4`}
          >
            <ChevronRight size={18} />
          </button>

          <div
            ref={trackRef}
            onScroll={updateArrows}
            className="flex gap-3 sm:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="snap-start shrink-0 w-[70%] sm:w-[calc((100%-5rem)/5)] h-[170px] rounded-2xl border border-slate-200 bg-slate-100 animate-pulse"
                  />
                ))
              : cards.map((c) => (
                  <div
                    key={c.key}
                    className="snap-start shrink-0 w-[70%] sm:w-[calc((100%-5rem)/5)] rounded-2xl border border-slate-200 bg-gradient-to-b from-indigo-50/70 via-white to-white shadow-sm px-4 py-5 sm:py-6 flex flex-col items-center text-center"
                  >
                    <h3 className="font-heading text-sm sm:text-base font-bold text-slate-900 leading-snug min-h-[2.5rem] flex items-center">
                      {c.name}
                    </h3>

                    <div className="mt-4 w-full grid grid-cols-2 gap-2">
                      <div>
                        <div className="font-heading text-xl sm:text-2xl font-semibold text-[#0A2FC4]">
                          {fmt(c.sla)}
                        </div>
                        <div className="mt-1 text-[10px] sm:text-xs font-bold text-slate-500 tracking-wide">SLA</div>
                      </div>
                      <div className="border-l border-slate-200">
                        <div className="font-heading text-xl sm:text-2xl font-semibold text-[#0A2FC4]">
                          {fmt(c.ola)}
                        </div>
                        <div className="mt-1 text-[10px] sm:text-xs font-bold text-slate-500 tracking-wide">OLA</div>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      )}
    </section>
  );
};