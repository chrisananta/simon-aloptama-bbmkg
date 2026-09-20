import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Clock,
  FileText,
  Loader2,
  Printer,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AloptamaDevice } from '../../shared/types';
import type { PanduanAlat, PanduanNode, PanduanTab } from './panduanTypes';
import {
  TabDef,
  buildPrintHtml,
  buildSearchIndex,
  buildTabDefs,
  ringkasCadangan,
  searchPanduan,
  splitBatas,
} from './panduanUtils';

interface PanduanViewProps {
  /** Tidak dipakai lagi (pil kategori dihapus); dibiarkan opsional agar pemanggil lama tetap valid. */
  devices?: AloptamaDevice[];
}

const GROUP_ORDER: PanduanAlat['kelompokAlat'][] = ['Meteorologi', 'Klimatologi', 'Kualitas Udara', 'Geofisika'];

// ---------------------------------------------------------------------------
// Potongan tampilan kecil
// ---------------------------------------------------------------------------

const NodeList: React.FC<{ nodes: PanduanNode[]; nested?: boolean }> = ({ nodes, nested = false }) => (
  <ul className={nested ? 'mt-1.5 space-y-1.5' : 'divide-y divide-slate-100'}>
    {nodes.map((n, i) => (
      <li
        key={i}
        className={
          nested
            ? 'flex gap-2.5 text-[13px] leading-snug text-slate-600'
            : 'flex gap-3.5 py-2.5 text-sm leading-snug text-slate-800'
        }
      >
        <span
          className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${
            nested ? 'bg-slate-400' : 'ml-1 bg-[#0052CC]'
          }`}
        />
        <div className="min-w-0">
          <span>{n.text}</span>
          {n.children && n.children.length > 0 && <NodeList nodes={n.children} nested />}
        </div>
      </li>
    ))}
  </ul>
);

const Chips: React.FC<{ items: PanduanNode[] }> = ({ items }) => (
  <div className="flex flex-wrap gap-2">
    {items.map((n, i) => (
      <span key={i} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] text-slate-700">
        {n.text}
      </span>
    ))}
  </div>
);

const SubHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="mb-2.5 mt-6 text-[13.5px] font-semibold text-[#0F2D52]">{children}</h3>
);

const LogNote: React.FC<{ text: string }> = ({ text }) => (
  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13.5px] text-slate-600">
    <FileText size={16} className="mt-0.5 shrink-0 text-slate-500" />
    <span>{text}</span>
  </div>
);

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const Highlight: React.FC<{ text: string; tokens: string[] }> = ({ text, tokens }) => {
  if (tokens.length === 0) return <>{text}</>;
  const re = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi');
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-yellow-100 px-0.5 text-inherit">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Isi tiap tab
// ---------------------------------------------------------------------------

const BerkalaContent: React.FC<{ tab: PanduanTab }> = ({ tab }) => (
  <div>
    {tab.durasi && (
      <div className="mt-5 flex items-center gap-2 text-sm text-slate-700">
        <Clock size={16} className="shrink-0 text-slate-500" />
        <span>
          Perkiraan waktu <b className="font-semibold">{tab.durasi}</b>.
        </span>
      </div>
    )}

    {tab.persiapan && tab.persiapan.length > 0 && (
      <>
        <SubHeading>Yang perlu disiapkan</SubHeading>
        <Chips items={tab.persiapan} />
      </>
    )}

    {tab.persiapanGrup &&
      tab.persiapanGrup.map((g, i) => (
        <div key={i}>
          <SubHeading>Yang perlu disiapkan ({g.label.toLowerCase()})</SubHeading>
          <Chips items={g.items} />
        </div>
      ))}

    {tab.persiapanCatatan && (
      <p className="mt-2.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{tab.persiapanCatatan}</p>
    )}

    {tab.langkah.length > 0 && (
      <>
        <SubHeading>Langkah pemeliharaan</SubHeading>
        <NodeList nodes={tab.langkah} />
      </>
    )}

    {tab.catatan && <LogNote text={tab.catatan} />}
  </div>
);

const PerbaikanContent: React.FC<{ tab: PanduanTab }> = ({ tab }) => (
  <div>
    {tab.kerusakan && tab.kerusakan.length > 0 && (
      <>
        <SubHeading>Jenis kerusakan dan tindakan</SubHeading>
        <NodeList nodes={tab.kerusakan} />
      </>
    )}

    {tab.persiapan && tab.persiapan.length > 0 && (
      <>
        <SubHeading>Yang perlu disiapkan</SubHeading>
        <Chips items={tab.persiapan} />
      </>
    )}

    {tab.langkah.length > 0 && (
      <>
        <SubHeading>Langkah perbaikan</SubHeading>
        <NodeList nodes={tab.langkah} />
      </>
    )}

    {tab.langkah.length === 0 && (!tab.kerusakan || tab.kerusakan.length === 0) && (
      <p className="mt-5 text-sm text-slate-500">Aturan tidak memuat langkah perbaikan tertulis untuk alat ini.</p>
    )}
  </div>
);

const TabContent: React.FC<{ entry: PanduanAlat; def: TabDef }> = ({ entry, def }) => {
  if (def.kind === 'komponen') {
    return (
      <div>
        <SubHeading>Komponen alat</SubHeading>
        <NodeList nodes={entry.komponen} />
      </div>
    );
  }
  if (def.kind === 'lain') {
    return (
      <div>
        {entry.ketentuanLain.map((k, i) => (
          <div key={i}>
            <SubHeading>{k.judul}</SubHeading>
            <NodeList nodes={k.isi} />
          </div>
        ))}
      </div>
    );
  }
  if (!def.tab) return null;
  return def.kind === 'perbaikan' ? <PerbaikanContent tab={def.tab} /> : <BerkalaContent tab={def.tab} />;
};

// ---------------------------------------------------------------------------
// Halaman
// ---------------------------------------------------------------------------

export const PanduanView: React.FC<PanduanViewProps> = () => {
  const [data, setData] = useState<PanduanAlat[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [tabId, setTabId] = useState<string>('');
  const [query, setQuery] = useState('');

  // Data panduan cukup besar (~400 KB), jadi dimuat hanya saat halaman ini dibuka.
  useEffect(() => {
    let cancelled = false;
    import('./panduanData')
      .then((m) => {
        if (!cancelled) setData(m.PANDUAN_ALAT);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const searchIndex = useMemo(() => (data ? buildSearchIndex(data) : []), [data]);

  const selectedEntry: PanduanAlat | undefined = useMemo(() => {
    if (!data) return undefined;
    return data.find((e) => e.id === selectedId) ?? data.find((e) => e.simon === 'AWS') ?? data[0];
  }, [data, selectedId]);

  const tabDefs = useMemo(() => (selectedEntry ? buildTabDefs(selectedEntry) : []), [selectedEntry]);
  const activeTab: TabDef | undefined = tabDefs.find((t) => t.id === tabId) ?? tabDefs[0];

  const searching = query.trim().length >= 2;
  const hits = useMemo(() => (searching ? searchPanduan(searchIndex, query) : []), [searching, searchIndex, query]);
  const queryTokens = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);

  const chooseEntry = (id: string, nextTab = '') => {
    setSelectedId(id);
    setTabId(nextTab);
  };

  const handlePrint = () => {
    if (!selectedEntry) return;
    const w = window.open('', '_blank');
    if (!w) {
      window.alert('Pop-up diblokir oleh browser. Izinkan pop-up untuk situs ini agar panduan bisa dicetak.');
      return;
    }
    w.document.open();
    w.document.write(buildPrintHtml(selectedEntry));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  if (loadFailed) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
        Panduan gagal dimuat. Periksa koneksi lalu muat ulang halaman.
      </div>
    );
  }

  if (!data || !selectedEntry) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        <Loader2 size={18} className="animate-spin text-[#0052CC]" />
        Memuat panduan pemeliharaan...
      </div>
    );
  }

  const sameCategory = selectedEntry.simon ? data.filter((e) => e.simon === selectedEntry.simon) : [];
  const batas = selectedEntry.batasPerbaikan ? splitBatas(selectedEntry.batasPerbaikan) : null;
  const cadangan = ringkasCadangan(selectedEntry);

  return (
    <div className="space-y-4">
      {/* Pengantar + pencarian */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-[13.5px] text-slate-500">
          Standar teknis dan operasional pemeliharaan alat MKG,{' '}
          <b className="font-semibold text-slate-800">Perka BMKG No. 7 Tahun 2014</b>
        </p>
        <div className="relative w-full md:w-[390px]">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari alat atau langkah, misalnya “AWS” atau “baterai”"
            aria-label="Cari panduan"
            className="h-[42px] w-full rounded-[11px] border border-slate-300 bg-white pl-10 pr-10 text-[13.5px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0052CC] focus:ring-2 focus:ring-[#0052CC]/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Pilih alat dari daftar lengkap */}
      <div>
        <select
          value={selectedEntry.id}
          onChange={(e) => {
            setQuery('');
            chooseEntry(e.target.value);
          }}
          aria-label="Pilih alat dari daftar lengkap"
          className="h-[38px] w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-[#0052CC] sm:w-80"
        >
          {GROUP_ORDER.map((g) => (
            <optgroup key={g} label={`Alat ${g.toLowerCase()}`}>
              {data
                .filter((e) => e.kelompokAlat === g)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nama}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Hasil pencarian */}
      {searching ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#0F2D52]">
              {hits.length > 0 ? `${hits.length} alat cocok dengan “${query.trim()}”` : `Tidak ada hasil untuk “${query.trim()}”`}
            </h2>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
            >
              Tutup pencarian
            </button>
          </div>
          {hits.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">
              Coba kata yang lebih pendek, atau nama alat seperti “thermometer”, “seismograph”, atau “radar”.
            </p>
          )}
          <ul className="mt-4 divide-y divide-slate-100">
            {hits.map((h) => (
              <li key={h.entry.id} className="py-3">
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    chooseEntry(h.entry.id, h.lines[0]?.tabId ?? '');
                  }}
                  className="text-left text-[15px] font-semibold text-[#0052CC] hover:underline"
                >
                  <Highlight text={h.entry.nama} tokens={queryTokens} />
                </button>
                <span className="ml-2 text-xs text-slate-400">{h.entry.kelompokAlat}</span>
                <ul className="mt-1.5 space-y-1">
                  {h.lines.slice(0, 3).map((l, i) => (
                    <li key={i} className="text-[13px] leading-snug text-slate-600">
                      <button
                        type="button"
                        onClick={() => {
                          setQuery('');
                          chooseEntry(h.entry.id, l.tabId);
                        }}
                        className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-200"
                      >
                        {l.tabLabel}
                      </button>
                      <Highlight text={l.text.length > 170 ? `${l.text.slice(0, 170)}…` : l.text} tokens={queryTokens} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Isi panduan */}
          <div className="flex min-w-0 flex-col p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-bold leading-tight text-[#0F2D52] sm:text-2xl">{selectedEntry.nama}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
                  {selectedEntry.caraKerja && (
                    <span className="rounded-full bg-[#EAF1FF] px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                      {selectedEntry.caraKerja}
                    </span>
                  )}
                  <span>{selectedEntry.jenis}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {selectedEntry.kelompokAlat}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="flex h-[38px] shrink-0 items-center gap-2 rounded-[10px] border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Printer size={16} />
                <span className="hidden sm:inline">Cetak panduan</span>
              </button>
            </div>

            {sameCategory.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {sameCategory.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    aria-pressed={e.id === selectedEntry.id}
                    onClick={() => chooseEntry(e.id)}
                    className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium ${
                      e.id === selectedEntry.id
                        ? 'border-[#0052CC] bg-[#EAF1FF] text-[#0052CC]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {e.nama}
                  </button>
                ))}
              </div>
            )}

            {selectedEntry.jadwalRingkas.length > 0 && (
              <p className="mt-3 text-[13px] text-slate-600">{selectedEntry.jadwalRingkas.join('. ')}.</p>
            )}

            <div
              role="tablist"
              className="mt-5 flex gap-5 overflow-x-auto overflow-y-hidden whitespace-nowrap border-b border-slate-200 sm:gap-6"
            >
              {tabDefs.map((t) => {
                const active = activeTab?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTabId(t.id)}
                    className={`relative pb-3 text-sm font-semibold transition-colors ${
                      active ? 'text-[#0052CC]' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t.label}
                    {active && <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t bg-[#0052CC]" />}
                  </button>
                );
              })}
            </div>

            {activeTab && <TabContent entry={selectedEntry} def={activeTab} />}

            <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="shrink-0" />
                <span>
                  Perka BMKG No. 7 Tahun 2014, Lampiran I hlm. {selectedEntry.hlmMulai}–{selectedEntry.hlmSelesai}
                </span>
              </div>
              {selectedEntry.catatanSumber && <p className="mt-1.5 pl-[23px]">{selectedEntry.catatanSumber}</p>}
            </div>
          </div>

          {/* Panel samping */}
          <aside className="flex flex-col gap-6 border-t border-slate-200 bg-slate-50 p-5 sm:p-6 lg:border-l lg:border-t-0">
            {batas ? (
              <div className="rounded-[14px] border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-[13.5px] font-bold text-amber-900">
                  <AlertTriangle size={17} className="text-amber-600" />
                  Batas waktu perbaikan
                </div>
                <div className="mb-1 mt-2.5 font-heading text-4xl font-bold leading-none text-amber-950">
                  {batas.nilai}
                  {batas.satuan && <small className="ml-1 text-[17px] font-semibold">{batas.satuan}</small>}
                </div>
                <p className="text-[13px] leading-relaxed text-amber-900/80">
                  Dihitung sejak kerusakan diketahui. Perbaiki mengacu buku manual, catat di log book, lalu laporkan
                  secara hirarki.
                </p>
              </div>
            ) : (
              <p className="rounded-[14px] border border-slate-200 bg-white p-4 text-[13px] text-slate-500">
                Aturan tidak mencantumkan batas waktu perbaikan untuk alat ini.
              </p>
            )}

            {selectedEntry.gantiKomponen.length > 0 && (
              <div>
                <h4 className="mb-1.5 text-sm font-semibold text-[#0F2D52]">Jadwal ganti komponen</h4>
                <ul className="divide-y divide-slate-200/80">
                  {selectedEntry.gantiKomponen.map((n, i) => (
                    <li key={i} className="py-2.5 text-[13px] leading-snug text-slate-700">
                      {n.text}
                      {n.children && n.children.length > 0 && (
                        <ul className="mt-1 space-y-0.5 pl-3 text-slate-500">
                          {n.children.map((c, j) => (
                            <li key={j}>{c.text}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {cadangan && (
              <div className="flex gap-2.5 text-[13px] leading-relaxed text-slate-600">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#0052CC]" />
                <div>
                  <b className="font-semibold text-[#0F2D52]">Peralatan cadangan.</b> {cadangan}.
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};