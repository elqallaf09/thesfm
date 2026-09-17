import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ loading: true, user: null, session: null, isGuest: false }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/useLanguage', () => ({ useLanguage: () => ({ lang: 'en', dir: 'ltr' }) }));
vi.mock('@/components/DashboardPageShell', () => ({ DashboardPageShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('@/components/invest/RealEstateMarketCoverage', () => ({ RealEstateMarketCoverage: () => null }));
vi.mock('@/components/invest/RealEstateValuationTimeline', () => ({ RealEstateValuationTimeline: () => null }));
vi.mock('@/components/invest/RealEstateLandAnalyst', () => ({ RealEstateLandAnalyst: () => <form aria-label="Property input" /> }));
import { RealEstateAnalystWorkspace } from '@/components/invest/RealEstateAnalystWorkspace';

describe('property input session readiness', () => {
  beforeAll(() => { vi.stubGlobal('React', React); });
  afterAll(() => { vi.unstubAllGlobals(); });
  it('does not accept input that would be discarded when the authenticated shell mounts', () => {
    auth.loading = true;
    const html = renderToStaticMarkup(<RealEstateAnalystWorkspace />);
    expect(html).toContain('Loading session');
    expect(html).not.toContain('<form');
  });

  it('allows public field inspection after session restoration settles', () => {
    auth.loading = false;
    const html = renderToStaticMarkup(<RealEstateAnalystWorkspace />);
    expect(html).toContain('Property input');
    expect(html).toContain('Sign in to run analysis');
  });
});
