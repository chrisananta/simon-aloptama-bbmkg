import { useCallback, useEffect, useRef, useState } from 'react';
import { NETWORK_ERROR_EVENT } from '../api/http';

/**
 * - online      : browser online DAN server SIMON bisa dihubungi
 * - offline     : browser melaporkan tidak ada koneksi internet / jaringan
 * - server-down : internet ada, tetapi server SIMON tidak menjawab
 */
export type ConnectionStatus = 'online' | 'offline' | 'server-down';

const HEALTH_URL = '/api/health'; // endpoint publik (tanpa login)
const CHECK_TIMEOUT_MS = 4000;
const POLL_ONLINE_MS = 5_000; // saat normal: cek berkala yang ringan
const POLL_DOWN_MS = 3_000; // saat terputus: coba sambung ulang lebih sering
const RETRY_DELAY_MS = 500; // konfirmasi ulang cepat sebelum banner tampil (hindari berkedip)
const TRIGGER_MIN_GAP_MS = 1_500; // redam pemicu beruntun dari request API yang gagal bersamaan
const RECOVERED_VISIBLE_MS = 3_000;

type PingResult = 'ok' | 'degraded' | 'unreachable';

/**
 * ok          : server menjawab sehat (termasuk database)
 * degraded    : server menjawab, tetapi melaporkan masalah (mis. 503 database tak terjangkau)
 * unreachable : tidak ada jawaban sama sekali (jaringan putus / timeout)
 */
async function pingServer(): Promise<PingResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(HEALTH_URL, { cache: 'no-store', signal: controller.signal });
    return res.ok ? 'ok' : 'degraded';
  } catch {
    return 'unreachable';
  } finally {
    window.clearTimeout(timer);
  }
}

interface Options {
  /** Pantau hanya saat true (mis. setelah login). */
  enabled: boolean;
  /** Dipanggil sekali setiap koneksi PULIH (mis. untuk menyinkronkan ulang data). */
  onReconnect?: () => void;
}

export function useConnectionStatus({ enabled, onReconnect }: Options) {
  const [status, setStatus] = useState<ConnectionStatus>(() =>
    typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'online'
  );
  const [isChecking, setIsChecking] = useState(false);
  const [justRecovered, setJustRecovered] = useState(false);

  const statusRef = useRef<ConnectionStatus>(status);
  const inFlight = useRef(false);
  const lastCheckAt = useRef(0);
  const recoveredTimer = useRef<number | undefined>(undefined);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onReconnectRef.current = onReconnect;
  });

  useEffect(() => () => window.clearTimeout(recoveredTimer.current), []);

  const applyStatus = useCallback((next: ConnectionStatus) => {
    const prev = statusRef.current;
    if (prev === next) return;
    statusRef.current = next;
    setStatus(next);

    if (next === 'online') {
      setJustRecovered(true);
      onReconnectRef.current?.();
      window.clearTimeout(recoveredTimer.current);
      recoveredTimer.current = window.setTimeout(() => setJustRecovered(false), RECOVERED_VISIBLE_MS);
    } else {
      window.clearTimeout(recoveredTimer.current);
      setJustRecovered(false);
    }
  }, []);

  const check = useCallback(
    async (manual = false) => {
      if (inFlight.current && !manual) return;
      inFlight.current = true;
      lastCheckAt.current = Date.now();
      if (manual) setIsChecking(true);
      try {
        if (!navigator.onLine) {
          applyStatus('offline');
          return;
        }
        let result = await pingServer();
        // Server sendiri sudah bilang bermasalah (degraded) -> langsung tampilkan banner.
        // Tidak ada jawaban sama sekali (unreachable) saat status masih normal -> konfirmasi
        // sekali lagi sebentar, supaya satu hiccup tidak memunculkan banner.
        if (result === 'unreachable' && !manual && statusRef.current === 'online') {
          await new Promise((resolve) => window.setTimeout(resolve, RETRY_DELAY_MS));
          if (!navigator.onLine) {
            applyStatus('offline');
            return;
          }
          result = await pingServer();
        }
        applyStatus(result === 'ok' ? 'online' : 'server-down');
      } finally {
        inFlight.current = false;
        if (manual) setIsChecking(false);
      }
    },
    [applyStatus]
  );

  // Pemicu cepat: perubahan status jaringan browser, request API yang gagal total, tab aktif lagi.
  useEffect(() => {
    if (!enabled) return;
    const handleOffline = () => applyStatus('offline');
    const handleTrigger = () => void check();
    const handleRequestFailed = () => {
      if (Date.now() - lastCheckAt.current >= TRIGGER_MIN_GAP_MS) void check();
    };
    const handleVisibility = () => {
      if (!document.hidden) void check();
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleTrigger);
    window.addEventListener(NETWORK_ERROR_EVENT, handleRequestFailed);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleTrigger);
      window.removeEventListener(NETWORK_ERROR_EVENT, handleRequestFailed);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, applyStatus, check]);

  // Cek berkala; lebih sering saat sedang terputus supaya pulih otomatis tanpa klik apa pun.
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(
      () => {
        if (!document.hidden) void check();
      },
      status === 'online' ? POLL_ONLINE_MS : POLL_DOWN_MS
    );
    return () => window.clearInterval(id);
  }, [enabled, status, check]);

  const recheck = useCallback(() => check(true), [check]);

  return { status, isChecking, justRecovered, recheck };
}