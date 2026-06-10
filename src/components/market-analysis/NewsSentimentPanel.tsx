'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, Brain, Info, Newspaper, RefreshCw, Sparkles } from 'lucide-react';
import type { MarketAssetType } from '@/lib/market/marketService';
import type { ApiListState } from './types';
import {
  MARKET_TOOL_REQUEST_TIMEOUT_MS, isAbortLikeError, logMarketToolPerformance,
  marketToolFailureState, sanitizeMarketToolMessage,
} from './utils';

export function NewsSentimentPanel({
  t,
  lang,
  news,
  sentiment,
  selectedAsset,
  onSelectAsset,
  onRefreshNews,
  onRefreshSentiment,
  onCheckSentimentHealth,
  checkingSentimentHealth,
  onOpenTechnicalAnalysis,
  onApplySentimentSuggestion,
}: {
  t: (key: string) => string;
  lang: string;
  news: ApiListState<Record<string, any>>;
  sentiment: ApiListState<Record<string, any>>;
  selectedAsset: SelectedMarketAsset | null;
  onSelectAsset: () => void;
  onRefreshNews: () => void;
  onRefreshSentiment: () => void;
  onCheckSentimentHealth: () => void;
  checkingSentimentHealth: boolean;
  onOpenTechnicalAnalysis: () => void;
  onApplySentimentSuggestion: (symbol: string) => void;
}) {
  const newsEmpty = publicNewsEmptyCopy(news.code, t);
  const hasSelectedAsset = Boolean(selectedAsset?.symbol?.trim());
  const sentimentItems = hasSelectedAsset ? sentiment.items : [];
  const sentimentLoading = hasSelectedAsset && sentiment.loading;
  const sentimentAssetType = sentimentAssetBadgeType(sentiment.assetType, selectedAsset);
  const supportsMyfxbookHealth = sentimentAssetType === 'forex'
    || sentimentAssetType === 'gold'
    || sentimentAssetType === 'silver'
    || sentimentAssetType === 'metals';
  const sentimentProviderKey = sentimentProviderBadgeKey(sentiment.provider, sentiment.sentimentAvailable, sentimentAssetType);
  const sentimentProviderStatus = sentimentProviderStatusMeta(sentiment.providerStatus, t);
  const sentimentEmpty = publicSentimentEmptyCopy(hasSelectedAsset ? sentiment.code : 'NO_SELECTED_ASSET', t, sentimentAssetType);
  const sentimentContextBody = hasSelectedAsset ? t(sentimentContextBodyKey(sentimentAssetType)) : '';
  const normalizedSentimentCode = String(sentiment.code ?? '').trim().toUpperCase();
  const sentimentEmptyVariant: 'info' | 'warning' = [
    'MISSING_CREDENTIALS',
    'LOGIN_REJECTED',
    'LOGIN_FAILED',
    'INVALID_SESSION',
    'NO_SESSION',
    'PROVIDER_DOWN',
    'TIMEOUT',
    'RATE_LIMIT',
    'HTML_RESPONSE',
    'CLOUDFLARE_BLOCKED',
    'MYFXBOOK_AUTH_FAILED',
    'MYFXBOOK_INVALID_SESSION',
    'MYFXBOOK_HTML_RESPONSE',
    'MYFXBOOK_CLOUDFLARE_BLOCKED',
    'MYFXBOOK_PROVIDER_FAILED',
  ].includes(normalizedSentimentCode) ? 'warning' : 'info';
  const newsLastAttempt = news.updatedAt
    ? `${t('market_last_attempt')}: ${formatMarketToolTimestamp(news.updatedAt, lang)}`
    : undefined;
  const sentimentLastCheckedAt = hasSelectedAsset
    ? (sentiment.lastCheckedAt || sentiment.checkedAt || sentiment.updatedAt)
    : '';
  const sentimentLastAttempt = hasSelectedAsset && sentimentLastCheckedAt
    ? `${t('market_last_attempt')}: ${formatMarketToolTimestamp(sentimentLastCheckedAt, lang)}`
    : undefined;
  const sentimentUpdatedLabel = hasSelectedAsset && sentiment.sentimentAvailable && sentiment.updatedAt
    ? `${t('market_sentiment_last_updated_metric')}: ${formatMarketToolTimestamp(sentiment.updatedAt, lang)}`
    : '';
  const sentimentCheckedLabel = hasSelectedAsset && sentimentLastCheckedAt
    ? `${t('market_sentiment_last_checked_metric')}: ${formatMarketToolTimestamp(sentimentLastCheckedAt, lang)}`
    : '';
  const sentimentCachedWarning = hasSelectedAsset && (sentiment.stale || sentiment.cacheStatus === 'stale')
    ? (sentiment.message || t('market_sentiment_cached_warning'))
    : '';
  const sentimentSessionRenewed = hasSelectedAsset
    && sentiment.sentimentAvailable
    && (
      String(sentiment.communityOutlookStatus ?? '').trim().toLowerCase() === 'invalid_session_recovered'
      || String(sentiment.sentimentStatus ?? '').trim().toLowerCase() === 'invalid_session_recovered'
    )
    ? (sentiment.message || t('market_sentiment_myfxbook_session_renewed'))
    : '';
  const sentimentProviderMessage = hasSelectedAsset && sentiment.providerMessage
    ? String(sentiment.providerMessage)
    : '';
  const sentimentActionLabel = hasSelectedAsset ? t('market_refresh_sentiment') : t('market_sentiment_select_asset_action');
  const sentimentAction = hasSelectedAsset ? onRefreshSentiment : onSelectAsset;
  const sentimentSuggestions = hasSelectedAsset ? (sentiment.suggestions ?? []).filter(Boolean) : [];

  return (
    <section className="news-sentiment-section" aria-labelledby="market-news-sentiment-title">
      <div className="market-panel news-sentiment-shell">
        <div className="market-section-head news-sentiment-head">
          <span className="news-sentiment-head-icon"><Newspaper size={20} /></span>
          <div>
            <span>{t('market_news_sentiment_subtitle')}</span>
            <h2 id="market-news-sentiment-title">{t('market_news_sentiment')}</h2>
          </div>
        </div>

        <div className="news-sentiment-grid">
          <article className="news-tool-card">
            <div className="news-tool-card-head">
              <span><Landmark size={19} /></span>
              <div>
                <small>{t('market_central_bank_topics')}</small>
                <h3>{t('market_central_bank_news')}</h3>
              </div>
              <MarketSectionRefreshButton t={t} loading={news.loading} onRefresh={onRefreshNews} label={t('market_refresh_news')} />
            </div>

            {news.loading ? (
              <MarketSectionLoading label={t('market_loading_central_bank_news')} />
            ) : news.items.length > 0 ? (
              <div className="central-news-list">
                {news.items.map((item, index) => {
                  const headline = textField(item, ['title', 'headline', 'name']);
                  const summary = textField(item, ['summary', 'description', 'excerpt']);
                  const source = textField(item, ['source', 'sourceName', 'provider', 'publisher']);
                  const published = textField(item, ['publishedAt', 'published_at', 'published', 'date', 'time']);
                  const relatedBank = textField(item, ['related_bank', 'bank', 'centralBank', 'central_bank', 'region']);
                  const relatedCurrency = textField(item, ['related_currency', 'currency']);
                  const related = [relatedBank, relatedCurrency].filter(Boolean).join(' / ');
                  const url = textField(item, ['url', 'link', 'sourceUrl', 'source_url']);
                  return (
                    <article className="central-news-card" key={`${headline || source || 'central-news'}-${index}`}>
                      <div className="central-news-meta">
                        {related ? <span dir="ltr">{related}</span> : null}
                        {published ? <small dir="ltr">{published}</small> : null}
                      </div>
                      <h4>{headline || t('market_news_no_items_title')}</h4>
                      {summary ? <p>{summary}</p> : null}
                      <div className="central-news-footer">
                        {source ? <small>{t('market_news_source')}: {source}</small> : null}
                        {url ? <a href={url} target="_blank" rel="noreferrer">{t('market_open_source')}</a> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <MarketToolEmptyState
                icon={<Newspaper size={18} />}
                title={newsEmpty.title}
                description={newsEmpty.body}
                meta={newsLastAttempt}
                actionLabel={t('market_refresh_news')}
                onAction={onRefreshNews}
                variant="info"
              />
            )}
          </article>

          <article className="news-tool-card sentiment-tool-card">
            <div className="news-tool-card-head">
              <span><BarChart3 size={19} /></span>
              <div>
                <small>{t('market_sentiment_note_title')}</small>
                <h3>{t('market_market_sentiment')}</h3>
              </div>
              {hasSelectedAsset ? (
                <MarketSectionRefreshButton
                  t={t}
                  loading={sentiment.loading}
                  onRefresh={onRefreshSentiment}
                  label={t('market_refresh_sentiment')}
                  loadingLabel={t('market_refreshing_section')}
                />
              ) : null}
            </div>

            {hasSelectedAsset ? (
              <div className="sentiment-context-block">
                <div className="sentiment-selected-asset" aria-label={t('market_sentiment_selected_asset')}>
                  <span>{t('market_sentiment_selected_asset')}</span>
                  <b dir="ltr">{selectedAsset?.symbol}</b>
                  {selectedAsset?.name ? <small>{selectedAsset.name}</small> : null}
                </div>
                <div className="sentiment-context-row" aria-label={t('market_sentiment_context_badges')}>
                  <span className="sentiment-context-badge">
                    <small>{t('market_asset_type_label')}</small>
                    <b>{t(sentimentAssetBadgeKey(sentimentAssetType))}</b>
                  </span>
                  <span className="sentiment-context-badge source">
                    <small>{t('market_sentiment_provider_label')}</small>
                    <b>{t(sentimentProviderKey)}</b>
                  </span>
                  <span className={`sentiment-context-badge status ${sentimentProviderStatus.className}`}>
                    <small>{t('market_sentiment_provider_status')}</small>
                    <b>{sentimentProviderStatus.label}</b>
                  </span>
                </div>
                {sentimentUpdatedLabel ? (
                  <p className="sentiment-context-note sentiment-updated-note">
                    <Clock3 size={13} />
                    <span>{sentimentUpdatedLabel}</span>
                  </p>
                ) : null}
                {sentimentCheckedLabel ? (
                  <p className="sentiment-context-note sentiment-updated-note">
                    <Clock3 size={13} />
                    <span>{sentimentCheckedLabel}</span>
                  </p>
                ) : null}
                {sentimentCachedWarning ? (
                  <p className="sentiment-context-note sentiment-cache-note">
                    <Info size={13} />
                    <span>{sentimentCachedWarning}</span>
                  </p>
                ) : null}
                {sentimentSessionRenewed ? (
                  <p className="sentiment-context-note sentiment-updated-note">
                    <CheckCircle2 size={13} />
                    <span>{sentimentSessionRenewed}</span>
                  </p>
                ) : null}
                {sentimentProviderMessage ? (
                  <p className="sentiment-context-note sentiment-cache-note">
                    <ShieldAlert size={13} />
                    <span>{sentimentProviderMessage}</span>
                  </p>
                ) : null}
                {sentimentContextBody ? <p className="sentiment-context-note">{sentimentContextBody}</p> : null}
              </div>
            ) : null}

            {sentimentLoading ? (
              <MarketSectionLoading label={t('market_loading_market_sentiment')} cards={2} />
            ) : sentimentItems.length > 0 ? (
              <div className="sentiment-card-list">
                {sentimentItems.map((item, index) => {
                  const symbol = textField(item, ['displaySymbol', 'symbol', 'ticker', 'asset', 'instrument']);
                  const name = textField(item, ['name', 'assetName', 'asset_name', 'description']);
                  const values = sentimentValues(item);
                  if (!values) {
                    return (
                      <article className="sentiment-card" key={`${symbol || 'sentiment'}-${index}`}>
                        <div className="sentiment-card-head">
                          <b dir="ltr">{symbol || t('market_unavailable')}</b>
                          {name ? <span>{name}</span> : null}
                        </div>
                        <p>{t('market_sentiment_no_items_body')}</p>
                      </article>
                    );
                  }
                  const tone = sentimentTone(values);
                  const extraMetrics = sentimentExtraMetrics(item, t, lang);
                  return (
                    <article className="sentiment-card" key={`${symbol || 'sentiment'}-${index}`}>
                      <div className="sentiment-card-head">
                        <div>
                          <b dir="ltr">{symbol || t('market_unavailable')}</b>
                          {name ? <span>{name}</span> : null}
                        </div>
                        <em className={`sentiment-badge ${tone}`}>
                          {tone === 'buy' ? t('market_sentiment_majority_buy') : tone === 'sell' ? t('market_sentiment_majority_sell') : t('market_sentiment_balanced')}
                        </em>
                      </div>
                      <div className="sentiment-metrics">
                        <span>{t('market_buy_ratio')} <b dir="ltr">{values.buy.toFixed(0)}%</b></span>
                        <span>{t('market_sell_ratio')} <b dir="ltr">{values.sell.toFixed(0)}%</b></span>
                      </div>
                      <div className="sentiment-bar" aria-hidden="true">
                        <i style={{ width: `${values.buy}%` }} />
                        <b style={{ width: `${values.sell}%` }} />
                      </div>
                      {extraMetrics.length > 0 ? (
                        <div className="sentiment-extra-metrics">
                          {extraMetrics.map(([label, value]) => (
                            <span key={label}>
                              <small>{label}</small>
                              <b dir="ltr">{value}</b>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
                <div className="sentiment-empty-actions sentiment-card-actions">
                  <button type="button" onClick={onRefreshSentiment}>
                    <Activity size={15} />
                    <span>{t('market_refresh_sentiment')}</span>
                  </button>
                  {supportsMyfxbookHealth ? (
                    <button type="button" onClick={onCheckSentimentHealth} disabled={checkingSentimentHealth}>
                      <ShieldAlert size={15} />
                      <span>{checkingSentimentHealth ? t('market_refreshing_section') : t('market_sentiment_check_myfxbook')}</span>
                    </button>
                  ) : null}
                  <button type="button" onClick={onRefreshNews}>
                    <Newspaper size={15} />
                    <span>{t('market_sentiment_show_news_action')}</span>
                  </button>
                  <button type="button" onClick={onOpenTechnicalAnalysis}>
                    <LineChart size={15} />
                    <span>{t('market_sentiment_technical_action')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <MarketToolEmptyState
                  icon={<BarChart3 size={18} />}
                  title={sentimentEmpty.title}
                  description={sentimentEmpty.body}
                  meta={sentimentLastAttempt}
                  actionLabel={hasSelectedAsset ? undefined : sentimentActionLabel}
                  onAction={hasSelectedAsset ? undefined : sentimentAction}
                  variant={sentimentEmptyVariant}
                />
                {hasSelectedAsset ? (
                  <div className="sentiment-empty-actions">
                    <button type="button" onClick={onRefreshSentiment}>
                      <Activity size={15} />
                      <span>{t('market_refresh_sentiment')}</span>
                    </button>
                    {supportsMyfxbookHealth ? (
                      <button type="button" onClick={onCheckSentimentHealth} disabled={checkingSentimentHealth}>
                        <ShieldAlert size={15} />
                        <span>{checkingSentimentHealth ? t('market_refreshing_section') : t('market_sentiment_check_myfxbook')}</span>
                      </button>
                    ) : null}
                    {sentimentSuggestions.map(suggestion => (
                      <button type="button" key={suggestion} onClick={() => onApplySentimentSuggestion(suggestion)}>
                        <Search size={15} />
                        <span dir="ltr">{suggestion}</span>
                      </button>
                    ))}
                    <button type="button" onClick={onRefreshNews}>
                      <Newspaper size={15} />
                      <span>{t('market_sentiment_show_news_action')}</span>
                    </button>
                    <button type="button" onClick={onOpenTechnicalAnalysis}>
                      <LineChart size={15} />
                      <span>{t('market_sentiment_technical_action')}</span>
                    </button>
                  </div>
                ) : null}
              </>
            )}

            <div className="sentiment-info-card">
              <ShieldAlert size={17} />
              <p>{t('market_sentiment_warning')}</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export function MarketToolEmptyState({
  icon = <AlertTriangle size={18} />,
  title,
  description,
  meta,
  actionLabel,
  onAction,
  variant = 'neutral',
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'info' | 'warning' | 'neutral';
}) {
  return (
    <div className={`tool-empty-state ${variant}`}>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
        {meta ? <small>{meta}</small> : null}
        {actionLabel && onAction ? <button type="button" onClick={onAction}>{actionLabel}</button> : null}
      </div>
    </div>
  );
}

export function EmptyToolState({ icon, title, body }: { icon?: ReactNode; title: string; body: string }) {
  return <MarketToolEmptyState icon={icon} title={title} description={body} variant="neutral" />;
}

export function MarketSectionRefreshButton({
  t,
  loading,
  onRefresh,
  label,
  loadingLabel,
}: {
  t: (key: string) => string;
  loading: boolean;
  onRefresh: () => void;
  label?: string;
  loadingLabel?: string;
}) {
  return (
    <button className="market-section-refresh" type="button" onClick={onRefresh} disabled={loading}>
      <Activity size={15} />
      <span>{loading ? loadingLabel ?? t('market_loading_short') : label ?? t('market_refresh_section')}</span>
    </button>
  );
}

export function MarketSectionLoading({ label, cards = 3 }: { label: string; cards?: number }) {
  return (
    <div className="market-section-loading" role="status" aria-live="polite">
      <div className="market-section-loading-head">
        <span className="market-loading-dot" />
        <strong>{label}</strong>
      </div>
      <div className="market-loading-card-grid" aria-hidden="true">
        {Array.from({ length: cards }).map((_, index) => (
          <span className="market-loading-card" key={index}>
            <i />
            <b />
            <em />
          </span>
        ))}
      </div>
    </div>
  );
}

function MarketAsyncToolStyles() {
