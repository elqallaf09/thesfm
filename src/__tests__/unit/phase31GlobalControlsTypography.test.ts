import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), 'utf8');

function sourceFiles(directory: string, extensions = new Set(['.ts', '.tsx', '.css'])): string[] {
  const absolute = join(root, directory);
  return readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const path = join(absolute, entry.name);
    if (entry.isDirectory()) return sourceFiles(relative(root, path), extensions);
    return extensions.has(extname(entry.name)) ? [relative(root, path).replaceAll('\\', '/')] : [];
  });
}

function renderCount(source: string, component: 'LanguageSwitcher' | 'UserChip') {
  return source.match(new RegExp(`<${component}(?:\\s|/?>)`, 'g'))?.length ?? 0;
}

function tokenValue(tokens: string, token: string) {
  const value = tokens.match(new RegExp(`--${token}:\\s*([^;]+);`))?.[1]?.trim();
  expect(value, `${token} is defined`).toBeDefined();
  return value!;
}

function remToPixels(value: string) {
  const rem = value.match(/^(\d*\.?\d+)rem$/)?.[1];
  expect(rem, `${value} is an auditable rem value`).toBeDefined();
  return Number(rem) * 16;
}

const appFiles = sourceFiles('src/app', new Set(['.tsx'])).sort();
const componentFiles = sourceFiles('src/components', new Set(['.tsx'])).sort();
// The standalone trader route serves these files directly. Images and manifest
// metadata are intentionally excluded because they cannot declare UI typography.
const activeTraderUiFiles = sourceFiles(
  'src/trader-app/public',
  new Set(['.css', '.js', '.html']),
).sort();
const activeUiFiles = [
  ...sourceFiles('src/app').filter(file => !file.startsWith('src/app/api/')),
  ...sourceFiles('src/components'),
  ...sourceFiles('src/styles'),
  ...activeTraderUiFiles,
].sort();

// This declaration is an SVG viewBox user unit, not rendered CSS pixels. The
// 100x40 chart renders it at ~18.7px on desktop and ~15.3px on mobile.
const traderVectorUnitAllowlist = [
  {
    selector: '.detail-chart-value',
    declaration: 'font: 700 3.4px var(--font-data)',
  },
] as const;

