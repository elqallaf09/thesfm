import { registerJurisdictionCoverage } from './coverage';

/**
 * Capability registry based only on source surfaces verified during source discovery.
 * `VALUATION_READY` is intentionally not VERIFIED here: adapter implementation,
 * source terms, normalization and evidence sufficiency still have to pass.
 */
export function registerVerifiedGccCoverage(): void {
  registerJurisdictionCoverage({
    jurisdictionCode: 'SA', countryCode: 'SA', label: 'Saudi Arabia', verifiedAt: '2026-09-15',
    capabilities: { ASSET_INPUT: 'VERIFIED', PARCEL_CONTEXT: 'VERIFIED', OFFICIAL_AGGREGATES: 'VERIFIED', TRANSACTION_COMPARABLES: 'VERIFIED', FX_READY: 'RESEARCHING', VALUATION_READY: 'PARTIAL' },
    notes: ['REGA/MOJ expose daily and historical sales transaction services; adapter/terms validation remains before valuation-ready status.'],
  });
  registerJurisdictionCoverage({
    jurisdictionCode: 'AE-DU', countryCode: 'AE', label: 'Dubai', verifiedAt: '2026-09-15',
    capabilities: { ASSET_INPUT: 'VERIFIED', PARCEL_CONTEXT: 'VERIFIED', OFFICIAL_AGGREGATES: 'VERIFIED', TRANSACTION_COMPARABLES: 'VERIFIED', FX_READY: 'RESEARCHING', VALUATION_READY: 'PARTIAL' },
    notes: ['Dubai Land Department/Dubai Pulse expose transaction datasets with amount, area, date and property fields.'],
  });
  registerJurisdictionCoverage({
    jurisdictionCode: 'AE-AZ', countryCode: 'AE', label: 'Abu Dhabi', verifiedAt: '2026-09-15',
    capabilities: { ASSET_INPUT: 'VERIFIED', OFFICIAL_AGGREGATES: 'VERIFIED', TRANSACTION_COMPARABLES: 'PARTIAL', FX_READY: 'RESEARCHING', VALUATION_READY: 'PARTIAL' },
    notes: ['ADREC market-data surfaces transactions and price indices; export/API grain and terms require adapter validation.'],
  });
  registerJurisdictionCoverage({
    jurisdictionCode: 'OM', countryCode: 'OM', label: 'Oman', verifiedAt: '2026-09-15',
    capabilities: { ASSET_INPUT: 'VERIFIED', PARCEL_CONTEXT: 'VERIFIED', OFFICIAL_AGGREGATES: 'VERIFIED', TRANSACTION_COMPARABLES: 'PARTIAL', FX_READY: 'RESEARCHING', VALUATION_READY: 'PARTIAL' },
    notes: ['MOHUP publishes monthly real-estate buy/sell open datasets; comparable grain requires validation.'],
  });
  registerJurisdictionCoverage({
    jurisdictionCode: 'QA', countryCode: 'QA', label: 'Qatar', verifiedAt: '2026-09-15',
    capabilities: { ASSET_INPUT: 'VERIFIED', OFFICIAL_AGGREGATES: 'VERIFIED', TRANSACTION_COMPARABLES: 'RESEARCHING', FX_READY: 'RESEARCHING', VALUATION_READY: 'PARTIAL' },
    notes: ['Ministry of Justice publishes real-estate registration/documentation open statistics; price-comparable grain is not yet claimed.'],
  });
  registerJurisdictionCoverage({ jurisdictionCode: 'KW', countryCode: 'KW', label: 'Kuwait', capabilities: { ASSET_INPUT: 'VERIFIED', OFFICIAL_AGGREGATES: 'RESEARCHING', TRANSACTION_COMPARABLES: 'RESEARCHING', FX_READY: 'RESEARCHING', VALUATION_READY: 'RESEARCHING' } });
  registerJurisdictionCoverage({ jurisdictionCode: 'BH', countryCode: 'BH', label: 'Bahrain', capabilities: { ASSET_INPUT: 'VERIFIED', OFFICIAL_AGGREGATES: 'RESEARCHING', TRANSACTION_COMPARABLES: 'RESEARCHING', FX_READY: 'RESEARCHING', VALUATION_READY: 'RESEARCHING' } });
}
