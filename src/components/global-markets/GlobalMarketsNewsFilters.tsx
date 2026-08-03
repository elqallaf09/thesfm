'use client';

import { memo, useDeferredValue, useId, useMemo, useState } from 'react';
import { Check, RotateCcw, Search, X } from 'lucide-react';
import {
  EMPTY_GLOBAL_NEWS_FILTERS,
  NEWS_REGION_OPTIONS,
  activeFilterCount,
  companyOptions,
  countryOptions,
  exchangeOptions,
  type GlobalNewsFilters,
  type SelectOption,
} from '@/lib/market/globalMarketNewsFilters';
import type { GlobalMarketStripKind } from '@/lib/market/globalMarketStrips';
import type { Lang } from '@/lib/translations';

type Props = {
  lang: Lang;
  filters: GlobalNewsFilters;
  sourceOptions: SelectOption[];
  onApply: (filters: GlobalNewsFilters) => void;
};

const COPY = {
  ar: { country: 'الدول', exchange: 'البورصات', company: 'الشركات والرموز', region: 'منطقة الأخبار', language: 'لغة المصدر', source: 'الناشر', asset: 'نوع الأصل', date: 'الفترة الزمنية', sort: 'الترتيب', latest: 'الأحدث فقط', apply: 'تطبيق المرشحات', reset: 'إعادة الضبط', search: 'ابحث ضمن الخيارات', selected: 'مختار', from: 'من', to: 'إلى', relevance: 'الأكثر صلة', stock: 'أسهم', forex: 'فوركس', commodity: 'سلع', crypto: 'عملات رقمية', index: 'مؤشرات' },
  en: { country: 'Countries', exchange: 'Exchanges', company: 'Companies & symbols', region: 'News region', language: 'Source language', source: 'Publisher', asset: 'Asset type', date: 'Date range', sort: 'Sort', latest: 'Latest only', apply: 'Apply filters', reset: 'Reset', search: 'Search options', selected: 'selected', from: 'From', to: 'To', relevance: 'Most relevant', stock: 'Stocks', forex: 'Forex', commodity: 'Commodities', crypto: 'Crypto', index: 'Indices' },
  fr: { country: 'Pays', exchange: 'Bourses', company: 'Sociétés et symboles', region: 'Région', language: 'Langue source', source: 'Éditeur', asset: 'Type d’actif', date: 'Période', sort: 'Tri', latest: 'Plus récentes', apply: 'Appliquer', reset: 'Réinitialiser', search: 'Rechercher', selected: 'sélectionné(s)', from: 'Du', to: 'Au', relevance: 'Plus pertinentes', stock: 'Actions', forex: 'Forex', commodity: 'Matières premières', crypto: 'Crypto', index: 'Indices' },
} as const;

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter(candidate => candidate !== value) : [...values, value];
}

const MultiSelect = memo(function MultiSelect({ label, values, options, searchable = false, onChange }: {
  label: string;
  values: string[];
  options: SelectOption[];
  searchable?: boolean;
  onChange: (values: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const optionsId = useId();
  const filtered = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    return normalized ? options.filter(option => `${option.label} ${option.searchText ?? ''}`.toLowerCase().includes(normalized)) : options;
  }, [deferredQuery, options]);
  return (
    <details className="gm-news-select">
      <summary><span>{label}</span>{values.length ? <b>{values.length}</b> : null}</summary>
      <div className="gm-news-select-panel">
        {searchable ? <label className="gm-news-option-search"><Search size={14} /><input type="search" role="combobox" aria-controls={optionsId} aria-expanded="true" aria-autocomplete="list" value={query} onChange={event => setQuery(event.target.value)} aria-label={`${label} search`} /></label> : null}
        <div className="gm-news-options" id={optionsId} role="listbox" aria-multiselectable="true">
          {filtered.map(option => {
            const checked = values.includes(option.value);
            return <label key={option.value} className={checked ? 'is-selected' : ''}><input type="checkbox" checked={checked} onChange={() => onChange(toggle(values, option.value))} /><span>{option.label}</span>{checked ? <Check size={14} /> : null}</label>;
          })}
        </div>
      </div>
    </details>
  );
});

