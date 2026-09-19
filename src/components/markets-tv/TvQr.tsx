'use client';
import { useEffect, useRef } from 'react';
export function TvQr({ value, label }: { value: string; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    void import('qrcode').then(qr => { if (!cancelled && canvas.current) return qr.toCanvas(canvas.current, value, { width: 260, margin: 3, errorCorrectionLevel: 'M' }); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [value]);
  return <canvas ref={canvas} className="tv-qr" role="img" aria-label={label} />;
}
