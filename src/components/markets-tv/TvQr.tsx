'use client';
import { useEffect, useRef } from 'react';
export function TvQr({ value, label, size = 260 }: { value: string; label: string; size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const target = canvas.current;
    if (!target) return;
    let cancelled = false;
    void import('qrcode').then(QRCode => {
      if (cancelled || canvas.current !== target) return;
      return QRCode.toCanvas(target, value, { width: size, margin: 3, errorCorrectionLevel: 'M' });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [value, size]);
  return <canvas ref={canvas} width={size} height={size} className="tv-qr" role="img" aria-label={label} />;
}
