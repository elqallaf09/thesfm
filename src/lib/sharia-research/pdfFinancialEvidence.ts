import { randomUUID } from 'node:crypto';
import { createSourceDocument } from './contentExtraction';
import { EVIDENCE_VERSION } from './evidenceValidation';
import { financialStatementSections, kwdStatementScale, pdfStatementLayout, statementAmount } from './pdfStatementLayout';
import type { FinancialValue, SecurityIdentity, SourceDocument } from './types';

export type PdfEvidencePage = { num: number; text: string };
export async function extractSelectedPdfPages(body: Uint8Array, hints: number[] = []): Promise<PdfEvidencePage[]> {
  if (body.byteLength < 5 || body.byteLength > 15 * 1024 * 1024) throw new Error('pdf_size_limit');
  const { CanvasFactory } = await import('pdf-parse/worker');
  const { PDFParse } = await import('pdf-parse');
  // PDF.js transfers ownership of its data buffer to a worker. Transferring the
  // secureFetch buffer detached the cached source and corrupted subsequent reads.
  const parser = new PDFParse({ data: new Uint8Array(body), CanvasFactory });
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

/** Read recognized consolidated statements independently, including two-page
 * annual-report spreads. Unknown columns and unreadable numbers remain absent. */
export function financialValuesFromPdfPages(pages: PdfEvidencePage[], security: SecurityIdentity, document: SourceDocument,
  expectedName: RegExp, now = new Date()): FinancialValue[] {
  if (document.companyIdentifier !== security.canonicalId) return [];
  const result: FinancialValue[] = [];
  const allText = pages.map(page => page.text).join('\n');
  const signature = /(?:financial (?:statements|information)[\s\S]{0,160}?authorised for issue[\s\S]{0,260}?on\s+)(\d{1,2}\s+[A-Za-z]+\s+20\d{2})/i.exec(allText)?.[1]
    ?? pages.filter(page => /INDEPENDENT AUDITORS|REPORT ON REVIEW OF INTERIM/i.test(page.text))
      .flatMap(page => [...page.text.matchAll(/(?:^|\n)\s*(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2})\s*\n\s*Kuwait\s*(?:\n|$)/g)])
      .map(match => match[1]).at(-1) ?? null;
  const signatureTime = signature ? Date.parse(signature + ' UTC') : NaN;
  const reportedAt = Number.isFinite(signatureTime) && signatureTime <= now.getTime() ? new Date(signatureTime).toISOString().slice(0, 10) : null;
  for (const page of pages) {
    if (!expectedName.test(page.text)) continue;
    for (const {kind,text} of financialStatementSections(page.text)) {
      const layout=pdfStatementLayout(text,kind,now), scale=kwdStatementScale(text);
      if (!layout || !scale) continue;
      for (const raw of text.split(/\r?\n/)) {
        const line=raw.trim();
        let field: FinancialValue['normalizedField'] | null=null, bound: 'exact'|'lower'|'upper'='exact';
        const row = kind==='position' ? /^(TOTAL ASSETS|TOTAL LIABILITIES|Cash and cash equivalents)\s+(.+)$/i.exec(line)
          : kind==='income' ? /^(Interest income|Total revenues|Revenue|Revenues)\s+(.+)$/i.exec(line)
            : /^(Cash and cash equivalents (?:at (?:the )?end of (?:the )?(?:period|year)|as at 31 December))\s+(.+)$/i.exec(line);
        if (!row) continue;
        const label=row[1], amount=statementAmount(row[2],layout);
        if (amount===null) continue;
        const value=Number(amount.replaceAll(',',''))*scale;
        if (!Number.isFinite(value) || value<0 || value>Number.MAX_SAFE_INTEGER) continue;
        if (kind==='position') {
          if (/^TOTAL ASSETS$/i.test(label)) field='total_assets';
          else if (/^TOTAL LIABILITIES$/i.test(label)) {field='interest_bearing_debt';bound='upper';}
          else field='cash_and_equivalents';
        } else if (kind==='income') {
          if (/^Interest income$/i.test(label)) {field='interest_income';bound='lower';}
          else field='total_income';
        } else {
          if (/31 December/i.test(label) && !layout.period.endsWith('-12-31')) continue;
          field='cash_and_equivalents';bound='lower';
        }
        // Sukuk, financing income, net income and cash + short-term funds are
        // deliberately not relabeled as interest, gross revenue or exact cash.
        if (!field || (field==='total_assets' && value<=0)) continue;
        const start=kind==='income'?layout.start:null;
        const existing=result.find(item=>item.normalizedField===field && item.periodEnd===layout.period
          && item.periodStart===start && item.validation?.bound===bound);
        if(existing){if(existing.value!==value)throw new Error('pdf_conflicting_statement_values');continue;}
        result.push({id:randomUUID(),documentId:document.id,sourceUrl:document.sourceUrl,sourceTitle:document.sourceTitle,
          sourceTier:1,reportingPeriod:start?`${start}/${layout.period}`:layout.period,periodEnd:layout.period,periodStart:start,
          filedAt:null,reportedAt,sourceDateKind:'issuer_report_signature',currency:'KWD',unit:'KWD',value,
          originalField:label,normalizedField:field,normalizationFormula:`PDF page ${page.num}: ${label} = ${amount} × ${scale} KWD`,
          validation:{version:EVIDENCE_VERSION,bound,note:bound==='upper'
            ? 'Consolidated total liabilities are a conservative upper bound, not an exact debt amount.'
            : kind==='cashflow' ? 'Reported closing cash-flow balance is retained as a lower bound pending balance-sheet/overdraft reconciliation.'
              : `Source-backed statement row on PDF page ${page.num}; selected-page extraction, not full-document completeness.`}});
      }
    }
  }
  return result;
}

export function pdfEvidenceDocument(pages: PdfEvidencePage[], security: SecurityIdentity, url: string, retrievedAt: string) {
  const text=pages.map(page=>`[PDF page ${page.num}] ${page.text}`).join('\n');
  const periods=pages.flatMap(page=>financialStatementSections(page.text).flatMap(section=>{
    const layout=pdfStatementLayout(section.text,section.kind,new Date(retrievedAt));return layout?[layout.period]:[];
  })).sort().reverse();
  return createSourceDocument({adapterId:'regional-official-filings',sourceTitle:`${security.name} — selected financial report pages`,
    publisher:security.name,url,retrievalDate:retrievedAt,sourceType:periods[0]&&!periods[0].endsWith('-12-31')?'quarterly_report':'annual_report',tier:1,reliability:'official',
    extractedText:text,companyIdentifier:security.canonicalId,reportingPeriod:periods[0]??null,mimeType:'application/pdf',
    supports:[`Only PDF pages ${pages.map(page=>page.num).join(', ')} were extracted; no unreported zeros or complete institutional certification.`]});
}
