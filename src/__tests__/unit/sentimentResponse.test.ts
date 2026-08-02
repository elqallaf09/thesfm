import { describe, expect, it } from 'vitest';
import {
  availableSentimentResponse,
  maskProviderMessage,
  sentimentLabel,
  unavailableSentimentResponse,
} from '@/lib/market/sentimentResponse';

describe('market sentiment response contract', () => {
  it.each([
    [60, 40, 'bullish'],
    [40, 60, 'bearish'],
    [52, 48, 'neutral'],
    [null, 50, 'unavailable'],
  ])('classifies %s/%s as %s', (buy, sell, expected) => {
    expect(sentimentLabel(buy, sell)).toBe(expected);
  });

  it('redacts provider email addresses before they reach the response', async () => {
    expect(maskProviderMessage('Login failed for trader@example.com')).toBe('Login failed for [email]');
    const response = unavailableSentimentResponse({
      code: 'LOGIN_REJECTED',
      symbol: 'EURUSD',
      assetType: 'forex',
      provider: 'myfxbook',
      providerMessage: 'Account trader@example.com was rejected',
      lastCheckedAt: '2026-08-02T00:00:00.000Z',
    });
    const payload = await response.json();
    expect(payload.providerMessage).toBe('Account [email] was rejected');
    expect(JSON.stringify(payload)).not.toContain('trader@example.com');
  });

  it('suppresses provider details for an invalid session', async () => {
    const response = unavailableSentimentResponse({
      code: 'INVALID_SESSION',
      symbol: 'EURUSD',
      assetType: 'forex',
      provider: 'myfxbook',
      providerMessage: 'session detail must not leave the server',
    });
    const payload = await response.json();
    expect(payload.providerMessage).toBeNull();
    expect(payload.communityOutlookStatus).toBe('invalid_session_retry_failed');
  });

  it('preserves long/short metrics and derives total positions', async () => {
    const response = availableSentimentResponse({
      symbol: 'EURUSD',
      assetType: 'forex',
      provider: 'myfxbook',
      source: 'Myfxbook',
      updatedAt: '2026-08-02T00:00:00.000Z',
      items: [{
        buyPercent: '62%',
        sellPercent: 38,
        longVolume: '1,250',
        shortVolume: 750,
        longPositions: 12,
        shortPositions: 8,
      }],
    });
    const payload = await response.json();
    expect(payload).toMatchObject({
      success: true,
      sentimentAvailable: true,
      buyPercent: 62,
      sellPercent: 38,
      longVolume: 1250,
      shortVolume: 750,
      positions: 20,
      sentimentLabel: 'bullish',
      assetType: 'forex',
    });
  });

  it('clamps out-of-range percentages without altering raw volumes', async () => {
    const response = availableSentimentResponse({
      symbol: 'AAPL',
      assetType: 'stock',
      provider: 'news',
      source: 'Finnhub',
      updatedAt: null,
      items: [{ buyPercent: 130, sellPercent: -10, longVolume: 130 }],
    });
    const payload = await response.json();
    expect(payload.buyPercent).toBe(100);
    expect(payload.sellPercent).toBe(0);
    expect(payload.longVolume).toBe(130);
  });
});
