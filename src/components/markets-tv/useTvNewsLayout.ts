'use client';
import { useCallback, useEffect, useState } from 'react';
import { tvNewsLayout } from '@/lib/markets-tv/newsLayout';

export function useTvNewsLayout() {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState({ columns: 1, rows: 1, count: 1 });
  const ref = useCallback((node: HTMLDivElement | null) => setElement(node), []);
  useEffect(() => {
    if (!element) return;
    const fit = () => {
      const next = tvNewsLayout(element.clientWidth, element.clientHeight, parseFloat(getComputedStyle(element).fontSize));
      if (next) setLayout(previous => previous.columns === next.columns && previous.rows === next.rows ? previous : next);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return { ref, ...layout };
}
