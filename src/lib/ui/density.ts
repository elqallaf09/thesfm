/**
 * Information-density preference.
 *
 * Two supported modes: `comfortable` (the approved default appearance —
 * selecting it changes nothing) and `compact` (tighter cards, tables, grids
 * and heroes via src/styles/density.css). A third `dense` mode is reserved
 * for a future phase and is intentionally rejected by the normalizer until
 * its CSS tier exists.
 *
 * When the user has never chosen a mode the preference is `auto`: the
 * data-heavy trader and admin areas resolve to compact on desktop while
 * every other area (and every mobile viewport) keeps the comfortable
 * default. An explicit choice always wins everywhere and is the only thing
 * ever written to storage — `auto` is represented by the absence of a
 * stored value, so clearing the preference restores the area defaults.
 *
 * The preference is stored under its own key and mirrored into the shared
 * `sfm_settings` blob, following the theme-preference convention in
 * src/components/ThemeToggle.tsx. All storage access is guarded — a blocked
 * or full localStorage must never break the UI.
 */

export type Density = 'comfortable' | 'compact';
export type DensityPreference = Density | 'auto';

export const DENSITY_STORAGE_KEY = 'sfm-density';
export const DEFAULT_DENSITY: Density = 'comfortable';
export const DENSITY_ATTRIBUTE = 'data-density';

/** Product areas that read best compact on desktop (see themeScopes.ts). */
export const DENSITY_COMPACT_DEFAULT_SCOPES: readonly string[] = ['trader', 'admin'];

/** Matches the desktop breakpoint used by density.css's mobile guardrail. */
export const DENSITY_DESKTOP_QUERY = '(min-width: 768px)';

export function normalizeDensity(value: unknown): Density | null {
  if (value === 'comfortable' || value === 'compact') return value;
  return null;
}

/**
 * Effective density for a page: an explicit preference wins; `auto` resolves
 * to compact only for the trader/admin scopes on desktop viewports.
 */
export function resolveDensity(
  preference: DensityPreference,
  scope: string | null | undefined,
  isDesktop: boolean,
): Density {
  if (preference !== 'auto') return preference;
  if (isDesktop && scope && DENSITY_COMPACT_DEFAULT_SCOPES.includes(scope)) return 'compact';
  return DEFAULT_DENSITY;
}

/** Explicit stored choice, or `auto` when the user never picked a mode. */
export function readStoredDensityPreference(): DensityPreference {
  if (typeof window === 'undefined') return 'auto';
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
    // Storage unavailable or corrupted — fall through to auto.
  }
  return 'auto';
}

export function readStoredDensity(): Density {
  const preference = readStoredDensityPreference();
  return preference === 'auto' ? DEFAULT_DENSITY : preference;
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
