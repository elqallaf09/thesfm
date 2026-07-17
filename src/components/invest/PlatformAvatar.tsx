'use client';

import { useEffect, useState } from 'react';
import {
  Briefcase,
  Building2,
  CandlestickChart,
  Coins,
  Gem,
  Landmark,
  PieChart,
  ShieldCheck,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';
import {
  resolvePlatformIdentity,
  type PlatformLogoCategory,
  type PlatformVisualInput,
} from '@/lib/platformVisuals';

type PlatformAvatarSize = 'sm' | 'md';

type PlatformAvatarProps = PlatformVisualInput & {
  size?: PlatformAvatarSize;
  className?: string;
  imageClassName?: string;
  /** Accessible label; when omitted the avatar is decorative (name shown beside it). */
  label?: string;
};

const SIZE_CLASS: Record<PlatformAvatarSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
};

const ICON_PIXELS: Record<PlatformAvatarSize, number> = {
  sm: 16,
  md: 18,
};

const CATEGORY_ICON: Record<PlatformLogoCategory, ComponentType<{ size?: number }>> = {
  broker: Briefcase,
  bank: Landmark,
  trading: CandlestickChart,
  crypto: Coins,
  fund: PieChart,
  metals: Gem,
  'real-estate': Building2,
  insurance: ShieldCheck,
  other: Building2,
};

/**
 * Platform (broker/bank/exchange/…) logo with a safe semantic fallback. Renders
 * exactly one visual: the category icon shows until the verified logo has
 * loaded, and returns if the logo fails — so a broken remote image never
 * appears and there is never a duplicate logo+icon. This is the platform
 * counterpart to AssetAvatar and never renders an asset logo.
 */
export function PlatformAvatar({
  size = 'md',
  className,
  imageClassName,
  label,
  ...input
}: PlatformAvatarProps) {
  // Pure, cheap lookup — recomputed each render; image state below resets only
  // when the resolved logo URL actually changes (compared by value).
  const identity = resolvePlatformIdentity(input);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const showImage = Boolean(identity.logoUrl && !imageFailed);

  useEffect(() => {
    setImageFailed(false);
    setImageLoaded(false);
  }, [identity.logoUrl]);

  const CategoryIcon = CATEGORY_ICON[identity.category];

  return (
    <span
      className={cn(
        'platform-avatar relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface text-foreground-secondary shadow-[var(--shadow-card)]',
        SIZE_CLASS[size],
        className,
      )}
      data-fallback={!showImage || !imageLoaded ? 'true' : 'false'}
      data-category={identity.category}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      title={label}
      dir="ltr"
    >
      {/* Exactly one visual: the category icon renders until the verified logo
          has loaded, and remains if the logo has no URL or fails to load. */}
      {(!showImage || !imageLoaded) && (
        <span className="platform-avatar-fallback grid place-items-center" aria-hidden="true">
          <CategoryIcon size={ICON_PIXELS[size]} />
        </span>
      )}
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={identity.logoUrl ?? undefined}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={cn(
            'absolute inset-0 h-full w-full object-contain p-1 transition-opacity',
            imageLoaded ? 'opacity-100' : 'opacity-0',
            imageClassName,
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageFailed(true)}
        />
      )}
    </span>
  );
}

export default PlatformAvatar;
