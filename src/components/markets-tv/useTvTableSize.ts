'use client';
import { useEffect, useState } from 'react';

/** Keep readable rows on smaller TV/WebView surfaces without vertical scrolling. */
export function useTvTableSize() {
  const [size, setSize] = useState(6);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 761px) and (max-height: 650px)');
    const fit = () => setSize(media.matches ? 4 : 6);
    fit(); media.addListener(fit);
    return () => media.removeListener(fit);
  }, []);
  return size;
}
