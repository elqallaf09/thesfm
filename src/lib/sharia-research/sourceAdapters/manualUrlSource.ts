import type { SourceAdapter } from '../types';
import { emptyAdapterResult, fetchDocument } from './shared';

export const manualUrlSourceAdapter: SourceAdapter = {
  id: 'manual-url-source',
  label: 'User-supplied public source URLs',
  tier: 4,
  isEnabled: () => true,
  supports: () => true,
  async research(context) {
    const urls = Array.from(new Set(context.manualUrls ?? [])).slice(0, 3);
    if (urls.length === 0) return emptyAdapterResult(this.id);
    const settled = await Promise.allSettled(urls.map(url => fetchDocument({
      context,
      adapterId: this.id,
      url,
      title: `${context.security.name} — supplied public source`,
      publisher: new URL(url).hostname,
      sourceType: 'manual_url',
      tier: 4,
      reliability: 'unknown',
      supports: ['user-supplied supporting evidence; authority must be assessed from the publisher'],
    })));
    const documents = settled.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
    const errors = settled.flatMap((result, index) => result.status === 'rejected' ? [{
      code: 'MANUAL_SOURCE_FAILED',
      message: result.reason instanceof Error ? result.reason.message : String(result.reason),
      retryable: false,
      url: urls[index],
    }] : []);
    return { adapterId: this.id, status: documents.length === urls.length ? 'success' : documents.length ? 'partial' : 'failed', documents, financialValues: [], errors };
  },
};
