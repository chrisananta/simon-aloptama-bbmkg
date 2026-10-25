import { useState } from 'react';

/**
 * Mengembalikan true begitu `flag` pernah true, dan tetap true setelahnya.
 * Dipakai untuk modal yang di-lazy-load: kodenya baru diunduh saat modal pertama kali
 * dibuka, tapi setelah itu tetap ter-mount supaya state & animasi tutupnya tidak hilang.
 */
export function useEverTrue(flag: boolean): boolean {
  const [ever, setEver] = useState(flag);
  if (flag && !ever) setEver(true); // set-state saat render: pola resmi React untuk state turunan
  return ever || flag;
}