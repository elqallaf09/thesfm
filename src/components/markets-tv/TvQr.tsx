'use client';
import * as QRCode from 'qrcode';
import { useEffect, useRef } from 'react';
export function TvQr({ value, label }: { value: string; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvas.current) return;
    void QRCode.toCanvas(canvas.current, value, { width: 260, margin: 3, errorCorrectionLevel: 'M' }).catch(() => undefined);
  }, [value]);
  return <canvas ref={canvas} className="tv-qr" role="img" aria-label={label} />;
}
