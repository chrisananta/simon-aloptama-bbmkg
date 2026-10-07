/**
 * Menentukan provinsi sebuah titik koordinat dari GeoJSON batas provinsi.
 * Dipakai filter wilayah dashboard: wilayah alat = lokasi FISIK alat,
 * bukan provinsi kantor UPT pengelolanya (satu UPT bisa mengelola alat
 * yang tersebar di banyak provinsi).
 */
type Ring = number[][];
type Polygon = Ring[]; // [outer, ...holes]

export interface ProvinceShape {
  name: string;
  polygons: Polygon[];
}

let cache: Promise<ProvinceShape[]> | null = null;

export function loadPapuaProvinces(): Promise<ProvinceShape[]> {
  if (!cache) {
    cache = fetch('/geo/provinsi-indonesia.geojson')
      .then((r) => r.json())
      .then((geo: GeoJSON.FeatureCollection) =>
        geo.features
          .filter((f) => String(f.properties?.PROVINSI ?? '').startsWith('Papua'))
          .map((f) => {
            const g = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
            return {
              name: String(f.properties?.PROVINSI),
              polygons: g.type === 'Polygon' ? [g.coordinates as Polygon] : (g.coordinates as Polygon[]),
            };
          })
      )
      .catch(() => {
        cache = null; // boleh dicoba lagi
        return [];
      });
  }
  return cache;
}

function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(lng: number, lat: number, poly: Polygon): boolean {
  if (!poly.length || !inRing(lng, lat, poly[0])) return false;
  return !poly.slice(1).some((hole) => inRing(lng, lat, hole));
}

export function findProvince(lat: number, lng: number, shapes: ProvinceShape[]): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;

  for (const s of shapes) {
    if (s.polygons.some((p) => inPolygon(lng, lat, p))) return s.name;
  }

  // Titik di tepi pantai / sedikit di luar poligon: ambil provinsi dengan
  // titik batas terdekat (dalam batas ~0.5 derajat) agar alat pesisir tidak hilang.
  let best: string | null = null;
  let bestD = 0.25; // derajat^2 (~0.5 derajat)
  for (const s of shapes) {
    for (const poly of s.polygons) {
      for (const [x, y] of poly[0]) {
        const d = (x - lng) ** 2 + (y - lat) ** 2;
        if (d < bestD) {
          bestD = d;
          best = s.name;
        }
      }
    }
  }
  return best;
}