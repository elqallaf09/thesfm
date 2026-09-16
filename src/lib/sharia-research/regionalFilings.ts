import { secureFetch } from './secureFetch';
import { extractSelectedPdfPages, financialValuesFromPdfPages, pdfEvidenceDocument } from './pdfFinancialEvidence';
import type { SecurityIdentity, SourceAdapter } from './types';
import { failedAdapterResult } from './sourceAdapters/shared';

type DocumentFallback = { url: string; pages?: number[] };
type Profile = { symbols: string[]; country: string; name: RegExp; directory: string; document?: string; pages?: number[]; alternates?: DocumentFallback[] };
const profiles: Profile[] = [
  { symbols: ['NBK', 'NBK.KW'], country: 'KW', name: /National Bank of Kuwait/i, directory: 'https://www.nbk.com/investor-relations.html',
    document: 'https://www.nbk.com/dam/jcr:a9b5fda4-e785-4705-8938-9a2364b06360/nbk-fs-2q-2026-e.pdf' },
  { symbols: ['KFH', 'KFH.KW'], country: 'KW', name: /Kuwait Finance House/i, directory: 'https://www.kfh.com/en/home/Investor-Relations/Annual-Reports/Annual-Reports.html',
    document: 'https://www.kfh.com/en/reports/kuwait/Annual-Reports/Annual-Report-2025/document_en/KFH%20Annual%20Report%20En%202025%20(Draft-17)%20Web.pdf.pdf', pages: [83, 84, 85, 86, 87, 88, 89, 90, 91, 92] },
  { symbols: ['BOUBYAN', 'BOUBYAN.KW'], country: 'KW', name: /Boubyan Bank/i, directory: 'https://www.bankboubyan.com/en/investor-relations', document: 'https://www.bankboubyan.com/media/filer_public/60/37/6037dab5-8d89-4ec5-93eb-cc87d58cf16e/english_-_boubyan_bank_e_30_june_2026.pdf' },
  { symbols: ['IFA', 'IFA.KW'], country: 'KW', name: /International Financial Advis[oe]rs/i, directory: 'https://www.ifakuwait.com/financial-statements.html',
    // Prefer the issuer's dedicated audited financial-statements PDF. The larger
    // annual report remains a same-origin fallback because its visual layout can
    // produce sparse text extraction even though the source itself is valid.
    document: 'https://www.ifakuwait.com/pdf/2025/EN/IFA_FS_31-12-2025-EN.pdf',
    alternates: [{ url: 'https://www.ifakuwait.com/pdf/annual-report/2025/IFA_Holding_Annual_Report_2025-English.pdf', pages: [37, 38, 39, 40, 43, 44, 45, 91, 103, 105] }] },
];
function issuerHost(hostname: string) { return hostname.toLowerCase().replace(/^www\./, ''); }
function sameIssuerHost(left: string, right: string) { return issuerHost(new URL(left).hostname) === issuerHost(new URL(right).hostname); }
export function regionalProfile(security: Pick<SecurityIdentity, 'ticker' | 'providerSymbol' | 'country' | 'exchange' | 'name'>) {
  const country = String(security.country ?? '').toUpperCase();
  if (!['KW', 'KUWAIT'].includes(country) && !/KUWAIT|XKUW/i.test(security.exchange)) return null;
  return profiles.find(profile => profile.symbols.some(symbol => [security.ticker, security.providerSymbol].includes(symbol)) && profile.name.test(security.name)) ?? null;
}

/** Bounded discovery on the already-verified issuer host. An explicit document
 * fallback is not advertised as the newest quarter when no newer link is found. */
