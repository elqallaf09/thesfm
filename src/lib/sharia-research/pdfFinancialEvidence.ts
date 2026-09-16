import { randomUUID } from 'node:crypto';
import { createSourceDocument } from './contentExtraction';
import { EVIDENCE_VERSION } from './evidenceValidation';
import { statementCurrencyScale, statementLayout, statementSections } from './pdfStatementLayout';
import type { FinancialValue, SecurityIdentity, SourceDocument } from './types';

export type PdfEvidencePage = { num: number; text: string };
export async function extractSelectedPdfPages(body: Uint8Array, hints: number[] = []): Promise<PdfEvidencePage[]> {
  if (body.byteLength > 15 * 1024 * 1024) throw new Error('pdf_size_limit');
  const { CanvasFactory } = await import('pdf-parse/worker');
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: body, CanvasFactory });
  try {
    const info = await parser.getInfo({ parsePageInfo: false });
    const total = Number(info.total);
    if (!Number.isInteger(total) || total < 1 || total > 400) throw new Error('pdf_page_limit');
    const selected = [...new Set([...hints, ...Array.from({ length: Math.min(20, total) }, (_, i) => i + 1)])]
      .filter(page => Number.isInteger(page) && page >= 1 && page <= total).slice(0, 32).sort((a, b) => a - b);
    const result = await parser.getText({ partial: selected });
    const pages = result.pages.map(page => ({ num: page.num, text: page.text }));
    if (pages.reduce((n, page) => n + page.text.length, 0) > 600_000) throw new Error('pdf_text_limit');
    return pages;
  } finally { await parser.destroy(); }
}

function signatureDate(pages: PdfEvidencePage[], now: Date) {
  const allText = pages.map(page => page.text).join('\n');
  const signature = /(?:financial (?:statements|information)[\s\S]{0,160}?authori[sz]ed for issue[\s\S]{0,260}?on\s+)(\d{1,2}\s+[A-Za-z]+\s+20\d{2})/i.exec(allText)?.[1]
    ?? pages.filter(page => /INDEPENDENT AUDITORS|REPORT ON REVIEW OF INTERIM/i.test(page.text))
      .flatMap(page => [...page.text.matchAll(/(?:^|\n)\s*(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})\s*\n\s*Kuwait\s*(?:\n|$)/g)])
      .map(match => match[1]).at(-1) ?? null;
  const time = signature ? Date.parse(signature + ' UTC') : NaN;
  return Number.isFinite(time) && time <= now.getTime() ? new Date(time).toISOString().slice(0, 10) : null;
}

/** Explicit statement rows only. Net operating income, Islamic financing,
 * sukuk, undated text and absence of a field never become gross income/zeros. */
export function financialValuesFromPdfPages(pages: PdfEvidencePage[], security: SecurityIdentity, document: SourceDocument,
  expectedName: RegExp, now = new Date()): FinancialValue[] {
  const result: FinancialValue[] = [];
  if (document.companyIdentifier !== security.canonicalId) return result;
  const reportedAt = signatureDate(pages, now);
  for (const page of pages) {
    if (!expectedName.test(page.text)) continue;
    for (const section of statementSections(page.text)) {
      const layout = statementLayout(section.text, section.kind, now);
      const units = statementCurrencyScale(section.text);
      if (!layout || !units) continue;
      const numeric = /(?:^|\s)(\(?-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\)?)(?=\s|$)/g;
      for (const line of section.text.split(/\r?\n/)) {
        const matches = [...line.matchAll(numeric)];
        if (matches.length < layout.columns || matches.length > layout.columns + 1) continue;
        const label = line.slice(0, matches[0].index).trim();
        const amount = matches[matches.length - layout.columns + layout.index][1];
        if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(amount)) continue;
        const value = Number(amount.replaceAll(',', '')) * units.scale;
        if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) continue;
        let field: FinancialValue['normalizedField'] | null = null;
        let bound: 'exact' | 'lower' | 'upper' = 'exact';
        if (section.kind === 'balance' && /^TOTAL ASSETS$/i.test(label)) field = 'total_assets';
        else if (section.kind === 'balance' && /^TOTAL LIABILITIES$/i.test(label)) { field = 'interest_bearing_debt'; bound = 'upper'; }
        else if (section.kind === 'balance' && /^Cash and cash equivalents$/i.test(label)) field = 'cash_and_equivalents';
        else if (section.kind === 'cashflow' && /^Cash and cash equivalents (?:at (?:the )?end of (?:the )?(?:period|year)|as at 31 December)$/i.test(label)) field = 'cash_and_equivalents';
        else if (section.kind === 'income' && /^Interest income$/i.test(label)) { field = 'interest_income'; bound = 'lower'; }
        else if (section.kind === 'income' && /^(?:Total )?Revenues?$/i.test(label)) field = 'total_income';
        if (!field || (field === 'total_assets' && value <= 0)) continue;
        if (section.kind === 'cashflow' && /31 December$/i.test(label) && !layout.period.endsWith('-12-31')) continue;
        const periodStart = ['cash_and_equivalents', 'total_assets', 'interest_bearing_debt'].includes(field) ? null : layout.start;
        const existing = result.find(item => item.normalizedField === field && item.periodEnd === layout.period
          && item.periodStart === periodStart && item.validation?.bound === bound);
        if (existing) { if (existing.value !== value) throw new Error('pdf_conflicting_statement_values'); continue; }
        result.push({ id: randomUUID(), documentId: document.id, sourceUrl: document.sourceUrl,
          sourceTitle: document.sourceTitle, sourceTier: 1, reportingPeriod: layout.period, periodEnd: layout.period,
          periodStart, filedAt: null, reportedAt, sourceDateKind: 'issuer_report_signature', currency: units.currency, unit: units.currency, value,
          originalField: label, normalizedField: field, normalizationFormula: `PDF page ${page.num}: ${label} = ${amount} × ${units.scale} ${units.currency}`,
          validation: { version: EVIDENCE_VERSION, bound, note: bound === 'upper'
            ? 'Consolidated total liabilities are a conservative upper bound, not an exact debt amount.'
            : `Source-backed statement row on PDF page ${page.num}; selected-page extraction, not full-document completeness.` } });
      }
    }
  }
  return result;
}

export function pdfEvidenceDocument(pages: PdfEvidencePage[], security: SecurityIdentity, url: string, retrievedAt: string) {
  const text = pages.map(page => `[PDF page ${page.num}] ${page.text}`).join('\n');
  const periods = pages.flatMap(page => statementSections(page.text).flatMap(section => {
    const layout = statementLayout(section.text, section.kind, new Date(retrievedAt));
    return layout ? [layout.period] : [];
  })).sort().reverse();
  return createSourceDocument({ adapterId: 'regional-official-filings', sourceTitle: `${security.name} — selected financial report pages`,
    publisher: security.name, url, retrievalDate: retrievedAt, sourceType: periods[0] && !periods[0].endsWith('-12-31') ? 'quarterly_report' : 'annual_report', tier: 1, reliability: 'official',
    extractedText: text, companyIdentifier: security.canonicalId, reportingPeriod: periods[0] ?? null, mimeType: 'application/pdf',
    supports: [`Only PDF pages ${pages.map(page => page.num).join(', ')} were extracted; no unreported zeros or complete institutional certification.`] });
}
