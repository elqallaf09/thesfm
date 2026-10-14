import 'server-only';
import { MARKET_DATA_PROVIDERS, PRIORITY_MARKET_SCOPES } from './catalog';

/** Public policy references are review aids, never account-level permissions. */
export const MARKET_DATA_POLICY_EVIDENCE = {
  fmp_terms: { url: 'https://site.financialmodelingprep.com/terms-of-service', requirement: 'Review the account order form and written display permission (sections 2.1–2.2.2).' },
  finnhub_terms: { url: 'https://finnhub.io/terms-of-service', requirement: 'Obtain written business-use and redistribution approval; personal plans do not establish either right.' },
  twelve_terms: { url: 'https://twelvedata.com/terms', requirement: 'Review the subscribed business tier, add-ons, attribution and independent third-party exchange requirements (sections 2–3).' },
  eodhd_commercial: { url: 'https://eodhd.com/financial-apis/commercial-vs-personal-license-use', requirement: 'Review the commercial agreement and exchange-specific permission; retail packages are personal-use products.' },
  marketstack_agreement: { url: 'https://marketstack.com/agreement', requirement: 'Review the actual subscription and obtain explicit external-display and redistribution scope.' },
  kuwait_data: { url: 'https://www.boursakuwait.com.kw/en/data-and-research/data-and-research-overview/data-and-research/', requirement: 'Review the Information License Agreement and relevant display, delayed, historical or non-display product.' },
  kuwait_vendors: { url: 'https://www.boursakuwait.com.kw/en/authorized-data-vendors/', requirement: 'Verify the upstream distribution chain. A vendor listing does not grant THE SFM downstream rights.' },
  adx_terms: { url: 'https://www.adx.ae/terms-of-use', requirement: 'Obtain applicable permission for public display and systematic retrieval; website access is not a license.' },
  dfm_vendors: { url: 'https://www.dfm.ae/the-exchange/market-information/marketdata-providers', requirement: 'Verify the data vendor chain and independently obtain THE SFM display rights.' },
  nasdaq_dubai_policy: { url: 'https://www.nasdaqdubai.com/services/marketdata-services', requirement: 'Review prior written permission and the authorized upstream chain separately from DFM and US Nasdaq.' },
  muscat_disclaimer: { url: 'https://www.msx.om/msmDocs/downloads/Disclaimeren.pdf', requirement: 'Website publication does not grant downstream display or distribution; review written permission and feed terms.' },
  qse_policy: { url: 'https://www.qe.com.qa/en/data-policy', requirement: 'Review the QSE Market Data Agreement and applicable display/non-display product.' },
  bahrain_data: { url: 'https://bahrainbourse.com/en/products%20and%20services/infoservices/market-data', requirement: 'Review the Information License Agreement and authorized redistribution scope.' },
  nasdaq_agreement: { url: 'https://www.nasdaqtrader.com/TraderNews.aspx?id=DN2026-4', requirement: 'Review the applicable GDA, product/order scope and policies effective September 1, 2026.' },
  nyse_documents: { url: 'https://www.nyse.com/market-data/key-documents', requirement: 'Identify the exact NYSE/consolidated feed and applicable vendor/subscriber agreements.' },
  lse_agreements: { url: 'https://marketdata.londonstockexchange.com/pages/agreements-and-policies', requirement: 'Review the current 2026 license, product schedules and redistribution permissions.' },
  xetra_agreements: { url: 'https://www.mds.deutsche-boerse.com/mds-en/real-time-data/agreements', requirement: 'Review the applicable dissemination agreement and named information products.' },
  euronext_agreements: { url: 'https://connect2.euronext.com/en/data/market-data-agreements', requirement: 'Review the EMDA/product schedules effective October 1, 2026; Paris and Amsterdam require explicit product scope.' },
} as const;

type EvidenceId = keyof typeof MARKET_DATA_POLICY_EVIDENCE;
const providerEvidence: Partial<Record<keyof typeof MARKET_DATA_PROVIDERS, EvidenceId[]>> = {
  fmp: ['fmp_terms'], finnhub: ['finnhub_terms'], twelve_data: ['twelve_terms'],
  eodhd: ['eodhd_commercial'], marketstack: ['marketstack_agreement'],
};
const exchangeEvidence: Partial<Record<(typeof PRIORITY_MARKET_SCOPES)[number]['exchange'], EvidenceId[]>> = {
  BOURSA_KUWAIT: ['kuwait_data', 'kuwait_vendors'], ADX: ['adx_terms'], DFM: ['dfm_vendors'],
  NASDAQ_DUBAI: ['nasdaq_dubai_policy'], MUSCAT: ['muscat_disclaimer'], QSE: ['qse_policy'], BAHRAIN_BOURSE: ['bahrain_data'], NASDAQ: ['nasdaq_agreement'], NYSE: ['nyse_documents'],
  LSE: ['lse_agreements'], XETRA: ['xetra_agreements'], EURONEXT_PARIS: ['euronext_agreements'], EURONEXT_AMSTERDAM: ['euronext_agreements'],
};

export function marketDataPolicyReview() {
  return {
    reviewedAt: '2026-10-14', evidenceType: 'public_policy_only', grantsAccountRights: false,
    sources: MARKET_DATA_POLICY_EVIDENCE,
    providers: Object.entries(MARKET_DATA_PROVIDERS).map(([providerId, provider]) => ({
      providerId, policyEvidenceIds: providerEvidence[providerId as keyof typeof MARKET_DATA_PROVIDERS] ?? [],
      reviewRequirement: provider.kind === 'integration' ? 'identify_actual_upstream' : 'review_account_agreement_and_exchange_scope',
    })),
    exchanges: PRIORITY_MARKET_SCOPES.map(scope => ({
      ...scope, policyEvidenceIds: exchangeEvidence[scope.exchange] ?? [],
      reviewRequirement: 'independent_exchange_and_provider_evidence',
    })),
    accountEvidenceRequirements: [
      'actual_account_plan_and_licensed_entity', 'exact_provider_dataset_exchange_and_feed_product',
      'external_display_separate_from_redistribution', 'contractual_delay_and_storage_limits',
      'attribution_and_subscriber_reporting', 'effective_date_expiry_and_human_review',
    ],
  } as const;
}
