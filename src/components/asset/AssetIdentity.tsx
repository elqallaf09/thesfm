'use client';

import { AssetAvatar } from '@/components/asset/AssetAvatar';
import { cn } from '@/lib/utils';
import { getAssetVisualMeta, type AssetVisualInput } from '@/lib/assetVisuals';

type AssetIdentitySize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AssetIdentityVariant = 'avatar' | 'badge';

type AssetIdentityProps = AssetVisualInput & {
  size?: AssetIdentitySize;
  variant?: AssetIdentityVariant;
  className?: string;
  imageClassName?: string;
  labelClassName?: string;
  symbolClassName?: string;
  showName?: boolean;
  showSymbol?: boolean;
  decorative?: boolean;
};

export function AssetIdentity({
  symbol,
  name,
  companyName,
  assetType,
  exchange,
  market,
  logoUrl,
  imageUrl,
  size = 'sm',
  variant = 'avatar',
  className,
  imageClassName,
  labelClassName,
  symbolClassName,
  showName = true,
  showSymbol = true,
  decorative = true,
}: AssetIdentityProps) {
  if (variant === 'badge') {
    const meta = getAssetVisualMeta({ symbol, name, companyName, assetType, exchange, market, logoUrl, imageUrl });

    return (
      <span className={cn('asset-identity inline-flex min-w-0 items-center gap-2', className)}>
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
          imageClassName={imageClassName}
          decorative
        />
        <span className="asset-identity-copy grid min-w-0 gap-0.5">
          {showName ? (
            <span className={cn('asset-identity-name min-w-0 truncate font-semibold leading-tight', labelClassName)}>
              {meta.label}
            </span>
          ) : null}
          {showSymbol && meta.symbol ? (
            <span className={cn('asset-identity-symbol min-w-0 truncate font-mono font-medium uppercase leading-tight tracking-normal text-current opacity-70', symbolClassName)} dir="ltr">
              {meta.symbol}
            </span>
          ) : null}
        </span>
      </span>
    );
  }

  return (
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
      className={className}
      imageClassName={imageClassName}
      decorative={decorative}
    />
  );
}
