import { describe, expect, it } from 'vitest';
import { implicitMarketAssetCandidates } from '@/lib/ai-analyst/marketAssetCandidate';
import {
  ChatDomainMismatchError,
  MARKET_CHAT_DOMAINS,
  assertChatDomain,
  buildMarketChatSystemPrompt,
  type VerifiedChatAsset,
  type VerifiedChatMarketSnapshot,
} from '@/lib/ai-analyst/marketChat';

// This is the direct regression coverage for the confirmed live bug: a
// market-symbol question answered by a hardcoded "planning assistant for
// THE SFM projects" system prompt, describing AAPL as a software project.
// The fix is (1) a fail-closed domain assertion shared by both chat
// endpoints and (2) a system prompt that always explicitly forbids
// describing a financial instrument as a project, for every asset type and
// every locale -- not an AAPL-only special case.

const AAPL: VerifiedChatAsset = {
  canonicalSymbol: 'AAPL', displaySymbol: 'AAPL', name: 'Apple Inc.', assetType: 'STOCK', exchange: 'NASDAQ', market: 'US', quoteCurrency: 'USD',
};
const SPY: VerifiedChatAsset = {
  canonicalSymbol: 'SPY', displaySymbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', assetType: 'FUND', exchange: 'NYSE', market: 'US', quoteCurrency: 'USD',
};
const BTC: VerifiedChatAsset = {
  canonicalSymbol: 'BTC/USD', displaySymbol: 'BTC-USD', name: 'Bitcoin', assetType: 'CRYPTO', exchange: null, market: 'CRYPTO', quoteCurrency: 'USD',
};
const EURUSD: VerifiedChatAsset = {
  canonicalSymbol: 'EURUSD', displaySymbol: 'EURUSD', name: 'Euro / US Dollar', assetType: 'FOREX', exchange: null, market: 'FX', quoteCurrency: 'USD',
};
const GOLD: VerifiedChatAsset = {
  canonicalSymbol: 'XAUUSD', displaySymbol: 'XAUUSD', name: 'Gold', assetType: 'COMMODITY', exchange: null, market: 'COMMODITY', quoteCurrency: 'USD',
};
const LIVE_AAPL: VerifiedChatMarketSnapshot = {
  provider: 'finnhub',
  dataAsOf: '2026-09-16T18:00:00.000Z',
  dataStatus: 'LIVE',
  fallbackUsed: false,
  price: 189.25,
  change: 2.5,
  changePercent: 1.34,
  volume: 1234567,
  support: 184.2,
  resistance: 192.8,
  reportedRiskLevel: 'MEDIUM',
  currency: 'USD',
  shariaStatus: 'compliant',
  shariaSource: 'verified-screening',
  shariaReviewedAt: '2026-09-15T00:00:00.000Z',
};

describe('assertChatDomain — fail-closed cross-domain guard', () => {
  it('allows exactly the domains on the allowlist', () => {
    expect(() => assertChatDomain('market', MARKET_CHAT_DOMAINS)).not.toThrow();
    expect(() => assertChatDomain('finance', MARKET_CHAT_DOMAINS)).not.toThrow();
    expect(() => assertChatDomain('projects', ['projects'])).not.toThrow();
  });

  it('fails closed when a market/finance request is sent with the projects domain, and vice versa', () => {
    expect(() => assertChatDomain('projects', MARKET_CHAT_DOMAINS)).toThrow(ChatDomainMismatchError);
    expect(() => assertChatDomain('market', ['projects'])).toThrow(ChatDomainMismatchError);
    expect(() => assertChatDomain('finance', ['projects'])).toThrow(ChatDomainMismatchError);
  });

  it('fails closed on a missing, empty, or non-string domain rather than defaulting to permissive', () => {
    expect(() => assertChatDomain(undefined, MARKET_CHAT_DOMAINS)).toThrow(ChatDomainMismatchError);
    expect(() => assertChatDomain('', MARKET_CHAT_DOMAINS)).toThrow(ChatDomainMismatchError);
    expect(() => assertChatDomain(null, MARKET_CHAT_DOMAINS)).toThrow(ChatDomainMismatchError);
    expect(() => assertChatDomain(42, MARKET_CHAT_DOMAINS)).toThrow(ChatDomainMismatchError);
  });
});

