import { UPTStation } from '../types';

/**
 * Data UPT di aplikasi ini tersimpan dalam dua format berbeda tergantung
 * sumbernya: KODE stasiun (mis. "MET001" - akun teknisi/KaUPT & seed CSV) atau
 * NAMA stasiun (mis. "Stasiun Meteorologi DEO Sorong" - import & form admin).
 * Helper ini menganggap keduanya sama selama menunjuk ke stasiun yang sama.
 */
const norm = (v?: string | null): string => (v ?? '').trim().toUpperCase();

export function findStation(value: string | undefined | null, stations: UPTStation[]): UPTStation | undefined {
  const n = norm(value);
  if (!n) return undefined;
  return stations.find((s) => norm(s.stationid) === n || norm(s.name) === n);
}

function stationKey(value: string | undefined | null, stations: UPTStation[]): string {
  const st = findStation(value, stations);
  return st ? norm(st.stationid) : norm(value);
}

export function isSameUpt(
  a: string | undefined | null,
  b: string | undefined | null,
  stations: UPTStation[]
): boolean {
  const ka = stationKey(a, stations);
  return !!ka && ka === stationKey(b, stations);
}