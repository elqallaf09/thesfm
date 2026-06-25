'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, Info, Search } from 'lucide-react';
import { normalizeEconomicEvents, type EconomicImpact, type NormalizedEconomicEvent } from '@/lib/market/normalizeEconomicEvents';
import type { ApiListState, EconomicCalendarFilter, EconomicCalendarEvent } from './types';
import { EmptyToolState, MarketSectionLoading, MarketSectionRefreshButton, MarketToolEmptyState } from './NewsSentimentPanel';

const ECONOMIC_CALENDAR_FILTERS: EconomicCalendarFilter[] = ['today', 'week', 'high', 'USD', 'EUR', 'GBP', 'JPY'];

function readCalendarField(event: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = event[key];
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return '';
}

function readCalendarDate(event: Record<string, any>) {
  const value = event.date ?? event.datetime ?? event.time ?? event.eventTime ?? event.event_time ?? event.timestamp;
  if (value === null || value === undefined || value === '') return null;
  const parsed = new Date(typeof value === 'number' && value < 10000000000 ? value * 1000 : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatCalendarDate(date: Date | null, locale: string) {
  if (!date) return '';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatCalendarCountdown(date: Date | null, locale: string, fallback: string) {
  if (!date) return fallback;
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return fallback;
  const rtf = new Intl.RelativeTimeFormat(locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US', { numeric: 'auto' });
  const minutes = Math.ceil(diffMs / 60000);
  if (minutes < 60) return rtf.format(minutes, 'minute');
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return rtf.format(hours, 'hour');
  return rtf.format(Math.ceil(hours / 24), 'day');
}

function normalizeEconomicCalendarEvent(event: Record<string, any>, index: number, locale: string, unavailable: string): EconomicCalendarEvent {
  const eventTime = readCalendarDate(event);
  return {
    id: readCalendarField(event, ['id', 'event_id', 'eventId']) || `${readCalendarField(event, ['event', 'name', 'title'])}-${index}`,
    name: readCalendarField(event, ['event', 'name', 'title', 'headline']) || unavailable,
    currency: readCalendarField(event, ['currency', 'symbol', 'ccy']) || unavailable,
    country: readCalendarField(event, ['country', 'region']) || unavailable,
    impact: readCalendarField(event, ['impact', 'importance', 'level']) || unavailable,
    previous: readCalendarField(event, ['previous', 'prev']) || unavailable,
    forecast: readCalendarField(event, ['forecast', 'estimate', 'consensus']) || unavailable,
    actual: readCalendarField(event, ['actual', 'value']) || unavailable,
    eventTime,
    eventTimeLabel: formatCalendarDate(eventTime, locale) || unavailable,
  };
}

function isToday(date: Date | null) {
  if (!date) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function isWithinWeek(date: Date | null) {
  if (!date) return false;
  const now = Date.now();
  const diff = date.getTime() - now;
  return diff >= -86400000 && diff <= 7 * 86400000;
}

type CalendarTimeFilter = 'today' | 'tomorrow' | 'week';
type CalendarImpactFilter = 'all' | 'high' | 'medium' | 'low';
type CalendarCurrencyFilter = 'all' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'CHF';
type CalendarAvailability = 'loading' | 'not_configured' | 'error' | 'empty' | 'ready';

const CALENDAR_TIME_FILTERS: CalendarTimeFilter[] = ['today', 'tomorrow', 'week'];
const CALENDAR_IMPACT_FILTERS: CalendarImpactFilter[] = ['all', 'high', 'medium', 'low'];
const CALENDAR_CURRENCY_FILTERS: CalendarCurrencyFilter[] = ['all', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF'];
const CALENDAR_PAGE_SIZE = 12;

function marketIntlLocale(locale: string) {
  return locale === 'ar' ? 'ar-KW' : locale === 'fr' ? 'fr-FR' : 'en-US';
}

function getEconomicEventDate(event: NormalizedEconomicEvent) {
  if (!event.dateTime) return null;
  const date = new Date(event.dateTime);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfLocalDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameLocalDay(date: Date | null, compareTo: Date) {
  if (!date) return false;
  return startOfLocalDay(date).getTime() === startOfLocalDay(compareTo).getTime();
}

function isTomorrowLocalDay(date: Date | null, compareTo: Date) {
  if (!date) return false;
  const tomorrow = startOfLocalDay(compareTo);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return startOfLocalDay(date).getTime() === tomorrow.getTime();
}

function isWithinCalendarWeek(date: Date | null, compareTo: Date) {
  if (!date) return false;
  const start = startOfLocalDay(compareTo).getTime();
  const end = start + 7 * 86400000;
  const value = date.getTime();
  return value >= start && value <= end;
}

function formatEconomicCalendarDate(date: Date | null, locale: string, unavailable: string) {
  if (!date) return unavailable;
  return new Intl.DateTimeFormat(marketIntlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatEconomicCalendarTime(date: Date | null, locale: string, unavailable: string) {
  if (!date) return unavailable;
  return new Intl.DateTimeFormat(marketIntlLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatEconomicCalendarCountdown(date: Date | null, locale: string, fallback: string) {
  if (!date) return fallback;
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return fallback;
  const relative = new Intl.RelativeTimeFormat(marketIntlLocale(locale), { numeric: 'auto' });
  const minutes = Math.ceil(diffMs / 60000);
  if (minutes < 60) return relative.format(minutes, 'minute');
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return relative.format(hours, 'hour');
  return relative.format(Math.ceil(hours / 24), 'day');
}

function displayEconomicValue(value: unknown, unavailable: string) {
  if (value === null || value === undefined || value === '') return unavailable;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : unavailable;
  if (typeof value === 'string') return value.trim() || unavailable;
  return unavailable;
}

function economicImpactLabel(impact: EconomicImpact, t: (key: string) => string) {
  if (impact === 'high') return t('market_calendar_impact_high');
  if (impact === 'medium') return t('market_calendar_impact_medium');
  if (impact === 'low') return t('market_calendar_impact_low');
  return t('market_unavailable');
}

function economicStatusLabel(status: NormalizedEconomicEvent['status'], t: (key: string) => string) {
  if (status === 'upcoming') return t('market_calendar_status_upcoming');
  if (status === 'released') return t('market_calendar_status_released');
  return t('market_unavailable');
}

function isCalendarProviderNotConfigured(code?: string, message?: string) {
  const normalizedCode = String(code ?? '').trim().toUpperCase();
  const normalizedMessage = String(message ?? '').trim().toLowerCase();
  return [
    'PROVIDER_NOT_CONFIGURED',
    'NOT_CONFIGURED',
    'ECONOMIC_CALENDAR_SOURCE_NOT_CONFIGURED',
    'ECONOMIC_CALENDAR_PROVIDER_NOT_CONFIGURED',
    'ECONOMIC_CALENDAR_NOT_CONFIGURED',
  ].includes(normalizedCode) || normalizedMessage.includes('not configured') || normalizedMessage.includes('provider_not_configured');
}

function isCalendarProviderAccessDenied(code?: string, providerStatus?: string | null) {
  const normalizedCode = String(code ?? '').trim().toUpperCase();
  const normalizedStatus = String(providerStatus ?? '').trim().toUpperCase();
  return ['PROVIDER_ACCESS_DENIED', 'UNAUTHORIZED', 'FORBIDDEN'].includes(normalizedCode)
    || ['UNAUTHORIZED', 'FORBIDDEN'].includes(normalizedStatus);
}

function isCalendarProviderRateLimited(code?: string, providerStatus?: string | null) {
  const normalizedCode = String(code ?? '').trim().toUpperCase();
  const normalizedStatus = String(providerStatus ?? '').trim().toUpperCase();
  return ['PROVIDER_RATE_LIMITED', 'RATE_LIMITED', 'RATE_LIMIT'].includes(normalizedCode)
    || ['RATE_LIMITED', 'RATE_LIMIT'].includes(normalizedStatus);
}

function resolveCalendarAvailability(state: ApiListState<Record<string, any>>, eventCount: number): CalendarAvailability {
  if (state.loading && eventCount === 0) return 'loading';
  if (isCalendarProviderNotConfigured(state.code, state.message)) return 'not_configured';
  if (state.code && eventCount === 0) return 'error';
  if (eventCount === 0) return 'empty';
  return 'ready';
}

type EconomicExplanationEvent = {
  eventName: string;
  currency: string | null;
  previous: string | number | null;
  forecast: string | number | null;
  actual: string | number | null;
  status?: NormalizedEconomicEvent['status'];
};

function interpolateTranslation(template: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value),
    template,
  );
}

function economicExplanationTypeKey(eventName: string) {
  const name = eventName.toLowerCase();
  if (/\bgdp\b|gross domestic|الناتج|نمو الاقتصاد|croissance|pib/.test(name)) return 'market_calendar_explanation_type_gdp';
  if (/\bcpi\b|inflation|consumer price|أسعار المستهلك|التضخم|inflation|prix/.test(name)) return 'market_calendar_explanation_type_cpi';
  if (/interest rate|rate decision|fomc|fed|ecb|boe|boj|سعر الفائدة|قرار الفائدة|البنك المركزي|taux|banque centrale/.test(name)) return 'market_calendar_explanation_type_rate';
  if (/\bnfp\b|payroll|employment|jobs|وظائف|التوظيف|سوق العمل|emploi/.test(name)) return 'market_calendar_explanation_type_employment';
  if (/\bpmi\b|purchasing managers|مديري المشتريات|activité/.test(name)) return 'market_calendar_explanation_type_pmi';
  if (/retail sales|مبيعات التجزئة|ventes au détail/.test(name)) return 'market_calendar_explanation_type_retail';
  if (/unemployment|jobless|البطالة|chômage/.test(name)) return 'market_calendar_explanation_type_unemployment';
  if (/speech|speaks|testimony|تصريح|خطاب|شهادة|discours/.test(name)) return 'market_calendar_explanation_type_speech';
  return 'market_calendar_explanation_type_generic';
}

function economicExplanationValue(value: unknown, unavailable: string) {
  return displayEconomicValue(value, unavailable);
}

function buildEconomicExplanationRows(event: EconomicExplanationEvent, unavailable: string, t: (key: string) => string) {
  const previous = economicExplanationValue(event.previous, unavailable);
  const forecast = economicExplanationValue(event.forecast, unavailable);
  const actual = economicExplanationValue(event.actual, unavailable);
  const hasActual = actual !== unavailable;
  const currency = displayEconomicValue(event.currency, unavailable);
  const currencyNote = currency !== unavailable
    ? ` ${interpolateTranslation(t('market_calendar_explanation_currency_note'), { currency })}`
    : '';

  return {
    overview: t(economicExplanationTypeKey(event.eventName)),
    rows: [
      {
        label: t('market_calendar_previous'),
        value: previous,
        body: interpolateTranslation(t('market_calendar_explanation_previous_body'), { value: previous }),
      },
      {
        label: t('market_calendar_forecast'),
        value: forecast,
        body: interpolateTranslation(t('market_calendar_explanation_forecast_body'), { value: forecast }),
      },
      {
        label: t('market_calendar_actual'),
        value: actual,
        body: hasActual
          ? interpolateTranslation(t('market_calendar_explanation_actual_body'), { value: actual })
          : t('market_calendar_explanation_actual_unavailable'),
      },
      {
        label: t('market_calendar_potential_impact'),
        value: currency,
        body: `${hasActual ? t('market_calendar_explanation_impact_body') : t('market_calendar_explanation_impact_pending')}${currencyNote}`,
      },
    ],
  };
}

export function EconomicCalendarPanel({
  t,
  locale,
  state,
  onRefresh,
}: {
  t: (key: string) => string;
  locale: string;
  state: ApiListState<Record<string, any>>;
  onRefresh: () => void;
}) {
  const [timeFilter, setTimeFilter] = useState<CalendarTimeFilter>('week');
  const [impactFilter, setImpactFilter] = useState<CalendarImpactFilter>('all');
  const [currencyFilter, setCurrencyFilter] = useState<CalendarCurrencyFilter>('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(CALENDAR_PAGE_SIZE);
  const unavailable = t('market_unavailable');

  const events = useMemo(() => normalizeEconomicEvents(state.items), [state.items]);
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => {
      const aTime = getEconomicEventDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = getEconomicEventDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    }),
    [events],
  );
  const availability = resolveCalendarAvailability(state, sortedEvents.length);
  const providerNotConfigured = availability === 'not_configured';
  const providerFailed = availability === 'error';
  const providerAccessDenied = providerFailed && isCalendarProviderAccessDenied(state.code, state.providerStatus);
  const providerRateLimited = providerFailed && isCalendarProviderRateLimited(state.code, state.providerStatus);
  const now = new Date();
  const query = searchTerm.trim().toLowerCase();
  const todayCount = sortedEvents.filter(event => isSameLocalDay(getEconomicEventDate(event), now)).length;
  const highImpactCount = sortedEvents.filter(event => event.impact === 'high').length;
  const countryOptions = useMemo(
    () => ['all', ...[...new Set(sortedEvents.map(event => displayEconomicValue(event.country, '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))],
    [sortedEvents],
  );
  const nextEvent = sortedEvents.find(event => event.impact === 'high' && (getEconomicEventDate(event)?.getTime() ?? 0) >= now.getTime())
    ?? sortedEvents.find(event => (getEconomicEventDate(event)?.getTime() ?? 0) >= now.getTime())
    ?? sortedEvents[0];
  const filteredEvents = sortedEvents.filter(event => {
    const date = getEconomicEventDate(event);
    if (timeFilter === 'today' && !isSameLocalDay(date, now)) return false;
    if (timeFilter === 'tomorrow' && !isTomorrowLocalDay(date, now)) return false;
    if (timeFilter === 'week' && !isWithinCalendarWeek(date, now)) return false;
    if (impactFilter !== 'all' && event.impact !== impactFilter) return false;
    if (currencyFilter !== 'all' && event.currency !== currencyFilter) return false;
    if (countryFilter !== 'all' && displayEconomicValue(event.country, '') !== countryFilter) return false;
    if (!query) return true;
    return [event.eventName, event.country, event.currency, event.source]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  useEffect(() => {
    setVisibleCount(CALENDAR_PAGE_SIZE);
  }, [countryFilter, currencyFilter, impactFilter, searchTerm, timeFilter]);

  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const lastUpdatedLabel = state.updatedAt && !providerNotConfigured ? formatEconomicCalendarDate(new Date(state.updatedAt), locale, unavailable) : unavailable;
  const isTimedOut = state.code === 'MARKET_DATA_TIMEOUT';
  const stateTitle = isTimedOut
    ? t('market_section_timeout_title')
    : providerNotConfigured
      ? t('market_calendar_not_configured_title')
      : providerAccessDenied
        ? t('market_calendar_access_denied_title')
      : providerRateLimited
        ? t('market_calendar_rate_limited_title')
      : providerFailed
        ? t('market_calendar_error_title')
        : t('market_calendar_no_events_title');
  const stateBody = isTimedOut
    ? t('market_section_timeout_body')
    : providerNotConfigured
      ? t('market_calendar_not_configured_body')
      : providerAccessDenied
        ? t('market_calendar_access_denied_body')
      : providerRateLimited
        ? t('market_calendar_rate_limited_body')
      : providerFailed
        ? t('market_calendar_error_body')
        : t('market_calendar_no_events_body');
  const providerLabel = state.provider || state.source || unavailable;
  const providerStatusLabel = providerNotConfigured
    ? t('market_calendar_provider_not_configured_badge')
    : providerAccessDenied
      ? t('market_calendar_provider_access_denied_badge')
    : providerRateLimited
      ? t('market_calendar_provider_rate_limited_badge')
    : providerFailed
      ? t('market_calendar_provider_error_badge')
      : state.loading
        ? t('market_loading_short')
        : t('market_calendar_provider_connected_badge');
  const hasActiveFilters = Boolean(searchTerm.trim()) || timeFilter !== 'week' || impactFilter !== 'all' || currencyFilter !== 'all' || countryFilter !== 'all';
  const clearCalendarFilters = () => {
    setSearchTerm('');
    setTimeFilter('week');
    setImpactFilter('all');
    setCurrencyFilter('all');
    setCountryFilter('all');
  };

  return (
    <section className="economic-calendar-dashboard market-panel">
      <div className="economic-calendar-dashboard-head">
        <span className="economic-calendar-head-icon"><CalendarDays size={24} /></span>
        <div>
          <small>{t('market_high_impact_events')}</small>
          <h2>{t('market_economic_calendar')}</h2>
          <p>{t('market_calendar_dashboard_subtitle')}</p>
          <div className="economic-calendar-status-row" aria-label={t('market_calendar_status_summary')}>
            <span className={`calendar-provider-pill ${providerNotConfigured ? 'warning' : providerFailed ? 'error' : 'connected'}`}>{providerStatusLabel}</span>
            <span>{t('market_calendar_source')}: <b dir="auto">{providerLabel}</b></span>
            <span>{t('market_calendar_timezone')}: <b dir="ltr">{Intl.DateTimeFormat().resolvedOptions().timeZone}</b></span>
            <span>{t('market_last_updated')}: <b dir="auto">{lastUpdatedLabel}</b></span>
          </div>
        </div>
        <MarketSectionRefreshButton
          t={t}
          loading={state.loading}
          onRefresh={onRefresh}
          disabled={providerNotConfigured}
          title={providerNotConfigured ? t('market_calendar_refresh_disabled_tooltip') : undefined}
        />
      </div>

      <div className="economic-calendar-summary-grid">
        <CalendarStatCard icon={<Clock3 size={18} />} label={t('market_calendar_next_event')} value={providerNotConfigured || providerFailed ? unavailable : nextEvent?.eventName ?? unavailable} valueDir="auto" tone="cyan" />
        <CalendarStatCard icon={<CalendarDays size={18} />} label={t('market_calendar_today_events')} value={providerNotConfigured || providerFailed ? unavailable : String(todayCount)} valueDir="auto" tone="blue" />
        <CalendarStatCard icon={<AlertTriangle size={18} />} label={t('market_calendar_high_impact_count')} value={providerNotConfigured || providerFailed ? unavailable : String(highImpactCount)} valueDir="auto" tone="amber" />
        <CalendarStatCard icon={<CheckCircle2 size={18} />} label={t('market_last_updated')} value={lastUpdatedLabel} valueDir="auto" tone="green" />
      </div>

      {state.loading && sortedEvents.length > 0 ? (
        <div className="economic-calendar-refreshing" role="status">{t('market_calendar_refreshing_existing')}</div>
      ) : null}

      {availability === 'loading' ? (
        <MarketSectionLoading label={t('market_loading_economic_calendar')} />
      ) : availability !== 'ready' ? (
        <div className={`economic-calendar-empty-state ${providerNotConfigured ? 'not-configured' : providerFailed ? 'error' : 'empty'}`}>
          <span><CalendarDays size={24} /></span>
          <div>
            <small>{providerNotConfigured ? t('market_calendar_provider_not_configured_badge') : providerFailed ? t('market_calendar_provider_error_badge') : t('market_high_impact_events')}</small>
            <strong>{stateTitle}</strong>
            <p>{stateBody}</p>
            {availability === 'empty' ? (
              <button type="button" onClick={clearCalendarFilters}>{t('market_news_clear_filters')}</button>
            ) : providerFailed ? (
              <button type="button" onClick={onRefresh}>{t('market_retry')}</button>
            ) : (
              <em>{t('market_calendar_public_note')}</em>
            )}
          </div>
        </div>
      ) : (
        <>
          {nextEvent && <CalendarFeaturedEvent event={nextEvent} locale={locale} t={t} unavailable={unavailable} />}

          <div className="economic-calendar-filter-card">
            <label className="economic-calendar-search">
              <Search size={18} />
              <input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder={t('market_calendar_search_placeholder')}
                type="search"
              />
            </label>
            <CalendarFilterGroup
              label={t('market_calendar_time_filter')}
              options={CALENDAR_TIME_FILTERS}
              active={timeFilter}
              onSelect={setTimeFilter}
              getLabel={item => t(item === 'today' ? 'market_calendar_filter_today' : item === 'tomorrow' ? 'market_calendar_filter_tomorrow' : 'market_calendar_filter_week')}
            />
            <CalendarFilterGroup
              label={t('market_calendar_impact_filter')}
              options={CALENDAR_IMPACT_FILTERS}
              active={impactFilter}
              onSelect={setImpactFilter}
              getLabel={item => t(item === 'all' ? 'market_calendar_filter_all' : `market_calendar_filter_${item}`)}
            />
            <CalendarFilterGroup
              label={t('market_calendar_currency_filter')}
              options={CALENDAR_CURRENCY_FILTERS}
              active={currencyFilter}
              onSelect={setCurrencyFilter}
              getLabel={item => item === 'all' ? t('market_calendar_filter_all_currencies') : item}
              valueDir="ltr"
            />
            <CalendarFilterGroup
              label={t('market_calendar_country')}
              options={countryOptions}
              active={countryFilter}
              onSelect={setCountryFilter}
              getLabel={item => item === 'all' ? t('market_calendar_filter_all') : item}
              valueDir="auto"
            />
            {hasActiveFilters ? (
              <button className="economic-calendar-clear-filters" type="button" onClick={clearCalendarFilters}>{t('market_news_clear_filters')}</button>
            ) : null}
          </div>

          {filteredEvents.length === 0 ? (
            <MarketToolEmptyState
              icon={<Search size={18} />}
              title={t('market_calendar_filter_empty_title')}
              description={t('market_calendar_filter_empty_body')}
              actionLabel={t('market_news_clear_filters')}
              onAction={clearCalendarFilters}
              variant="info"
            />
          ) : (
            <>
              <div className="economic-calendar-mobile-list">
                {visibleEvents.map(event => (
                  <CalendarEventCard key={event.id} event={event} locale={locale} t={t} unavailable={unavailable} />
                ))}
              </div>
              <div className="economic-calendar-table-card">
                <table>
                  <thead>
                    <tr>
                      <th>{t('market_calendar_event')}</th>
                      <th>{t('market_calendar_country')}</th>
                      <th>{t('market_calendar_currency')}</th>
                      <th>{t('market_calendar_impact')}</th>
                      <th>{t('market_calendar_event_time')}</th>
                      <th>{t('market_calendar_previous')}</th>
                      <th>{t('market_calendar_forecast')}</th>
                      <th>{t('market_calendar_actual')}</th>
                      <th>{t('market_calendar_status')}</th>
                      <th>{t('market_calendar_source')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEvents.map(event => (
                      <tr key={event.id}>
                        <td>
                          <strong dir="auto">{event.eventName}</strong>
                          <small>{economicStatusLabel(event.status, t)}</small>
                          <EconomicEventExplanationAccordion event={event} t={t} unavailable={unavailable} compact />
                        </td>
                        <td dir="auto">{displayEconomicValue(event.country, unavailable)}</td>
                        <td><span className="calendar-currency-badge" dir="ltr">{displayEconomicValue(event.currency, unavailable)}</span></td>
                        <td><CalendarImpactBadge impact={event.impact} t={t} /></td>
                        <td dir="ltr">{formatEconomicCalendarDate(getEconomicEventDate(event), locale, unavailable)}</td>
                        <td dir="ltr">{displayEconomicValue(event.previous, unavailable)}</td>
                        <td dir="ltr">{displayEconomicValue(event.forecast, unavailable)}</td>
                        <td dir="ltr">{displayEconomicValue(event.actual, unavailable)}</td>
                        <td><span className="calendar-status-badge">{economicStatusLabel(event.status, t)}</span></td>
                        <td><span className="calendar-source-badge" dir="auto">{displayEconomicValue(event.source, unavailable)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="economic-calendar-list-footer">
                {visibleCount < filteredEvents.length ? (
                  <button type="button" onClick={() => setVisibleCount(count => count + CALENDAR_PAGE_SIZE)}>
                    {t('market_calendar_show_more')}
                  </button>
                ) : (
                  <span>{t('market_calendar_all_displayed')}</span>
                )}
              </div>
            </>
          )}
        </>
      )}
      <style jsx global>{`
        .economic-calendar-dashboard{width:100%;max-width:1400px;margin-inline:auto;display:grid;gap:18px;overflow:hidden;border-radius:32px}
        .economic-calendar-dashboard-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:start}
        .economic-calendar-head-icon{width:54px;height:54px;border-radius:22px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(29,140,255,.12),rgba(47,214,192,.16));border:1px solid rgba(47,214,192,.22);color:var(--sfm-primary-hover)}
        .economic-calendar-dashboard-head small{display:block;color:var(--sfm-primary-hover);font-size:12px;font-weight:950;line-height:1.4}
        .economic-calendar-dashboard-head h2{margin:3px 0 0;color:var(--sfm-foreground);font-size:clamp(24px,3vw,34px);font-weight:950;line-height:1.2}
        .economic-calendar-dashboard-head p{margin:8px 0 0;max-width:760px;color:var(--sfm-muted);font-size:14px;font-weight:850;line-height:1.85}
        .economic-calendar-status-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}
        .economic-calendar-status-row>span,.calendar-provider-pill{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(100,116,139,.16);background:rgba(100,116,139,.07);color:var(--sfm-muted);border-radius:999px;padding:7px 10px;font-size:12px;font-weight:950;line-height:1.2}
        .calendar-provider-pill.connected{border-color:rgba(47,214,192,.24);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover)}
        .calendar-provider-pill.warning{border-color:rgba(245,158,11,.25);background:rgba(245,158,11,.12);color:#B45309}
        .calendar-provider-pill.error{border-color:rgba(239,68,68,.22);background:rgba(239,68,68,.10);color:#B91C1C}
        .economic-calendar-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .calendar-stat-card{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:center;min-width:0;border:1px solid rgba(167,243,240,.16);background:var(--sfm-card);border-radius:24px;padding:14px;box-shadow:0 14px 34px rgba(3,18,37,.06)}
        .calendar-stat-card i{width:42px;height:42px;border-radius:18px;display:grid;place-items:center;font-style:normal;border:1px solid rgba(167,243,240,.18);background:var(--sfm-light-card)}
        .calendar-stat-card small{display:block;color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.45}
        .calendar-stat-card strong{display:block;margin-top:3px;color:var(--sfm-foreground);font-size:15px;font-weight:950;line-height:1.45;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .calendar-stat-card.cyan i{color:var(--sfm-primary-hover);background:rgba(47,214,192,.11)}
        .calendar-stat-card.blue i{color:#2563EB;background:rgba(37,99,235,.09)}
        .calendar-stat-card.amber i{color:#B45309;background:rgba(245,158,11,.11)}
        .calendar-stat-card.green i{color:#059669;background:rgba(16,185,129,.11)}
        .economic-calendar-featured{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:14px;border:1px solid rgba(47,214,192,.22);background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.11)),var(--sfm-card);border-radius:30px;padding:18px;box-shadow:0 18px 46px rgba(3,18,37,.08)}
        .economic-calendar-featured-main{display:grid;gap:12px;min-width:0}
        .economic-calendar-featured-main small,.economic-calendar-featured-metrics small{color:var(--sfm-muted);font-size:12px;font-weight:900;line-height:1.4}
        .economic-calendar-featured-main h3{margin:0;color:var(--sfm-foreground);font-size:clamp(19px,2.2vw,26px);font-weight:950;line-height:1.35;overflow-wrap:anywhere}
        .economic-calendar-featured-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
        .calendar-currency-badge,.calendar-status-badge,.calendar-source-badge,.calendar-countdown-badge{display:inline-flex;align-items:center;width:max-content;max-width:100%;border-radius:999px;border:1px solid rgba(47,214,192,.22);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);padding:7px 10px;font-size:12px;font-weight:950;line-height:1.2}
        .calendar-status-badge{border-color:rgba(29,140,255,.20);background:rgba(29,140,255,.09);color:#2563EB}
        .calendar-source-badge{border-color:rgba(100,116,139,.18);background:rgba(100,116,139,.08);color:var(--sfm-muted)}
        .calendar-countdown-badge{border-color:rgba(245,158,11,.24);background:rgba(245,158,11,.11);color:#B45309}
        .economic-calendar-featured-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        .economic-calendar-filter-card{display:grid;gap:12px;border:1px solid rgba(167,243,240,.14);background:var(--sfm-card);border-radius:26px;padding:14px;box-shadow:0 14px 34px rgba(3,18,37,.05)}
        .economic-calendar-refreshing{display:inline-flex;width:max-content;max-width:100%;border:1px solid rgba(29,140,255,.20);background:rgba(29,140,255,.08);color:var(--sfm-primary-hover);border-radius:999px;padding:8px 12px;font-size:12px;font-weight:950;line-height:1.35}
        .economic-calendar-search{display:flex;align-items:center;gap:10px;border:1px solid rgba(167,243,240,.16);background:var(--sfm-light-card);border-radius:20px;padding:0 13px;min-height:48px;color:var(--sfm-muted)}
        .economic-calendar-search input{width:100%;min-width:0;border:0;background:transparent;outline:none;color:var(--sfm-foreground);font:850 14px Tajawal,Arial,sans-serif}
        .economic-calendar-search input::placeholder{color:var(--sfm-muted)}
        .calendar-filter-group{display:grid;gap:8px;min-width:0}
        .calendar-filter-group>span{color:var(--sfm-muted);font-size:12px;font-weight:950}
        .calendar-filter-row{display:flex;gap:8px;overflow-x:auto;padding:1px 1px 7px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
        .calendar-filter-row::-webkit-scrollbar{display:none}
        .calendar-filter-row button{flex:0 0 auto;min-height:39px;border:1px solid rgba(167,243,240,.18);border-radius:999px;background:var(--sfm-light-card);color:var(--sfm-muted);padding:0 13px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;white-space:nowrap;transition:transform .18s ease,box-shadow .18s ease,background .18s ease,color .18s ease}
        .calendar-filter-row button:hover,.calendar-filter-row button:focus-visible,.calendar-filter-row button[aria-pressed="true"]{outline:none;background:linear-gradient(135deg,var(--sfm-primary),var(--sfm-accent));border-color:transparent;color:#fff;box-shadow:0 12px 24px rgba(29,140,255,.18);transform:translateY(-1px)}
        .economic-calendar-clear-filters{width:max-content;min-height:42px;border:1px solid rgba(47,214,192,.25);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:999px;padding:0 14px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}
        .economic-calendar-clear-filters:hover,.economic-calendar-clear-filters:focus-visible{outline:none;border-color:var(--sfm-accent);box-shadow:0 0 0 3px rgba(24,212,212,.18)}
        .economic-calendar-table-card{overflow-x:auto;border:1px solid rgba(167,243,240,.14);background:var(--sfm-card);border-radius:28px;box-shadow:0 16px 40px rgba(3,18,37,.06)}
        .economic-calendar-table-card table{width:100%;min-width:1080px;border-collapse:separate;border-spacing:0}
        .economic-calendar-table-card th{padding:14px 16px;text-align:inherit;color:var(--sfm-muted);font-size:12px;font-weight:950;background:var(--sfm-light-card);white-space:nowrap}
        .economic-calendar-table-card th:first-child{border-start-start-radius:24px}
        .economic-calendar-table-card th:last-child{border-start-end-radius:24px}
        .economic-calendar-table-card td{padding:15px 16px;border-top:1px solid rgba(167,243,240,.12);color:var(--sfm-foreground);font-size:13px;font-weight:850;white-space:nowrap;vertical-align:middle}
        .economic-calendar-table-card td:first-child{white-space:normal;min-width:270px}
        .economic-calendar-table-card td strong{display:block;color:var(--sfm-foreground);font-size:14px;font-weight:950;line-height:1.5}
        .economic-calendar-table-card td small{display:block;margin-top:4px;color:var(--sfm-muted);font-size:11px;font-weight:900}
        .economic-calendar-mobile-list{display:none;gap:12px}
        .economic-calendar-event-card{display:grid;gap:13px;border:1px solid rgba(167,243,240,.14);background:var(--sfm-card);border-radius:24px;padding:15px;box-shadow:0 12px 30px rgba(3,18,37,.05)}
        .economic-calendar-event-head{display:grid;gap:10px}
        .economic-calendar-event-head h3{margin:0;color:var(--sfm-foreground);font-size:16px;font-weight:950;line-height:1.45;overflow-wrap:anywhere}
        .economic-calendar-event-badges{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
        .economic-calendar-event-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
        .economic-calendar-metric{display:grid;gap:5px;min-width:0;border:1px solid rgba(167,243,240,.12);background:var(--sfm-light-card);border-radius:16px;padding:10px}
        .economic-calendar-metric small{color:var(--sfm-muted);font-size:11px;font-weight:900;line-height:1.35}
        .economic-calendar-metric b{color:var(--sfm-foreground);font-size:12px;font-weight:950;line-height:1.45;overflow-wrap:anywhere}
        .economic-calendar-featured>.economic-event-explanation{grid-column:1/-1}
        .economic-calendar-table-card .economic-event-explanation{margin-top:10px;max-width:520px;white-space:normal}
        .economic-event-explanation{display:grid;gap:10px;min-width:0}
        .economic-event-explanation-toggle{width:max-content;max-width:100%;min-height:39px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid rgba(47,214,192,.34);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:14px;padding:8px 12px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer;transition:background .18s ease,border-color .18s ease,box-shadow .18s ease,transform .18s ease}
        .economic-event-explanation-toggle:hover,.economic-event-explanation-toggle:focus-visible{outline:none;background:rgba(47,214,192,.16);border-color:var(--sfm-accent);box-shadow:0 10px 22px rgba(29,140,255,.12);transform:translateY(-1px)}
        .economic-event-explanation-toggle svg:last-child{transition:transform .18s ease}
        .economic-event-explanation-toggle[aria-expanded="true"] svg:last-child{transform:rotate(180deg)}
        .economic-event-explanation-panel{display:grid;gap:11px;border:1px solid rgba(47,214,192,.20);background:linear-gradient(135deg,rgba(29,140,255,.06),rgba(47,214,192,.09)),var(--sfm-light-card);border-radius:20px;padding:14px;color:var(--sfm-foreground);animation:economicExplanationIn .18s ease-out}
        .economic-event-explanation-title{display:flex;align-items:center;gap:8px;color:var(--sfm-primary-hover)}
        .economic-event-explanation-title strong{font-size:14px;font-weight:950;line-height:1.4}
        .economic-event-explanation-panel>p{margin:0;color:var(--sfm-muted);font-size:13px;font-weight:850;line-height:1.8}
        .economic-event-explanation-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
        .economic-event-explanation-item{display:grid;gap:5px;min-width:0;border:1px solid rgba(167,243,240,.14);background:var(--sfm-card);border-radius:16px;padding:11px}
        .economic-event-explanation-item span{color:var(--sfm-muted);font-size:11px;font-weight:950;line-height:1.35}
        .economic-event-explanation-item b{color:var(--sfm-foreground);font-size:13px;font-weight:950;line-height:1.45;overflow-wrap:anywhere}
        .economic-event-explanation-item p{margin:0;color:var(--sfm-muted);font-size:12px;font-weight:800;line-height:1.7}
        .economic-event-explanation-panel>small{display:block;color:var(--sfm-muted);font-size:11px;font-weight:900;line-height:1.7;border-top:1px solid rgba(167,243,240,.14);padding-top:9px}
        @keyframes economicExplanationIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        .calendar-impact-badge{display:inline-flex;align-items:center;width:max-content;border-radius:999px;border:1px solid rgba(100,116,139,.18);background:rgba(100,116,139,.08);color:var(--sfm-muted);padding:7px 10px;font-size:12px;font-weight:950;line-height:1.2}
        .calendar-impact-badge.high{border-color:rgba(239,68,68,.22);background:rgba(239,68,68,.10);color:#DC2626}
        .calendar-impact-badge.medium{border-color:rgba(245,158,11,.24);background:rgba(245,158,11,.12);color:#B45309}
        .calendar-impact-badge.low{border-color:rgba(16,185,129,.22);background:rgba(16,185,129,.10);color:#059669}
        .economic-calendar-list-footer{display:flex;justify-content:center}
        .economic-calendar-list-footer button,.economic-calendar-list-footer span{border:1px solid rgba(47,214,192,.24);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:999px;padding:10px 16px;font:950 13px Tajawal,Arial,sans-serif}
        .economic-calendar-list-footer button{cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}
        .economic-calendar-list-footer button:hover,.economic-calendar-list-footer button:focus-visible{outline:none;transform:translateY(-1px);box-shadow:0 12px 24px rgba(29,140,255,.16)}
        .economic-calendar-empty-state{display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;border:1px solid rgba(245,158,11,.24);background:linear-gradient(135deg,rgba(245,158,11,.10),rgba(29,140,255,.06)),var(--sfm-card);border-radius:28px;padding:20px;box-shadow:0 16px 40px rgba(3,18,37,.07)}
        .economic-calendar-empty-state>span{width:54px;height:54px;border-radius:20px;display:grid;place-items:center;background:rgba(245,158,11,.13);border:1px solid rgba(245,158,11,.24);color:#B45309}
        .economic-calendar-empty-state small{display:block;color:#B45309;font-size:12px;font-weight:950;line-height:1.4;margin-bottom:5px}
        .economic-calendar-empty-state strong{display:block;color:var(--sfm-foreground);font-size:clamp(18px,2vw,24px);font-weight:950;line-height:1.35}
        .economic-calendar-empty-state p{margin:8px 0 0;max-width:760px;color:var(--sfm-muted);font-size:14px;font-weight:850;line-height:1.9}
        .economic-calendar-empty-state em{display:inline-flex;width:max-content;max-width:100%;margin-top:12px;border:1px solid rgba(47,214,192,.24);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:999px;padding:7px 11px;font-style:normal;font-size:12px;font-weight:950;line-height:1.4}
        .economic-calendar-empty-state button{width:max-content;max-width:100%;min-height:42px;border:1px solid rgba(47,214,192,.26);background:rgba(47,214,192,.10);color:var(--sfm-primary-hover);border-radius:999px;padding:0 14px;font:950 12px Tajawal,Arial,sans-serif;cursor:pointer}
        .economic-calendar-empty-state.error{border-color:rgba(239,68,68,.22);background:linear-gradient(135deg,rgba(239,68,68,.08),rgba(29,140,255,.05)),var(--sfm-card)}
        .economic-calendar-empty-state.error>span{background:rgba(239,68,68,.10);border-color:rgba(239,68,68,.22);color:#B91C1C}
        .dark .calendar-stat-card,.dark .economic-calendar-filter-card,.dark .economic-calendar-table-card,.dark .economic-calendar-event-card{background:#0f1d31;border-color:#1d3050}
        .dark .economic-calendar-status-row>span{background:rgba(148,163,184,.10);border-color:#1d3050}
        .dark .calendar-stat-card i,.dark .economic-calendar-search,.dark .calendar-filter-row button,.dark .economic-calendar-table-card th,.dark .economic-calendar-metric{background:#0a1422;border-color:#1d3050}
        .dark .economic-event-explanation-toggle{border-color:rgba(47,214,192,.30);background:rgba(47,214,192,.11);color:#A7F3F0}
        .dark .economic-event-explanation-toggle:hover,.dark .economic-event-explanation-toggle:focus-visible{background:rgba(47,214,192,.16);border-color:#2FD6C0;box-shadow:0 10px 24px rgba(47,214,192,.10)}
        .dark .economic-event-explanation-panel{background:linear-gradient(135deg,rgba(29,140,255,.08),rgba(47,214,192,.08)),#0a1422;border-color:#1d3050}
        .dark .economic-event-explanation-item{background:#0f1d31;border-color:#1d3050}
        .dark .economic-calendar-featured{background:linear-gradient(135deg,rgba(29,140,255,.09),rgba(47,214,192,.10)),#0f1d31;border-color:rgba(47,214,192,.24)}
        .dark .calendar-status-badge{color:#93C5FD;border-color:rgba(147,197,253,.24);background:rgba(147,197,253,.10)}
        .dark .calendar-countdown-badge{color:#FDE68A;border-color:rgba(245,185,66,.25);background:rgba(245,185,66,.12)}
        .dark .calendar-impact-badge.high{color:#FCA5A5}.dark .calendar-impact-badge.medium{color:#FDE68A}.dark .calendar-impact-badge.low{color:#86EFAC}
        .dark .economic-calendar-empty-state{background:linear-gradient(135deg,rgba(245,185,66,.12),rgba(29,140,255,.07)),#0f1d31;border-color:rgba(245,185,66,.26)}
        .dark .economic-calendar-empty-state>span{background:rgba(245,185,66,.12);border-color:rgba(245,185,66,.24);color:#F5B942}
        .dark .economic-calendar-empty-state small{color:#F5B942}
        .dark .economic-calendar-empty-state em{color:#2FD6C0;background:rgba(47,214,192,.12);border-color:rgba(47,214,192,.25)}
        @media(max-width:980px){.economic-calendar-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.economic-calendar-featured{grid-template-columns:1fr}.economic-calendar-table-card{display:none}.economic-calendar-mobile-list{display:grid}}
        @media(max-width:640px){.economic-calendar-dashboard{border-radius:24px;padding:16px}.economic-calendar-dashboard-head{grid-template-columns:1fr}.economic-calendar-summary-grid{grid-template-columns:1fr}.calendar-stat-card strong{white-space:normal}.economic-calendar-featured{border-radius:24px;padding:15px}.economic-calendar-featured-metrics,.economic-calendar-event-metrics,.economic-event-explanation-grid{grid-template-columns:1fr}.economic-event-explanation-toggle{width:100%;min-height:44px}.economic-calendar-filter-card{border-radius:22px;padding:12px}.economic-calendar-empty-state{grid-template-columns:1fr;padding:16px;border-radius:22px}.economic-calendar-empty-state>span{width:46px;height:46px;border-radius:17px}}
      `}</style>
    </section>
  );
}

export function CalendarStatCard({ icon, label, value, valueDir, tone }: { icon: ReactNode; label: string; value: string; valueDir?: 'ltr' | 'rtl' | 'auto'; tone: 'cyan' | 'blue' | 'amber' | 'green' }) {
  return (
    <article className={`calendar-stat-card ${tone}`}>
      <i>{icon}</i>
      <div>
        <small>{label}</small>
        <strong dir={valueDir}>{value}</strong>
      </div>
    </article>
  );
}

export function CalendarFeaturedEvent({ event, locale, t, unavailable }: { event: NormalizedEconomicEvent; locale: string; t: (key: string) => string; unavailable: string }) {
  const eventDate = getEconomicEventDate(event);
  return (
    <article className="economic-calendar-featured">
      <div className="economic-calendar-featured-main">
        <small>{t('market_calendar_featured_event')}</small>
        <h3 dir="auto">{event.eventName}</h3>
        <div className="economic-calendar-featured-meta">
          <span className="calendar-currency-badge" dir="ltr">{displayEconomicValue(event.currency, unavailable)}</span>
          <CalendarImpactBadge impact={event.impact} t={t} />
          <span className="calendar-countdown-badge">{formatEconomicCalendarCountdown(eventDate, locale, t('market_calendar_now'))}</span>
          <span className="calendar-source-badge" dir="ltr">{displayEconomicValue(event.source, unavailable)}</span>
        </div>
      </div>
      <div className="economic-calendar-featured-metrics">
        <CalendarMetric label={t('market_calendar_event_time')} value={formatEconomicCalendarTime(eventDate, locale, unavailable)} valueDir="ltr" />
        <CalendarMetric label={t('market_calendar_previous')} value={displayEconomicValue(event.previous, unavailable)} valueDir="ltr" />
        <CalendarMetric label={t('market_calendar_forecast')} value={displayEconomicValue(event.forecast, unavailable)} valueDir="ltr" />
        <CalendarMetric label={t('market_calendar_actual')} value={displayEconomicValue(event.actual, unavailable)} valueDir="ltr" />
      </div>
      <EconomicEventExplanationAccordion event={event} t={t} unavailable={unavailable} compact />
    </article>
  );
}

export function CalendarFilterGroup<T extends string>({
  label,
  options,
  active,
  onSelect,
  getLabel,
  valueDir,
}: {
  label: string;
  options: T[];
  active: T;
  onSelect: (value: T) => void;
  getLabel: (value: T) => string;
  valueDir?: 'ltr' | 'rtl' | 'auto';
}) {
  return (
    <div className="calendar-filter-group">
      <span>{label}</span>
      <div className="calendar-filter-row">
        {options.map(option => (
          <button key={option} type="button" aria-pressed={active === option} onClick={() => onSelect(option)} dir={valueDir}>
            {getLabel(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CalendarImpactBadge({ impact, t }: { impact: EconomicImpact; t: (key: string) => string }) {
  return <span className={`calendar-impact-badge ${impact}`}>{economicImpactLabel(impact, t)}</span>;
}

export function CalendarEventCard({ event, locale, t, unavailable }: { event: NormalizedEconomicEvent; locale: string; t: (key: string) => string; unavailable: string }) {
  const eventDate = getEconomicEventDate(event);
  return (
    <article className="economic-calendar-event-card">
      <div className="economic-calendar-event-head">
        <div className="economic-calendar-event-badges">
          <span className="calendar-currency-badge" dir="ltr">{displayEconomicValue(event.currency, unavailable)}</span>
          <CalendarImpactBadge impact={event.impact} t={t} />
          <span className="calendar-status-badge">{economicStatusLabel(event.status, t)}</span>
        </div>
        <h3 dir="auto">{event.eventName}</h3>
      </div>
      <div className="economic-calendar-event-metrics">
        <CalendarMetric label={t('market_calendar_event_time')} value={formatEconomicCalendarDate(eventDate, locale, unavailable)} valueDir="ltr" />
        <CalendarMetric label={t('market_calendar_country')} value={displayEconomicValue(event.country, unavailable)} valueDir="auto" />
        <CalendarMetric label={t('market_calendar_previous')} value={displayEconomicValue(event.previous, unavailable)} valueDir="ltr" />
        <CalendarMetric label={t('market_calendar_forecast')} value={displayEconomicValue(event.forecast, unavailable)} valueDir="ltr" />
        <CalendarMetric label={t('market_calendar_actual')} value={displayEconomicValue(event.actual, unavailable)} valueDir="ltr" />
        <CalendarMetric label={t('market_calendar_source')} value={displayEconomicValue(event.source, unavailable)} valueDir="ltr" />
      </div>
      <EconomicEventExplanationAccordion event={event} t={t} unavailable={unavailable} />
    </article>
  );
}

export function CalendarMetric({ label, value, valueDir }: { label: string; value: string; valueDir?: 'ltr' | 'rtl' | 'auto' }) {
  return (
    <span className="economic-calendar-metric">
      <small>{label}</small>
      <b dir={valueDir}>{value}</b>
    </span>
  );
}

export function EconomicEventExplanationAccordion({
  event,
  t,
  unavailable,
  compact = false,
}: {
  event: EconomicExplanationEvent;
  t: (key: string) => string;
  unavailable: string;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const panelId = `economic-event-explanation-${reactId}`;
  const explanation = buildEconomicExplanationRows(event, unavailable, t);

  return (
    <div className={`economic-event-explanation ${compact ? 'compact' : ''}`}>
      <button
        type="button"
        className="economic-event-explanation-toggle"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded(value => !value)}
      >
        <Info size={16} aria-hidden="true" />
        <span>{expanded ? t('market_calendar_hide_explanation') : t('market_calendar_show_explanation')}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {expanded ? (
        <div className="economic-event-explanation-panel" id={panelId}>
          <div className="economic-event-explanation-title">
            <Info size={16} aria-hidden="true" />
            <strong>{t('market_calendar_simple_explanation')}</strong>
          </div>
          <p>{explanation.overview}</p>
          <div className="economic-event-explanation-grid">
            {explanation.rows.map(row => (
              <section key={row.label} className="economic-event-explanation-item">
                <span>{row.label}</span>
                <b dir="auto">{row.value}</b>
                <p>{row.body}</p>
              </section>
            ))}
          </div>
          <small>{t('market_calendar_explanation_disclaimer')}</small>
        </div>
      ) : null}
    </div>
  );
}

export function LegacyEconomicCalendarPanel({ t, locale, state }: { t: (key: string) => string; locale: string; state: ApiListState<Record<string, any>> }) {
  const [filter, setFilter] = useState<EconomicCalendarFilter>('week');
  const events = useMemo(
    () => state.items.map((event, index) => normalizeEconomicCalendarEvent(event, index, locale, t('market_unavailable'))),
    [locale, state.items, t],
  );
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => (a.eventTime?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.eventTime?.getTime() ?? Number.MAX_SAFE_INTEGER)),
    [events],
  );
  const filteredEvents = useMemo(() => sortedEvents.filter(event => {
    if (filter === 'today') return isToday(event.eventTime);
    if (filter === 'week') return isWithinWeek(event.eventTime);
    if (filter === 'high') return /high|عالي|fort/i.test(event.impact);
    return event.currency.toUpperCase() === filter;
  }), [filter, sortedEvents]);
  const nextEvent = sortedEvents.find(event => event.eventTime && event.eventTime.getTime() >= Date.now()) ?? sortedEvents[0];
  const isMissingSource = isCalendarProviderNotConfigured(state.code, state.message);
  const isAccessDenied = isCalendarProviderAccessDenied(state.code, state.providerStatus);
  const isRateLimited = isCalendarProviderRateLimited(state.code, state.providerStatus);
  const isTimedOut = state.code === 'MARKET_DATA_TIMEOUT';
  const emptyTitle = isTimedOut
    ? t('market_section_timeout_title')
    : isMissingSource
      ? t('market_calendar_not_configured_title')
      : isAccessDenied
        ? t('market_calendar_access_denied_title')
        : isRateLimited
          ? t('market_calendar_rate_limited_title')
          : t('market_calendar_unavailable_title');
  const emptyBody = isTimedOut
    ? t('market_section_timeout_body')
    : isMissingSource
      ? t('market_calendar_not_configured_body')
      : isAccessDenied
        ? t('market_calendar_access_denied_body')
        : isRateLimited
          ? t('market_calendar_rate_limited_body')
          : (state.message || t('market_calendar_unavailable_body'));

  return (
    <section className="market-panel economic-calendar-panel">
      <div className="market-section-head">
        <CalendarDays size={20} />
        <div>
          <span>{t('market_high_impact_events')}</span>
          <h2>{t('market_economic_calendar')}</h2>
        </div>
      </div>

      {state.loading ? (
        <MarketSectionLoading label={t('market_loading_economic_calendar')} />
      ) : sortedEvents.length === 0 ? (
        <div className="economic-calendar-empty">
          <span className="economic-calendar-empty-icon"><CalendarDays size={24} /></span>
          <div>
            <small>{t('market_high_impact_events')}</small>
            <strong>{emptyTitle}</strong>
            <p>{emptyBody}</p>
            <div className="economic-calendar-chips" aria-label={t('market_calendar_key_events')}>
              {['NFP', 'CPI', 'FOMC', 'ECB', 'BoE'].map(item => <span key={item} dir="ltr">{item}</span>)}
            </div>
            <em>{t('market_calendar_public_note')}</em>
          </div>
        </div>
      ) : (
        <>
          {nextEvent && (
            <article className="economic-calendar-next">
              <div>
                <span>{t('market_calendar_next_event')}</span>
                <strong>{nextEvent.name}</strong>
              </div>
              <div className="economic-calendar-next-meta">
                <b dir="ltr">{nextEvent.currency}</b>
                <small>{formatCalendarCountdown(nextEvent.eventTime, locale, t('market_calendar_now'))}</small>
              </div>
            </article>
          )}

          <div className="economic-calendar-filters" role="tablist" aria-label={t('market_economic_calendar')}>
            {ECONOMIC_CALENDAR_FILTERS.map(item => (
              <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>
                {t(item === 'today' ? 'market_calendar_filter_today' : item === 'week' ? 'market_calendar_filter_week' : item === 'high' ? 'market_calendar_filter_high' : `market_calendar_filter_${item.toLowerCase()}`)}
              </button>
            ))}
          </div>

          {filteredEvents.length === 0 ? (
            <EmptyToolState title={t('market_calendar_filter_empty_title')} body={t('market_calendar_filter_empty_body')} />
          ) : (
            <div className="economic-calendar-list">
              {filteredEvents.slice(0, 12).map(event => (
                <article className="economic-calendar-event" key={event.id}>
                  <div className="economic-calendar-event-main">
                    <b>{event.name}</b>
                    <span>{event.country}</span>
                  </div>
                  <div className="economic-calendar-event-metrics">
                    <CalendarMetric label={t('market_calendar_event_time')} value={event.eventTimeLabel} />
                    <CalendarMetric label={t('market_calendar_currency')} value={event.currency} valueDir="ltr" />
                    <CalendarMetric label={t('market_calendar_impact')} value={event.impact} />
                    <CalendarMetric label={t('market_calendar_previous')} value={event.previous} valueDir="ltr" />
                    <CalendarMetric label={t('market_calendar_forecast')} value={event.forecast} valueDir="ltr" />
                    <CalendarMetric label={t('market_calendar_actual')} value={event.actual} valueDir="ltr" />
                  </div>
                  <EconomicEventExplanationAccordion
                    event={{
                      eventName: event.name,
                      currency: event.currency,
                      previous: event.previous,
                      forecast: event.forecast,
                      actual: event.actual,
                    }}
                    t={t}
                    unavailable={t('market_unavailable')}
                  />
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function LegacyCalendarMetric({ label, value, valueDir }: { label: string; value: string; valueDir?: 'ltr' | 'rtl' }) {
  return (
    <span className="economic-calendar-metric">
      <small>{label}</small>
      <b dir={valueDir}>{value}</b>
    </span>
  );
}