describe('implicitMarketAssetCandidates — multilingual verified resolver handoff', () => {
  it('extracts direct symbols and localized names without trusting them yet', () => {
    expect(implicitMarketAssetCandidates([{ role: 'user', content: 'NVDA' }])).toEqual(['NVDA']);
    expect(implicitMarketAssetCandidates([{ role: 'user', content: 'بوبيان' }])).toEqual(['بوبيان']);
    expect(implicitMarketAssetCandidates([{ role: 'assistant', content: 'x' }, { role: 'user', content: 'بيتكوين' }])).toEqual(['بيتكوين']);
  });

  it('extracts the asset from longer explicit analysis requests and drops request qualifiers', () => {
    expect(implicitMarketAssetCandidates([
      { role: 'user', content: 'حلل سهم بيتك اليوم باختصار واذكر فقط البيانات الحالية الموثقة.' },
    ])).toContain('بيتك');
    expect(implicitMarketAssetCandidates([
      { role: 'user', content: 'Analyze Apple stock today and mention only verified data.' },
    ])).toContain('Apple');
    expect(implicitMarketAssetCandidates([
      { role: 'user', content: 'شنو رايك في EURUSD؟' },
    ])).toContain('EURUSD');
  });

  it('does not collapse general questions or comparisons into one guessed asset', () => {
    expect(implicitMarketAssetCandidates([{ role: 'user', content: 'شنو وضع السوق اليوم؟' }])).toEqual([]);
    expect(implicitMarketAssetCandidates([{ role: 'user', content: 'compare NVDA with AMD' }])).toEqual([]);
  });
});

describe('buildMarketChatSystemPrompt — verified financial-instrument framing', () => {
  it.each(['ar', 'en', 'fr'] as const)('always states the domain is financial, never a project, in %s', (locale) => {
    const prompt = buildMarketChatSystemPrompt({ domain: 'market', asset: null, requestedUnresolvedSymbol: false, locale });
    const projectWord = locale === 'ar' ? 'مشروع' : locale === 'fr' ? 'projet' : 'project';
    expect(prompt.toLowerCase()).toContain(projectWord.toLowerCase());
    expect(prompt).toMatch(locale === 'ar' ? /لا تصف/ : locale === 'fr' ? /Ne décrivez jamais/i : /Do not describe/i);
  });

  it.each([
    ['a verified stock', AAPL],
    ['a verified ETF', SPY],
    ['a verified crypto pair', BTC],
    ['a verified forex pair', EURUSD],
    ['a verified commodity', GOLD],
  ] as const)('includes %s classification verbatim and still forbids project-domain framing', (_label, asset) => {
    const prompt = buildMarketChatSystemPrompt({ domain: 'market', asset, requestedUnresolvedSymbol: false, locale: 'en' });
    expect(prompt).toContain(asset.name);
    expect(prompt).toContain(`type=${asset.assetType}`);
    expect(prompt).toMatch(/Do not describe a financial instrument as a project/i);
    expect(prompt).toMatch(/Verified asset metadata.*always overrides any prior project/i);
  });

  it('injects only verified current market facts with provider, timestamp and freshness status', () => {
    const prompt = buildMarketChatSystemPrompt({
      domain: 'market', asset: AAPL, marketSnapshot: LIVE_AAPL, requestedUnresolvedSymbol: false, locale: 'en',
    });
    expect(prompt).toContain('Verified THE SFM server market snapshot');
    expect(prompt).toContain('"price":189.25');
    expect(prompt).toContain('"currency":"USD"');
    expect(prompt).toContain('"provider":"finnhub"');
    expect(prompt).toContain('"dataStatus":"LIVE"');
    expect(prompt).toContain('"dataAsOf":"2026-09-16T18:00:00.000Z"');
    expect(prompt).toContain('"shariaStatus":"compliant"');
    expect(prompt).toMatch(/do not infer missing values/i);
  });

  it('never fabricates instructions permitting invented prices, targets, or confidence values', () => {
    const prompt = buildMarketChatSystemPrompt({ domain: 'finance', asset: AAPL, requestedUnresolvedSymbol: false, locale: 'en' });
    expect(prompt).toMatch(/Never invent or estimate a price, price target, confidence score/i);
    expect(prompt).toMatch(/educational.*not financial advice.*does not guarantee/i);
  });

  it('instructs the model to ask for clarification, not guess, for an unresolved symbol', () => {
    const prompt = buildMarketChatSystemPrompt({ domain: 'market', asset: null, requestedUnresolvedSymbol: true, locale: 'en' });
    expect(prompt).toMatch(/could not verify|could not be verified/i);
    expect(prompt).toMatch(/ask the user to confirm/i);
    expect(prompt).not.toContain('type=');
  });

  it('omits both verified asset and live-snapshot lines for a general finance question with no symbol', () => {
    const prompt = buildMarketChatSystemPrompt({ domain: 'finance', asset: null, requestedUnresolvedSymbol: false, locale: 'en' });
    expect(prompt).not.toContain('Verified asset for this conversation');
    expect(prompt).not.toContain('Verified THE SFM server market snapshot');
    expect(prompt).not.toMatch(/could not verify|could not be verified/i);
  });
});
