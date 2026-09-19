import type { OfficialPropertyRecord } from './intelligence/official-context';

export type PropertyRecordSort = 'newest' | 'oldest' | 'price-asc' | 'price-desc';
export function filterPropertyRecords(records: OfficialPropertyRecord[], query: string, propertyType: string, currency: string, sort: PropertyRecordSort) {
  const normalize = (value: string) => value.normalize('NFKD').replace(/[\u064b-\u065f\u0670]/g, '').toLowerCase().trim();
  const needle = normalize(query);
  return records.filter(row => (!propertyType || row.propertyType === propertyType) && (!currency || (currency === 'unknown' ? !row.currency : row.currency === currency))
    && (!needle || normalize([row.district, row.districtAr, row.municipality, row.municipalityAr, row.propertyType, row.propertyTypeAr, row.usage, row.usageAr, row.observedOn].filter(Boolean).join(' ')).includes(needle)))
    .sort((a, b) => {
      if (sort === 'newest' || sort === 'oldest') return (sort === 'newest' ? -1 : 1) * a.observedOn.localeCompare(b.observedOn) || a.id.localeCompare(b.id);
      // Group currencies before ordering: USD and KWD values cannot be compared without FX.
      const group = a.currency === b.currency ? 0 : !a.currency ? 1 : !b.currency ? -1 : a.currency.localeCompare(b.currency);
      if (group) return group;
      if (a.reportedValue === null || b.reportedValue === null) return a.reportedValue === b.reportedValue ? 0 : a.reportedValue === null ? 1 : -1;
      return (sort === 'price-asc' ? 1 : -1) * (a.reportedValue - b.reportedValue) || a.id.localeCompare(b.id);
    });
}
