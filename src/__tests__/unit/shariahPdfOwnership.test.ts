import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { extractSelectedPdfPages, financialValuesFromPdfPages, pdfEvidenceDocument } from '@/lib/sharia-research/pdfFinancialEvidence';
import { validFinancialValue } from '@/lib/sharia-research/evidenceValidation';
import { security } from './shariaEvidenceFixtures';

// A generated, self-contained PDF fixture exercises the REAL PDF.js worker.
// No network, third-party report contents or mock parser can hide detachment.
function fixturePdf() {
  const stream = 'BT /F1 16 Tf 30 100 Td (Evidence buffer ownership) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf));
}
const now = new Date('2026-09-15T00:00:00Z');
const issuer = { ...security, ticker: 'BOUBYAN', providerSymbol: 'BOUBYAN.KW', name: 'Boubyan Bank', country: 'KW', exchange: 'Boursa Kuwait', canonicalId: 'XKUW:BOUBYAN' };
// Header and two totals independently observed in the issuer's Q2 report.
const text = "Boubyan Bank K.S.C.P. AND SUBSIDIARIES\nINTERIM CONDENSED CONSOLIDATED STATEMENT OF FINANCIAL POSITION\nAs at 30 June 2026\n4\nNotes 30 June\n2026\n(Audited)\n31 December\n2025\n30 June\n2025\nKD’000’s KD’000’s KD’000’s\nAssets\nTotal assets 10,592,712 10,201,278 9,952,562\nTotal liabilities 9,436,340 9,063,393 8,861,599\nCash and balances with banks 7 375,082 353,679 527,965\nThe financial statements were authorised for issue by resolution on 7 July 2026.";
function values(input = text) {
  const pages = [{ num: 6, text: input }];
  const document = pdfEvidenceDocument(pages, issuer, 'https://www.bankboubyan.com/report.pdf', now.toISOString());
  return { document, values: financialValuesFromPdfPages(pages, issuer, document, /Boubyan Bank/i, now) };
}
describe('regional PDF ownership and observed stacked columns', () => {
  it('keeps every caller-owned byte and its digest intact across two real worker parses', async () => {
    const input = fixturePdf(), original = input.slice();
    const digest = createHash('sha256').update(input).digest('hex');
    for (let attempt = 0; attempt < 2; attempt++) {
      const pages = await extractSelectedPdfPages(input);
      expect(pages.map(page => page.text).join(' ')).toContain('Evidence buffer ownership');
      expect(input).toEqual(original);
      expect(createHash('sha256').update(input).digest('hex')).toBe(digest);
    }
  }, 30000);
  it('rejects an empty/detached input without invoking a worker', async () => {
    await expect(extractSelectedPdfPages(new Uint8Array())).rejects.toThrow('pdf_empty_input');
  });
  it('recognizes a stacked three-date header and apostrophe scale without treating Islamic financing as interest', () => {
    const result = values();
    expect(result.document.reportingPeriod).toBe('2026-06-30');
    expect(result.values).toHaveLength(2);
    expect(result.values.every(value => validFinancialValue(value, now))).toBe(true);
    expect(result.values.find(value => value.normalizedField === 'total_assets')).toMatchObject({ value: 10592712000, reportedAt: '2026-07-07', currency: 'KWD', periodEnd: '2026-06-30' });
    expect(result.values.find(value => value.normalizedField === 'interest_bearing_debt')).toMatchObject({ value: 9436340000, validation: { bound: 'upper' } });
    expect(result.values.some(value => value.normalizedField === 'cash_and_equivalents')).toBe(false);
  });
  it('does not accept shifted prior-period date columns, unknown scale or a future statement', () => {
    expect(values(text.replace('31 December\n2025', '31 December\n2024')).values).toEqual([]);
    expect(values(text.replaceAll('KD’000’s', 'KD millions')).values).toEqual([]);
    expect(values(text.replaceAll('2026', '2099')).values).toEqual([]);
  });
  it('does not relabel net operating income as total revenue', () => {
    const income = text.replace(/CONSOLIDATED STATEMENT OF FINANCIAL POSITION[\s\S]*/, 'CONSOLIDATED STATEMENT OF INCOME\nFor the year ended 31 December 2025\n2025 2024\nKD’000’s\nNet operating income 123 122\nOperating income 123 122\nThe financial statements were authorised for issue on 7 July 2026.');
    expect(values(income).values).toEqual([]);
  });
});
