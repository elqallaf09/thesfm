'use client';

import { LegacyRouteRedirect } from '@/components/ai-analyst/LegacyRouteRedirect';

/**
 * Preserve the former URL as a lightweight redirect. The compatibility
 * workspace is owned and loaded only by the explicit AI Analyst adapter.
 */
export default function MarketAnalysisPage() {
  return <LegacyRouteRedirect kind="market-analysis" />;
}