describe('Phase 3.1 global-controls contract', () => {
  it('keeps authenticated language and account controls in one adaptive header path', () => {
    const appHeader = read('src/components/AppHeader.tsx');
    const mobileMenu = read('src/components/MobileMenu.tsx');

    expect(renderCount(appHeader, 'LanguageSwitcher')).toBe(1);
    expect(renderCount(appHeader, 'UserChip')).toBe(1);
    expect(renderCount(mobileMenu, 'LanguageSwitcher')).toBe(1);
    expect(renderCount(mobileMenu, 'UserChip')).toBe(1);
    expect(appHeader).toContain('{mobileMenuMounted && <MobileMenu open={open}');

    const userChipRenderers = [...appFiles, ...componentFiles]
      .filter(file => renderCount(read(file), 'UserChip') > 0);
    expect(userChipRenderers).toEqual([
      'src/components/AppHeader.tsx',
      'src/components/MobileMenu.tsx',
    ]);

    const componentLanguageRenderers = componentFiles
      .filter(file => renderCount(read(file), 'LanguageSwitcher') > 0);
    expect(componentLanguageRenderers).toEqual([
      'src/components/AppHeader.tsx',
      'src/components/MobileMenu.tsx',
      'src/components/WisdomTicker.tsx',
      'src/components/auth/AuthForm.tsx',
      'src/components/ui/LanguageSwitcher.tsx',
    ].sort());
  });

  it('allows page-local language controls only on public shells and profile preferences', () => {
    const routedLanguageRenderers = appFiles
      .filter(file => renderCount(read(file), 'LanguageSwitcher') > 0);

    expect(routedLanguageRenderers).toEqual([
      'src/app/(auth)/login/page.tsx',
      'src/app/about/page.tsx',
      'src/app/contact/page.tsx',
      'src/app/page.tsx',
      'src/app/profile/page.tsx',
      'src/app/reset-password/page.tsx',
    ]);

    const publicRouteRegistry = read('src/config/workspaces/public-shell-routes.ts');
    for (const route of ['/', '/login', '/reset-password', '/about', '/contact']) {
      expect(publicRouteRegistry).toContain(`'${route}'`);
    }

    // These compatibility components retain local APIs, but are not mounted by
    // any page or shared application composition path.
    const composition = [...appFiles, ...componentFiles]
      .filter(file => ![
        'src/components/auth/AuthForm.tsx',
        'src/components/WisdomTicker.tsx',
        'src/components/ui/LanguageSwitcher.tsx',
      ].includes(file))
      .map(read)
      .join('\n');
    expect(composition).not.toMatch(/<AuthForm(?:\s|\/?>)|<WisdomTicker(?:\s|\/?>)|<LanguageSwitcherPreview(?:\s|\/?>)/);
  });

  it('keeps workspace switching header-only with the retired global view mode absent', () => {
    const appHeader = read('src/components/AppHeader.tsx');
    const switcher = read('src/components/WorkspaceSwitcher.tsx');
    const sidebar = read('src/components/Sidebar.tsx');
    const mobileMenu = read('src/components/MobileMenu.tsx');
    const navigation = read('src/components/navigationConfig.ts');
    const shellSources = [appHeader, switcher, sidebar, mobileMenu, navigation].join('\n');

    expect(appHeader.match(/<WorkspaceSwitcher\b/g)).toHaveLength(1);
    expect(sidebar).not.toMatch(/WorkspaceSwitcher|sfm-workspace-tab/);
    expect(mobileMenu).not.toMatch(/WorkspaceSwitcher|sfm-workspace-tab/);
    expect(switcher).not.toMatch(/useState|localStorage|sessionStorage|router\.push/);
    expect(shellSources).not.toMatch(/Basic View|Advanced View|useViewMode|ViewModeSelector|viewModes|view_mode|sfm:view-mode-change|sfm-mobile-view-mode/i);
  });
});

