'use client';
import { useEffect, useState } from 'react';

/** Keep the page size stable while a quote page and its ticker are loading. */
export function useTvTableSize(directory = false) {
  const [size, setSize] = useState(6);
  useEffect(() => {
    const short = window.matchMedia('(min-width: 761px) and (max-height: 650px)');
    const tablet = window.matchMedia('(min-width: 761px) and (max-height: 710px)');
    const fit = () => setSize(short.matches ? 3 : directory && tablet.matches ? 4 : 6);
    fit();
    short.addListener(fit); tablet.addListener(fit);
    return () => { short.removeListener(fit); tablet.removeListener(fit); };
  }, [directory]);
  return size;
}
