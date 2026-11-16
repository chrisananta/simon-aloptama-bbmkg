import React, { useEffect, useMemo, useState } from 'react';
import { X, FileText, Download, Printer } from 'lucide-react';
import { CalibrationRecord } from './CalibrationTypes';
import { petugasService, PetugasItem } from '../../shared/services/petugasService';
import { downloadPagesAsPdf } from '../../shared/print/downloadPagesAsPdf';
import type { UPTStation } from '../../shared/types';
import printlogobmkg from '../../assets/images/BMKGLogo.png';
import footerTte from '../../assets/images/FooterTTE.png';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  records: CalibrationRecord[];
  stations?: UPTStation[];
}

// Penanggung jawab "Mengetahui" otomatis (sama seperti laporan lain).
const KETUA_JABATAN = 'Ketua Tim Kerja Instrumentasi dan Kalibrasi';
const KETUA_NAMA = 'Yessi Veronika Marpaung, S.Tr';
const KETUA_NIP = '199201162012102001';
const KOTA = 'Jayapura';

const ROMAN = ['I', 'II', 'III', 'IV'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** "2026-08-24" -> "24/08/2026" */
const fmtDate = (iso?: string | null) => {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

const quarterOf = (iso: string) => Math.floor((parseInt(iso.split('-')[1], 10) - 1) / 3) + 1;

/** Tanggal selesai pelaksanaan; data lama (tanpa endDate) memakai lastCalibrated. */
const endOf = (r: CalibrationRecord) => r.endDate || r.lastCalibrated;
const startOf = (r: CalibrationRecord) => r.startDate || r.lastCalibrated;

/** Gabungkan nomor order: satu nilai apa adanya; urutan berurutan -> rentang "033-044"; selain itu dipisah koma. */
const mergeOrders = (orders: string[]) => {
  const uniq = Array.from(new Set(orders.map((o) => o.trim()).filter(Boolean)));
  if (uniq.length === 0) return '-';
  if (uniq.length === 1) return uniq[0];
  if (uniq.every((o) => /^\d+$/.test(o))) {
    const sorted = [...uniq].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    const nums = sorted.map((o) => parseInt(o, 10));
    const consecutive = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
    if (consecutive) return `${sorted[0]}-${sorted[sorted.length - 1]}`;
    return sorted.join(', ');
  }
  return uniq.join(', ');
};

const joinAnd = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} dan ${items[items.length - 1]}`;

export const CalibrationRecapReportModal: React.FC<Props> = ({ isOpen, onClose, records, stations = [] }) => {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [petugasList, setPetugasList] = useState<PetugasItem[]>(() => petugasService.getAll());
  const [petugasId, setPetugasId] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    petugasService.fetch().then((data) => setPetugasList(data));
  }, [isOpen]);

  // Petugas default = petugas pertama di master.
  useEffect(() => {
    if (!petugasId && petugasList.length > 0) setPetugasId(petugasList[0].id);
  }, [petugasList, petugasId]);

  const petugas = petugasList.find((p) => p.id === petugasId) || null;

  const stationName = (v: string) => stations.find((s) => s.name === v || s.id === v || s.stationid === v)?.name || v;

  const years = useMemo(() => {
    const set = new Set<string>([String(now.getFullYear())]);
    records.forEach((r) => {
      const e = endOf(r);
      if (e) set.add(e.split('-')[0]);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records]);

  // Rekap: 1 baris per nomor order (tiap order = satu alat); catatan lama tanpa order tetap 1 baris per alat.
  const rows = useMemo(() => {
    const picked = records.filter((r) => {
      const e = endOf(r);
      if (!e || e.split('-')[0] !== year || quarterOf(e) !== quarter) return false;
      if (!petugas) return true;
      return (r.calibrationAgency || '').toLowerCase().includes(petugas.name.toLowerCase());
    });

    const groups = new Map<string, CalibrationRecord[]>();
    picked.forEach((r) => {
      const key = [(r.orderNumber || '').trim() || `__${r.deviceId}`, r.assignmentLetterNumber || '', startOf(r), endOf(r), r.uptStation].join('|');
      groups.set(key, [...(groups.get(key) || []), r]);
    });

    return Array.from(groups.values())
      .map((g) => ({
        order: mergeOrders(g.map((r) => r.orderNumber || '')),
        site: stationName(g[0].uptStation),
        jenis: joinAnd(Array.from(new Set(g.map((r) => r.category).filter(Boolean)))),
        mulai: startOf(g[0]),
        selesai: endOf(g[0]),
        surat: g[0].assignmentLetterNumber || '-',
      }))
      .sort((a, b) => a.mulai.localeCompare(b.mulai) || a.order.localeCompare(b.order));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, year, quarter, petugas, stations]);

  // Tanggal laporan otomatis = hari terakhir triwulan terpilih (mis. Triwulan I 2026 -> 31 Maret 2026).
  const tanggalTeks = (() => {
    const lastDay = new Date(Number(year), quarter * 3, 0);
    return `${lastDay.getDate()} ${MONTHS[lastDay.getMonth()]} ${lastDay.getFullYear()}`;
  })();

  const handleDownload = async () => {
    const el = document.getElementById('calibration-recap-sheet');
    if (!el || isDownloading) return;
    setIsDownloading(true);
    setError(null);
    try {
      await downloadPagesAsPdf(
        [{ element: el, orientation: 'landscape', marginMm: 0, cloneCss: 'margin:0;box-shadow:none;' }],
        `Laporan_Rekapitulasi_Kalibrasi_Lapang_Triwulan_${ROMAN[quarter - 1]}_${year}.pdf`
      );
    } catch (e) {
      console.error('Gagal membuat PDF:', e);
      setError('Gagal membuat PDF. Coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  const fieldClass =
    'w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:bg-white';
  const labelClass = 'block text-[11px] font-bold text-slate-700 mb-1';

  const SHEET_CSS = `
    .cr-sheet, .cr-sheet * { box-sizing: border-box; }
    .cr-sheet {
      position: relative; width: 297mm; height: 210mm; overflow: hidden;
      margin: 0 auto; background: #fff; color: #000;
      font-family: Arial, "Liberation Sans", Helvetica, sans-serif; font-size: 11pt; line-height: 1.2;
      box-shadow: 0 1px 6px rgba(0,0,0,.25);
    }
    .cr-kop { position: absolute; left: 0; top: 0; width: 297mm; height: 35.3mm; background: #d0d0d0; border-bottom: 0.8mm solid #000; }
    .cr-kop::after { content: ""; position: absolute; left: 0; right: 0; bottom: -1.6mm; border-top: 0.25mm solid #000; }
    .cr-kop-logo { position: absolute; left: 7.3mm; top: 4.2mm; width: 25.4mm; height: 25.2mm; object-fit: contain; }
    .cr-kop-text { position: absolute; left: 32.7mm; right: 7mm; top: 5.9mm; text-align: center; font-weight: bold; }
    .cr-kop-1 { font-size: 16pt; line-height: 7mm; }
    .cr-kop-2 { font-size: 13pt; line-height: 6mm; }
    .cr-kop-3 { font-size: 12pt; line-height: 5.6mm; }
    .cr-link { color: #0563c1; text-decoration: underline; }
    .cr-footer { position: absolute; left: 68.9mm; bottom: 12.6mm; width: 159.2mm; height: 8.9mm; }
    .cr-footer img { display: block; width: 100%; height: 100%; }

    .cr-body { position: absolute; left: 20mm; right: 20mm; top: 43mm; }
    .cr-title { text-align: center; font-size: 14pt; font-weight: bold; line-height: 7mm; margin-bottom: 4mm; }
    .cr-info { font-size: 10pt; line-height: 4.8mm; margin-bottom: 4mm; }
    .cr-info td { padding: 0; }
    .cr-table { width: 100%; border-collapse: collapse; font-family: Calibri, Carlito, Arial, sans-serif; font-size: 9.5pt; }
    .cr-table th, .cr-table td { border: 0.3mm solid #000; padding: 0.8mm 1.5mm; text-align: center; vertical-align: middle; line-height: 1.15; }
    .cr-table th { background: #c6e0b4; font-weight: bold; }
    .cr-sign-row { display: flex; justify-content: space-between; margin-top: 16mm; font-size: 10pt; text-align: center; line-height: 5mm; }
    .cr-sign { width: 85mm; }
    .cr-sign-space { height: 17mm; }
    .cr-sign-name { font-weight: bold; }

    @media print {
      @page { size: A4 landscape; margin: 0; }
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body * { visibility: hidden !important; }
      #calibration-recap-sheet, #calibration-recap-sheet * { visibility: visible !important; }
      #calibration-recap-sheet { position: fixed !important; left: 0 !important; top: 0 !important; margin: 0 !important; box-shadow: none !important; }
    }
  `;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <style>{SHEET_CSS}</style>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-2 sm:my-6 flex flex-col max-h-[95vh] overflow-hidden">
        <div className="no-print bg-slate-900 text-white p-3.5 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText size={20} className="text-blue-400 shrink-0" />
            <h3 className="font-heading font-bold text-sm sm:text-lg truncate">
              Laporan Rekapitulasi Pelaksanaan Kalibrasi Lapang
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer shrink-0"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-3 sm:p-5 space-y-4 bg-slate-100">
          <div className="no-print bg-white rounded-xl border border-slate-200 p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className={labelClass}>Tahun</label>
              <select value={year} onChange={(e) => setYear(e.target.value)} className={fieldClass}>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Triwulan</label>
              <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} className={fieldClass}>
                {ROMAN.map((r, i) => (
                  <option key={r} value={i + 1}>Triwulan {r}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Petugas Kalibrasi</label>
              <select value={petugasId} onChange={(e) => setPetugasId(e.target.value)} className={fieldClass}>
                {petugasList.length === 0 && <option value="">Belum ada data petugas</option>}
                {petugasList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.nip ? ` — ${p.nip}` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="no-print flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-600">
              {rows.length} pelaksanaan pada Triwulan {ROMAN[quarter - 1]} {year}
              {petugas ? ` untuk ${petugas.name}` : ''}. Satu baris per nomor order.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Printer size={14} /> Cetak
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0052CC] hover:bg-[#003a99] text-white cursor-pointer disabled:opacity-60"
              >
                <Download size={14} /> {isDownloading ? 'Membuat PDF...' : 'Unduh PDF'}
              </button>
            </div>
          </div>
          {error && (
            <div className="no-print p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">{error}</div>
          )}

          <div className="overflow-x-auto pb-2">
            <section id="calibration-recap-sheet" className="cr-sheet">
              <header className="cr-kop">
                <img className="cr-kop-logo" src={printlogobmkg} alt="Logo BMKG" />
                <div className="cr-kop-text">
                  <div className="cr-kop-1">BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA</div>
                  <div className="cr-kop-2">BALAI BESAR METEOROLOGI, KLIMATOLOGI DAN GEOFISIKA WILAYAH V</div>
                  <div className="cr-kop-3">Jl. Raya Abepura Entrop - Jayapura, Telp : (0967) 5165442, Kode Pos 99224</div>
                  <div className="cr-kop-3">
                    Email : <span className="cr-link">bbmkg5@bmkg.go.id</span> Website : <span className="cr-link">bbmkg5.bmkg.go.id</span>
                  </div>
                </div>
              </header>

              <div className="cr-body">
                <div className="cr-title">Laporan Rekapitulasi Pelaksanaan Kalibrasi Lapang</div>

                <table className="cr-info">
                  <tbody>
                    {[
                      ['Tahun', year],
                      ['Triwulan', ROMAN[quarter - 1]],
                      ['Nama', petugas?.name || '-'],
                      ['NIP', petugas?.nip || '-'],
                    ].map(([k, v]) => (
                      <tr key={k}>
                        <td style={{ width: '22mm' }}>{k}</td>
                        <td>: {v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <table className="cr-table">
                  <thead>
                    <tr>
                      <th rowSpan={2}>No</th>
                      <th rowSpan={2}>Nomer Order</th>
                      <th rowSpan={2}>Nama Site</th>
                      <th rowSpan={2}>Jenis Peralatan</th>
                      <th colSpan={2}>Tanggal</th>
                      <th rowSpan={2}>Nomor Surat Tugas</th>
                      <th rowSpan={2}>Keterangan</th>
                    </tr>
                    <tr>
                      <th>Mulai</th>
                      <th>Selesai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '3mm' }}>
                          Tidak ada data kalibrasi lapang pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{r.order}</td>
                          <td>{r.site}</td>
                          <td>{r.jenis}</td>
                          <td>{fmtDate(r.mulai)}</td>
                          <td>{fmtDate(r.selesai)}</td>
                          <td>{r.surat}</td>
                          <td>-</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <div className="cr-sign-row">
                  <div className="cr-sign">
                    <div>Mengetahui,</div>
                    <div>{KETUA_JABATAN}</div>
                    <div>BBMKG Wilayah V Jayapura</div>
                    <div className="cr-sign-space" />
                    <div className="cr-sign-name">{KETUA_NAMA}</div>
                    <div>NIP. {KETUA_NIP}</div>
                  </div>
                  <div className="cr-sign">
                    <div>{KOTA}, {tanggalTeks}</div>
                    <div>Petugas Kalibrasi</div>
                    <div style={{ height: '5mm' }} />
                    <div className="cr-sign-space" />
                    <div className="cr-sign-name">{petugas?.name || '-'}</div>
                    <div>NIP. {petugas?.nip || '-'}</div>
                  </div>
                </div>
              </div>

              <div className="cr-footer">
                <img src={footerTte} alt="Dokumen ini telah ditandatangani secara elektronik" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};