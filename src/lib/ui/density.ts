/**
 * Information-density preference.
 *
 * Two supported modes: `comfortable` (the approved default appearance —
 * selecting it changes nothing) and `compact` (tighter cards, tables, grids
 * and heroes via src/styles/density.css). A third `dense` mode is reserved
 * for a future phase and is intentionally rejected by the normalizer until
 * its CSS tier exists.
 *
 * The preference is stored under its own key and mirrored into the shared
 * `sfm_settings` blob, following the theme-preference convention in
 * src/components/ThemeToggle.tsx. All storage access is guarded — a blocked
 * or full localStorage must never break the UI.
 */

export type Density = 'comfortable' | 'compact';

export const DENSITY_STORAGE_KEY = 'sfm-density';
export const DEFAULT_DENSITY: Density = 'comfortable';
export const DENSITY_ATTRIBUTE = 'data-density';

export function normalizeDensity(value: unknown): Density | null {
  if (value === 'comfortable' || value === 'compact') return value;
  return null;
}

export function readStoredDensity(): Density {
  if (typeof window === 'undefined') return DEFAULT_DENSITY;
  try {
    const direct = normalizeDensity(window.localStorage.getItem(DENSITY_STORAGE_KEY));
    if (direct) return direct;
    const raw = window.localStorage.getItem('sfm_settings');
    if (raw) {
      const settings = JSON.parse(raw) as Record<string, unknown>;
      const fromSettings = normalizeDensity(settings.density);
      if (fromSettings) return fromSettings;
    }
  } catch {
    // Storage unavailable or corrupted — fall through to the default.
  }
  return DEFAULT_DENSITY;
}

export function persistDensity(density: Density): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
  } catch {
    return;
  }
  try {
    const raw = window.localStorage.getItem('sfm_settings');
    const settings = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    window.localStorage.setItem('sfm_settings', JSON.stringify({ ...settings, density }));
  } catch {
    try {
      window.localStorage.setItem('sfm_settings', JSON.stringify({ density }));
    } catch {
      // Preference still applied for this session via the DOM attribute.
    }
  }
}

export function applyDensityAttribute(density: Density): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute(DENSITY_ATTRIBUTE, density);
}
