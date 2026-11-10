import React from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import type { ConnectionStatus } from '../hooks/useConnectionStatus';

interface ConnectionBannerProps {
  status: ConnectionStatus;
  isChecking: boolean;
  justRecovered: boolean;
  onRetry: () => void;
  /** Waktu sinkron data terakhir (opsional, ditampilkan saat terputus). */
  lastUpdate?: string;
}

const MESSAGES: Record<Exclude<ConnectionStatus, 'online'>, { title: string; body: string }> = {
  offline: {
    title: 'Tidak ada koneksi internet',
    body: 'Pastikan perangkat Anda memiliki koneksi internet aktif.',
  },
  'server-down': {
    title: 'Koneksi ke server terputus',
    body: 'SIMON sedang mencoba menyambung kembali. Periksa jaringan Anda jika masalah berlanjut.',
  },
};

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
  status,
  isChecking,
  justRecovered,
  onRetry,
  lastUpdate,
}) => {
  if (status === 'online' && !justRecovered) return null;

  const showLastUpdate = !!lastUpdate && lastUpdate !== 'Belum sinkron';

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[104px] z-[35] flex justify-center px-3">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg animate-fade-in ${
          status === 'online'
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-amber-200 bg-[#FEF4E3]'
        }`}
      >
        {status === 'online' ? (
          <CheckCircle2 size={26} className="mt-0.5 shrink-0 text-emerald-600" />
        ) : (
          <AlertTriangle size={26} className="mt-0.5 shrink-0 text-amber-500" />
        )}

        <div className="min-w-0 flex-1">
          {status === 'online' ? (
            <>
              <p className="text-sm font-bold text-slate-900">Terhubung kembali</p>
              <p className="text-xs text-slate-600">Data sedang diperbarui dari server.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-900">{MESSAGES[status].title}</p>
              <p className="text-xs text-slate-600">{MESSAGES[status].body}</p>
              {showLastUpdate && (
                <p className="mt-0.5 text-[11px] text-slate-500">Data terakhir diperbarui: {lastUpdate}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};