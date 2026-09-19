import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FactorResult } from '@/domain/intelligence/contracts';
import { ContextFactorEvidence } from '@/components/intelligence/ContextFactorEvidence';

const factor = { factor: 'MACRO', availability: 'PARTIAL', failureReason: null, source: 'World Bank', evidence: [
  { id: 'macro:observation', labelKey: 'intelligence_evidence_macro_observation_gdp_annual', value: 2.731825804492, observedAt: '2025-12-31', source: 'World Bank' },
  { id: 'macro:country', labelKey: 'intelligence_evidence_macro_country_gdp_annual', value: 'KW', observedAt: '2025-12-31', source: 'World Bank' },
  { id: 'macro:previous', labelKey: 'intelligence_evidence_macro_previous_gdp_annual', value: -1.474018181, observedAt: '2024-12-31', source: 'World Bank' },
  { id: 'macro:source:GDP_ANNUAL', labelKey: 'intelligence_evidence_macro_source_url', value: 'https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=KW', source: 'World Bank' },
] } as FactorResult;
beforeEach(() => { vi.stubGlobal('React', React); });
afterEach(() => { vi.unstubAllGlobals(); });
describe('macro evidence display', () => {
  it.each(['ar', 'en', 'fr'] as const)('shows one current/previous value and one source with Latin digits and annual context in %s', locale => {
    const html = renderToStaticMarkup(<ContextFactorEvidence factor={factor} locale={locale} />);
    expect((html.match(/World Bank/g) ?? [])).toHaveLength(1);
    expect(html).toContain('2025'); expect(html).toContain('2024'); expect(html).not.toMatch(/[٠-٩]/);
    expect(html).toContain('2.73'.replace('.', locale === 'fr' ? ',' : '.'));
    expect(html).not.toContain('2.731825804492');
    expect(html).toContain(locale === 'ar' ? 'الكويت' : locale === 'fr' ? 'Koweït' : 'Kuwait');
    expect(html).toContain(locale === 'ar' ? 'سياق طويل الأجل' : locale === 'fr' ? 'contexte à long terme' : 'long-term context');
    expect((html.match(/<details>/g) ?? [])).toHaveLength(1);
  });
  it('ignores internal metadata without hiding actual calendar events', () => {
    const metadata = { ...factor, evidence: [...factor.evidence, { ...factor.evidence[0]!, id: 'method', labelKey: 'intelligence_evidence_macro_methodology', value: 'rules-v1', source: 'local' }] };
    const html = renderToStaticMarkup(<ContextFactorEvidence factor={metadata} locale="en" />);
    expect((html.match(/<details>/g) ?? [])).toHaveLength(1);
    const calendar = { ...metadata, evidence: [...metadata.evidence, { ...factor.evidence[0]!, id: 'event', labelKey: 'intelligence_evidence_macro_event_title', value: 'CPI release', source: 'BLS' }] };
    const events = renderToStaticMarkup(<ContextFactorEvidence factor={calendar} locale="en" />);
    expect(events).toContain('Economic events');
    expect(events).toContain('CPI release');
    expect((events.match(/<details>/g) ?? [])).toHaveLength(2);
  });
  it.each(['ar', 'en', 'fr'] as const)('shows the next event once without hiding separate releases in %s', locale => {
    const event = { ...factor.evidence[0]!, id: 'event', labelKey: 'intelligence_evidence_macro_event_title', value: 'CPI release', observedAt: '2026-09-24T12:30:00Z' };
    const next = { ...event, id: 'next', labelKey: 'intelligence_evidence_next_macro_event' };
    const withNext = { ...factor, evidence: [...factor.evidence, event, next] };
    const html = renderToStaticMarkup(<ContextFactorEvidence factor={withNext} locale={locale} />);
    expect((html.match(/CPI release/g) ?? [])).toHaveLength(1);
    expect(html).toContain(locale === 'ar' ? 'الحدث القادم' : locale === 'fr' ? 'Prochain événement' : 'Next event');
    const separateRelease = { ...withNext, evidence: [...withNext.evidence, { ...event, id: 'other', observedAt: '2026-10-24T12:30:00Z' }] };
    expect((renderToStaticMarkup(<ContextFactorEvidence factor={separateRelease} locale={locale} />).match(/CPI release/g) ?? [])).toHaveLength(2);
  });
  it('does not turn an unsafe source into a link', () => {
    const unsafe = { ...factor, evidence: factor.evidence.map(item => item.id === 'macro:source:GDP_ANNUAL' ? { ...item, value: 'javascript:alert(1)' } : item) };
    expect(renderToStaticMarkup(<ContextFactorEvidence factor={unsafe} locale="en" />)).not.toContain('href=');
  });
});
