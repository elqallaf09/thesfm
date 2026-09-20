import { describe, expect, it } from 'vitest';
import { parseOpecPolicyDetail, parseOpecPressReleaseIndex } from '@/lib/market/opecPolicy';

describe('OPEC policy parser', () => {
  it('selects production and market-stability press releases and orders them by date', () => {
    const html = [
      '<section><h3>Saudi Arabia, Russia, Iraq, Kuwait, Kazakhstan, Algeria, and Oman reaffirm commitment to market stability</h3>',
      '<time>6 September 2026</time><a href="/pr-detail/1835613-6-september-2026.html">Read More</a></section>',
      '<section><h3>Inaugural technical committee meeting</h3>',
      '<time>15 July 2026</time><a href="/pr-detail/111-15-july-2026.html">Read More</a></section>',
      '<section><h3>Saudi Arabia and partners adjust production and reaffirm commitment to market stability</h3>',
      '<time>2 August 2026</time><a href="/pr-detail/222-2-august-2026.html">Read More</a></section>',
    ].join('');

    const releases = parseOpecPressReleaseIndex(html);
    expect(releases).toHaveLength(2);
    expect(releases[0]).toMatchObject({
      publishedDate: '2026-09-06',
      url: 'https://www.opec.org/pr-detail/1835613-6-september-2026.html',
    });
    expect(releases[1]?.publishedDate).toBe('2026-08-02');
  });

  it('captures an explicit maintain-production decision without inventing an adjustment amount', () => {
    const candidate = {
      title: 'Saudi Arabia, Russia, Iraq, Kuwait, Kazakhstan, Algeria, and Oman reaffirm commitment to market stability',
      publishedDate: '2026-09-06',
      url: 'https://www.opec.org/pr-detail/1835613-6-september-2026.html',
    };
    const detail = [
      '<h3>' + candidate.title + '</h3>',
      '<p>The seven participating countries decided to maintain September 2026 required production for October 2026.</p>',
      '<h4>Address</h4>',
    ].join('');
    const parsed = parseOpecPolicyDetail(detail, candidate, '2026-09-20T00:00:00.000Z');
    expect(parsed.decision).toBe('maintain');
    expect(parsed.explicitAdjustmentThousandBarrelsPerDay).toBeNull();
    expect(parsed.summary).toContain('maintain September 2026 required production');
  });

  it('extracts a stated adjustment quantity while leaving direction separate', () => {
    const candidate = {
      title: 'OPEC+ countries adjust production and reaffirm commitment to market stability',
      publishedDate: '2026-08-02',
      url: 'https://www.opec.org/pr-detail/222-2-august-2026.html',
    };
    const detail = '<h3>' + candidate.title + '</h3><p>A production adjustment of 188 thousand barrels per day will apply.</p>';
    const parsed = parseOpecPolicyDetail(detail, candidate);
    expect(parsed.decision).toBe('adjust');
    expect(parsed.explicitAdjustmentThousandBarrelsPerDay).toBe(188);
  });
});
