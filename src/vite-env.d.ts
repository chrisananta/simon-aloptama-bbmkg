/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * API key gratis dari MapTiler (daftar di https://cloud.maptiler.com/),
   * dipakai untuk basemap peta monitoring. Tanpa key ini, peta akan
   * fallback ke tile.openstreetmap.org yang SERING DIBLOKIR (403 "Access
   * blocked") untuk pemakaian aplikasi produksi, terutama di Firefox.
   */
  readonly VITE_MAPTILER_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}