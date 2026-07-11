'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  applyDensityAttribute,
  DEFAULT_DENSITY,
  persistDensity,
  readStoredDensity,
  type Density,
} from '@/lib/ui/density';

type DensityContextValue = {
  density: Density;
  setDensity: (density: Density) => void;
  toggleDensity: () => void;
};

const DensityContext = createContext<DensityContextValue | null>(null);

export function DensityProvider({ children }: { children: ReactNode }) {
  // Server render and first client paint use the approved comfortable
  // default; the stored preference is applied after mount so hydration
  // stays consistent (same pattern as the mounted guard in ThemeToggle).
  const [density, setDensityState] = useState<Density>(DEFAULT_DENSITY);

  useEffect(() => {
    const stored = readStoredDensity();
    setDensityState(stored);
    applyDensityAttribute(stored);
  }, []);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
    applyDensityAttribute(next);
    persistDensity(next);
  }, []);

  const toggleDensity = useCallback(() => {
    setDensityState((current) => {
      const next: Density = current === 'compact' ? 'comfortable' : 'compact';
      applyDensityAttribute(next);
      persistDensity(next);
      return next;
    });
  }, []);

  return (
    <DensityContext.Provider value={{ density, setDensity, toggleDensity }}>
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
