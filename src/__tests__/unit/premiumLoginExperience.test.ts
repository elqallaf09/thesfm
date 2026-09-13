import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('premium login experience', () => {
  const page = source('src/app/(auth)/login/page.tsx');
  const showcase = source('src/components/auth/PremiumLoginShowcase.tsx');

  it('uses the exact approved original logo in both brand placements', () => {
    const logo = readFileSync(resolve(process.cwd(), 'public/brand/sfm-original-logo.png'));
    expect(createHash('sha256').update(logo).digest('hex')).toBe('0ad147d4c8d3d467fd3cd78cd8690f5ea4c5175e2487933b327d0f9646902741');
    expect(page).toContain('src="/brand/sfm-original-logo.png"');
    expect(showcase).toContain('src="/brand/sfm-original-logo.png"');
  });

  it('preserves the existing sign-in, OAuth, guest and safe redirect contracts', () => {
    expect(page).toContain('await signIn(loginIdentifier, password)');
    expect(page).toContain("signInWithOAuth({ provider: 'google'");
    expect(page).toContain('await continueAsGuest()');
    expect(page).toContain('mergeClientHash(');
    expect(page).toContain('loginHrefForDestination(nextPath)');
    expect(page).toContain("if (submitting || guestSubmitting) return");
  });

  it('remembers only the login identifier and never stores a password', () => {
    expect(page).toContain("const REMEMBERED_IDENTIFIER_KEY = 'sfm.auth.rememberedIdentifier.v1'");
    expect(page).toContain('localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, loginIdentifier)');
    expect(page).not.toMatch(/localStorage\.setItem\([^\n]*password/i);
  });

  it('keeps the pre-authentication preview globally neutral and explicitly illustrative', () => {
    expect(showcase).toContain('معاينة توضيحية للمنتج');
    expect(showcase).toContain('Illustrative product preview');
    expect(showcase).not.toMatch(/\b(?:KWD|SAR|AED|USD)\b|د\.ك|\$|€|£/);
    expect(showcase).not.toMatch(/ISO|PCI DSS|GDPR|customers|عملاء|skyline|برج|علم/);
  });

  it('provides Arabic, English and French copy plus explicit light and dark controls', () => {
    const theme = source('src/components/auth/AuthThemeControl.tsx');
    expect(showcase).toContain('Gestionnaire financier intelligent');
    expect(page).toContain('مرحباً بعودتك');
    expect(page).toContain('Welcome back');
    expect(page).toContain('Heureux de vous revoir');
    expect(theme).toContain("aria-pressed={activeTheme === 'light'}");
    expect(theme).toContain("aria-pressed={activeTheme === 'dark'}");
  });
});
