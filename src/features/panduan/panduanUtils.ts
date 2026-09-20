import type {
  PanduanAlat,
  PanduanNode,
  PanduanSimonKategori,
  PanduanTab,
} from './panduanTypes';

// ---------------------------------------------------------------------------
// Kategori alat SIMON <-> panduan
// ---------------------------------------------------------------------------

export const normalizeCategory = (s: string) => (s || '').toLowerCase().replace(/[.\s]/g, '');

export interface SimonPill {
  key: string;
  /** Padanan di panduan; null = belum ada di aturan (pil nonaktif). */
  panduan: PanduanSimonKategori | null;
  match: (deviceCategoryNormalized: string) => boolean;
}

export const SIMON_PILLS: SimonPill[] = [
  { key: 'AWOS', panduan: 'AWOS', match: (k) => k.startsWith('awos') },
  { key: 'AWS', panduan: 'AWS', match: (k) => k === 'aws' },
  { key: 'ARG', panduan: 'ARG', match: (k) => k === 'arg' },
  { key: 'Radar Cuaca', panduan: 'Radar Cuaca', match: (k) => k === 'radarcuaca' },
  { key: 'Seismometer', panduan: 'Seismometer', match: (k) => k === 'seismometer' },
  { key: 'Accelerograph', panduan: 'Accelerograph', match: (k) => k === 'accelerograph' },
  { key: 'Lightning Detector', panduan: 'Lightning Detector', match: (k) => k === 'lightningdetector' },
  { key: 'WRS NG', panduan: null, match: (k) => k === 'wrsng' },
  { key: 'Sirene', panduan: null, match: (k) => k === 'sirene' },
];

export function countByPill(devices: { category: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of SIMON_PILLS) out[p.key] = 0;
  for (const d of devices) {
    const k = normalizeCategory(d.category);
    const pill = SIMON_PILLS.find((p) => p.match(k));
    if (pill) out[pill.key] += 1;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

export interface TabDef {
  id: string;
  label: string;
  kind: PanduanTab['kind'] | 'komponen' | 'lain';
  tab?: PanduanTab;
}

/** Tab dari aturan (berkala + perbaikan) ditambah "Komponen alat" dan "Ketentuan lain" bila ada isinya. */
export function buildTabDefs(entry: PanduanAlat): TabDef[] {
  const defs: TabDef[] = entry.tabs.map((t) => ({ id: t.id, label: t.label, kind: t.kind, tab: t }));
  if (entry.komponen.length > 0) defs.push({ id: 'komponen', label: 'Komponen alat', kind: 'komponen' });
  if (entry.ketentuanLain.length > 0) defs.push({ id: 'lain', label: 'Ketentuan lain', kind: 'lain' });
  return defs;
}

// ---------------------------------------------------------------------------
// Teks
// ---------------------------------------------------------------------------

export function flattenNodes(nodes: PanduanNode[]): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    out.push(n.text);
    if (n.children) out.push(...flattenNodes(n.children));
  }
  return out;
}

/** "3 × 24 jam" -> { nilai: "3 × 24", satuan: "jam" } */
export function splitBatas(batas: string): { nilai: string; satuan: string } {
  const m = batas.match(/^(.*?)\s*(jam|hari|menit)$/i);
  if (m && m[1]) return { nilai: m[1], satuan: m[2].toLowerCase() };
  return { nilai: batas, satuan: '' };
}

/** Teks "peralatan cadangan" (Bagian XII) untuk ditampilkan ringkas di panel samping. */
export function ringkasCadangan(entry: PanduanAlat): string | null {
  const sec = entry.ketentuanLain.find((k) => /peralatan cadangan/i.test(k.judul));
  if (!sec || sec.isi.length === 0) return null;
  return sec.isi[0].text;
}

// ---------------------------------------------------------------------------
// Pencarian
// ---------------------------------------------------------------------------

export interface SearchLine {
  tabId: string;
  tabLabel: string;
  text: string;
}
export interface SearchIndexItem {
  entry: PanduanAlat;
  lines: SearchLine[];
}
export interface SearchHit {
  entry: PanduanAlat;
  score: number;
  lines: SearchLine[];
}

export function buildSearchIndex(data: PanduanAlat[]): SearchIndexItem[] {
  return data.map((entry) => {
    const lines: SearchLine[] = [];
    const push = (tabId: string, tabLabel: string, texts: string[]) => {
      for (const t of texts) if (t && t.trim()) lines.push({ tabId, tabLabel, text: t });
    };
    for (const t of entry.tabs) {
      if (t.durasi) push(t.id, t.label, [`Perkiraan waktu ${t.durasi}`]);
      if (t.catatan) push(t.id, t.label, [t.catatan]);
      if (t.persiapan) push(t.id, t.label, flattenNodes(t.persiapan));
      if (t.persiapanGrup) for (const g of t.persiapanGrup) push(t.id, t.label, flattenNodes(g.items));
      if (t.kerusakan) push(t.id, t.label, flattenNodes(t.kerusakan));
      push(t.id, t.label, flattenNodes(t.langkah));
    }
    const first = entry.tabs[0];
    if (first) {
      push(first.id, 'Jadwal ganti komponen', flattenNodes(entry.gantiKomponen));
      push(first.id, 'Jadwal', entry.jadwalRingkas);
    }
    push('komponen', 'Komponen alat', flattenNodes(entry.komponen));
    for (const k of entry.ketentuanLain) push('lain', k.judul, flattenNodes(k.isi));
    return { entry, lines };
  });
}

