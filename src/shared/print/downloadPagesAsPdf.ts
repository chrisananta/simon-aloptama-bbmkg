/**
 * Unduh PDF langsung (tanpa dialog cetak browser).
 * Tiap halaman dirender ke gambar (html2canvas-pro) lalu disusun jadi satu PDF A4 (jsPDF).
 * Library dimuat dinamis supaya tidak membebani bundle awal.
 */

export interface PdfPageSpec {
  /** Elemen halaman di preview (akan disalin ke luar layar, aslinya tidak diubah). */
  element: HTMLElement;
  orientation: 'portrait' | 'landscape';
  /** Margin kertas dalam mm (0 bila elemen sudah berukuran penuh A4). */
  marginMm: number;
  /** Gaya tambahan untuk salinan, mis. menghilangkan padding/bayangan preview. */
  cloneCss?: string;
}

export const MM_TO_PX = 96 / 25.4;

/** Buang karakter yang tidak boleh ada di nama berkas. */
const safeFilename = (name: string) => name.replace(/[\\/:*?"<>|]+/g, '-');

const waitImages = (root: HTMLElement) =>
  Promise.all(
    Array.from(root.querySelectorAll('img')).map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
    )
  );

export async function downloadPagesAsPdf(pages: PdfPageSpec[], filename: string, scale = 3): Promise<void> {
  if (pages.length === 0) throw new Error('Tidak ada halaman untuk diunduh.');

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);
  if (document.fonts?.ready) await document.fonts.ready;

  let pdf: InstanceType<typeof jsPDF> | null = null;

  for (const page of pages) {
    const landscape = page.orientation === 'landscape';
    const pageW = landscape ? 297 : 210;
    const pageH = landscape ? 210 : 297;
    const contentW = pageW - page.marginMm * 2;
    const contentH = pageH - page.marginMm * 2;

    const holder = document.createElement('div');
    holder.style.cssText = `position:fixed;left:-100000px;top:0;width:${contentW * MM_TO_PX}px;background:#fff;`;
    const clone = page.element.cloneNode(true) as HTMLElement;
    if (page.cloneCss) clone.style.cssText += `;${page.cloneCss}`;
    holder.appendChild(clone);
    document.body.appendChild(holder);

    try {
      await waitImages(clone);
      const canvas = await html2canvas(clone, { scale, backgroundColor: '#ffffff', useCORS: true });

      // Muat ke area konten; bila lebih tinggi dari halaman, perkecil proporsional.
      let w = contentW;
      let h = (canvas.height * w) / canvas.width;
      if (h > contentH) {
        h = contentH;
        w = (canvas.width * h) / canvas.height;
      }

      if (!pdf) pdf = new jsPDF({ orientation: page.orientation, unit: 'mm', format: 'a4' });
      else pdf.addPage('a4', page.orientation);
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', page.marginMm + (contentW - w) / 2, page.marginMm, w, h);
    } finally {
      document.body.removeChild(holder);
    }
  }

  pdf?.save(safeFilename(filename));
}

// ---------------------------------------------------------------------------------------
// Dokumen "mengalir" (satu elemen panjang yang dipotong jadi beberapa halaman A4)
// ---------------------------------------------------------------------------------------

export interface FlowPdfOptions {
  element: HTMLElement;
  filename: string;
  orientation: 'portrait' | 'landscape';
  marginMm: number;
  /** Gaya untuk salinan (mis. hapus padding/border/bayangan pratinjau). */
  cloneCss?: string;
  /** Selector footer di dalam elemen; dipindah & diulang di bawah SETIAP halaman. */
  footerSelector?: string;
  /** Selector elemen yang selalu memulai halaman baru (mis. ".page-break"). */
  pageBreakBeforeSelector?: string;
  /** true = elemen sudah terpasang dengan lebar yang benar (mis. di dalam iframe), tidak disalin. */
  mounted?: boolean;
  scale?: number;
}

const BREAK_CANDIDATES = 'tr, li, p, h1, h2, h3, h4, img';
const HEADING = /^H[1-4]$/;
const MAX_CANVAS_PX = 16000;

