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
  sm: 'text-xs',
  md: 'text-xs',
  lg: 'text-xs',
};

const COMPANY_FALLBACKS: Record<string, { text: string; className: string }> = {
  AAPL: { text: 'AAPL', className: 'border-border-strong bg-foreground text-background' },
  AMD: { text: 'AMD', className: 'border-success/25 bg-success-soft text-success' },
  ASML: { text: 'ASML', className: 'border-primary/25 bg-primary-soft text-primary' },
  GOOGL: { text: 'GOOGL', className: 'border-primary/25 bg-primary-soft text-primary' },
  JNJ: { text: 'JNJ', className: 'border-danger/25 bg-danger-soft text-danger' },
  META: { text: 'META', className: 'border-primary/25 bg-primary-soft text-primary' },
  MSFT: { text: 'MSFT', className: 'border-border bg-surface-muted text-foreground-secondary' },
  NVDA: { text: 'NVDA', className: 'border-success/25 bg-success-soft text-success' },
  TSM: { text: 'TSM', className: 'border-primary/25 bg-primary-soft text-primary' },
  TSLA: { text: 'TSLA', className: 'border-danger/25 bg-danger-soft text-danger' },
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
        'company-logo-badge inline-flex shrink-0 items-center justify-center overflow-hidden border bg-surface p-1.5 text-center font-semibold leading-none shadow-[var(--shadow-card)]',
        shape === 'circle' ? 'rounded-[var(--radius-circle)]' : 'rounded-[var(--radius-card)]',
        showImage
          ? 'border-border bg-surface text-foreground-secondary'
          : brandFallback?.className ?? 'border-border bg-surface-muted text-foreground-secondary',
        className,
      )}
      style={{
        width: dimension,
        height: dimension,
        minWidth: dimension,
        minHeight: dimension,
        maxWidth: dimension,
        maxHeight: dimension,
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
        <span className={cn('block font-mono font-semibold tracking-normal', FALLBACK_TEXT_SIZE[size])}>
          {fallbackText(meta.symbol, meta.fallbackText)}
        </span>
      )}
    </span>
  );
}
