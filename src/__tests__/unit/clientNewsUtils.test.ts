import { describe, expect, it } from 'vitest';
import { dedupeNewsItems, normalizeNewsTitle, safeExternalNewsUrl } from '@/lib/news/clientNewsUtils';

describe('client news utilities', () => {
  it('allows only absolute HTTP(S) article URLs', () => {
    expect(safeExternalNewsUrl('https://example.com/story')).toBe('https://example.com/story');
    expect(safeExternalNewsUrl('http://example.com/story')).toBe('http://example.com/story');
    expect(safeExternalNewsUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalNewsUrl('/relative/story')).toBeNull();
    expect(safeExternalNewsUrl('not a url')).toBeNull();
  });

  it('normalizes case, accents, and punctuation for title comparison', () => {
    expect(normalizeNewsTitle('  Marché—UPDATE!  ')).toBe('marche update');
  });

  it('deduplicates canonical URLs and normalized translated titles', () => {
    const items = [
      { id: '1', source: 'one', url: 'https://example.com/a', title: 'Market Update' },
      { id: '2', source: 'two', url: 'https://example.com/a', title: 'Different title' },
      { id: '3', source: 'three', url: 'https://example.com/b', titleOriginal: 'Márket update!' },
      { id: '4', source: 'four', url: 'javascript:alert(1)', title: 'Unique story' },
      { id: '5', source: 'five', url: null, title: '' },
    ];

    expect(dedupeNewsItems(items).map(item => item.id)).toEqual(['1', '4']);
  });
});
