import { randomUUID } from 'node:crypto';
import { createSourceDocument } from './contentExtraction';
import { EVIDENCE_VERSION } from './evidenceValidation';
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

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_ABBREVIATIONS: Record<string, string> = {
  jan: 'January', feb: 'February', mar: 'March', apr: 'April', jun: 'June', jul: 'July', aug: 'August',
  sep: 'September', sept: 'September', oct: 'October', nov: 'November', dec: 'December',
};
function normalizeStatementDates(text: string) {
  return text.replace(/\b(Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?(?=\s+20\d{2}\b)/gi,
    value => MONTH_ABBREVIATIONS[value.replace('.', '').toLowerCase()] ?? value);
}
function statementLayout(text: string, income: boolean, now: Date) {
  const compact = normalizeStatementDates(text.slice(0, 700)).replace(/\s+/g, ' ');
  const dated = /(?:As at|As of|year ended)?\s*(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i.exec(compact);
  if (!dated) return null;
  const day=Number(dated[1]), month=MONTHS.findIndex(value=>value.toLowerCase()===dated[2].toLowerCase()), year=Number(dated[3]);
  const stamp=Date.UTC(year,month,day), period=new Date(stamp).toISOString().slice(0,10);
  if (month < 0 || new Date(stamp).getUTCDate()!==day || stamp>now.getTime()) return null;
  const yearPair=new RegExp(`${year} ${year-1}`);
  const label=`${day} ${MONTHS[month]}`;
  const annualDatePair = new RegExp(`${label}\\s+${year}(?:\\s+Year ended)?\\s+${label}\\s+${year-1}`, 'i');
  if (day===31 && month===11 && (yearPair.test(compact) || annualDatePair.test(compact))) return {year,period,columns:2,index:0,start:income?`${year}-01-01`:null};
  // Explicit observed interim layouts: first balance-sheet column is current;
  // income's third of four columns is the year-to-date six/nine-month period.
  if (!income && new RegExp(`${label} 31 December ${label} ${year} ${year-1} ${year-1}`, 'i').test(compact)) return {year,period,columns:3,index:0,start:null};
  if (income && /Three months ended/i.test(compact) && /(?:Six|Nine) months ended/i.test(compact)
    && new RegExp(`${year} ${year-1} ${year} ${year-1}`).test(compact) && [5,8].includes(month)) return {year,period,columns:4,index:2,start:`${year}-01-01`};
  return null;
}

function statementHeader(text: string) {
  return /(?:^|\n)[ \t]*(?:INTERIM[ \t]+CONDENSED[ \t]+)?CONSOLIDATED[ \t]+(?:STATEMENT[ \t]+OF[ \t]+(?:FINANCIAL[ \t]+POSITION|INCOME|PROFIT[ \t]+OR[ \t]+LOSS)|BALANCE[ \t]+SHEET)(?:[ \t]*\([^\n)]*\))?[ \t]*(?=\r?$)/im.exec(text);
}
function statementUnits(text: string) {
  const header = text.slice(0, 600);
  if (/\b(?:KD|KWD)\s*(?:000['’]?s|thousands)/i.test(header)) return { currency: 'KWD', scale: 1000 };
  // Full-dinar audited statements can expose an explicit unit row such as
  // "KD KD". Accept only a table unit line, never a narrative mention of KD.
  if (/(?:^|\n)[ \t]*(?:KD|KWD)(?:[ \t]+(?:KD|KWD)){0,4}[ \t]*(?=\r?$)/im.test(header)) return { currency: 'KWD', scale: 1 };
  return null;
}

/** Only unambiguous consolidated, two-year, English statement rows. Unsupported
 * layouts remain missing; notes/ratios/press-release net profits are not revenue. */
export function financialValuesFromPdfPages(pages: PdfEvidencePage[], security: SecurityIdentity, document: SourceDocument,
  expectedName: RegExp, now = new Date()): FinancialValue[] {
  const result: FinancialValue[] = [];
  const allText = pages.map(page => page.text).join('\n');
  // Verify issuer identity across the selected document once. Some official
  // statements (IFA is a real example) render the issuer heading letter-spaced
  // on the numeric pages while the normal legal name appears on the auditor or
  // notes pages. Requiring the legal name on every statement page discarded
  // valid rows even after the document itself had already been issuer-bound.
  // Never parse a statement when the expected issuer is absent from all pages.
  if (!expectedName.test(allText)) return [];
  const signature = /(?:financial (?:statements|information)[\s\S]{0,160}?authori[sz]ed for issue[\s\S]{0,260}?on\s+)(\d{1,2}\s+[A-Za-z]+\s+20\d{2})/i.exec(allText)?.[1]
    ?? /approved (?:these )?consolidated financial statements for issue on\s+(\d{1,2}\s+[A-Za-z]+\s+20\d{2})/i.exec(allText)?.[1]
    ?? pages.filter(page => /INDEPENDENT AUDITORS|REPORT ON REVIEW OF INTERIM/i.test(page.text))
      .flatMap(page => [...page.text.matchAll(/(?:^|\n)\s*(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})\s*\n\s*Kuwait\s*(?:\n|$)/g)])
      .map(match => match[1]).at(-1) ?? null;
  const signatureTime = signature ? Date.parse(signature + ' UTC') : NaN;
  const reportedAt = Number.isFinite(signatureTime) && signatureTime <= now.getTime() ? new Date(signatureTime).toISOString().slice(0, 10) : null;
  for (const page of pages) {
    const header = statementHeader(page.text);
    if (!header) continue;
    const text = page.text.slice(header.index);
    const income = /STATEMENT OF (?:INCOME|PROFIT OR LOSS)/i.test(header[0]);
    const layout = statementLayout(text, income, now);
    if (!layout) continue;
    const units = statementUnits(text);
    if (!units) continue;
    const period = layout.period;
    const numeric = /(?:^|\s)(\(?-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\)?)(?=\s|$)/g;
    for (const line of text.split(/\r?\n/)) {
      const matches = [...line.matchAll(numeric)];
      if (matches.length < layout.columns || matches.length > layout.columns + 1) continue;
      const label = line.slice(0, matches[0].index).trim();
      const amount = matches[matches.length - layout.columns + layout.index][1];
      if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(amount)) continue;
      const value = Number(amount.replaceAll(',', '')) * units.scale;
      if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) continue;
      let field: FinancialValue['normalizedField'] | null = null, bound: 'exact' | 'lower' | 'upper' = 'exact';
      if (!income && /^TOTAL ASSETS$/i.test(label)) field = 'total_assets';
      else if (!income && /^TOTAL LIABILITIES$/i.test(label)) { field = 'interest_bearing_debt'; bound = 'upper'; }
      else if (!income && /^Cash and cash equivalents$/i.test(label)) field = 'cash_and_equivalents';
      else if (income && /^Interest income$/i.test(label)) { field = 'interest_income'; bound = 'lower'; }
      // Financing receivables, sukuk, cash + short-term funds and net operating
      // income are intentionally NOT relabeled as corporate interest/debt/revenue.
      if (!field || (field === 'total_assets' && value <= 0)) continue;
      const existing = result.find(item => item.normalizedField === field && item.periodEnd === period && item.validation?.bound === bound);
      if (existing) { if (existing.value !== value) throw new Error('pdf_conflicting_statement_values'); continue; }
      result.push({ id: randomUUID(), documentId: document.id, sourceUrl: document.sourceUrl,
        sourceTitle: document.sourceTitle, sourceTier: 1, reportingPeriod: period, periodEnd: period,
        periodStart: layout.start, filedAt: null, reportedAt, sourceDateKind: 'issuer_report_signature', currency: units.currency, unit: units.currency, value,
        originalField: label, normalizedField: field, normalizationFormula: `PDF page ${page.num}: ${label} = ${amount} × ${units.scale} ${units.currency}`,
        validation: { version: EVIDENCE_VERSION, bound, note: bound === 'upper'
          ? 'Consolidated total liabilities are a conservative upper bound, not an exact debt amount.'
          : `Source-backed statement row on PDF page ${page.num}; selected-page extraction, not full-document completeness.` } });
    }
  }
  return result;
}

export function pdfEvidenceDocument(pages: PdfEvidencePage[], security: SecurityIdentity, url: string, retrievedAt: string) {
  const text = pages.map(page => `[PDF page ${page.num}] ${page.text}`).join('\n');
  const periods = pages.flatMap(page => {
    const header = statementHeader(page.text);
    const layout = header ? statementLayout(page.text.slice(header.index), /STATEMENT OF (?:INCOME|PROFIT OR LOSS)/i.test(header[0]), new Date(retrievedAt)) : null;
    return layout ? [layout.period] : [];
  }).sort().reverse();
  return createSourceDocument({ adapterId: 'regional-official-filings', sourceTitle: `${security.name} — selected financial report pages`,
    publisher: security.name, url, retrievalDate: retrievedAt, sourceType: periods[0] && !periods[0].endsWith('-12-31') ? 'quarterly_report' : 'annual_report', tier: 1, reliability: 'official',
    extractedText: text, companyIdentifier: security.canonicalId, reportingPeriod: periods[0] ?? null, mimeType: 'application/pdf',
    supports: [`Only PDF pages ${pages.map(page => page.num).join(', ')} were extracted; no unreported zeros or complete institutional certification.`] });
}