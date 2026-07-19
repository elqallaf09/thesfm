import 'server-only';

import type {
  AnalysisResult,
  CanonicalAssetIdentity,
  IntelligenceHorizon,
} from '@/domain/intelligence/contracts';
import type {
  IntelligenceAnalysisDrift,
  IntelligenceTimelineComparison,
  IntelligenceTimelineItem,
} from '@/domain/intelligence/outcomes';
import { calculateIntelligenceDrift } from '@/lib/intelligence/drift';
import type {
  IntelligenceOutcomeStore,
  IntelligenceTimelineStoreQuery,
  StoredIntelligenceAnalysis,
} from './outcomeStore';
import { SupabaseIntelligenceOutcomeStore } from './outcomeStore';

export type IntelligenceTimelineQuery = Omit<IntelligenceTimelineStoreQuery, 'asset'> & {
  asset: Pick<CanonicalAssetIdentity, 'canonicalSymbol' | 'assetType'>;
};

export type IntelligenceTimelineResult = {
  items: IntelligenceTimelineItem[];
  nextCursor: string | null;
};

function timelineItem(input: {
  analysis: StoredIntelligenceAnalysis;
  previous: AnalysisResult | null;
  outcome: IntelligenceTimelineItem['outcome'];
}): IntelligenceTimelineItem {
  const { result } = input.analysis;
  return {
    analysisId: result.analysisId,
    asset: {
      canonicalSymbol: result.asset.canonicalSymbol,
      displaySymbol: result.asset.displaySymbol,
      assetType: result.asset.assetType,
      exchange: result.asset.exchange,
      market: result.asset.market,
      quoteCurrency: result.asset.quoteCurrency,
    },
    generatedAt: result.generatedAt,
    dataAsOf: result.dataAsOf,
    recommendation: result.recommendation,
    confidence: result.confidence,
    risk: result.risk,
    freshness: result.freshness.state,
    warnings: result.warnings,
    provider: result.providerProvenance,
    versions: {
      engineVersion: result.engineVersion,
      rulesVersion: result.rulesVersion,
      weightingVersion: result.weightingVersion,
    },
    drift: calculateIntelligenceDrift(result, input.previous),
    outcomeStatus: input.outcome?.evaluationStatus ?? 'PENDING',
    outcome: input.outcome,
  };
}

function ensureComparable(input: {
  left: StoredIntelligenceAnalysis;
  right: StoredIntelligenceAnalysis;
  asset: Pick<CanonicalAssetIdentity, 'canonicalSymbol' | 'assetType'>;
  horizon: IntelligenceHorizon;
}) {
  return input.left.result.asset.canonicalSymbol === input.asset.canonicalSymbol
    && input.right.result.asset.canonicalSymbol === input.asset.canonicalSymbol
    && input.left.result.asset.assetType === input.asset.assetType
    && input.right.result.asset.assetType === input.asset.assetType
    && input.left.result.horizon === input.horizon
    && input.right.result.horizon === input.horizon;
}

export class IntelligenceTimelineService {
  constructor(private readonly store: IntelligenceOutcomeStore = new SupabaseIntelligenceOutcomeStore()) {}

  async getTimeline(query: IntelligenceTimelineQuery): Promise<IntelligenceTimelineResult> {
    const timeline = await this.store.listTimeline(query);
    const visible = new Map(timeline.analyses.map(analysis => [analysis.result.analysisId, analysis]));
    const referencedPrevious = new Map<string, AnalysisResult | null>();
    for (let index = 0; index < timeline.analyses.length; index += 1) {
      const analysis = timeline.analyses[index];
      const previousId = analysis.result.previousAnalysis?.analysisId;
      const visiblePrevious = previousId ? visible.get(previousId) : timeline.analyses[index + 1];
      if (visiblePrevious) {
        referencedPrevious.set(analysis.result.analysisId, visiblePrevious.result);
        continue;
      }
      if (!previousId) {
        referencedPrevious.set(analysis.result.analysisId, null);
        continue;
      }
      const previous = await this.store.getAccessibleAnalysis(previousId, query.userId);
      referencedPrevious.set(analysis.result.analysisId, previous?.result ?? null);
    }
    return {
      items: timeline.analyses.map(analysis => timelineItem({
        analysis,
        previous: referencedPrevious.get(analysis.result.analysisId) ?? null,
        outcome: timeline.outcomes.get(analysis.result.analysisId) ?? null,
      })),
      nextCursor: timeline.nextCursor,
    };
  }

  async compare(input: {
    leftAnalysisId: string;
    rightAnalysisId: string;
    userId: string | null;
    asset: Pick<CanonicalAssetIdentity, 'canonicalSymbol' | 'assetType'>;
    horizon: IntelligenceHorizon;
  }): Promise<IntelligenceTimelineComparison | null> {
    if (input.leftAnalysisId === input.rightAnalysisId) return null;
    const [first, second] = await Promise.all([
      this.store.getAccessibleAnalysis(input.leftAnalysisId, input.userId),
      this.store.getAccessibleAnalysis(input.rightAnalysisId, input.userId),
    ]);
    if (!first || !second || !ensureComparable({ left: first, right: second, asset: input.asset, horizon: input.horizon })) return null;
    const [firstOutcome, secondOutcome] = await Promise.all([
      this.store.getOutcome(first.result.analysisId),
      this.store.getOutcome(second.result.analysisId),
    ]);
    const [left, right] = Date.parse(first.result.generatedAt) <= Date.parse(second.result.generatedAt)
      ? [first, second]
      : [second, first];
    const leftOutcome = left.result.analysisId === first.result.analysisId ? firstOutcome : secondOutcome;
    const rightOutcome = right.result.analysisId === first.result.analysisId ? firstOutcome : secondOutcome;
    const drift: IntelligenceAnalysisDrift = calculateIntelligenceDrift(right.result, left.result);
    return {
      left: timelineItem({ analysis: left, previous: null, outcome: leftOutcome }),
      right: timelineItem({ analysis: right, previous: left.result, outcome: rightOutcome }),
      drift,
    };
  }

  async latestOutcome(input: {
    userId: string | null;
    asset: Pick<CanonicalAssetIdentity, 'canonicalSymbol' | 'assetType'>;
    horizon: IntelligenceHorizon;
  }) {
    const timeline = await this.getTimeline({
      ...input,
      from: null,
      to: null,
      cursor: null,
      limit: 1,
    });
    return timeline.items[0] ?? null;
  }
}

export const intelligenceTimelineService = new IntelligenceTimelineService();
