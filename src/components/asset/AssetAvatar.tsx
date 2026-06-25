'use client';

import { useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  Banknote,
  Bitcoin,
  Building2,
  ChartCandlestick,
  CircleDollarSign,
  Droplets,
  Flame,
  Gem,
  Landmark,
  LineChart,
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
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-8 w-8 text-[10px]',
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
  stock: 'from-sky-100 to-cyan-50 text-sky-800 border-sky-200 dark:from-sky-400/15 dark:to-cyan-400/10 dark:text-cyan-100 dark:border-cyan-300/20',
  crypto: 'from-amber-100 to-orange-50 text-amber-800 border-amber-200 dark:from-amber-400/15 dark:to-orange-400/10 dark:text-amber-100 dark:border-amber-300/20',
  etf: 'from-indigo-100 to-sky-50 text-indigo-800 border-indigo-200 dark:from-indigo-400/15 dark:to-sky-400/10 dark:text-indigo-100 dark:border-indigo-300/20',
  forex: 'from-emerald-100 to-teal-50 text-emerald-800 border-emerald-200 dark:from-emerald-400/15 dark:to-teal-400/10 dark:text-emerald-100 dark:border-emerald-300/20',
  commodity: 'from-stone-100 to-slate-50 text-stone-800 border-stone-200 dark:from-stone-400/15 dark:to-slate-400/10 dark:text-stone-100 dark:border-stone-300/20',
  gold: 'from-yellow-100 to-amber-50 text-yellow-800 border-yellow-200 dark:from-yellow-400/15 dark:to-amber-400/10 dark:text-yellow-100 dark:border-yellow-300/20',
  silver: 'from-slate-100 to-zinc-50 text-slate-700 border-slate-200 dark:from-slate-300/15 dark:to-zinc-300/10 dark:text-slate-100 dark:border-slate-200/20',
  oil: 'from-neutral-200 to-stone-100 text-neutral-900 border-neutral-300 dark:from-neutral-300/15 dark:to-stone-300/10 dark:text-neutral-100 dark:border-neutral-200/20',
  gas: 'from-cyan-100 to-teal-50 text-cyan-800 border-cyan-200 dark:from-cyan-400/15 dark:to-teal-400/10 dark:text-cyan-100 dark:border-cyan-300/20',
  index: 'from-blue-100 to-slate-50 text-blue-800 border-blue-200 dark:from-blue-400/15 dark:to-slate-400/10 dark:text-blue-100 dark:border-blue-300/20',
  fund: 'from-violet-100 to-indigo-50 text-violet-800 border-violet-200 dark:from-violet-400/15 dark:to-indigo-400/10 dark:text-violet-100 dark:border-violet-300/20',
  unknown: 'from-slate-100 to-slate-50 text-slate-700 border-slate-200 dark:from-slate-300/15 dark:to-slate-400/10 dark:text-slate-100 dark:border-slate-200/20',
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
  const showImage = Boolean(meta.logoUrl && !imageFailed);
  const showFlags = !showImage && meta.flags.length >= 2;

  return (
    <span
      className={cn(
        'asset-avatar relative inline-grid shrink-0 place-items-center overflow-hidden rounded-2xl border bg-gradient-to-br font-black leading-none shadow-sm',
        sizeClass[size],
        toneClass[meta.tone],
        className,
      )}
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
          className={cn('h-full w-full object-contain p-1', imageClassName)}
          onError={() => setImageFailed(true)}
        />
      ) : showFlags ? (
        <span className="flex items-center justify-center -space-x-1 text-[1.05em]" aria-hidden="true">
          {meta.flags.map(flag => <span key={flag}>{flag}</span>)}
        </span>
      ) : meta.iconKind === 'stock' || meta.iconKind === 'unknown' ? (
        <span className="tracking-normal">{meta.fallbackText}</span>
      ) : (
        <IconForType meta={meta} size={size} />
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
          <span className={cn('min-w-0 truncate font-black leading-tight', nameClassName)}>
            {meta.label}
          </span>
        ) : null}
        {showSymbol && meta.symbol ? (
          <span className={cn('min-w-0 truncate font-black uppercase leading-tight tracking-normal text-current opacity-70', symbolClassName)} dir="ltr">
            {meta.symbol}
          </span>
        ) : null}
      </span>
    </span>
  );
}
