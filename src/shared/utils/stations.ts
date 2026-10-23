import type { UPTStation } from '../types';

/**
 * Nama stasiun dari ID-nya (UPTStation.id). Dipakai untuk TAMPILAN saja;
 * pencocokan/filter selalu membandingkan stationId secara langsung.
 * `stationId` kosong (null/undefined) = level Balai (tidak terikat satu UPT).
 */
export function getStationName(
  stations: readonly UPTStation[],
  stationId: string | null | undefined,
  fallback = '-',
): string {
  if (!stationId) return fallback;
  return stations.find((s) => s.id === stationId)?.name ?? fallback;
}