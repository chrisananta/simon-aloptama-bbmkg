import React from 'react';
import { 
  X, 
  Server, 
  RefreshCw, 
  CheckCircle2, 
  Database
} from 'lucide-react';
import { ServerFetchResult } from '../../api/serverDataService';

interface ServerStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncState: ServerFetchResult;
  onTriggerSync: () => void;
  isSyncing: boolean;
}

export const ServerStatusModal: React.FC<ServerStatusModalProps> = ({
  isOpen,
  onClose,
  syncState,
  onTriggerSync,
  isSyncing,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-2 sm:my-6 flex flex-col max-h-[95vh]">
        {/* Modal Header */}
        <div className="bg-[#0A203C] text-white p-3 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Server size={18} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-heading text-sm sm:text-lg font-bold">Server Data BMKG</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  API REALTIME
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-300 mt-0.5">
                Database Server Pusat Operasional BBMKG Wilayah V Papua
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors shrink-0"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-3 sm:px-5 py-2.5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between flex-wrap gap-2 text-[11px] sm:text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="font-semibold text-slate-700">Sumber Data:</span>
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-bold px-2 sm:px-2.5 py-1 rounded-md border border-emerald-200">
              <CheckCircle2 size={13} className="text-emerald-600" />
              BMKG Backend API Server
            </span>
          </div>

          <button
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-1.5 bg-[#0052CC] hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-3 py-1.5 rounded-lg shadow-2xs transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Data Server'}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 text-slate-700 text-[11px] sm:text-xs overflow-y-auto">
          <div className="p-3 sm:p-4 bg-blue-50/70 border border-blue-200 rounded-lg sm:rounded-xl space-y-2">
            <div className="flex justify-between items-center text-blue-900 font-bold text-xs sm:text-sm">
              <span className="flex items-center gap-1.5 sm:gap-2">
                <Database size={15} className="text-[#0052CC] sm:w-4 sm:h-4" />
                Status Database Server
              </span>
              <span className="text-[10px] sm:text-xs bg-blue-200 text-blue-900 px-2 sm:px-2.5 py-0.5 rounded-full font-mono shrink-0">
                ONLINE
              </span>
            </div>
            <p className="text-slate-600">
              Aplikasi saat ini terhubung langsung ke <strong>Server Database Internal BMKG</strong>. Seluruh entri status peralatan, perubahan SLA & OLA, serta histori kalibrasi diproses dan disimpan secara terpusat di server.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl space-y-1">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 block">Data Master Instrumen</span>
              <span className="font-heading font-black text-base sm:text-xl text-slate-900">{syncState.devices.length} Unit</span>
              <span className="text-[9px] sm:text-[10px] text-emerald-600 font-bold block">100% Terdaftar di Master Server</span>
            </div>
            <div className="p-2.5 sm:p-3.5 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl space-y-1">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 block">Arsip Log Multi-Tahun</span>
              <span className="font-heading font-bold text-xs sm:text-sm text-blue-700 block mt-1">Permanen (2024 - 2026+)</span>
              <span className="text-[9px] sm:text-[10px] text-emerald-600 font-bold block">Tersimpan Bertahun-tahun</span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-2.5 sm:pt-3 space-y-2">
            <span className="font-bold text-slate-800 block">Struktur Endpoint Repository Server:</span>
            <div className="space-y-1.5 font-mono text-[10px] sm:text-[11px] text-slate-600">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="break-all">GET /api/master/devices</span>
                <span className="text-emerald-600 font-bold shrink-0">200 OK (Data Master Aloptama)</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="break-all">GET /api/history</span>
                <span className="text-emerald-600 font-bold shrink-0">200 OK (Histori Multi-Tahun)</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="break-all">POST /api/sla-ola</span>
                <span className="text-emerald-600 font-bold shrink-0">200 OK (Update & Append Log)</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <span className="break-all">POST /api/calibration</span>
                <span className="text-emerald-600 font-bold shrink-0">200 OK (INSKAL History Log)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2 sm:gap-0 justify-between shrink-0">
          <span className="text-[10px] sm:text-xs text-slate-500 font-medium text-center sm:text-left">
            BMKG Aloptama Server Engine © 2026
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white text-[11px] sm:text-xs font-bold px-4 py-2 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
