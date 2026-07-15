import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const commandButton = read('src/components/CommandMenuButton.tsx');
const header = read('src/components/AppHeader.tsx');
const sidebar = read('src/components/Sidebar.tsx');
const themes = read('src/styles/themes.css');

const rgb = (hex: string) => {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255);
};

const luminance = (hex: string) => rgb(hex)
  .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);

const contrast = (foreground: string, background: string) => {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

describe('accessibility contracts', () => {
  it('keeps command trigger names synchronized with translated visible labels', () => {
    expect(commandButton).toContain("'aria-label': ariaLabel");
    expect(commandButton).toContain("aria-label={ariaLabel ?? (compact ? t('command_open') : undefined)}");
    expect(commandButton).toContain('<span>{t(\'command_open\')}</span>');
    expect(commandButton).toContain('<kbd aria-hidden="true">{t(\'command_shortcut\')}</kbd>');
    expect(header).toContain("<CommandMenuButton aria-label={t('command_open')} />");
  });

  it('uses the semantic glass sidebar text token for utility group labels', () => {
    expect(sidebar).toMatch(/\.sfm-shared-global-toggle\{[^}]*color:var\(--sidebar-item-text\)/);
  });

  it('meets WCAG AA normal-text contrast in both themes', () => {
    const combinations = [
      ['light sidebar utility', '#172033', '#F7F9FC'],
      ['dark sidebar utility', '#EDF3FA', '#0A101A'],
      ['light muted insight', '#5D6B80', '#F1F4F8'],
      ['dark muted insight', '#94A3B8', '#182334'],
    ] as const;

    expect(themes).toContain('--foreground-muted: #5D6B80');
    for (const [label, foreground, background] of combinations) {
      expect(contrast(foreground, background), label).toBeGreaterThanOrEqual(4.5);
    }
  });
});
