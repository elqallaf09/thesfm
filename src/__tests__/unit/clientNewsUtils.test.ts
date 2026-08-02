import { describe, expect, it } from 'vitest';
import {
  canonicalExternalNewsUrl,
  dedupeNewsItems,
  normalizeNewsTitle,
  safeExternalNewsUrl,
} from '@/lib/news/clientNewsUtils';

describe('client news utilities', () => {
  it('allows only absolute HTTP(S) article URLs', () => {
    expect(safeExternalNewsUrl('https://example.com/story')).toBe('https://example.com/story');
    expect(safeExternalNewsUrl('http://example.com/story')).toBe('http://example.com/story');
    expect(safeExternalNewsUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalNewsUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeExternalNewsUrl('file:///etc/passwd')).toBeNull();
    expect(safeExternalNewsUrl('/relative/story')).toBeNull();
    expect(safeExternalNewsUrl('not a url')).toBeNull();
    expect(safeExternalNewsUrl('')).toBeNull();
    expect(safeExternalNewsUrl(null)).toBeNull();
    expect(safeExternalNewsUrl(undefined)).toBeNull();
  });

  it('canonicalizes a safe URL (no fragment, sorted query, no trailing slash) for dedup', () => {
    expect(canonicalExternalNewsUrl('https://example.com/story?b=2&a=1#section'))
      .toBe('https://example.com/story?a=1&b=2');
    expect(canonicalExternalNewsUrl('https://example.com/story/')).toBe('https://example.com/story');
  });

  it('returns an empty string, never a fallback URL, for unsafe or malformed input', () => {
    expect(canonicalExternalNewsUrl('javascript:alert(1)')).toBe('');
    expect(canonicalExternalNewsUrl('data:text/html,x')).toBe('');
    expect(canonicalExternalNewsUrl('file:///etc/passwd')).toBe('');
    expect(canonicalExternalNewsUrl('/relative/story')).toBe('');
    expect(canonicalExternalNewsUrl('not a url')).toBe('');
    expect(canonicalExternalNewsUrl('')).toBe('');
    expect(canonicalExternalNewsUrl(null)).toBe('');
    expect(canonicalExternalNewsUrl(undefined)).toBe('');
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