export async function downloadFlowAsPdf(opts: FlowPdfOptions): Promise<void> {
  const { orientation, marginMm, scale = 3 } = opts;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')]);
  if (document.fonts?.ready) await document.fonts.ready;

  const landscape = orientation === 'landscape';
  const pageW = landscape ? 297 : 210;
  const pageH = landscape ? 210 : 297;
  const contentW = pageW - marginMm * 2;
  const contentH = pageH - marginMm * 2;

  let holder: HTMLElement | null = null;
  let root = opts.element;
  if (!opts.mounted) {
    holder = document.createElement('div');
    holder.style.cssText = `position:fixed;left:-100000px;top:0;width:${contentW * MM_TO_PX}px;background:#fff;`;
    root = opts.element.cloneNode(true) as HTMLElement;
    if (opts.cloneCss) root.style.cssText += `;${opts.cloneCss}`;
    holder.appendChild(root);
    document.body.appendChild(holder);
  }

  try {
    await waitImages(root);

    // Footer (mis. TTE) dirender terpisah lalu diulang di tiap halaman.
    let footerImg: string | null = null;
    let footerHmm = 0;
    let footerWmm = 0;
    if (opts.footerSelector) {
      const f = root.querySelector<HTMLElement>(opts.footerSelector);
      if (f) {
        f.style.margin = '0';
        const rect = f.getBoundingClientRect();
        const fc = await html2canvas(f, { scale, backgroundColor: '#ffffff', useCORS: true });
        footerImg = fc.toDataURL('image/png');
        footerHmm = rect.height / MM_TO_PX;
        footerWmm = Math.min(rect.width / MM_TO_PX, contentW);
        f.remove();
      }
    }

    const totalPx = Math.max(1, Math.ceil(root.scrollHeight));
    const rootTop = root.getBoundingClientRect().top;
    const topOf = (el: Element) => el.getBoundingClientRect().top - rootTop;

    const candidates = Array.from(root.querySelectorAll(BREAK_CANDIDATES))
      .map((el) => ({ top: topOf(el), heading: HEADING.test(el.tagName) }))
      .filter((c) => c.top > 1)
      .sort((a, b) => a.top - b.top);
    const forced = opts.pageBreakBeforeSelector
      ? Array.from(root.querySelectorAll(opts.pageBreakBeforeSelector))
          .map(topOf)
          .filter((t) => t > 1)
          .sort((a, b) => a - b)
      : [];

    const footerReserveMm = footerImg ? footerHmm + 3 : 0;
    const capacityPx = Math.floor((contentH - footerReserveMm) * MM_TO_PX);
    const minFill = capacityPx * 0.4;

    // Tentukan titik potong halaman: patuhi page-break, lalu potong di batas baris/paragraf.
    const slices: Array<[number, number]> = [];
    let start = 0;
    while (start < totalPx - 1) {
      const limit = start + capacityPx;
      let end: number;
      const forcedBreak = forced.find((t) => t > start + 1 && t <= limit);
      if (forcedBreak !== undefined) {
        end = forcedBreak;
      } else if (totalPx <= limit + 1) {
        end = totalPx;
      } else {
        let idx = -1;
        for (let i = candidates.length - 1; i >= 0; i--) {
          if (candidates[i].top <= limit && candidates[i].top > start + minFill) {
            idx = i;
            break;
          }
        }
        // Jangan biarkan judul sendirian di dasar halaman.
        while (idx > 0 && candidates[idx - 1].heading && candidates[idx - 1].top > start + minFill) idx -= 1;
        end = idx >= 0 ? candidates[idx].top : limit;
      }
      slices.push([start, end]);
      start = end;
    }
    if (slices.length === 0) slices.push([0, totalPx]);

    const sf = Math.max(1, Math.min(scale, MAX_CANVAS_PX / totalPx));
    const canvas = await html2canvas(root, { scale: sf, backgroundColor: '#ffffff', useCORS: true });
    const k = canvas.height / totalPx;

    const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    slices.forEach(([s, e], i) => {
      if (i > 0) pdf.addPage('a4', orientation);
      const sy = Math.round(s * k);
      const sh = Math.max(1, Math.min(canvas.height - sy, Math.round((e - s) * k)));
      const part = document.createElement('canvas');
      part.width = canvas.width;
      part.height = sh;
      const ctx = part.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, part.width, part.height);
      ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);
      pdf.addImage(part.toDataURL('image/jpeg', 0.95), 'JPEG', marginMm, marginMm, contentW, sh / k / MM_TO_PX);
      if (footerImg) {
        pdf.addImage(footerImg, 'PNG', marginMm + (contentW - footerWmm) / 2, pageH - marginMm - footerHmm, footerWmm, footerHmm);
      }
    });
    pdf.save(safeFilename(opts.filename));
  } finally {
    if (holder) document.body.removeChild(holder);
  }
}