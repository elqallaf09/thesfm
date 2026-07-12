'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  applyDensityAttribute,
  DEFAULT_DENSITY,
  DENSITY_DESKTOP_QUERY,
  persistDensity,
  readStoredDensityPreference,
  resolveDensity,
  type Density,
  type DensityPreference,
} from '@/lib/ui/density';
import { getThemeScope } from '@/lib/navigation/themeScopes';

type DensityContextValue = {
  /** Effective density for the current page (preference + area default). */
  density: Density;
  /** The stored choice — `auto` until the user explicitly picks a mode. */
  preference: DensityPreference;
  setDensity: (density: Density) => void;
  toggleDensity: () => void;
};

const DensityContext = createContext<DensityContextValue | null>(null);

export function DensityProvider({ children }: { children: ReactNode }) {
  // Server render and first client paint use the approved comfortable
  // default; the stored preference, viewport and area default are applied
  // after mount so hydration stays consistent (same pattern as the mounted
  // guard in ThemeToggle).
  const pathname = usePathname();
  const [preference, setPreference] = useState<DensityPreference>('auto');
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPreference(readStoredDensityPreference());
    const media = window.matchMedia(DENSITY_DESKTOP_QUERY);
    setIsDesktop(media.matches);
    const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    media.addEventListener('change', onChange);
    setMounted(true);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const density = mounted
    ? resolveDensity(preference, getThemeScope(pathname), isDesktop)
    : DEFAULT_DENSITY;

  useEffect(() => {
    if (mounted) applyDensityAttribute(density);
  }, [density, mounted]);

  const setDensity = useCallback((next: Density) => {
    setPreference(next);
    applyDensityAttribute(next);
    persistDensity(next);
  }, []);

  const toggleDensity = useCallback(() => {
    const next: Density = density === 'compact' ? 'comfortable' : 'compact';
    setDensity(next);
  }, [density, setDensity]);

  return (
    <DensityContext.Provider value={{ density, preference, setDensity, toggleDensity }}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity(): DensityContextValue {
  const context = useContext(DensityContext);
  if (!context) {
    throw new Error('useDensity must be used within a DensityProvider');
  }
  return context;
}
