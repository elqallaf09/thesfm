import 'server-only';

import { getEconomicDataProviderStatus, getMacroIndicator } from '@/lib/providers/economic-data';
import type { MacroIndicator } from '@/lib/providers/economic-data/types';
import {
  ECONOMIC_CONTEXT_INDICATORS,
  buildEconomicContextFromIndicators,
  type EconomicContextSnapshot,
} from './economicContext';

export type EconomicContextLoadResult = {
  context: EconomicContextSnapshot;
  provider: ReturnType<typeof getEconomicDataProviderStatus>;
  failures: string[];
};

export async function loadEconomicContext(
  country = 'United States',
  options: { force?: boolean } = {},
): Promise<EconomicContextLoadResult> {
  const provider = getEconomicDataProviderStatus();
  const results = await Promise.allSettled(
    ECONOMIC_CONTEXT_INDICATORS.map((indicator) => getMacroIndicator(country, indicator, options)),
  );

  const indicators: MacroIndicator[] = [];
  const failures: string[] = [];

  results.forEach((result, index) => {
    const id = ECONOMIC_CONTEXT_INDICATORS[index];
    if (result.status === 'fulfilled' && result.value) indicators.push(result.value);
    else if (result.status === 'rejected') failures.push(id);
  });

  return {
    context: buildEconomicContextFromIndicators(
      country,
      indicators.map((indicator) => ({
        id: indicator.id,
        value: indicator.value,
        previous: indicator.previous,
        unit: indicator.unit,
        date: indicator.date,
        source: indicator.source,
        provider: indicator.provider,
      })),
    ),
    provider,
    failures,
  };
}
