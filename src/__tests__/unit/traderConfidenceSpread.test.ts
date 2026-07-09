import { describe, expect, it } from 'vitest';
import {
  buildMultiFactorRecommendation,
  type RecommendationPricePoint,
} from '@/lib/trader/recommendationEngine';

function series(count: number, start: number, step: number, waveAmp = 0.2): RecommendationPricePoint[] {
  return Array.from({ length: count }, (_, i) => {
    const close = start + i * step + Math.sin(i / 8) * waveAmp;
    return {
      date: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
      open: close - 0.1,
      high: close + 0.4,
      low: close - 0.4,
      close,
      volume: 1_000_000 + i * 1200,
    };
  });
}

describe('recommendation confidence differentiation on delayed data', () => {
  const profiles = {
    strongUptrend: series(220, 100, 0.35, 0.15),
    mildUptrend: series(220, 100, 0.12, 0.25),
    sideways: series(220, 100, 0.0, 0.9),
    downtrend: series(220, 140, -0.22, 0.3),
  };

  function run(hist: RecommendationPricePoint[]) {
    return buildMultiFactorRecommendation({
      price: hist.at(-1)?.close ?? null,
      history: hist,
      dataQuality: 'complete',
      delayed: true,
      assetType: 'stock',
    });
  }

  it('spreads confidence across distinct market profiles instead of clustering at one value', () => {
    const results = Object.fromEntries(Object.entries(profiles).map(([key, hist]) => [key, run(hist)]));
    const confidences = Object.values(results)
      .map(r => r.confidence)
      .filter((c): c is number => c !== null);

    expect(confidences.length).toBeGreaterThanOrEqual(3);
    const spread = Math.max(...confidences) - Math.min(...confidences);
    // إعادة معايرة بعد جعل درجة الاتجاه متصلة مع بوابة ضجيج:
    // النجاح القديم (نطاق ≥12) كان يعتمد على خلل يمنح ملف "العرضي" درجة ترند 88 مضخّمة.
    // النية الأصلية محفوظة: لا تجمّع عند قيمة واحدة، والقيم متمايزة فعلياً،
    // والدرجة المتصلة تميّز الترند القوي عن المعتدل بدل تطابقهما التام سابقاً.
    expect(spread).toBeGreaterThanOrEqual(5);
    expect(new Set(confidences).size).toBeGreaterThanOrEqual(3);
    const strong = results.strongUptrend;
    const mild = results.mildUptrend;
    expect(strong.finalScore as number).toBeGreaterThanOrEqual(mild.finalScore as number);
    expect(strong.scoreBreakdown.trend).toBeGreaterThan(mild.scoreBreakdown.trend);
  });

  it('does not hard-cap delayed confidence at a single 68 wall', () => {
    // قبل الإصلاح: كل إشارة متأخرة تُقص عند 68 بالضبط. بعده: القيم تختلف
    // حسب قوة الإعداد ولا تلتصق جميعها بـ68.
    const confs = Object.values(profiles).map(run).map(r => r.confidence).filter((c): c is number => c !== null);
    const clusteredAt68 = confs.filter(c => c === 68).length;
    expect(clusteredAt68).toBeLessThan(confs.length); // ليست كلها 68
    expect(new Set(confs).size).toBeGreaterThanOrEqual(2); // قيم متعددة
  });

  it('produces differentiated recommendations, not a uniform buy', () => {
    const recs = Object.values(profiles).map(run).map(r => r.finalRecommendation);
    const unique = new Set(recs);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it('lets delayed data produce a tradeable signal rather than forcing watch', () => {
    const strong = run(profiles.strongUptrend);
    expect(['buy', 'sell']).toContain(strong.signal);
    // والتوصية الرسمية متسقة مع الإشارة (لا تناقض buy/watch)
    expect(strong.finalRecommendation).not.toBe('Watch');
  });

  it('still refuses to trade genuinely partial data (few real samples)', () => {
    const shortHist = series(60, 100, 0.3, 0.15); // <200 عينة تبقى جزئية
    const partial = buildMultiFactorRecommendation({
      price: shortHist.at(-1)?.close ?? null,
      history: shortHist,
      dataQuality: 'partial',
      delayed: false,
      assetType: 'stock',
    });
    expect(partial.finalRecommendation).toBe('Watch');
    expect(partial.signal).toBe('watch');
  });
});
