'use client';
import { useEffect, useRef } from 'react';
export function TvQr({ value, label }: { value: string; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    let cancelled = false;
    void import('qrcode').then(QRCode => {
      if (cancelled || canvas.current !== target) return;
      return QRCode.toCanvas(target, value, { width: 260, margin: 3, errorCorrectionLevel: 'M' });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [value]);
  return <canvas ref={canvas} className="tv-qr" role="img" aria-label={label} />;
}
