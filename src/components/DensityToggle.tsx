'use client';

import { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useDensity } from '@/hooks/useDensity';
import { useLanguage } from '@/hooks/useLanguage';

type DensityToggleProps = {
  className?: string;
};

export function DensityToggle({ className = '' }: DensityToggleProps) {
  const { lang } = useLanguage();
  const { density, toggleDensity } = useDensity();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isCompact = mounted && density === 'compact';
  const label = lang === 'en'
    ? (isCompact ? 'Comfortable view' : 'Compact view')
    : lang === 'fr'
      ? (isCompact ? 'Affichage confortable' : 'Affichage compact')
      : (isCompact ? 'عرض مريح' : 'عرض مضغوط');

  return (
    <button
      type="button"
      className={`sfm-theme-toggle sfm-density-toggle ${className}`.trim()}
      aria-label={label}
      aria-pressed={isCompact}
      title={label}
      onClick={toggleDensity}
    >
      {isCompact
        ? <Maximize2 size={18} aria-hidden="true" />
        : <Minimize2 size={18} aria-hidden="true" />}
    </button>
  );
}

export default DensityToggle;
