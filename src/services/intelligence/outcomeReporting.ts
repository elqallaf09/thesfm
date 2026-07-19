import 'server-only';

import type { IntelligenceOutcomeCalibrationReport } from '@/domain/intelligence/outcomes';
import { buildOutcomeCalibrationReport } from '@/lib/intelligence/calibration';
import type { IntelligenceOutcomeStore } from './outcomeStore';
import { SupabaseIntelligenceOutcomeStore } from './outcomeStore';

export type IntelligenceCalibrationAggregate = {
  report: IntelligenceOutcomeCalibrationReport;
  scope: 'SHARED';
  truncated: boolean;
  includedOutcomes: number;
};

/**
 * Calibration aggregates are descriptive, shared-market reporting only. They
 * never update live weights and deliberately exclude private user rows.
 */
export class IntelligenceOutcomeReportingService {
  constructor(private readonly store: IntelligenceOutcomeStore = new SupabaseIntelligenceOutcomeStore()) {}

  async buildSharedCalibration(limit = 1_000): Promise<IntelligenceCalibrationAggregate> {
    const loaded = await this.store.listSharedOutcomesForReporting(limit);
    return {
      report: buildOutcomeCalibrationReport(loaded.outcomes),
      scope: 'SHARED',
      truncated: loaded.truncated,
      includedOutcomes: loaded.outcomes.length,
    };
  }
}

export const intelligenceOutcomeReportingService = new IntelligenceOutcomeReportingService();
