'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  Banknote,
  Bitcoin,
  Building2,
  BriefcaseBusiness,
  ChartCandlestick,
  CircleDollarSign,
  Droplets,
  Flame,
  Gem,
  Landmark,
  LineChart,
  House,
  WalletCards,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAssetVisualMeta, type AssetVisualInput, type AssetVisualMeta, type AssetVisualType } from '@/lib/assetVisuals';

type AssetAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type AssetAvatarProps = AssetVisualInput & {
  size?: AssetAvatarSize;
  className?: string;
  imageClassName?: string;
  decorative?: boolean;
};

type AssetBadgeProps = AssetAvatarProps & {
  showName?: boolean;
  showSymbol?: boolean;
  nameClassName?: string;
  symbolClassName?: string;
};

const sizeClass: Record<AssetAvatarSize, string> = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-xs',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-16 w-16 text-base',
};

const iconSize: Record<AssetAvatarSize, number> = {
  xs: 12,
  sm: 15,
  md: 18,
  lg: 21,
  xl: 28,
};

const toneClass: Record<AssetVisualType, string> = {
  stock: 'border-primary/25 bg-primary-soft text-primary',
  crypto: 'border-warning/25 bg-warning-soft text-warning',
  etf: 'border-primary/25 bg-primary-soft text-primary',
  forex: 'border-accent/25 bg-accent-soft text-foreground-secondary',
  commodity: 'border-border bg-surface-muted text-foreground-secondary',
  gold: 'border-warning/25 bg-warning-soft text-warning',
  silver: 'border-border bg-surface-muted text-foreground-secondary',
  oil: 'border-border-strong bg-surface-muted text-foreground',
  gas: 'border-accent/25 bg-accent-soft text-foreground-secondary',
  index: 'border-primary/25 bg-primary-soft text-primary',
  fund: 'border-primary/25 bg-primary-soft text-primary',
  'real-estate': 'border-accent/25 bg-accent-soft text-accent',
  cash: 'border-success/25 bg-success-soft text-success',
  project: 'border-primary/25 bg-primary-soft text-primary',
  unknown: 'border-border bg-surface-muted text-foreground-secondary',
};

function IconForType({ meta, size }: { meta: AssetVisualMeta; size: AssetAvatarSize }) {
  const pixels = iconSize[size];
  if (meta.iconKind === 'crypto') return <Bitcoin size={pixels} />;
  if (meta.iconKind === 'forex') return <CircleDollarSign size={pixels} />;
  if (meta.iconKind === 'etf' || meta.iconKind === 'fund') return <BadgeDollarSign size={pixels} />;
  if (meta.iconKind === 'index') return <LineChart size={pixels} />;
  if (meta.iconKind === 'gold' || meta.iconKind === 'silver') return <Gem size={pixels} />;
  if (meta.iconKind === 'oil') return <Droplets size={pixels} />;
  if (meta.iconKind === 'gas') return <Flame size={pixels} />;
  if (meta.iconKind === 'commodity') return <ChartCandlestick size={pixels} />;
  if (meta.iconKind === 'real-estate') return <House size={pixels} />;
  if (meta.iconKind === 'cash') return <WalletCards size={pixels} />;
  if (meta.iconKind === 'project') return <BriefcaseBusiness size={pixels} />;
  if (meta.symbol.length >= 6 && meta.assetType === 'forex') return <Banknote size={pixels} />;
  if (meta.symbol.includes('BANK')) return <Landmark size={pixels} />;
  return <Building2 size={pixels} />;
}

export function AssetAvatar({
  symbol,
  name,
  companyName,
  assetType,
  exchange,
  market,
  logoUrl,
  imageUrl,
  size = 'md',
  className,
  imageClassName,
  decorative = false,
}: AssetAvatarProps) {
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const showImage = Boolean(meta.logoUrl && !imageFailed);

  useEffect(() => {
    setImageFailed(false);
    setImageLoaded(false);
  }, [meta.logoUrl]);

  const fallback = meta.flags.length >= 2 ? (
    <span className="flex items-center justify-center -space-x-1 text-[1.05em]" aria-hidden="true">
      {meta.flags.map(flag => <span key={flag}>{flag}</span>)}
    </span>
  ) : (
    <IconForType meta={meta} size={size} />
  );

  return (
    <span
      className={cn(
        'asset-avatar relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[var(--radius-card)] border font-semibold leading-none shadow-[var(--shadow-card)]',
        sizeClass[size],
        toneClass[meta.tone],
        className,
      )}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : meta.alt}
      title={decorative ? undefined : meta.alt}
      dir="ltr"
    >
      {fallback}
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta.logoUrl ?? undefined}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={cn('absolute inset-0 h-full w-full object-contain p-1 transition-opacity', imageLoaded ? 'opacity-100' : 'opacity-0', imageClassName)}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageFailed(true)}
        />
      )}
    </span>
  );
}

export function AssetBadge({
  symbol,
  name,
  companyName,
  assetType,
  exchange,
  market,
  logoUrl,
  imageUrl,
  showName = true,
  showSymbol = true,
  nameClassName,
  symbolClassName,
  className,
  size = 'sm',
}: AssetBadgeProps) {
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

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <AssetAvatar
        symbol={symbol}
        name={name}
        companyName={companyName}
        assetType={assetType}
        exchange={exchange}
        market={market}
        logoUrl={logoUrl}
        imageUrl={imageUrl}
        size={size}
        decorative
      />
      <span className="grid min-w-0 gap-0.5">
        {showName ? (
          <span className={cn('min-w-0 truncate font-semibold leading-tight', nameClassName)}>
            {meta.label}
          </span>
        ) : null}
        {showSymbol && meta.symbol ? (
          <span className={cn('min-w-0 truncate font-mono font-medium uppercase leading-tight tracking-normal text-current opacity-70', symbolClassName)} dir="ltr">
            {meta.symbol}
          </span>
        ) : null}
      </span>
    </span>
  );
}
