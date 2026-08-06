import React from 'react';
import { AlertTriangle, RefreshCw, Trash2, Copy, Check, ShieldAlert } from 'lucide-react';

interface Props {
  children?: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      copied: false,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SIMON Error Boundary caught an exception:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetCache = () => {
    try {
      localStorage.removeItem('simon_devices_data');
      localStorage.removeItem('simon_calibration_logs');
      localStorage.removeItem('simon_stations_v1');
      localStorage.removeItem('simon_change_logs_v1');
      window.location.reload();
    } catch (e) {
      console.error('Failed to reset localStorage cache:', e);
      window.location.reload();
    }
  };

  handleCopyDetails = () => {
    const text = `SIMON Applet Error Details:\nMessage: ${this.state.error?.message}\nStack: ${this.state.error?.stack}\nComponent Stack: ${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#0A203C] text-white flex items-center justify-center p-4 font-['Inter',sans-serif]">
          <div className="max-w-2xl w-full bg-white text-slate-800 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-rose-600 p-6 text-white flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                <ShieldAlert size={32} />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider">
                  System Guard • SIMON Error Boundary
                </span>
                <h2 className="font-heading font-extrabold text-xl sm:text-2xl mt-1">
                  Terjadi Kesalahan Aplikasi
                </h2>
                <p className="text-xs text-rose-100 mt-0.5">
                  Aplikasi mendeteksi pengecualian runtime yang tidak terduga. Sistem mengamankan data Anda.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                  <AlertTriangle size={18} className="shrink-0 text-rose-600" />
                  <span>Detail Pesan Error:</span>
                </div>
                <p className="font-mono text-xs text-rose-900 bg-white p-3 rounded-xl border border-rose-200 break-words">
                  {this.state.error?.message || 'Unknown runtime rendering exception'}
                </p>
              </div>

              {this.state.error?.stack && (
                <details className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-700">
                  <summary className="font-bold cursor-pointer text-slate-800 hover:text-blue-600 select-none">
                    Tampilkan Stack Trace Diagnostik
                  </summary>
                  <pre className="mt-3 p-3 bg-slate-900 text-slate-200 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-48 whitespace-pre-wrap">
                    {this.state.error.stack}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
                <button
                  onClick={this.handleCopyDetails}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {this.state.copied ? (
                    <>
                      <Check size={15} className="text-emerald-600" />
                      <span>Berhasil Disalin</span>
                    </>
                  ) : (
                    <>
                      <Copy size={15} />
                      <span>Salin Detail Error</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={this.handleResetCache}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Mereset data lokal sementara dan memuat kembali aplikasi"
                  >
                    <Trash2 size={15} />
                    <span>Reset Cache &amp; Reload</span>
                  </button>

                  <button
                    onClick={this.handleReload}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0052CC] hover:bg-blue-700 text-white shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw size={15} />
                    <span>Coba Lagi / Refresh</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 text-center text-[11px] text-slate-500">
              SIMON Aloptama BBMKG Wilayah V Papua • Error Recovery Handler
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
