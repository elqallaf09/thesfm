import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

const assignedFiles = [
  'src/app/privacy/page.tsx',
  'src/app/terms/page.tsx',
  'src/app/site-map/page.tsx',
  'src/app/mfa/verify/page.tsx',
  'src/app/guest/page.tsx',
  'src/app/(auth)/login/page.tsx',
  'src/components/UserChip.tsx',
  'src/components/CommandMenu.tsx',
  'src/components/CommandMenuButton.tsx',
  'src/components/CurrencySelect.tsx',
  'src/components/Error.tsx',
  'src/components/Wakeel.tsx',
  'src/components/WisdomTicker.tsx',
  'src/components/src/components/WisdomTicker.tsx',
] as const;

const literalColour = /#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})\b|(?:rgb|hsl)a?\(|oklch\(/i;
const localGradient = /(?:linear|radial|conic)-gradient\(/i;
const directFont = /\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto|Noto Sans Arabic)\b|font-family\s*:(?!\s*(?:var\(--font-(?:ui|data)\)|inherit\b))/i;
const rawDepth = /border-radius\s*:\s*(?:[1-9]\d*(?:\.\d+)?|0?\.\d+)(?:px|rem)|box-shadow\s*:\s*(?!\s*(?:var\(|none\b))|filter\s*:\s*drop-shadow\(/i;

describe('auth, legal, and global controls visual-system contract', () => {
  it('uses the centralized semantic palette, typography, and depth system', () => {
    for (const relativePath of assignedFiles) {
      const source = read(relativePath);
      expect(source, relativePath).not.toMatch(literalColour);
      expect(source, relativePath).not.toMatch(localGradient);
      expect(source, relativePath).not.toMatch(directFont);
      expect(source, relativePath).not.toMatch(rawDepth);
      expect(source, relativePath).not.toMatch(/var\(--sfm-/);
      expect(source, relativePath).not.toMatch(/(?:html\.)?\.dark\b|\[data-theme=['"]?dark|\bdark:/i);
      expect(source, relativePath).not.toMatch(/font(?:-weight)?\s*:\s*(?:[7-9]\d\d|9[0-9]{2})/);
      expect(source, relativePath).not.toMatch(/100d?vw|calc\([^)]*(?:sidebar|100d?vw)/i);
    }
  });

  it('keeps the login brand treatment intentional and all other surfaces flat', () => {
    const login = read('src/app/(auth)/login/page.tsx');
    expect(login).toContain('background:var(--hero-gradient)');
    expect(login).not.toMatch(/background:\s*var\(--hero-gradient\)[^}]*\.(?:card|button)/i);

    for (const relativePath of assignedFiles.filter(path => path !== 'src/app/(auth)/login/page.tsx')) {
      expect(read(relativePath), relativePath).not.toContain('var(--hero-gradient)');
    }
  });

  it('uses the shared wide page container and leaves sidebar width to the application shell', () => {
    const siteMap = read('src/app/site-map/page.tsx');
    expect(siteMap).toContain('<WorkspacePageContainer variant="wide" className="site-map-content">');
    expect(siteMap).not.toContain('sidebar-w');
    expect(siteMap).not.toMatch(/LanguageSwitcher|UserChip|sfm-page-topbar/);
  });

  it('keeps global menus and selectors keyboard accessible with focus restoration', () => {
    const userChip = read('src/components/UserChip.tsx');
    expect(userChip).toContain('role="menu"');
    expect(userChip).toContain("event.key === 'Escape'");
    expect(userChip).toContain('buttonRef.current?.focus()');
    expect(userChip).toContain('min-height:44px');

    const commandMenu = read('src/components/CommandMenu.tsx');
    expect(commandMenu).toContain('focusOriginRef');
    expect(commandMenu).toContain('isVisibleFocusTarget(focusOrigin)');
    expect(commandMenu).toContain('focusTarget?.focus({ preventScroll: true })');

    const currencySelect = read('src/components/CurrencySelect.tsx');
    expect(currencySelect).toContain('role="combobox"');
    expect(currencySelect).toContain('aria-activedescendant');
    expect(currencySelect).toContain('triggerRef.current?.focus()');
  });

  it('keeps one canonical WisdomTicker implementation', () => {
    const compatibilityFacade = read('src/components/src/components/WisdomTicker.tsx');
    expect(compatibilityFacade).toContain("export { WisdomTicker } from '../../WisdomTicker';");
    expect(compatibilityFacade).not.toContain('BOOK_TIPS');
    expect(read('src/components/WisdomTicker.tsx')).toContain('var(--font-ui)');
  });
});
