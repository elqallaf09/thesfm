import 'server-only';

import sourceRows from '@/data/shariah/boubyan-q2-2026.json';
import { createBoubyanReferenceResolver, type BoubyanReferenceRow } from './boubyanReference';
import { BOUBYAN_REFERENCE } from './boubyanReferenceMetadata';

const rows = sourceRows as BoubyanReferenceRow[];

/** Full publication rows are loaded and indexed only on the server. */
export const resolveCatalogBoubyanReference = createBoubyanReferenceResolver(rows);

export function boubyanReferenceAvailability(now = new Date()) {
  const checkedAt = Date.parse(BOUBYAN_REFERENCE.checkedAt);
  const nextReviewAt = Date.parse(BOUBYAN_REFERENCE.nextReviewAt);
  const sourceAvailable = rows.length > 0 && Number.isFinite(now.getTime()) && now.getTime() >= checkedAt;
  const reviewDue = sourceAvailable && now.getTime() >= nextReviewAt;
  return {
    sourceAvailable,
    reviewDue,
    sourceMode: 'reviewed_publication_snapshot' as const,
    state: !sourceAvailable ? 'not_yet_effective' as const : reviewDue ? 'review_due' as const : 'available' as const,
    ...BOUBYAN_REFERENCE,
    rowCount: rows.length,
    lists: BOUBYAN_REFERENCE.lists.map(list => ({
      ...list,
      rowCount: rows.filter(row => row.listId === list.id).length,
    })),
  };
}
