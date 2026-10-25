import React, { useEffect, useId, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  /** Judul, mis. "Hapus Data SLA/OLA?" */
  title: string;
  /** Isi pesan. Gunakan <strong className="text-slate-900"> untuk menebalkan nama/tanggal. */
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Selama true: tombol dikunci, Esc & klik latar diabaikan, label konfirmasi berganti. */
  loading?: boolean;
  loadingLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Dialog konfirmasi bergaya seragam untuk SEMUA aksi hapus di aplikasi:
 * ikon bulat di tengah, judul, pesan, garis pemisah, lalu tombol "Batal" + tombol merah.
 * Ubah tampilan di sini saja -> semua dialog ikut berubah.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  children,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  loading = false,
  loadingLabel = 'Menghapus...',
  onConfirm,
  onCancel,
}) => {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Fokus awal ke "Batal" (aksi aman) supaya Enter tidak langsung menghapus.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [loading, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[3000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-fade-in"
      >
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shrink-0">
          <AlertTriangle size={24} />
        </div>

        <div>
          <h3 id={titleId} className="font-extrabold text-slate-900 text-base mb-1">
            {title}
          </h3>
          <div id={descId} className="text-slate-600 text-xs leading-relaxed">
            {children}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100">
          <button
            ref={cancelRef}
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};