export function GlobalMarketsNewsFilters({ lang, filters, sourceOptions, onApply }: Props) {
  const copy = COPY[lang];
  const [draft, setDraft] = useState(filters);
  const countries = useMemo(() => countryOptions(lang), [lang]);
  const exchanges = useMemo(() => exchangeOptions(lang), [lang]);
  const companies = useMemo(() => companyOptions(lang), [lang]);
  const languages = useMemo<SelectOption[]>(() => [
    { value: 'ar', label: 'العربية' }, { value: 'en', label: 'English' }, { value: 'zh', label: '中文' }, { value: 'fr', label: 'Français' },
  ], []);
  const assetTypes = useMemo<SelectOption[]>(() => ([
    ['equity', copy.stock], ['forex', copy.forex], ['commodity', copy.commodity], ['crypto', copy.crypto], ['index', copy.index],
  ].map(([value, label]) => ({ value, label }))), [copy]);
  const optionLabels = useMemo(() => ({
    countries: new Map(countries.map(option => [option.value, option.label])),
    exchanges: new Map(exchanges.map(option => [option.value, option.label])),
    symbols: new Map(companies.map(option => [option.value, option.label])),
    regions: new Map(NEWS_REGION_OPTIONS[lang].map(option => [option.value, option.label])),
    languages: new Map(languages.map(option => [option.value, option.label])),
    sources: new Map(sourceOptions.map(option => [option.value, option.label])),
    assetTypes: new Map(assetTypes.map(option => [option.value, option.label])),
  }), [assetTypes, companies, countries, exchanges, lang, languages, sourceOptions]);
  const tokens = (['countries', 'exchanges', 'symbols', 'regions', 'languages', 'sources', 'assetTypes'] as const)
    .flatMap(group => draft[group].map(value => ({ group, value, label: optionLabels[group].get(value) ?? value })));

  function remove(group: typeof tokens[number]['group'], value: string) {
    setDraft(current => ({
      ...current,
      [group]: current[group].filter(item => item !== value),
    }));
  }

  return (
    <div className="gm-news-filter-panel">
      <div className="gm-news-filter-grid">
        <MultiSelect label={copy.country} values={draft.countries} options={countries} searchable onChange={values => setDraft(current => ({ ...current, countries: values }))} />
        <MultiSelect label={copy.exchange} values={draft.exchanges} options={exchanges} searchable onChange={values => setDraft(current => ({ ...current, exchanges: values }))} />
        <MultiSelect label={copy.company} values={draft.symbols} options={companies} searchable onChange={values => setDraft(current => ({ ...current, symbols: values }))} />
        <MultiSelect label={copy.region} values={draft.regions} options={NEWS_REGION_OPTIONS[lang]} onChange={values => setDraft(current => ({ ...current, regions: values as GlobalNewsFilters['regions'] }))} />
        <MultiSelect label={copy.language} values={draft.languages} options={languages} onChange={values => setDraft(current => ({ ...current, languages: values }))} />
        <MultiSelect label={copy.source} values={draft.sources} options={sourceOptions} searchable onChange={values => setDraft(current => ({ ...current, sources: values }))} />
        <MultiSelect label={copy.asset} values={draft.assetTypes} options={assetTypes} onChange={values => setDraft(current => ({ ...current, assetTypes: values as GlobalMarketStripKind[] }))} />
      </div>

      <div className="gm-news-date-sort">
        <span>{copy.date}</span>
        <label>{copy.from}<input type="date" value={draft.from} onChange={event => setDraft(current => ({ ...current, from: event.target.value }))} /></label>
        <label>{copy.to}<input type="date" value={draft.to} onChange={event => setDraft(current => ({ ...current, to: event.target.value }))} /></label>
        <label className="gm-news-latest"><input type="checkbox" checked={draft.latestOnly} onChange={event => setDraft(current => ({ ...current, latestOnly: event.target.checked }))} />{copy.latest}</label>
        <select aria-label={copy.sort} value={draft.sort} disabled={draft.latestOnly} onChange={event => setDraft(current => ({ ...current, sort: event.target.value as GlobalNewsFilters['sort'] }))}><option value="latest">{copy.latest}</option><option value="relevance">{copy.relevance}</option></select>
      </div>

      {tokens.length ? <div className="gm-news-filter-tokens" aria-label={`${tokens.length} ${copy.selected}`}>{tokens.map(token => <button key={`${token.group}-${token.value}`} type="button" onClick={() => remove(token.group, token.value)}>{token.label}<X size={12} /></button>)}</div> : null}

      <div className="gm-news-filter-actions">
        <button type="button" className="gm-news-reset" onClick={() => { setDraft(EMPTY_GLOBAL_NEWS_FILTERS); onApply(EMPTY_GLOBAL_NEWS_FILTERS); }}><RotateCcw size={15} />{copy.reset}</button>
        <button type="button" className="gm-news-apply" onClick={() => onApply(draft)}>{copy.apply}{activeFilterCount(draft) ? <b>{activeFilterCount(draft)}</b> : null}</button>
      </div>
    </div>
  );
}

export default GlobalMarketsNewsFilters;
