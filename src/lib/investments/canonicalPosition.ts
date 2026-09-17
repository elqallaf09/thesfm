export type CanonicalInvestmentPositionRow = {
  id: string;
  asset_type: string | null;
  canonical_asset_identifier: string | null;
  symbol: string | null;
  display_name: string | null;
  country_code: string | null;
  exchange_code: string | null;
  sector_or_category: string | null;
  quantity: number | string | null;
  ownership_percentage: number | string | null;
  unit_type: string | null;
  purchase_date: string | null;
  purchase_unit_price: number | string | null;
  purchase_currency: string | null;
  total_cost: number | string | null;
  fees: number | string | null;
  current_unit_price: number | string | null;
  current_total_value: number | string | null;
  valuation_currency: string | null;
  user_base_currency: string | null;
  converted_value_in_base_currency: number | string | null;
  valuation_method: string | null;
  valuation_source: string | null;
  source_quality: string | null;
  valuation_confidence: string | null;
  valued_at: string | null;
  fx_rate_to_base_currency: number | string | null;
  fx_source: string | null;
  fx_valued_at: string | null;
  unrealized_gain_loss: number | string | null;
  realized_gain_loss: number | string | null;
  return_percentage: number | string | null;
  income_or_distributions: number | string | null;
  total_return: number | string | null;
  purchase_platform_name: string | null;
  purchase_platform_type: string | null;
  asset_logo_url: string | null;
  asset_image_url: string | null;
  notes: string | null;
  migration_state: string;
  imported_at: string;
  created_at: string | null;
  updated_at: string | null;
};

export type CanonicalInvestmentPosition = {
  id: string;
  asset: {
    type: string | null;
    identifier: string | null;
    symbol: string | null;
    name: string | null;
    countryCode: string | null;
    exchangeCode: string | null;
    category: string | null;
    logoUrl: string | null;
    imageUrl: string | null;
  };
  ownership: {
    quantity: number | null;
    percentage: number | null;
    unitType: string | null;
  };
  purchase: {
    date: string | null;
    unitPrice: number | null;
    currency: string | null;
    totalCost: number | null;
    fees: number | null;
    platformName: string | null;
    platformType: string | null;
  };
  valuation: {
    unitPrice: number | null;
    totalValue: number | null;
    currency: string | null;
    baseCurrency: string | null;
    valueInBaseCurrency: number | null;
    method: string | null;
    source: string | null;
    sourceQuality: string | null;
    confidence: string | null;
    valuedAt: string | null;
  };
  fx: {
    rateToBaseCurrency: number | null;
    source: string | null;
    valuedAt: string | null;
  };
  performance: {
    unrealizedGainLoss: number | null;
    realizedGainLoss: number | null;
    returnPercentage: number | null;
    incomeOrDistributions: number | null;
    totalReturn: number | null;
  };
  notes: string | null;
  dataStatus: {
    migrationState: string;
    importedAt: string;
    createdAt: string | null;
    updatedAt: string | null;
  };
};

function nullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toCanonicalInvestmentPosition(
  row: CanonicalInvestmentPositionRow,
): CanonicalInvestmentPosition {
  return {
    id: row.id,
    asset: {
      type: row.asset_type,
      identifier: row.canonical_asset_identifier,
      symbol: row.symbol,
      name: row.display_name,
      countryCode: row.country_code,
      exchangeCode: row.exchange_code,
      category: row.sector_or_category,
      logoUrl: row.asset_logo_url,
      imageUrl: row.asset_image_url,
    },
    ownership: {
      quantity: nullableNumber(row.quantity),
      percentage: nullableNumber(row.ownership_percentage),
      unitType: row.unit_type,
    },
    purchase: {
      date: row.purchase_date,
      unitPrice: nullableNumber(row.purchase_unit_price),
      currency: row.purchase_currency,
      totalCost: nullableNumber(row.total_cost),
      fees: nullableNumber(row.fees),
      platformName: row.purchase_platform_name,
      platformType: row.purchase_platform_type,
    },
    valuation: {
      unitPrice: nullableNumber(row.current_unit_price),
      totalValue: nullableNumber(row.current_total_value),
      currency: row.valuation_currency,
      baseCurrency: row.user_base_currency,
      valueInBaseCurrency: nullableNumber(row.converted_value_in_base_currency),
      method: row.valuation_method,
      source: row.valuation_source,
      sourceQuality: row.source_quality,
      confidence: row.valuation_confidence,
      valuedAt: row.valued_at,
    },
    fx: {
      rateToBaseCurrency: nullableNumber(row.fx_rate_to_base_currency),
      source: row.fx_source,
      valuedAt: row.fx_valued_at,
    },
    performance: {
      unrealizedGainLoss: nullableNumber(row.unrealized_gain_loss),
      realizedGainLoss: nullableNumber(row.realized_gain_loss),
      returnPercentage: nullableNumber(row.return_percentage),
      incomeOrDistributions: nullableNumber(row.income_or_distributions),
      totalReturn: nullableNumber(row.total_return),
    },
    notes: row.notes,
    dataStatus: {
      migrationState: row.migration_state,
      importedAt: row.imported_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  };
}
