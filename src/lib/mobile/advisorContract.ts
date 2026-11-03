export const ADVISOR_CAPABILITIES = ['coach', 'planner', 'portfolio', 'spending', 'retirement', 'debt', 'goals', 'investment', 'risk', 'wealth'] as const;
export type AdvisorCapability = typeof ADVISOR_CAPABILITIES[number];