export function issuerPdfLinks(html: string, directory: string, now = new Date()) {
  // Boubyan publishes same-origin financial links in escaped server-rendered
  // JSON rather than anchor tags. Decode quoting only; never execute scripts.
  if (new URL(directory).hostname === 'www.bankboubyan.com') {
    const decoded = html.replaceAll('\\"', '"');
    for (const match of decoded.matchAll(/"link"\s*:\s*"(\/media\/[^"<>]+\.pdf)"/g)) {
      if (/20\d{2}/.test(match[1])) html += `<a href="${match[1]}">Financial report</a>`;
    }
  }
  const links = [...html.matchAll(/<a\b[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].flatMap(match => {
    try {
      const url = new URL(match[1].replaceAll('&amp;', '&'), directory);
      const description = decodeURIComponent(url.pathname) + ' ' + match[2].replace(/<[^>]+>/g, ' ');
      const years = [...description.matchAll(/(?<!\d)(20\d{2})(?!\d)/g)].map(found => Number(found[1]));
      // A generic 'report' is not a financial statement. NBK's SPO sustainability
      // report otherwise sorted ahead of the current quarterly accounts.
      const financial = /financial[\s_-]*(?:statements?|reports?)|annual[\s_-]*reports?|(?:^|[ /_-])fs(?:[ /_-]|$)/i.test(description);
      const unrelated = /arabic|_ar\b|sustainab|esg|presentation|liquidity|nsfr|basel|tariff|full.script|second[\s_-]*party|(?:^|[ /_-])spo(?:[ /_-]|$)/i.test(description);
      if (!sameIssuerHost(url.toString(), directory) || url.protocol !== 'https:' || !/\.pdf$/i.test(url.pathname)
        || url.username || url.password || !years.length || Math.max(...years) > now.getUTCFullYear() || !financial || unrelated) return [];
      return [{ url: url.toString(), year: Math.max(...years), quarter: Number(/(?:q|quarter)[ -]*([1-4])(?!\d)/i.exec(description)?.[1] ?? /([1-4])[ -]*q(?![a-z])/i.exec(description)?.[1] ?? (/june/i.test(description) ? 2 : /march|mar[_ -]/i.test(description) ? 1 : /september/i.test(description) ? 3 : /annual|(?:^|[ /_-])fy(?:[ /_-]|$)|december/i.test(description) ? 4 : 0)) }];
    } catch { return []; }
  });
  return links.sort((a, b) => b.year - a.year || b.quarter - a.quarter).map(item => item.url).filter((url, i, all) => all.indexOf(url) === i);
}

export const regionalFilingsAdapter: SourceAdapter = {
  id: 'regional-official-filings', label: 'Verified Gulf issuer financial statements', tier: 1,
  isEnabled: () => true, supports: security => Boolean(regionalProfile(security)),
  async research(context) {
    const profile = regionalProfile(context.security);
    if (!profile) return { adapterId: this.id, status: 'unavailable', documents: [], financialValues: [], errors: [{ code: 'REGIONAL_IDENTITY_NOT_VERIFIED', message: 'No exact issuer/exchange/profile match.', retryable: false }] };
    try {
      // Discovery is an enhancement, not a prerequisite for a reviewed explicit
      // issuer PDF. This prevents a slow/unavailable IR index page from hiding a
      // known public filing such as IFA's audited annual report.
      let found: string[] = [];
      try {
        const directory = await secureFetch(profile.directory, { signal: context.signal, maxBytes: 5_000_000, acceptedContentTypes: ['text/html'], cacheTtlMs: 6 * 3600_000 });
        if (sameIssuerHost(directory.finalUrl, profile.directory)) {
          found = issuerPdfLinks(new TextDecoder().decode(directory.body), profile.directory, new Date(context.retrievedAt));
        }
      } catch {
        context.signal?.throwIfAborted();
      }
      const discovered = found.slice(0, 2).map(url => ({ url, pages: url === profile.document ? profile.pages : undefined }));
      const fallbacks: DocumentFallback[] = [
        ...(profile.document ? [{ url: profile.document, pages: profile.pages }] : []),
        ...(profile.alternates ?? []),
      ];
      // Reviewed explicit issuer documents are tried first. Discovery can add a
      // newer same-origin filing but cannot delay a known-good fallback until a
      // request-level deadline is nearly exhausted.
      const candidates = [...fallbacks, ...discovered].filter((item, index, all) => all.findIndex(other => other.url === item.url) === index).slice(0, 4);
      if (!candidates.length) throw new Error('regional_financial_document_not_discovered');

      let response: Awaited<ReturnType<typeof secureFetch>> | null = null;
      let selected: DocumentFallback | null = null;
      let lastError: unknown = null;
      for (const candidate of candidates) {
        try {
          const fetched = await secureFetch(candidate.url, { signal: context.signal, maxBytes: 15 * 1024 * 1024, acceptedContentTypes: ['application/pdf'], cacheTtlMs: 6 * 3600_000 });
          if (!sameIssuerHost(fetched.finalUrl, profile.directory)) throw new Error('regional_document_identity_changed');
          response = fetched;
          selected = candidate;
          break;
        } catch (error) {
          lastError = error;
          context.signal?.throwIfAborted();
        }
      }
      if (!response || !selected) throw lastError ?? new Error('regional_financial_document_not_discovered');

      context.signal?.throwIfAborted();
      const pages = await extractSelectedPdfPages(response.body, selected.pages ?? []);
      context.signal?.throwIfAborted();
      const document = pdfEvidenceDocument(pages, context.security, response.finalUrl, response.retrievedAt);
      if (!profile.name.test(document.extractedText)) throw new Error('regional_document_issuer_mismatch');
      const financialValues = financialValuesFromPdfPages(pages, context.security, document, profile.name, new Date(context.retrievedAt));
      return { adapterId: this.id, status: 'partial', documents: [document], financialValues,
        errors: [{ code: 'REGIONAL_FINANCIAL_COVERAGE_PARTIAL', message: 'Only explicit current statement rows were extracted. Missing income breakdown, statement layouts and institution-level opinions require further evidence.', retryable: false }],
        identityPatch: { website: profile.directory } };
    } catch (error) { return failedAdapterResult(this.id, error, profile.directory); }
  },
};