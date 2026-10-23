import { prisma } from '../db/prisma.js';

/**
 * UPT di aplikasi ini tersimpan dalam dua format tergantung sumbernya: KODE
 * stasiun (mis. "GEO001" - akun Teknisi/KaUPT hasil seed) atau NAMA stasiun
 * (mis. "Stasiun Geofisika Angkasa" - alat hasil import & form admin).
 * Fungsi ini menganggap keduanya sama selama menunjuk ke stasiun yang sama
 * (sama seperti isSameUpt di frontend: src/shared/utils/uptMatch.ts).
 */
const norm = (v?: string | null): string => (v ?? '').trim().toUpperCase();

export async function isSameUptStation(
  a: string | null | undefined,
  b: string | null | undefined
): Promise<boolean> {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const stations = await prisma.uptStation.findMany({ select: { stationid: true, name: true } });
  const keyOf = (v: string): string => {
    const st = stations.find((s) => norm(s.stationid) === v || norm(s.name) === v);
    return st ? norm(st.stationid) : v;
  };
  return keyOf(na) === keyOf(nb);
}