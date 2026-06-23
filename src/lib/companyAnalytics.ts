export const COMPANY_ANALYTICS_EVENT_TYPES = [
  'company_card_view',
  'company_profile_view',
  'company_website_click',
  'company_contact_click',
] as const;

export type CompanyAnalyticsEventType = (typeof COMPANY_ANALYTICS_EVENT_TYPES)[number];

export type CompanyAnalyticsSummary = {
  companyId: string;
  cardViews: number;
  profileViews: number;
  websiteClicks: number;
  contactClicks: number;
  lastViewedAt: string | null;
};

export function isCompanyAnalyticsEventType(value: unknown): value is CompanyAnalyticsEventType {
  return typeof value === 'string' && COMPANY_ANALYTICS_EVENT_TYPES.includes(value as CompanyAnalyticsEventType);
}

export function emptyCompanyAnalytics(companyId: string): CompanyAnalyticsSummary {
  return {
    companyId,
    cardViews: 0,
    profileViews: 0,
    websiteClicks: 0,
    contactClicks: 0,
    lastViewedAt: null,
  };
}

export function normalizeCompanyAnalytics(row: Record<string, unknown> | null | undefined, companyId: string): CompanyAnalyticsSummary {
  return {
    companyId,
    cardViews: Number(row?.card_views_count ?? row?.cardViews ?? 0),
    profileViews: Number(row?.profile_views_count ?? row?.profileViews ?? 0),
    websiteClicks: Number(row?.website_clicks_count ?? row?.websiteClicks ?? 0),
    contactClicks: Number(row?.contact_clicks_count ?? row?.contactClicks ?? 0),
    lastViewedAt: typeof row?.last_viewed_at === 'string' ? row.last_viewed_at : null,
  };
}
