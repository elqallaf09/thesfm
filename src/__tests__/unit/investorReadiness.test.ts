import { describe, expect, it } from 'vitest';
import {
  computeReadiness,
  READINESS_CATEGORY_WEIGHTS,
  STALE_AFTER_DAYS,
  type ReadinessSnapshot,
} from '@/lib/investor/readiness';

const NOW = new Date('2026-07-12T12:00:00Z').getTime();
const RECENT = '2026-07-01T00:00:00Z';

function emptySnapshot(): ReadinessSnapshot {
  return {
    project: null,
    feasibility: null,
    financialModel: null,
    funding: null,
    pitchDeck: null,
    documents: [],
    risks: [],
    links: [],
    contactEmail: null,
  };
}

function completeSnapshot(): ReadinessSnapshot {
  return {
    project: { name: 'مشروع تجريبي', notes: 'وصف واضح للمشروع وقيمته', status: 'growth', sector: 'fintech', updated_at: RECENT },
    feasibility: {
      market_data: { target_customers: 'شركات صغيرة', market_size: '5m', competition: 'قليلة' },
      technical_data: { business_model: 'subscriptions', operations: 'فريق تشغيل' },
      updated_at: RECENT,
    },
    financialModel: {
      revenue_streams: [{ name: 'اشتراكات', monthly_amount: 1000 }],
      cost_items: [{ name: 'تشغيل', monthly_amount: 400 }],
      forecast: [{ month: 1, revenue: 1000 }],
      assumptions: { growth: '5%' },
      updated_at: RECENT,
    },
    funding: {
      funding_needed: 50000,
      currency: 'KWD',
      funding_type: 'equity',
      use_of_funds: { product: { amount: 30000, percent: 60 } },
      updated_at: RECENT,
    },
    pitchDeck: {
      language: 'ar',
      deck_data: { slides: [{ title: 'A', status: 'complete' }, { title: 'B', status: 'complete' }] },
      updated_at: RECENT,
    },
    documents: [
      { title: 'رخصة تجارية', category: 'legal', updated_at: RECENT },
      { title: 'قوائم مالية', category: 'financial', updated_at: RECENT },
    ],
    risks: [{ title: 'منافسة', mitigation: 'تمييز المنتج', updated_at: RECENT }],
    links: [{ id: 'l1', revoked_at: null, created_at: RECENT }],
    contactEmail: 'owner@example.com',
  };
}

describe('investor readiness engine', () => {
  it('weights sum to 100 so the score is directly explainable', () => {
    const total = Object.values(READINESS_CATEGORY_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    expect(total).toBe(100);
  });

  it('is deterministic: the same snapshot and clock always give the same report', () => {
    const a = computeReadiness(completeSnapshot(), NOW);
    const b = computeReadiness(completeSnapshot(), NOW);
    expect(a).toEqual(b);
    expect(a.computedAt).toBe(new Date(NOW).toISOString());
  });

  it('reports an empty project as blocked with zero score and full missing list', () => {
    const report = computeReadiness(emptySnapshot(), NOW);
    expect(report.score).toBe(0);
    expect(report.status).toBe('blocked');
    // The three hard gates for investors: financial model, deck, documents.
    expect(report.blockerCheckIds).toContain('financials_model');
    expect(report.blockerCheckIds).toContain('pitch_deck_exists');
    expect(report.blockerCheckIds).toContain('documents_any');
    expect(report.missingRequiredCount).toBeGreaterThan(10);
  });

  it('only reaches 100 when every required check is genuinely complete', () => {
    const full = computeReadiness(completeSnapshot(), NOW);
    expect(full.score).toBe(100);
    expect(full.status).toBe('complete');
    expect(full.blockerCheckIds).toEqual([]);
    expect(full.missingRequiredCount).toBe(0);

    const missingRisk = completeSnapshot();
    missingRisk.risks = [];
    const partial = computeReadiness(missingRisk, NOW);
    expect(partial.score).toBeLessThan(100);
    expect(partial.status).toBe('partial');
    const risksCategory = partial.categories.find(category => category.id === 'risks');
    expect(risksCategory?.status).toBe('missing');
    expect(risksCategory?.percent).toBe(0);
  });

  it('caps a category at blocked when a blocking check is missing', () => {
    const snapshot = completeSnapshot();
    snapshot.pitchDeck = null;
    const report = computeReadiness(snapshot, NOW);
    const pitch = report.categories.find(category => category.id === 'pitch_deck');
    expect(pitch?.status).toBe('blocked');
    expect(report.status).toBe('blocked');
  });

  it('ignores optional checks in the percent but lists them as improvements', () => {
    const snapshot = completeSnapshot();
    snapshot.funding = { ...snapshot.funding, funding_type: '' };
    const report = computeReadiness(snapshot, NOW);
    const funding = report.categories.find(category => category.id === 'funding_request');
    expect(funding?.percent).toBe(100); // funding_type is optional
    expect(report.optionalImprovementCount).toBeGreaterThan(0);
  });

  it('flags stale-but-complete data as needs_review instead of complete', () => {
    const snapshot = completeSnapshot();
    const staleDate = new Date(NOW - (STALE_AFTER_DAYS + 10) * 24 * 60 * 60 * 1000).toISOString();
    snapshot.funding = { ...snapshot.funding, updated_at: staleDate, created_at: staleDate };
    const report = computeReadiness(snapshot, NOW);
    const funding = report.categories.find(category => category.id === 'funding_request');
    expect(funding?.status).toBe('needs_review');
    expect(report.status).toBe('needs_review');
  });

  it('names the first missing required check as the recommended next action', () => {
    const snapshot = completeSnapshot();
    snapshot.risks = [{ title: 'خطر بدون خطة', mitigation: '', updated_at: RECENT }];
    const report = computeReadiness(snapshot, NOW);
    const risks = report.categories.find(category => category.id === 'risks');
    expect(risks?.nextCheckId).toBe('risks_mitigation');
    expect(risks?.status).toBe('partial');
  });

  it('ignores revoked links for investor-contact readiness', () => {
    const snapshot = completeSnapshot();
    snapshot.links = [{ id: 'l1', revoked_at: RECENT, created_at: RECENT }];
    const report = computeReadiness(snapshot, NOW);
    const contact = report.categories.find(category => category.id === 'investor_contact');
    const linkCheck = contact?.checks.find(check => check.id === 'contact_share_link');
    expect(linkCheck?.done).toBe(false);
  });
});
