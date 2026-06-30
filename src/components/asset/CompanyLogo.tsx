'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { getAssetVisualMeta, type AssetVisualInput } from '@/lib/assetVisuals';

type CompanyLogoSize = 'sm' | 'md' | 'lg';
type CompanyLogoShape = 'rounded' | 'circle';

export type CompanyLogoProps = AssetVisualInput & {
  size?: CompanyLogoSize;
  shape?: CompanyLogoShape;
  className?: string;
  imageClassName?: string;
  decorative?: boolean;
};

const LOGO_SIZE: Record<CompanyLogoSize, number> = {
  sm: 44,
  md: 48,
  lg: 56,
};

const FALLBACK_TEXT_SIZE: Record<CompanyLogoSize, string> = {
  sm: 'text-[9px]',
  md: 'text-[10px]',
  lg: 'text-xs',
};

const COMPANY_FALLBACKS: Record<string, { text: string; className: string }> = {
  AAPL: { text: 'AAPL', className: 'border-neutral-200 bg-neutral-950 text-white dark:border-white/25 dark:bg-white dark:text-neutral-950' },
  AMD: { text: 'AMD', className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/25 dark:bg-emerald-400/12 dark:text-emerald-100' },
  ASML: { text: 'ASML', className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-300/25 dark:bg-sky-400/12 dark:text-sky-100' },
  GOOGL: { text: 'GOOGL', className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-300/25 dark:bg-blue-400/12 dark:text-blue-100' },
  JNJ: { text: 'JNJ', className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-300/25 dark:bg-rose-400/12 dark:text-rose-100' },
  META: { text: 'META', className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-300/25 dark:bg-blue-400/12 dark:text-blue-100' },
  MSFT: { text: 'MSFT', className: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-300/25 dark:bg-slate-300/12 dark:text-slate-100' },
  NVDA: { text: 'NVDA', className: 'border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-300/25 dark:bg-lime-400/12 dark:text-lime-100' },
  TSM: { text: 'TSM', className: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-300/25 dark:bg-blue-400/12 dark:text-blue-100' },
  TSLA: { text: 'TSLA', className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-300/25 dark:bg-red-400/12 dark:text-red-100' },
};

function fallbackText(symbol: string, metaFallback: string) {
  const mapped = COMPANY_FALLBACKS[symbol]?.text;
  if (mapped) return mapped;

  const compact = symbol.replace(/[^A-Z0-9]/g, '');
  return (compact || metaFallback || 'SFM').slice(0, 5);
}

export function CompanyLogo({
  symbol,
  name,
  companyName,
  assetType = 'stock',
  exchange,
  market,
  logoUrl,
  imageUrl,
  size = 'md',
  shape = 'rounded',
  className,
  imageClassName,
  decorative = true,
}: CompanyLogoProps) {
  const meta = useMemo(() => getAssetVisualMeta({ symbol, name, companyName, assetType, exchange, market, logoUrl, imageUrl }), [
    assetType,
    companyName,
    exchange,
    imageUrl,
    logoUrl,
    market,
    name,
    symbol,
  ]);
  const [imageFailed, setImageFailed] = useState(false);
  const dimension = LOGO_SIZE[size];
  const brandFallback = COMPANY_FALLBACKS[meta.symbol];
  const showImage = Boolean(meta.logoUrl && !imageFailed);

  useEffect(() => {
    setImageFailed(false);
  }, [meta.logoUrl]);

  return (
    <span
      className={cn(
        'company-logo-badge inline-flex shrink-0 items-center justify-center overflow-hidden border bg-white p-1.5 text-center font-black leading-none shadow-sm',
        shape === 'circle' ? 'rounded-full' : 'rounded-xl',
        showImage
          ? 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-white dark:text-slate-700'
          : brandFallback?.className ?? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-300/20 dark:bg-slate-300/10 dark:text-slate-100',
        className,
      )}
      style={{
        width: dimension,
        height: dimension,
        minWidth: dimension,
        minHeight: dimension,
        maxWidth: dimension,
        maxHeight: dimension,
        borderRadius: shape === 'circle' ? 999 : 12,
      }}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : meta.alt}
      title={decorative ? undefined : meta.alt}
      dir="ltr"
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta.logoUrl ?? undefined}
          alt={decorative ? '' : meta.alt}
          loading="lazy"
          decoding="async"
          className={cn('block', imageClassName)}
          style={{
            maxWidth: '80%',
            maxHeight: '80%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            objectPosition: 'center',
          }}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className={cn('block tracking-normal', FALLBACK_TEXT_SIZE[size])}>
          {fallbackText(meta.symbol, meta.fallbackText)}
        </span>
      )}
    </span>
  );
}
