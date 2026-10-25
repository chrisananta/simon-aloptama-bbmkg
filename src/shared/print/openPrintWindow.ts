/**
 * Satu-satunya tempat yang membuka jendela cetak (window.open + document.write).
 * Dipakai oleh laporan Mingguan, UPT, Genset, Perbaikan, dan Panduan supaya perilakunya
 * (CSS dasar, bilah cetak, cetak otomatis, footer berulang) seragam dan tidak ditulis ulang.
 */
import { PRINT_BASE_CSS } from './printBaseCss';

export interface PrintDocumentOptions {
  /** Judul dokumen — juga menjadi nama berkas bawaan saat "Simpan sebagai PDF". */
  title: string;
  /** HTML isi dokumen (sudah jadi). */
  bodyHtml: string;
  /** CSS khusus dokumen; ditaruh SETELAH CSS dasar sehingga bisa menimpanya. */
  css?: string;
  /** Bilah "Cetak / Simpan PDF" di atas dokumen (hilang saat cetak). false = tanpa bilah. */
  toolbar?: false | { text?: string; width?: string };
  /**
   * Dokumen memakai class Tailwind. CSS-nya diambil dari stylesheet aplikasi yang sedang
   * terbuka (bundle sendiri, tidak butuh internet), lihat collectAppStyleHtml().
   */
  tailwind?: boolean;
  /** HTML tambahan untuk <head> (mis. <link>/<style> hasil collectAppStyleHtml). */
  extraHeadHtml?: string;
  /** Jeda (ms) sebelum dialog cetak muncul otomatis. null = tidak otomatis. Bawaan 600. */
  autoPrintDelayMs?: number | null;
  /** HTML footer yang diulang di bawah SETIAP halaman tanpa menimpa isi. */
  repeatFooterHtml?: string;
  /** Ruang yang disisakan di bawah tiap halaman untuk footer di atas. Bawaan 26mm. */
  footerSpace?: string;
}

export interface OpenPrintWindowOptions extends PrintDocumentOptions {
  /** Ukuran jendela popup (px). Bila salah satu kosong, ukuran bawaan browser dipakai. */
  width?: number;
  height?: number;
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Menyusun dokumen HTML lengkap (murni, tanpa window)*/
export function buildPrintDocument(opts: PrintDocumentOptions): string {
  const {
    title,
    bodyHtml,
    css = '',
    toolbar = {},
    extraHeadHtml = '',
    autoPrintDelayMs = 600,
    repeatFooterHtml,
    footerSpace = '26mm',
  } = opts;

  const toolbarHtml =
    toolbar === false
      ? ''
      : `<div class="print-bar no-print" style="max-width:${escapeHtml(toolbar.width ?? '210mm')}">
      <span>${escapeHtml(toolbar.text ?? 'Dokumen siap dicetak atau disimpan sebagai PDF')}</span>
      <button onclick="window.print()">Cetak / Simpan PDF</button>
    </div>`;

  const content = repeatFooterHtml
    ? `<table class="print-shell" style="--print-footer-space:${escapeHtml(footerSpace)}">
      <tbody><tr><td>${bodyHtml}</td></tr></tbody>
      <tfoot><tr><td><div class="print-footer-space"></div></td></tr></tfoot>
    </table>
    <div class="print-footer-fixed">${repeatFooterHtml}</div>`
    : bodyHtml;

  const autoPrint =
    autoPrintDelayMs === null
      ? ''
      : `<script>window.onload = function () { setTimeout(function () { window.print(); }, ${Math.max(
          0,
          Math.round(autoPrintDelayMs)
        )}); };</script>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  ${extraHeadHtml}
  <style>${PRINT_BASE_CSS}
${css}</style>
</head>
<body>
  ${toolbarHtml}
  ${content}
  ${autoPrint}
</body>
</html>`;
}

/**
 * Mengumpulkan <link rel="stylesheet"> dan <style> dari halaman aplikasi yang sedang terbuka,
 * supaya jendela cetak punya Tailwind & CSS yang sama TANPA memuat CDN eksternal.
 * Production: <link> ke file CSS hasil build (URL dibuat absolut karena jendela cetak
 * dibuka dari about:blank). Development: Vite menyisipkan <style>, jadi isinya disalin.
 */
export function collectAppStyleHtml(): string {
  const parts: string[] = [];
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((el) => {
    if (el instanceof HTMLLinkElement) {
      if (el.href) parts.push(`<link rel="stylesheet" href="${escapeHtml(el.href)}">`);
    } else if (el.textContent) {
      // Cegah "</style>" di dalam isi menutup tag lebih awal.
      parts.push(`<style>${el.textContent.replace(/<\/style/gi, '<\\/style')}</style>`);
    }
  });
  return parts.join('\n  ');
}

/**
 * Membuka jendela cetak. Mengembalikan false bila popup diblokir browser —
 */
export function openPrintWindow(opts: OpenPrintWindowOptions): boolean {
  const features = opts.width && opts.height ? `width=${opts.width},height=${opts.height}` : undefined;
  const win = window.open('', '_blank', features);
  if (!win) return false;
  win.document.open();
  const extraHeadHtml = opts.tailwind ? collectAppStyleHtml() + (opts.extraHeadHtml ?? '') : opts.extraHeadHtml;
  win.document.write(buildPrintDocument({ ...opts, extraHeadHtml }));
  win.document.close();
  return true;
}