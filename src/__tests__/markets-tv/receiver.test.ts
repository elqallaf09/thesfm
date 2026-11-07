import { describe, expect, it } from 'vitest';
import { TV_RECEIVER_CHANNELS, isTvReceiverChannel, nextTvReceiverChannel } from '@/lib/markets-tv/receiver';
import { normalizeTvSettings } from '@/lib/markets-tv/types';
import { normalizeTvChannels } from '@/lib/markets-tv/channels';
import { tvNewsParams } from '@/lib/server/markets-tv/newsChannels';
import { tvCorsHeaders } from '@/lib/markets-tv/cors';

describe('SFM TV receiver channels', () => {
  it('wraps channels in both directions and preserves the chosen view in saved presets', () => {
    expect(nextTvReceiverChannel('investments', 1)).toBe('europeNews');
    expect(nextTvReceiverChannel('allStocks', -1)).toBe('incomeNews');
    expect(nextTvReceiverChannel('markets', 1)).toBe('allStocks');
    expect(nextTvReceiverChannel('markets', -1)).toBe('incomeNews');
    for (const channel of TV_RECEIVER_CHANNELS) {
      const settings = normalizeTvSettings({ broadcastChannel: channel });
      const [saved] = normalizeTvChannels([{ id: 'custom', name: 'Custom', view: channel, settings, selections: {} }]);
      expect(saved.view).toBe(channel);
      expect(saved.settings.broadcastChannel).toBe(channel);
    }
    expect(isTvReceiverChannel('constructor')).toBe(false);
    expect(normalizeTvSettings({ broadcastChannel: '__proto__' }).broadcastChannel).toBeUndefined();
  });
  it('constrains Kuwait news to Kuwait market metadata and technology to actual stock entities', () => {
    expect(tvNewsParams('ar', 'kuwait')).toMatchObject({ languages: ['ar'], countries: ['KW'], exchangeCodes: ['Boursa Kuwait'], marketCodes: ['KW','KUWAIT'] });
    expect(tvNewsParams('en', 'technology')).toMatchObject({ language: 'en', marketCodes: ['US'], strictEntityFilter: true, symbols: expect.arrayContaining(['AAPL','NVDA']) });
    expect(tvNewsParams('ar', 'technology').languages).toBeUndefined();
    expect(tvNewsParams('ar', 'technology').query).toBeUndefined();
    expect(tvNewsParams('fr', 'all').marketCodes).toBeUndefined();
    expect(tvCorsHeaders('https://appassets.androidplatform.net')).toMatchObject({ 'Access-Control-Expose-Headers': 'Retry-After' });
  });
});
