import { ExternalLink, FileText, Info, Layers3 } from 'lucide-react';
import { AssetIdentity } from '@/components/asset/AssetIdentity';
import type { AssetProfile, AssetProfileResponse } from '@/lib/market/fetchAssetProfile';
import { marketCurrencyLabel, normalizeMarketCurrencyCode } from '@/lib/market/marketCurrency';
import type { MarketAssetType } from '@/lib/market/marketService';

type AssetProfileCardProps = {
  response: AssetProfileResponse | null;
  loading: boolean;
  error: string | null;
  language: string;
  assetType: MarketAssetType;
  t: (key: string) => string;
};

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function formatCompactNumber(value: unknown, language: string) {
  if (typeof value === 'string') return value;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat(language === 'ar' ? 'ar' : language === 'fr' ? 'fr-FR' : 'en-US', {
    notation: Math.abs(value) >= 1000000 ? 'compact' : 'standard',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: unknown, language: string) {
  if (typeof value === 'string') return value;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const normalized = Math.abs(value) <= 1 ? value : value / 100;
  return new Intl.NumberFormat(language === 'ar' ? 'ar' : language === 'fr' ? 'fr-FR' : 'en-US', {
    style: 'percent',
    maximumFractionDigits: 2,
  }).format(normalized);
}

function formatDate(value: unknown, language: string) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar' : language === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function fieldValue(value: unknown, fallback: string) {
  return hasValue(value) ? String(value) : fallback;
}

type TextDirection = 'ltr' | 'rtl';

function textDirection(value: string | null | undefined): TextDirection | undefined {
  if (!value) return undefined;
  return /[A-Za-z0-9$\u20AC\u00A3\u00A5/.,&+:%()-]/.test(value) ? 'ltr' : undefined;
}

function directionFor(value: string | null | undefined, language: string): TextDirection {
  return textDirection(value) ?? (language === 'ar' ? 'rtl' : 'ltr');
}

function labelDirection(label: string, language: string): TextDirection {
  if (language === 'ar' && /[\u0600-\u06FF]/.test(label)) return 'rtl';
  return directionFor(label, language);
}

function formatProfileCurrency(value: unknown, unavailable: string, language: string) {
  const normalized = normalizeMarketCurrencyCode(value);
  if (!normalized) return fieldValue(value, unavailable);
  if (language === 'ar') {
    const localized = marketCurrencyLabel(normalized, language);
    return localized && localized !== normalized ? `${normalized} / ${localized}` : normalized;
  }
  return normalized;
}

function limitationLabel(key: string, t: (key: string) => string) {
  const map: Record<string, string> = {
    profile_description_unavailable: 'market_asset_profile_limitation_description',
    sector_unavailable: 'market_asset_profile_limitation_sector',
    holdings_unavailable: 'market_asset_profile_limitation_holdings',
    expense_ratio_unavailable: 'market_asset_profile_limitation_expense_ratio',
  };
  return t(map[key] ?? 'market_asset_profile_limitation_general');
}

type ProfileDetail = {
  key: string;
  label: string;
  value: string | null | undefined;
};

function DetailRow({ label, value, language }: { label: string; value: string | null | undefined; language: string }) {
  const safeValue = value || '';

  return (
    <div className="asset-profile-detail-row" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <dt dir={labelDirection(label, language)}>{label}</dt>
      <dd dir={directionFor(safeValue, language)}>{safeValue}</dd>
    </div>
  );
}

function profileDetails(profile: AssetProfile, assetType: MarketAssetType, unavailable: string, language: string, t: (key: string) => string): ProfileDetail[] {
  const common = [
    { key: 'ticker', label: t('market_asset_profile_ticker'), value: fieldValue(profile.ticker, unavailable) },
    { key: 'exchange', label: t('market_asset_profile_exchange'), value: fieldValue(profile.exchange, unavailable) },
  ];

  if (assetType === 'stock') {
    return [
      ...common,
      { key: 'sector', label: t('market_asset_profile_sector'), value: fieldValue(profile.sector, unavailable) },
      { key: 'industry', label: t('market_asset_profile_industry'), value: fieldValue(profile.industry, unavailable) },
      { key: 'country', label: t('market_asset_profile_country'), value: fieldValue(profile.country, unavailable) },
      { key: 'currency', label: t('market_asset_profile_currency'), value: formatProfileCurrency(profile.currency, unavailable, language) },
      { key: 'market-cap', label: t('market_asset_profile_market_cap'), value: formatCompactNumber(profile.marketCap, language) ?? unavailable },
      { key: 'employees', label: t('market_asset_profile_employees'), value: formatCompactNumber(profile.employeeCount ?? profile.employees, language) ?? unavailable },
    ];
  }

  if (assetType === 'etf') {
    return [
      ...common,
      { key: 'issuer', label: t('market_asset_profile_issuer'), value: fieldValue(profile.issuer, unavailable) },
      { key: 'tracked', label: t('market_asset_profile_index_tracked'), value: fieldValue(profile.indexTracked, unavailable) },
      { key: 'category', label: t('market_asset_profile_category'), value: fieldValue(profile.category, unavailable) },
      { key: 'currency', label: t('market_asset_profile_currency'), value: formatProfileCurrency(profile.currency, unavailable, language) },
      { key: 'expense', label: t('market_asset_profile_expense_ratio'), value: formatPercent(profile.expenseRatio, language) ?? unavailable },
      { key: 'aum', label: t('market_asset_profile_aum'), value: formatCompactNumber(profile.aum, language) ?? unavailable },
      { key: 'inception', label: t('market_asset_profile_inception_date'), value: formatDate(profile.inceptionDate, language) ?? unavailable },
    ];
  }

  if (assetType === 'crypto') {
    return [
      ...common,
      { key: 'category', label: t('market_asset_profile_category'), value: fieldValue(profile.category, unavailable) },
      { key: 'currency', label: t('market_asset_profile_currency'), value: formatProfileCurrency(profile.currency, unavailable, language) },
      { key: 'market-cap', label: t('market_asset_profile_market_cap'), value: formatCompactNumber(profile.marketCap, language) ?? unavailable },
    ];
  }

  if (assetType === 'index') {
    return [
      ...common,
      { key: 'category', label: t('market_asset_profile_category'), value: fieldValue(profile.category, unavailable) },
      { key: 'country', label: t('market_asset_profile_country'), value: fieldValue(profile.country, unavailable) },
      { key: 'currency', label: t('market_asset_profile_currency'), value: formatProfileCurrency(profile.currency, unavailable, language) },
    ];
  }

  return [
    ...common,
    { key: 'category', label: t('market_asset_profile_category'), value: fieldValue(profile.category, unavailable) },
    { key: 'country', label: t('market_asset_profile_country'), value: fieldValue(profile.country, unavailable) },
    { key: 'currency', label: t('market_asset_profile_currency'), value: formatProfileCurrency(profile.currency, unavailable, language) },
  ];
}

export function AssetProfileCard({ response, loading, error, language, assetType, t }: AssetProfileCardProps) {
  const profile = response?.profile ?? null;
  const unavailable = t('market_asset_profile_unavailable_value');
  const lastUpdated = response?.lastUpdated ? formatDate(response.lastUpdated, language) : null;
  const details = profile ? profileDetails(profile, assetType, unavailable, language, t) : [];
  const profileTitle = profile?.name ?? response?.symbol ?? '';
  const profileSummary = profile?.description ?? t('market_asset_profile_partial');
  const assetTypeLabel = t(`market_asset_type_${assetType}`);
  const dataProviderLabel = language === 'ar' ? 'مزود البيانات' : t('market_asset_profile_data_source');
  const dataProviderValue = fieldValue(response?.source, unavailable);

  return (
    <>
      <article className="market-panel asset-profile-card" aria-busy={loading}>
        <div className="market-section-head">
          <FileText size={19} />
          <div>
            <span>{t('market_asset_profile_eyebrow')}</span>
            <h2>{t('market_asset_profile_basics')}</h2>
          </div>
        </div>

        {loading ? (
          <div className="asset-profile-state" role="status">
            <span className="asset-profile-pulse" />
            {t('market_asset_profile_loading')}
          </div>
        ) : error ? (
          <div className="asset-profile-state error" role="alert">
            <Info size={17} />
            {t('market_asset_profile_error')}
          </div>
        ) : !response?.profileAvailable || !profile ? (
          <div className="asset-profile-state">
            <Info size={17} />
            {t('market_asset_profile_unavailable')}
          </div>
        ) : (
          <div className="asset-profile-body">
            <div className="asset-profile-header">
              <div className="asset-profile-title-row">
                <AssetIdentity
                  symbol={profile.ticker ?? response.symbol}
                  name={profile.name ?? response.symbol}
                  assetType={assetType}
                  size="lg"
                  decorative
                />
                <div>
                  <strong dir={directionFor(profileTitle, language)}>{profileTitle}</strong>
                  <p dir={directionFor(profileSummary, language)}>{profileSummary}</p>
                </div>
              </div>
              <div className="asset-profile-badges">
                <span dir="ltr">{profile.ticker ?? response.symbol}</span>
                <span dir={directionFor(assetTypeLabel, language)}>{assetTypeLabel}</span>
                <span dir="ltr">{response.source}</span>
              </div>
            </div>

            {profile.description && (
              <section className="asset-profile-section">
                <h3>{t('market_asset_profile_company_overview')}</h3>
                <p dir={directionFor(profile.description, language)}>{profile.description}</p>
              </section>
            )}

            {(profile.objective || profile.sector || profile.industry || profile.issuer) && (
              <section className="asset-profile-section">
                <h3>{assetType === 'etf' ? t('market_asset_profile_objective') : t('market_asset_profile_activity')}</h3>
                <p dir={directionFor(profile.objective ?? profile.sector ?? profile.industry ?? profile.issuer ?? unavailable, language)}>
                  {profile.objective ?? profile.sector ?? profile.industry ?? profile.issuer ?? unavailable}
                </p>
              </section>
            )}

            <section className="asset-profile-section asset-profile-basics-section">
              <h3>{t('market_asset_profile_basics')}</h3>
              <div className="asset-profile-details-shell">
                <dl className="asset-profile-details">
                  {details.map(item => (
                    <DetailRow key={item.key} label={item.label} value={item.value} language={language} />
                  ))}
                </dl>
                {profile.website && (
                  <a className="asset-profile-link" href={profile.website} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} />
                    {t('market_asset_profile_website')}
                  </a>
                )}
              </div>
            </section>

            {assetType === 'etf' && profile.topHoldings && profile.topHoldings.length > 0 && (
              <section className="asset-profile-section">
                <h3>{t('market_asset_profile_top_holdings')}</h3>
                <div className="asset-profile-holdings">
                  {profile.topHoldings.slice(0, 6).map((holding, index) => (
                    <span key={`${holding.symbol ?? holding.name ?? index}-${index}`}>
                      <AssetIdentity
                        variant="badge"
                        symbol={holding.symbol ?? holding.name}
                        name={holding.name ?? holding.symbol}
                        assetType="stock"
                        size="xs"
                        showName={false}
                        symbolClassName="asset-profile-holding-symbol"
                      />
                      {holding.weight !== undefined && <em>{formatPercent(holding.weight, language)}</em>}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {assetType === 'etf' && profile.sectorExposure && profile.sectorExposure.length > 0 && (
              <section className="asset-profile-section">
                <h3>{t('market_asset_profile_sector_exposure')}</h3>
                <div className="asset-profile-holdings">
                  {profile.sectorExposure.slice(0, 6).map((sector, index) => (
                    <span key={`${sector.sector}-${index}`}>
                      <b>{sector.sector}</b>
                      {sector.weight !== undefined && <em>{formatPercent(sector.weight, language)}</em>}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="asset-profile-section asset-profile-limitations">
              <h3><Layers3 size={16} />{t('market_asset_profile_risk_notes')}</h3>
              <ul>
                {(profile.dataLimitations && profile.dataLimitations.length > 0
                  ? profile.dataLimitations
                  : ['market_asset_profile_limitation_general']
                ).slice(0, 4).map((item, index) => (
                  <li key={`${item}-${index}`}>{limitationLabel(item, t)}</li>
                ))}
              </ul>
            </section>

            <footer className="asset-profile-footer">
              <span className="asset-profile-footer-item">
                <em dir={labelDirection(dataProviderLabel, language)}>{dataProviderLabel}</em>
                <b dir={directionFor(dataProviderValue, language)}>{dataProviderValue}</b>
              </span>
              <span className="asset-profile-footer-item">
                <em dir={labelDirection(t('market_asset_profile_last_updated'), language)}>{t('market_asset_profile_last_updated')}</em>
                <b dir={directionFor(lastUpdated ?? unavailable, language)}>{lastUpdated ?? unavailable}</b>
              </span>
            </footer>
          </div>
        )}
      </article>

      <style jsx>{`
        .asset-profile-card{margin:16px 0;display:grid;gap:0;padding:20px;min-width:0}.market-section-head{display:flex;align-items:flex-start;gap:11px;margin-bottom:16px;color:var(--sfm-soft-cyan)}.market-section-head span{display:block;color:var(--sfm-muted);font-size:11px;font-weight:900;margin-bottom:5px;line-height:1.4}.market-section-head h2{margin:0;color:var(--sfm-foreground);font-size:17px;font-weight:900;line-height:1.35}.asset-profile-body{display:grid;gap:14px;min-width:0}.asset-profile-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border:1px solid rgba(47,214,192,.18);background:rgba(47,214,192,.08);border-radius:18px;padding:15px;min-width:0}.asset-profile-title-row{display:flex;align-items:flex-start;gap:12px;min-width:0}.asset-profile-title-row>div{min-width:0}.asset-profile-header strong{display:block;color:var(--sfm-foreground);font-size:18px;font-weight:950;line-height:1.35;overflow-wrap:anywhere}.asset-profile-header p,.asset-profile-section p{margin:6px 0 0;color:var(--sfm-muted);font-size:13px;font-weight:800;line-height:1.8;overflow-wrap:anywhere}.asset-profile-badges{display:flex;flex-wrap:wrap;gap:7px;justify-content:flex-end;min-width:0}.asset-profile-badges span{border:1px solid rgba(47,214,192,.24);background:var(--sfm-light-card);color:var(--sfm-foreground);border-radius:999px;padding:6px 9px;font-size:11px;font-weight:950;line-height:1.2;min-width:0;max-width:100%;overflow-wrap:anywhere}.asset-profile-section{display:grid;gap:10px;background:var(--sfm-light-card);border:1px solid rgba(167,243,240,.12);border-radius:18px;padding:14px;min-width:0}.asset-profile-basics-section{gap:14px}.asset-profile-section h3{margin:0;display:flex;align-items:center;gap:7px;color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.4}.asset-profile-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;min-width:0}.asset-profile-metric{display:grid;align-content:start;gap:8px;min-width:0;min-height:86px;border:1px solid rgba(15,118,110,.14);background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(248,252,255,.82));border-radius:18px;padding:14px;box-shadow:0 12px 28px rgba(15,23,42,.05)}.asset-profile-metric span{display:block;color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.4;white-space:normal;overflow-wrap:anywhere}.asset-profile-metric strong{display:block;min-width:0;color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.55;white-space:normal;overflow-wrap:anywhere;word-break:break-word}.dark .asset-profile-metric{border-color:rgba(167,243,240,.16);background:linear-gradient(180deg,rgba(19,36,58,.92),rgba(15,29,49,.82));box-shadow:0 16px 34px rgba(0,0,0,.18)}.asset-profile-link{min-height:86px;display:flex;align-items:center;justify-content:center;gap:7px;border:1px solid rgba(47,214,192,.28);background:rgba(47,214,192,.10);border-radius:18px;color:var(--sfm-primary-hover);font-size:12px;font-weight:950;text-decoration:none;min-width:0;text-align:center;overflow-wrap:anywhere}.asset-profile-link:hover,.asset-profile-link:focus-visible{outline:none;border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.14)}.asset-profile-holdings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.asset-profile-holdings span{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid rgba(167,243,240,.12);background:var(--sfm-card);border-radius:13px;padding:9px 10px;min-width:0}.asset-profile-holdings b,.asset-profile-holding-symbol{color:var(--sfm-foreground);font-size:12px;font-weight:950;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.asset-profile-holdings em{color:var(--sfm-soft-cyan);font-size:11px;font-weight:950;font-style:normal;white-space:nowrap}.asset-profile-limitations ul{margin:0;padding-inline-start:18px;color:var(--sfm-muted);font-size:12px;font-weight:850;line-height:1.8}.asset-profile-footer{display:flex;flex-wrap:wrap;gap:8px;color:var(--sfm-muted);font-size:11px;font-weight:900}.asset-profile-footer span{border:1px solid rgba(167,243,240,.12);background:var(--sfm-light-card);border-radius:999px;padding:6px 9px}.asset-profile-state{display:flex;align-items:center;gap:9px;border:1px dashed rgba(167,243,240,.22);background:var(--sfm-light-card);border-radius:16px;padding:14px;color:var(--sfm-muted);font-size:13px;font-weight:900;line-height:1.6}.asset-profile-state.error{border-color:rgba(239,68,68,.25);color:#B91C1C}.dark .asset-profile-state.error{color:#FF8A96}.asset-profile-pulse{width:10px;height:10px;border-radius:50%;background:var(--sfm-soft-cyan);box-shadow:0 0 0 4px rgba(47,214,192,.12);animation:assetProfilePulse 1.1s ease-in-out infinite}@keyframes assetProfilePulse{50%{transform:scale(.72);opacity:.55}}@media (max-width:1024px){.asset-profile-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media (max-width:760px){.asset-profile-header{display:grid}.asset-profile-title-row{align-items:center}.asset-profile-badges{justify-content:flex-start}.asset-profile-metrics,.asset-profile-holdings{grid-template-columns:1fr}.asset-profile-card{padding:16px}.asset-profile-metric,.asset-profile-link{min-height:unset}}
      `}</style>
      <style jsx>{`
        .asset-profile-details-shell {
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        .asset-profile-details {
          display: grid;
          gap: 0;
          margin: 0;
          min-width: 0;
          overflow: hidden;
          border: 1px solid rgba(167, 243, 240, .16);
          border-radius: 16px;
          background: var(--sfm-card);
        }

        .asset-profile-detail-row {
          display: grid;
          grid-template-columns: minmax(96px, .72fr) minmax(0, 1fr);
          align-items: center;
          gap: 14px;
          min-width: 0;
          padding: 12px 14px;
          border-block-end: 1px solid rgba(167, 243, 240, .12);
        }

        .asset-profile-detail-row:last-child {
          border-block-end: 0;
        }

        .asset-profile-detail-row dt,
        .asset-profile-detail-row dd {
          min-width: 0;
          margin: 0;
          line-height: 1.45;
          unicode-bidi: isolate;
        }

        .asset-profile-detail-row dt {
          color: var(--sfm-muted);
          font-size: 12px;
          font-weight: 900;
          text-align: start;
        }

        .asset-profile-detail-row dd {
          color: var(--sfm-foreground);
          font-size: 13px;
          font-weight: 950;
          text-align: end;
          overflow-wrap: anywhere;
        }

        .asset-profile-footer {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .asset-profile-footer .asset-profile-footer-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
          border-radius: 14px;
          padding: 9px 11px;
        }

        .asset-profile-footer-item em,
        .asset-profile-footer-item b {
          min-width: 0;
          font-style: normal;
          line-height: 1.35;
          unicode-bidi: isolate;
        }

        .asset-profile-footer-item em {
          color: var(--sfm-muted);
          font-weight: 900;
        }

        .asset-profile-footer-item b {
          color: var(--sfm-foreground);
          font-weight: 950;
          text-align: end;
          overflow-wrap: anywhere;
        }

        .dark .asset-profile-details {
          border-color: rgba(167, 243, 240, .14);
          background: rgba(15, 29, 49, .78);
        }

        @media (max-width: 760px) {
          .asset-profile-detail-row {
            grid-template-columns: 1fr;
            gap: 5px;
            align-items: start;
          }

          .asset-profile-detail-row dd {
            text-align: start;
          }
        }
      `}</style>
    </>
  );
}

