'use client';
import { useEffect, useRef } from 'react';
export function TvQr({ value, label, size = 260 }: { value: string; label: string; size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    let cancelled = false;
    void import('qrcode').then(async QRCode => {
      if (cancelled || canvas.current !== target) return;
      await QRCode.toCanvas(target, value, { width: size, margin: 3, errorCorrectionLevel: 'M' });
      if (cancelled || canvas.current !== target) return;
      // Keep the square intrinsic bitmap, but let responsive TV styles size it.
      // The library's inline height would otherwise stretch a narrowed canvas.
      target.style.removeProperty('width');
      target.style.removeProperty('height');
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [value, size]);
  return <canvas ref={canvas} width={size} height={size} className="tv-qr" role="img" aria-label={label} />;
}
