export const AI_ANALYST_FEATURES = ['marketMap', 'futureTools'] as const;

export type AiAnalystFeature = (typeof AI_ANALYST_FEATURES)[number];

function internalSurfaceEnvironment() {
  const deployment = process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV;
  return deployment !== 'production';
}

/** Unfinished surfaces are opt-in only in non-production internal environments. */
export function isAiAnalystFeatureEnabled(feature: AiAnalystFeature) {
  if (!internalSurfaceEnvironment()) return false;
  const enabled = process.env.NEXT_PUBLIC_AI_ANALYST_INTERNAL_SURFACES === 'true';
  return enabled && (feature === 'marketMap' || feature === 'futureTools');
}
