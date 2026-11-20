import { historyImportFixture } from './portfolioRiskHistory';

export type SyntheticImportExample = 'deposits' | 'withdrawals' | 'mixed_flows' | 'two_percent_with_deposit';

/**
 * Invented test amounts and sources only. These candidates have no source approval.
 * Calendar sessions come from the separate fixture calendar, never from NAV rows.
 */
export function portfolioRiskImportExample(example: SyntheticImportExample = 'mixed_flows') {
  const { fixture, candidate } = historyImportFixture();
  let nav = 1000;
  const points = fixture.history.payload.points.map((point, index) => {
    let netExternalFlow = 0;
    if (index > 0) {
      if (example === 'deposits') netExternalFlow = 10;
      if (example === 'withdrawals') netExternalFlow = -10;
      if (example === 'mixed_flows') netExternalFlow = index % 2 === 1 ? 50 : -20;
      if (example === 'two_percent_with_deposit' && index === 1) {
        // First interval: NAV 1000 -> 1120, including a 100 end-period deposit.
        nav *= 1.02;
        netExternalFlow = 100;
      }
      nav += netExternalFlow;
    }
    return { ...point, nav, netExternalFlow };
  });
  const finalNav = points[points.length - 1].nav;
  const weights = [0.3, 0.3, 0.2];
  const endPositions = fixture.history.payload.endPositions.map((position, index) => ({
    ...position, valueBase: finalNav * weights[index],
  }));
  const endCashBase = finalNav - endPositions.reduce((sum, position) => sum + position.valueBase, 0);
  const history: Record<string, unknown> & {
    points: typeof points; endPositions: typeof endPositions; endCashBase: number; fxPolicy: string;
  } = {
    ...candidate.history, points, endPositions, endCashBase,
    fxPolicy: 'Synthetic KWD-only NAV and cash: rate to base currency is 1 at every valuation cutoff.',
  };
  return {
    fixture,
    candidate: {
      ...candidate,
      history,
    },
    // This is a separate synthetic calendar source, not a completeness claim
    // derived from the points being checked.
    sessions: fixture.calendar.payload.sessions.map(session => ({ ...session })),
  };
}

export type PortfolioRiskImportExample = ReturnType<typeof portfolioRiskImportExample>;
