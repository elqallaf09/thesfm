import { extractHtmlContent } from '../contentExtraction';
import { discoverWebSources } from '../webDiscovery';
import { isPlaywrightFallbackEnabled, renderPublicPageWithPlaywright } from '../playwrightFallback';
import { secureFetch } from '../secureFetch';
import type { SourceAdapter } from '../types';
import { emptyAdapterResult, extractSameOriginResearchLinks, failedAdapterResult, fetchDocument } from './shared';

async function candidateWebsite(context: Parameters<SourceAdapter['research']>[0]) {
  if (context.security.website) return context.security.website;
  const results = await discoverWebSources(`"${context.security.name}" investor relations annual report`, context.signal);
  const companyToken = context.security.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').find(token => token.length >= 4);
  return results.find(result => {
    try {
      const domain = new URL(result.url).hostname.toLowerCase();
      return /(investor|annual report|financial results)/i.test(`${result.title} ${result.content ?? ''}`)
        && Boolean(companyToken && domain.includes(companyToken));
    } catch {
      return false;
    }
  })?.url ?? null;
}

export const companyInvestorRelationsAdapter: SourceAdapter = {
  id: 'company-investor-relations',
  label: 'Official company investor-relations pages',
  tier: 1,
  isEnabled: () => true,
  supports: () => true,
  async research(context) {
    const website = await candidateWebsite(context).catch(() => null);
    if (!website) return emptyAdapterResult(this.id);
    try {
      const response = await secureFetch(website, {
        acceptedContentTypes: ['text/html', 'application/xhtml+xml'],
        maxBytes: 5 * 1024 * 1024,
        cacheTtlMs: 6 * 60 * 60 * 1000,
        signal: context.signal,
      });
      let html = new TextDecoder().decode(response.body);
      let extracted = extractHtmlContent(html);
      if (extracted.text.length < 350 && isPlaywrightFallbackEnabled()) {
        html = await renderPublicPageWithPlaywright(response.finalUrl);
        extracted = extractHtmlContent(html);
      }
      const links = extractSameOriginResearchLinks(html, response.finalUrl);
      const documents = [await fetchDocument({
        context,
        adapterId: this.id,
        url: response.finalUrl,
        title: extracted.title || `${context.security.name} investor relations`,
        publisher: context.security.name,
        sourceType: 'company_ir',
        tier: 1,
        reliability: context.security.website ? 'official' : 'unknown',
        supports: ['business description', 'company disclosures'],
      })];
      const settled = await Promise.allSettled(links.slice(0, 3).map(url => fetchDocument({
        context,
        adapterId: this.id,
        url,
        title: `${context.security.name} investor document`,
        publisher: context.security.name,
        sourceType: /annual|10-k/i.test(url) ? 'annual_report' : 'company_ir',
        tier: 1,
        reliability: context.security.website ? 'official' : 'unknown',
        supports: ['business activity', 'financial reporting', 'subsidiaries'],
      })));
      documents.push(...settled.flatMap(result => result.status === 'fulfilled' ? [result.value] : []));
      const errors = settled.flatMap(result => result.status === 'rejected' ? [{ code: 'IR_LINK_FAILED', message: result.reason instanceof Error ? result.reason.message : String(result.reason), retryable: true }] : []);
      return {
        adapterId: this.id,
        status: errors.length ? 'partial' : 'success',
        documents,
        financialValues: [],
        identityPatch: context.security.website ? undefined : { website: response.finalUrl },
        errors,
      };
    } catch (error) {
      return failedAdapterResult(this.id, error, website);
    }
  },
};