describe('Phase 3.1 typography and direction contract', () => {
  it('uses IBM Plex Sans Arabic globally and scopes IBM Plex Mono to data roles', () => {
    const layout = read('src/app/layout.tsx');
    const tokens = read('src/styles/tokens.css');
    const globals = read('src/app/globals.css');
    const activeUi = activeUiFiles.map(read).join('\n');

    expect(layout).toContain('IBM_Plex_Sans_Arabic');
    expect(layout).toContain("subsets: ['arabic', 'latin']");
    expect(layout).toContain('IBM_Plex_Mono');
    expect(tokens).toContain('--font-ui: var(--font-ibm-plex-sans-arabic');
    expect(tokens).toContain('--font-data: var(--font-ibm-plex-mono');
    expect(globals).toContain('body :is(');
    expect(globals).toContain('[data-financial-value]');
    expect(globals).toContain('[data-market-value]');
    expect(globals).toContain('font-family: var(--font-data) !important');
    expect(globals).not.toMatch(/body\s*\{[^}]*font-family\s*:\s*var\(--font-data\)/);
    expect(activeUi).not.toMatch(/\b(?:Tajawal|Cairo|Inter|Arial|Tahoma|Aptos)\b/i);
  });

  it('enforces readable shared typography floors and the supported weight ceiling', () => {
    const tokens = read('src/styles/tokens.css');

    expect(remToPixels(tokenValue(tokens, 'type-body-size'))).toBeGreaterThanOrEqual(15);
    expect(remToPixels(tokenValue(tokens, 'type-body-small-size'))).toBeGreaterThanOrEqual(14);
    expect(remToPixels(tokenValue(tokens, 'type-caption-size'))).toBeGreaterThanOrEqual(13);
    expect(remToPixels(tokenValue(tokens, 'type-label-size'))).toBeGreaterThanOrEqual(13);
    expect(remToPixels(tokenValue(tokens, 'type-button-size'))).toBeGreaterThanOrEqual(14);
    expect(remToPixels(tokenValue(tokens, 'type-navigation-size'))).toBeGreaterThanOrEqual(14);
    expect(tokenValue(tokens, 'type-navigation-weight')).toBe('500');
    expect(tokenValue(tokens, 'type-navigation-active-weight')).toBe('600');
    expect(tokenValue(tokens, 'control-h')).toBe('44px');

    const overweight: string[] = [];
    for (const file of activeUiFiles) {
      const source = read(file);
      if (/\bfont-(?:extrabold|black)\b/.test(source)
        || /(?:font-weight|fontWeight)\s*:\s*['"]?(?:7(?:0[1-9]|[1-9]\d)|[89]\d{2}|\d{4,})\b/i.test(source)
        || /\bfont\s*:\s*['"]?(?:7(?:0[1-9]|[1-9]\d)|[89]\d{2}|\d{4,})\b/i.test(source)
        || /(?:\bfont-\[|\[font-weight:)(?:7(?:0[1-9]|[1-9]\d)|[89]\d{2}|\d{4,})\]/i.test(source)) {
        overweight.push(file);
      }
    }
    expect(overweight, 'active UI must not request synthetic weights above the loaded 700 face').toEqual([]);
  });

  it('keeps directly served trader typography readable and semantically scoped', () => {
    const undersized: string[] = [];

    for (const file of activeTraderUiFiles) {
      const source = read(file);
      let auditableSource = source;

      if (file === 'src/trader-app/public/cinema.css') {
        for (const allowed of traderVectorUnitAllowlist) {
          const escapedSelector = allowed.selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const escapedDeclaration = allowed.declaration.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          expect(source).toMatch(new RegExp(`${escapedSelector}\\s*\\{[^}]*${escapedDeclaration}`, 's'));
          expect(source.split(allowed.declaration)).toHaveLength(2);
          auditableSource = auditableSource.replace(allowed.declaration, allowed.declaration.replace(/(?:2\.3|3\.4)px/, '12px'));
        }
      }

      const declarations = [
        ...auditableSource.matchAll(/font-size\s*:\s*(\d*\.?\d+)(px|rem|em)\b/gi),
        ...auditableSource.matchAll(/\bfont\s*:\s*(?:\d+\s+)?(\d*\.?\d+)(px|rem|em)\b/gi),
      ];

      for (const declaration of declarations) {
        const value = Number(declaration[1]);
        const pixels = declaration[2].toLowerCase() === 'px' ? value : value * 16;
        if (pixels < 12) undersized.push(`${file}: ${declaration[0]}`);
      }

      for (const clamp of auditableSource.matchAll(/font-size\s*:\s*clamp\(\s*(\d*\.?\d+)(px|rem|em)\b/gi)) {
        const value = Number(clamp[1]);
        const pixels = clamp[2].toLowerCase() === 'px' ? value : value * 16;
        if (pixels < 12) undersized.push(`${file}: ${clamp[0]}`);
      }
    }

    expect(undersized, 'served trader UI must not declare text below 12px').toEqual([]);

    const traderCss = read('src/trader-app/public/cinema.css');
    expect(traderCss).toMatch(/\.ai-pro-badge\s*\{[^}]*var\(--font-ui\)/);
    expect(traderCss).toMatch(/\.profile-avatar\s*\{[^}]*var\(--font-ui\)/);
    expect(traderCss).toMatch(/\.technical-unavailable-icon\s*\{[^}]*var\(--font-ui\)/);
    expect(traderCss).toMatch(/\.detail-card strong\.market-value[^}]*var\(--font-data\)/);
  });

  it('maps Arabic to RTL and English/French to LTR at the document root', () => {
    const provider = read('src/components/LanguageProvider.tsx');
    const switcher = read('src/components/WorkspaceSwitcher.tsx');

    expect(provider).toContain("const dir = lang === 'ar' ? 'rtl' : 'ltr'");
    expect(provider).toContain('document.documentElement.dir = dir');
    expect(provider).toContain('document.documentElement.lang = lang');
    expect(provider).toContain('document.body.dir = dir');
    expect(provider).toContain("dir: lang === 'ar' ? 'rtl' : 'ltr'");
    expect(provider).toContain("value === 'ar' || value === 'en' || value === 'fr'");
    expect(switcher).toContain('dir={dir}');
  });
});
