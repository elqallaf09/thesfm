import type { resolveBoubyanReference } from './boubyanReference';
import type { ShariahStatus } from './shariah-screening';

export type BoubyanReferenceResolution = ReturnType<typeof resolveBoubyanReference>;
export type BoubyanSourceConflict = {
  kind: 'manual_override' | 'source_disagreement';
  retainedStatus: ShariahStatus;
  retainedSource: string | null;
  retainedReviewedAt: string | null;
  publishedStatus: 'compliant';
  publishedSource: 'Boubyan Capital';
  reason: { ar: string; en: string; fr: string };
};

type DecisionContext = {
  status: ShariahStatus;
  source: string | null;
  reviewedAt: string | null;
  manualOverride: boolean;
  verifiedFailure: boolean;
};

const conflictReason = {
  ar: 'ورد السهم في قائمة بوبيان كابيتال المتوافقة، مع وجود قرار موثق مخالف. يظهر الرأيان ومصدر كل منهما للمراجعة.',
  en: 'Boubyan Capital lists this security as compliant, while a documented decision disagrees. Both opinions and their sources are retained for review.',
  fr: 'Boubyan Capital publie ce titre comme conforme, mais une décision documentée diffère. Les deux avis et leurs sources sont conservés pour examen.',
};

/** Shared precedence for the public catalog and the wider market classifier. */
export function decideBoubyanReference(
  resolved: BoubyanReferenceResolution | null,
  current: DecisionContext,
  now = new Date(),
) {
  // A review cannot retroactively change a historical decision or advertise
  // evidence that had not yet been checked at the requested point in time.
  const checkedAt = Date.parse(resolved?.reference?.checkedAt ?? '');
  const resolution = resolved?.reasonCode === 'source_not_yet_effective'
    || Number.isFinite(checkedAt) && checkedAt > now.getTime() ? null : resolved;
  const reference = resolution?.reference ?? null;
  const documentedDisagreement = resolution?.state === 'listed'
    && reference?.publishedStatus === 'compliant'
    && current.status === 'non_compliant' && current.verifiedFailure;
  const conflict: BoubyanSourceConflict | null = documentedDisagreement ? {
    kind: current.manualOverride ? 'manual_override' : 'source_disagreement',
    retainedStatus: current.status,
    retainedSource: current.source,
    retainedReviewedAt: current.reviewedAt,
    publishedStatus: 'compliant',
    publishedSource: 'Boubyan Capital',
    reason: conflictReason,
  } : null;
  const currentDetermination = current.verifiedFailure || current.status === 'compliant'
    && Boolean(current.source && current.reviewedAt);
  const historicalReference = resolution?.state !== 'listed' && currentDetermination;
  const applies = Boolean(reference && !current.manualOverride && !historicalReference
    && (resolution?.state === 'listed' || resolution?.state === 'review_due'
      || resolution?.reasonCode === 'excluded_from_publication'));
  return {
    resolution,
    reference,
    applies,
    conflict,
    status: applies ? conflict ? 'needs_review' as const : resolution!.shariahStatus : current.status,
    reason: conflict && !current.manualOverride ? conflictReason : resolution?.reason ?? null,
  };
}
