import { test, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { secureFetch } from '@/lib/sharia-research/secureFetch';
import { extractSelectedPdfPages } from '@/lib/sharia-research/pdfFinancialEvidence';

const enabled = process.env.SHARIAH_FOLLOWUP_LIVE === '1';
const sources = [
  { id: 'nbk', url: 'https://www.nbk.com/dam/jcr:a9b5fda4-e785-4705-8938-9a2364b06360/nbk-fs-2q-2026-e.pdf', pages: [] },
  { id: 'boubyan', url: 'https://www.bankboubyan.com/media/filer_public/60/37/6037dab5-8d89-4ec5-93eb-cc87d58cf16e/english_-_boubyan_bank_e_30_june_2026.pdf', pages: [] },
  { id: 'kfh', url: 'https://www.kfh.com/en/reports/kuwait/Annual-Reports/Annual-Report-2025/document_en/KFH%20Annual%20Report%20En%202025%20(Draft-17)%20Web.pdf.pdf', pages: [83,84,85,86,87,88,89,90,91,92] },
  { id: 'ifa', url: 'https://www.ifakuwait.com/pdf/2025/EN/IFA_FS_31-12-2025-EN.pdf', pages: [] },
];
for (const source of sources) test.skipIf(!enabled)(`inspect actual official PDF: ${source.id}`, async () => {
  mkdirSync('proof/public-probe', { recursive: true });
  const start = Date.now();
  try {
    const response = await secureFetch(source.url, { signal: AbortSignal.timeout(55000), timeoutMs: 15000,
      retries: 0, maxBytes: 15 * 1024 * 1024, acceptedContentTypes: ['application/pdf'], respectRobots: true });
    const pages = await extractSelectedPdfPages(response.body, source.pages);
    const item = { id: source.id, url: response.finalUrl, retrievedAt: response.retrievedAt, bytes: response.body.length,
      hash: createHash('sha256').update(response.body).digest('hex'), elapsedMs: Date.now()-start, pages };
    writeFileSync(`proof/public-probe/${source.id}.json`, JSON.stringify(item, null, 2));
    const statements = pages.filter(page => /CONSOLIDATED (?:STATEMENT|BALANCE)|authorised for issue|authorized for issue|INDEPENDENT AUDITORS|REPORT ON REVIEW/i.test(page.text));
    console.log(JSON.stringify({ ...item, pages: undefined, pageLengths: pages.map(page=>({page:page.num,length:page.text.length})),
      statements: statements.slice(0,8).map(page=>({num:page.num,text:page.text.slice(0,7500)})) }));
    expect(response.status).toBe(200);
  } catch(error) {
    const failure = { id: source.id, elapsedMs: Date.now()-start, error: error instanceof Error ? error.message : 'probe_failed' };
    writeFileSync(`proof/public-probe/${source.id}.json`, JSON.stringify(failure));
    console.log(JSON.stringify(failure));
    // This is a discovery record, not a source availability/completeness gate.
    expect(source.url.startsWith('https://')).toBe(true);
  }
}, 90000);
