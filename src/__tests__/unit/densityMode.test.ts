import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DENSITY,
  DENSITY_STORAGE_KEY,
  normalizeDensity,
  persistDensity,
  readStoredDensity,
} from '@/lib/ui/density';

type MutableGlobal = { window?: { localStorage: unknown } };

function createLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    dump: () => Object.fromEntries(store),
  };
}

function withWindow(localStorage: unknown, run: () => void) {
  const globalRef = globalThis as unknown as MutableGlobal;
  globalRef.window = { localStorage };
  try {
    run();
  } finally {
    delete globalRef.window;
  }
}

afterEach(() => {
  delete (globalThis as unknown as MutableGlobal).window;
});

describe('density preference', () => {
  it('accepts only the supported modes', () => {
    expect(normalizeDensity('comfortable')).toBe('comfortable');
    expect(normalizeDensity('compact')).toBe('compact');
    // "dense" is reserved for a future phase — rejected until its CSS tier exists.
    expect(normalizeDensity('dense')).toBeNull();
    expect(normalizeDensity('')).toBeNull();
    expect(normalizeDensity(null)).toBeNull();
    expect(normalizeDensity(42)).toBeNull();
  });

  it('defaults to comfortable (the approved appearance)', () => {
    expect(DEFAULT_DENSITY).toBe('comfortable');
    expect(readStoredDensity()).toBe('comfortable'); // no window in node env
    withWindow(createLocalStorage(), () => {
      expect(readStoredDensity()).toBe('comfortable');
    });
  });

  it('round-trips the preference through storage', () => {
    const storage = createLocalStorage();
    withWindow(storage, () => {
      persistDensity('compact');
      expect(readStoredDensity()).toBe('compact');
      persistDensity('comfortable');
      expect(readStoredDensity()).toBe('comfortable');
    });
  });

  it('mirrors the preference into the shared sfm_settings blob', () => {
    const storage = createLocalStorage({ sfm_settings: JSON.stringify({ theme: 'dark' }) });
    withWindow(storage, () => {
      persistDensity('compact');
    });
    expect(JSON.parse(storage.dump().sfm_settings)).toEqual({ theme: 'dark', density: 'compact' });
    expect(storage.dump()[DENSITY_STORAGE_KEY]).toBe('compact');
  });

  it('falls back to sfm_settings when the direct key is missing', () => {
    const storage = createLocalStorage({ sfm_settings: JSON.stringify({ density: 'compact' }) });
    withWindow(storage, () => {
      expect(readStoredDensity()).toBe('compact');
    });
  });

  it('survives corrupted or blocked storage without throwing', () => {
    withWindow(createLocalStorage({ [DENSITY_STORAGE_KEY]: 'garbage', sfm_settings: '{not json' }), () => {
      expect(readStoredDensity()).toBe('comfortable');
    });
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    withWindow(throwing, () => {
      expect(readStoredDensity()).toBe('comfortable');
      expect(() => persistDensity('compact')).not.toThrow();
    });
  });
});

describe('density.css compact layer', () => {
  const raw = readFileSync(join(process.cwd(), 'src/styles/density.css'), 'utf8');
  // Strip comments so prose about colors/controls does not trip the guards.
  const css = raw.replace(/\/\*[\s\S]*?\*\//g, '');

  it('defines compact rules and leaves comfortable as the untouched default', () => {
    expect(css).toContain(":root[data-density='compact']");
    expect(css).not.toContain("data-density='comfortable'");
  });

  it('never touches colors — product-area identities stay unchanged', () => {
    expect(css).not.toMatch(/(?:^|[;{\s])(?:background|color|border-color|box-shadow|fill|stroke|opacity)\s*:/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
  });

  it('never touches controls, so 44px+ touch targets survive compact mode', () => {
    expect(css).not.toMatch(/--control-h|--finance-field-h/);
    expect(css).not.toMatch(/(?:^|[,{\s])(?:input|select|textarea|button)\b/);
  });

  it('keeps every font size at or above the accessible floor', () => {
    const sizes = [...css.matchAll(/font-size\s*:\s*([^;]+);/g)]
      .flatMap(([, value]) => [...value.matchAll(/(\d+(?:\.\d+)?)px/g)].map(([, px]) => Number(px)));
    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes) {
      expect(size).toBeGreaterThanOrEqual(12);
    }
  });

  it('applies context-specific density: denser trader/admin tables, gentler core finance', () => {
    expect(css).toContain("[data-theme-scope='trader'] td");
    expect(css).toContain("[data-theme-scope='admin'] td");
    expect(css).not.toContain("[data-theme-scope='core-finance']");
  });

  it('has a mobile guardrail and uses only RTL-safe logical/symmetric spacing', () => {
    expect(css).toContain('@media (max-width: 767px)');
    expect(css).not.toMatch(/padding-(left|right)|margin-(left|right)|\b(left|right)\s*:/);
  });
});

describe('density wiring', () => {
  it('mounts the provider in the root layout and the toggle in the header', () => {
    const layout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
    expect(layout).toContain("import { DensityProvider } from '@/hooks/useDensity'");
    expect(layout).toContain('<DensityProvider>');

    const header = readFileSync(join(process.cwd(), 'src/components/AppHeader.tsx'), 'utf8');
    expect(header).toContain('<DensityToggle />');

    const globals = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
    expect(globals).toContain('@import "../styles/density.css";');
  });

  it('exposes an accessible, labelled toggle', () => {
    const toggle = readFileSync(join(process.cwd(), 'src/components/DensityToggle.tsx'), 'utf8');
    expect(toggle).toContain('aria-label={label}');
    expect(toggle).toContain('aria-pressed={isCompact}');
    // Arabic, English and French labels, following ThemeToggle's convention.
    expect(toggle).toContain('عرض مضغوط');
    expect(toggle).toContain('Compact view');
    expect(toggle).toContain('Affichage compact');
  });
});
