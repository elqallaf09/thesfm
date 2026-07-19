import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const recentRoute = read('src/app/api/intelligence/recent/route.ts');
const accuracyRoute = read('src/app/api/intelligence/accuracy/route.ts');
const recentService = read('src/services/intelligence/recentAnalyses.ts');

describe('AI Analyst read-adapter boundaries', () => {
  it('derives the identity server-side, rate-limits both reads, and emits safe telemetry', () => {
    for (const source of [recentRoute, accuracyRoute]) {
      expect(source).toContain('getCurrentUserFromRequest(request)');
      expect(source).toContain('checkRateLimit');
      expect(source).toContain('IntelligenceTelemetryCollector');
      expect(source).toContain("'X-Correlation-ID': correlationId");
      expect(source).not.toContain('service_role');
      expect(source).not.toContain('process.env.SUPABASE');
    }
  });

  it('returns only a safe summary projection and does not leak snapshots or user identifiers', () => {
    expect(recentService).toContain("import 'server-only'");
    expect(recentService).toContain("scope.eq.shared,and(scope.eq.private,user_id.eq.${userId})");
    expect(recentService).toContain("query.eq('scope', 'shared')");
    expect(recentService).not.toContain('result_snapshot');
    expect(recentService).not.toContain('provider_provenance');
    expect(recentService).not.toContain('user_id,');
    expect(recentService).toContain('fixed safe projection');
  });

  it('keeps historical accuracy descriptive and delegates the existing sample-gated report', () => {
    expect(accuracyRoute).toContain('buildSharedCalibration()');
    expect(accuracyRoute).not.toContain('weighting');
    expect(accuracyRoute).not.toContain('update');
    expect(accuracyRoute).not.toContain('insert');
  });
});
