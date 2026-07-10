import type { SourceAdapter } from '../types';
import { MSCI_ISLAMIC_INDEX_JULY_2025 } from '../methodologies';
import { failedAdapterResult, fetchDocument } from './shared';

export const indexMethodologiesAdapter: SourceAdapter = {
  id: 'index-methodologies',
  label: 'Official Shariah-index methodology documents',
  tier: 1,
  isEnabled: () => true,
  supports: () => true,
  async research(context) {
    const methodology = MSCI_ISLAMIC_INDEX_JULY_2025;
    try {
      const document = await fetchDocument({
        context,
        adapterId: this.id,
        url: methodology.sourceDocument.url,
        title: methodology.sourceDocument.title,
        publisher: methodology.sourceDocument.publisher,
        sourceType: 'methodology',
        tier: 1,
        reliability: 'official',
        publicationDate: methodology.sourceDocument.versionDate,
        reportingPeriod: methodology.version,
        supports: ['business exclusion rules', 'financial ratio formulas', 'thresholds', 'purification guidance'],
      });
      return { adapterId: this.id, status: 'success', documents: [document], financialValues: [], errors: [] };
    } catch (error) {
      return failedAdapterResult(this.id, error, methodology.sourceDocument.url);
    }
  },
};
