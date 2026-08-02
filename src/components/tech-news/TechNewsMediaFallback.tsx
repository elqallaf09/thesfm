'use client';

import {
  BrainCircuit,
  Cloud,
  Cpu,
  Newspaper,
  ServerCog,
  ShieldHalf,
  ShoppingCart,
  Smartphone,
  Users,
  Zap,
  Gamepad2,
} from 'lucide-react';
import type { TechStockSector } from '@/lib/market/techStocks';
import { canonicalSourceLabel } from '@/lib/tech-news/newsProcessing';

const SECTOR_ICON: Record<TechStockSector, typeof Cpu> = {
  ai: BrainCircuit,
  semiconductors: Cpu,
  software: ServerCog,
  hardware: Smartphone,
  ecommerce: ShoppingCart,
  cloud: Cloud,
  cybersecurity: ShieldHalf,
  ev: Zap,
  social_ads: Users,
  gaming: Gamepad2,
  infrastructure: ServerCog,
};

function sourceInitials(source: string) {
  const label = canonicalSourceLabel(source).trim();
  if (!label) return '';
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

type TechNewsMediaFallbackProps = {
  source: string;
  sector: TechStockSector;
  className?: string;
};

// News stories from this pipeline never carry a real provider image
// (see fetchTechNews.ts). Rather than an oversized blank/solid rectangle,
// every card without a real photo shows this truthful, branded placeholder:
// the source's initials plus a category icon. Never a stock photo.
export function TechNewsMediaFallback({ source, sector, className }: TechNewsMediaFallbackProps) {
  const initials = sourceInitials(source);
  const SectorIcon = SECTOR_ICON[sector] ?? Newspaper;

  return (
    <div className={`tech-news-media-fallback ${className ?? ''}`} aria-hidden="true">
      <SectorIcon size={22} className="tech-news-media-fallback-icon" />
      {initials ? <span className="tech-news-media-fallback-initials">{initials}</span> : null}
    </div>
  );
}

export default TechNewsMediaFallback;
