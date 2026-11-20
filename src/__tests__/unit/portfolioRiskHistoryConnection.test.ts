import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { historicalRiskErrorText, RISK_CONNECTION_COPY } from '@/components/investments/portfolioRiskConnectionCopy';

const read = (path: string) => readFileSync(path, 'utf8');
describe('historical risk integration boundaries', () => {
  it('keeps the public snapshot writer from accepting caller approval flags', () => {
    const route = read('src/app/api/connect/v1/snapshots/route.ts');
    expect(route).toContain("verification:'user_connector_supplied'");
    expect(route).not.toContain('server_verified_portfolio_history_v1');
    expect(route).not.toContain('server_verified_portfolio_calendar_v1');
    const schema = read('supabase/migrations/20260919191919_investor_access_and_readonly_integrations.sql');
    expect(schema).toContain('revoke all on public.sfm_integration_keys,public.sfm_integration_snapshots from anon,authenticated');
    expect(schema).toContain('grant select,delete on public.sfm_integration_snapshots to authenticated');
  });
  it('wires the real historical component and private endpoint without changing production flags', () => {
    expect(read('src/components/investments/PortfolioRiskWorkspace.tsx')).toContain('<PortfolioRiskHistoryLive locale={locale} />');
    const component = read('src/components/investments/PortfolioRiskHistoryLive.tsx');
    expect(component).toContain("fetch('/api/portfolio/risk/history'");
    expect(component).toContain('sameRiskRequestIdentity(state, owner, token)');
    expect(component).toContain('active = false'); expect(component).toContain('controller.abort()');
    const route = read('src/app/api/portfolio/risk/history/route.ts');
    expect(route).toContain("'Cache-Control': 'private, no-store'");
    expect(route).toContain("'Vary': 'Cookie, Authorization'");
    expect(read('src/lib/portfolio-risk/history.server.ts')).toContain('authorizeRiskRequest(request)');
  });
  it('keeps all three languages aligned and never echoes raw error codes or messages', () => {
    expect(Object.keys(RISK_CONNECTION_COPY.ar)).toEqual(Object.keys(RISK_CONNECTION_COPY.en));
    expect(Object.keys(RISK_CONNECTION_COPY.fr)).toEqual(Object.keys(RISK_CONNECTION_COPY.en));
    for (const locale of ['ar', 'en', 'fr'] as const) {
      expect(historicalRiskErrorText('PRIVATE_DATABASE_DETAILS', locale)).toBe(RISK_CONNECTION_COPY[locale].unavailable);
      expect(historicalRiskErrorText('HISTORY_NOT_IMPORTED', locale)).toBe(RISK_CONNECTION_COPY[locale].notImported);
      expect(historicalRiskErrorText('MFA_REQUIRED', locale)).toBe(RISK_CONNECTION_COPY[locale].mfa);
    }
  });
});
