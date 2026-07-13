import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

const standaloneBridge = read('src/lib/visual-system/standaloneDocument.ts');
const businessReport = read('src/lib/businessReports.ts');
const complianceReport = read('src/lib/sharia-research/complianceReportExport.ts');
const reports = [businessReport, complianceReport];

describe('standalone report visual system', () => {
  it('serializes the active application tokens into isolated print documents', () => {
    expect(standaloneBridge).toContain("'--font-ui'");
    expect(standaloneBridge).toContain("'--font-data'");
    expect(standaloneBridge).toContain("'--surface'");
    expect(standaloneBridge).toContain("'--foreground'");
    expect(standaloneBridge).toContain('window.getComputedStyle(document.documentElement)');
    expect(standaloneBridge).toContain("link[rel=\"stylesheet\"][href]");
    expect(standaloneBridge).not.toMatch(/(?<!&)#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(/i);
  });

  it.each(reports)('keeps report colors, typography, and depth semantic', source => {
    expect(source).toContain('semanticStandaloneDocumentStyles()');
    expect(source).toContain('semanticStandaloneStylesheetLinks()');
    expect(source).toContain('font-family:var(--font-ui)');
    expect(source).toContain('font-family:var(--font-data)');
    expect(source).not.toMatch(/(?<!&)#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\(|(?:linear|radial|conic)-gradient\(/i);
    expect(source).not.toMatch(/\b(?:Tajawal|Cairo|Arial|Helvetica|Inter|Poppins|Roboto)\b/);
    expect(source).not.toMatch(/font-weight:\s*(?:8|9)\d{2}\b/);
    expect(source).not.toMatch(/box-shadow:\s*(?!var\(|none)/);
    expect(source).toContain('document.fonts?.ready');
  });
});
