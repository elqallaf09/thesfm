import type { SfmMarketSourceClass } from '@/lib/sfm-market/types';

export type SfmSourceAccessState =
  | 'connected'
  | 'access_required'
  | 'license_required'
  | 'public_reference_only';

export type SfmMarketSourceCapability =
  | 'issuer_identity'
  | 'regulatory_filings'
  | 'xbrl_facts'
  | 'real_time_l1'
  | 'delayed_quotes'
  | 'historical_prices'
  | 'order_book'
  | 'corporate_actions'
  | 'announcements'
  | 'financial_statements'
  | 'reference_data';

export type SfmMarketSourceRegistryEntry = {
  id: string;
  name: string;
  sourceClass: SfmMarketSourceClass;
  jurisdictions: string[];
  accessState: SfmSourceAccessState;
  capabilities: SfmMarketSourceCapability[];
  officialUrl: string;
  redistribution: 'public_reference' | 'agreement_required';
  connection: {
    kind: 'native' | 'api' | 'mcp' | 'licensed_feed' | 'download';
    configured: boolean;
    envHints: string[];
  };
  notes: string[];
};

/**
 * Product-owned registry of primary/direct sources. The status is deliberately
 * conservative: publishing a public webpage does not give THE SFM the right to
 * label a real-time redistribution feed as connected or licensed.
 */
export const SFM_MARKET_SOURCE_REGISTRY: readonly SfmMarketSourceRegistryEntry[] = [
  {
    id: 'sec-edgar',
    name: 'U.S. SEC EDGAR',
    sourceClass: 'regulator',
    jurisdictions: ['US'],
    accessState: 'connected',
    capabilities: ['issuer_identity', 'regulatory_filings', 'xbrl_facts', 'financial_statements', 'reference_data'],
    officialUrl: 'https://www.sec.gov/edgar/sec-api-documentation',
    redistribution: 'public_reference',
    connection: { kind: 'native', configured: true, envHints: ['SEC_USER_AGENT'] },
    notes: [
      'Used for issuer identity, filings and XBRL evidence; it is not an exchange price feed.',
      'THE SFM preserves the SEC document URL, retrieval time and issuer CIK.',
    ],
  },
  {
    id: 'boursa-kuwait',
    name: 'Boursa Kuwait',
    sourceClass: 'primary_exchange',
    jurisdictions: ['KW'],
    accessState: 'license_required',
    capabilities: ['real_time_l1', 'delayed_quotes', 'historical_prices', 'order_book', 'announcements', 'financial_statements', 'reference_data'],
    officialUrl: 'https://www.boursakuwait.com.kw/en/data-and-research/data-and-research-overview/data-and-research/',
    redistribution: 'agreement_required',
    connection: { kind: 'licensed_feed', configured: false, envHints: ['SFM_BK_FEED_URL', 'SFM_BK_FEED_TOKEN'] },
    notes: [
      'Boursa Kuwait offers direct real-time, delayed, historical, non-display and issuer-data services.',
      'THE SFM must obtain the appropriate information/data-vendor agreement before treating a redistribution feed as connected.',
    ],
  },
  {
    id: 'saudi-exchange',
    name: 'Saudi Exchange',
    sourceClass: 'primary_exchange',
    jurisdictions: ['SA'],
    accessState: 'license_required',
    capabilities: ['real_time_l1', 'delayed_quotes', 'historical_prices', 'order_book', 'reference_data'],
    officialUrl: 'https://www.saudiexchange.sa/wps/portal/saudiexchange/trading/participants-directory/become-an-information-provider',
    redistribution: 'agreement_required',
    connection: { kind: 'licensed_feed', configured: false, envHints: ['SFM_SAUDI_FEED_URL', 'SFM_SAUDI_FEED_TOKEN'] },
    notes: [
      'Saudi Exchange requires an information-provider/data-distribution license for redistribution products.',
      'No production connection is claimed until THE SFM has the relevant agreement and credentials.',
    ],
  },
  {
    id: 'adx-mcp',
    name: 'Abu Dhabi Securities Exchange (ADX) MCP',
    sourceClass: 'primary_exchange',
    jurisdictions: ['AE-ADX'],
    accessState: 'access_required',
    capabilities: ['real_time_l1', 'historical_prices', 'corporate_actions', 'announcements', 'xbrl_facts', 'reference_data'],
    officialUrl: 'https://www.adx.ae/market-data-services/model-context-protocol/adx-mcp-features',
    redistribution: 'agreement_required',
    connection: { kind: 'mcp', configured: false, envHints: ['SFM_ADX_MCP_URL', 'SFM_ADX_MCP_API_KEY'] },
    notes: [
      'ADX provides an official authenticated MCP endpoint with market data and issuer evidence under plan entitlements.',
      'The adapter remains disabled until credentials and usage/redistribution rights are configured.',
    ],
  },
  {
    id: 'dfm',
    name: 'Dubai Financial Market',
    sourceClass: 'primary_exchange',
    jurisdictions: ['AE-DFM'],
    accessState: 'license_required',
    capabilities: ['historical_prices', 'real_time_l1', 'delayed_quotes', 'reference_data'],
    officialUrl: 'https://www.dfm.ae/the-exchange/market-information/marketdata-providers',
    redistribution: 'agreement_required',
    connection: { kind: 'licensed_feed', configured: false, envHints: ['SFM_DFM_FEED_URL', 'SFM_DFM_FEED_TOKEN'] },
    notes: [
      'DFM publishes official historical-data tools and identifies authorised market-data providers for distributed market data.',
      'Public historical access is not treated as a licensed real-time redistribution feed.',
    ],
  },
] as const;

export function listSfmMarketSources() {
  return SFM_MARKET_SOURCE_REGISTRY.map(source => ({
    ...source,
    connection: {
      ...source.connection,
      configured: source.connection.configured || source.connection.envHints.some(name => Boolean(process.env[name]?.trim())),
    },
  }));
}

export function sfmPrimarySourceReadiness() {
  const sources = listSfmMarketSources();
  return {
    connected: sources.filter(source => source.accessState === 'connected' || source.connection.configured).map(source => source.id),
    accessRequired: sources.filter(source => source.accessState === 'access_required' && !source.connection.configured).map(source => source.id),
    licenseRequired: sources.filter(source => source.accessState === 'license_required' && !source.connection.configured).map(source => source.id),
  };
}