const tokenize = (q: string) =>
  q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

export function searchPanduan(index: SearchIndexItem[], query: string, maxEntries = 30): SearchHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const item of index) {
    const head = `${item.entry.nama} ${item.entry.jenis} ${item.entry.kelompokAlat}`.toLowerCase();
    const headMatch = tokens.every((t) => head.includes(t));
    const lineHits = item.lines.filter((l) => {
      const low = l.text.toLowerCase();
      return tokens.every((t) => low.includes(t));
    });
    if (!headMatch && lineHits.length === 0) continue;
    // buang baris duplikat
    const seen = new Set<string>();
    const unique = lineHits.filter((l) => {
      const key = `${l.tabId}|${l.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const nameLow = item.entry.nama.toLowerCase();
    const score =
      (headMatch ? 10 : 0) +
      (tokens.every((t) => nameLow.includes(t)) ? 10 : 0) +
      (item.entry.simon ? 2 : 0) +
      Math.min(unique.length, 5);
    hits.push({ entry: item.entry, score, lines: unique });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, maxEntries);
}

// ---------------------------------------------------------------------------
// Cetak (dokumen sederhana di jendela baru, tanpa menyentuh CSS global aplikasi)
// ---------------------------------------------------------------------------

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const listHtml = (nodes: PanduanNode[]): string =>
  `<ul>${nodes
    .map((n) => `<li>${esc(n.text)}${n.children && n.children.length ? listHtml(n.children) : ''}</li>`)
    .join('')}</ul>`;

export function buildPrintHtml(entry: PanduanAlat): string {
  const parts: string[] = [];
  parts.push(`<h1>${esc(entry.nama)}</h1>`);
  parts.push(
    `<p class="meta">${esc(entry.kelompokAlat)} &middot; ${esc(entry.jenis)}${
      entry.caraKerja ? ` &middot; ${esc(entry.caraKerja)}` : ''
    }</p>`
  );
  if (entry.jadwalRingkas.length) parts.push(`<p>${entry.jadwalRingkas.map(esc).join('. ')}</p>`);
  if (entry.batasPerbaikan) {
    parts.push(
      `<p class="box"><b>Batas waktu perbaikan: ${esc(entry.batasPerbaikan)}</b> sejak kerusakan diketahui.</p>`
    );
  }
  for (const t of entry.tabs) {
    parts.push(`<h2>${esc(t.label)}</h2>`);
    if (t.durasi) parts.push(`<p>Perkiraan waktu: ${esc(t.durasi)}</p>`);
    if (t.persiapan && t.persiapan.length) parts.push(`<h3>Yang perlu disiapkan</h3>${listHtml(t.persiapan)}`);
    if (t.persiapanGrup) {
      for (const g of t.persiapanGrup) parts.push(`<h3>Yang perlu disiapkan (${esc(g.label)})</h3>${listHtml(g.items)}`);
    }
    if (t.persiapanCatatan) parts.push(`<p class="note">${esc(t.persiapanCatatan)}</p>`);
    if (t.kerusakan && t.kerusakan.length) parts.push(`<h3>Jenis kerusakan dan tindakan</h3>${listHtml(t.kerusakan)}`);
    if (t.langkah.length) {
      parts.push(`<h3>${t.kind === 'perbaikan' ? 'Langkah perbaikan' : 'Langkah pemeliharaan'}</h3>${listHtml(t.langkah)}`);
    }
    if (t.catatan) parts.push(`<p class="note">${esc(t.catatan)}</p>`);
  }
  if (entry.gantiKomponen.length) parts.push(`<h2>Jadwal ganti komponen</h2>${listHtml(entry.gantiKomponen)}`);
  if (entry.komponen.length) parts.push(`<h2>Komponen alat</h2>${listHtml(entry.komponen)}`);
  for (const k of entry.ketentuanLain) parts.push(`<h2>${esc(k.judul)}</h2>${listHtml(k.isi)}`);
  parts.push(
    `<p class="src">Sumber: Peraturan Kepala BMKG Nomor 7 Tahun 2014, Lampiran I hlm. ${entry.hlmMulai}&ndash;${entry.hlmSelesai}. Dicetak dari SIMON BBMKG.</p>`
  );
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(entry.nama)} - Panduan Pemeliharaan</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;margin:24px 32px;line-height:1.45;font-size:13px}
h1{font-size:20px;margin:0 0 4px;color:#0f2d52} h2{font-size:15px;margin:22px 0 6px;color:#0f2d52;border-bottom:1px solid #cbd5e1;padding-bottom:3px}
h3{font-size:13px;margin:12px 0 4px} ul{margin:4px 0 6px 18px;padding:0} li{margin:2px 0}
.meta{color:#64748b;margin:0 0 10px} .box{border:1px solid #f2c14e;background:#fff6e0;padding:8px 10px;border-radius:6px}
.note{color:#475569;font-style:italic} .src{margin-top:24px;color:#64748b;font-size:11px;border-top:1px solid #cbd5e1;padding-top:8px}
@media print{body{margin:12mm} h2{break-after:avoid}}
</style></head><body>${parts.join('')}</body></html>`;
}
