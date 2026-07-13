'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { currencyDisplayName, currencyDisplaySymbol, getCurrency, getCurrencyOptions } from '@/lib/currencies';
import type { CurrencyLocale } from '@/lib/currencies';

const TEXT = {
  currency: { ar: 'العملة', en: 'Currency', fr: 'Devise' },
  selectCurrency: { ar: 'اختر العملة', en: 'Select currency', fr: 'Sélectionner une devise' },
  searchCurrency: { ar: 'ابحث عن عملة', en: 'Search currency', fr: 'Rechercher une devise' },
  noCurrencies: { ar: 'لا توجد عملات', en: 'No currencies found', fr: 'Aucune devise trouvée' },
};

type CurrencySelectProps = {
  value?: string;
  onChange: (code: string) => void;
  lang?: string;
  label?: string;
  ariaLabel?: string;
  className?: string;
};

function safeLang(lang?: string): CurrencyLocale {
  return lang === 'en' || lang === 'fr' || lang === 'ar' ? lang : 'ar';
}

function displayValue(code: string, locale: CurrencyLocale) {
  const currency = getCurrency(code);
  const name = currencyDisplayName(currency, locale);
  const symbol = currencyDisplaySymbol(currency, locale);
  return locale === 'ar'
    ? `${symbol} — ${currency.code} — ${name}`
    : `${currency.code} — ${symbol} — ${name}`;
}

export function CurrencySelect({ value = 'KWD', onChange, lang, label, ariaLabel, className }: CurrencySelectProps) {
  const locale = safeLang(lang);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedCurrency = getCurrency(value);
  const selectedName = currencyDisplayName(selectedCurrency, locale);
  const selectedSymbol = currencyDisplaySymbol(selectedCurrency, locale);
  const selectedDisplay = displayValue(value, locale);
  const options = useMemo(() => getCurrencyOptions(locale), [locale]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(currency => [
      currency.code,
      currency.symbol,
      currency.symbolAr,
      currency.symbolEn,
      currency.nameAr,
      currency.nameEn,
      currency.nameFr,
      currency.country,
    ].some(part => part.toLowerCase().includes(needle)));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function select(code: string) {
    onChange(code);
    setOpen(false);
    setQuery('');
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <div className={`currency-select-root ${className ?? ''}`} ref={rootRef} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {label && <span className="currency-label">{label}</span>}
      <button
        ref={triggerRef}
        type="button"
        className="currency-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? TEXT.selectCurrency[locale]}
        title={selectedDisplay}
        onClick={() => setOpen(current => !current)}
      >
        <span className="currency-trigger-content">
          <span className="currency-trigger-code" dir="ltr">{selectedCurrency.code}</span>
          <span className="currency-trigger-symbol">{selectedSymbol}</span>
          <span className="currency-trigger-name">{selectedName}</span>
        </span>
        <ChevronDown className="currency-chevron" size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="currency-popover">
          <label className="currency-search">
            <Search size={15} aria-hidden="true" />
            <input
              ref={searchRef}
              value={query}
              role="combobox"
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded="true"
              aria-activedescendant={filtered[activeIndex] ? `${listboxId}-${filtered[activeIndex].code}` : undefined}
              aria-label={TEXT.searchCurrency[locale]}
              placeholder={TEXT.searchCurrency[locale]}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActiveIndex(index => Math.min(index + 1, Math.max(0, filtered.length - 1)));
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActiveIndex(index => Math.max(index - 1, 0));
                }
                if (event.key === 'Enter' && filtered[activeIndex]) {
                  event.preventDefault();
                  select(filtered[activeIndex].code);
                }
              }}
            />
          </label>
          <div id={listboxId} className="currency-list" role="listbox" aria-label={TEXT.currency[locale]}>
            {filtered.length === 0 ? (
              <div className="currency-empty">{TEXT.noCurrencies[locale]}</div>
            ) : filtered.slice(0, 80).map((currency, index) => (
              <button
                type="button"
                id={`${listboxId}-${currency.code}`}
                role="option"
                aria-selected={currency.code === value}
                className={index === activeIndex ? 'active' : ''}
                key={currency.code}
                title={displayValue(currency.code, locale)}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(currency.code)}
              >
                <span className="currency-option-main">
                  <span className="currency-code" dir="ltr">{currency.code}</span>
                  <span className="currency-symbol">{currencyDisplaySymbol(currency, locale)}</span>
                  <span className="currency-name">{currencyDisplayName(currency, locale)}</span>
                </span>
                {currency.code === value && <Check className="currency-check" size={16} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      )}
      <style jsx>{`
        .currency-select-root{position:relative;display:grid;gap:7px;width:100%;min-width:min(180px,100%)}
        .currency-label{color:var(--foreground);font-size:13px;font-weight:500}
        .currency-trigger{width:100%;min-height:50px;border:1px solid var(--border-strong);border-radius:var(--radius-control);background:var(--surface);color:var(--foreground);padding-block:8px;padding-inline:12px 11px;display:flex;align-items:center;justify-content:space-between;gap:10px;font:500 14px var(--font-ui);cursor:pointer;text-align:start;overflow:visible;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}
        .currency-trigger-content{display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-areas:"symbol code" "symbol name";align-items:center;column-gap:10px;row-gap:2px;min-width:0;flex:1}
        .currency-trigger-code,.currency-code{direction:ltr;unicode-bidi:isolate;font-family:var(--font-data);font-weight:600;letter-spacing:0;color:var(--foreground);white-space:nowrap}
        .currency-trigger-code{grid-area:code;font-size:12px;line-height:1;color:var(--foreground-muted)}
        .currency-trigger-symbol,.currency-symbol{unicode-bidi:isolate;color:var(--primary);font-family:var(--font-data);font-weight:600;white-space:nowrap}
        .currency-trigger-symbol{grid-area:symbol;min-inline-size:44px;min-height:32px;border-radius:var(--radius-sm);background:var(--primary-soft);display:inline-flex;align-items:center;justify-content:center;padding-inline:8px}
        .currency-trigger-name{grid-area:name;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--foreground-secondary);font-size:13px;line-height:1.25}
        .currency-chevron{flex:0 0 auto;inline-size:16px;min-inline-size:16px;color:var(--primary);transition:transform .18s ease}
        .currency-trigger[aria-expanded="true"] .currency-chevron{transform:rotate(180deg)}
        .currency-trigger:hover{border-color:color-mix(in srgb,var(--primary) 36%,var(--border));background:var(--surface-hover);box-shadow:var(--shadow-xs)}
        .currency-trigger:focus-visible,.currency-search input:focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px;box-shadow:var(--focus-shadow);border-color:var(--focus-ring)}
        .currency-popover{position:absolute;z-index:120;inset-block-start:100%;margin-block-start:8px;inset-inline-start:0;background:var(--surface-elevated);border:1px solid var(--border);border-radius:var(--radius-card);padding:10px;box-shadow:var(--shadow-lg);width:100%;min-width:320px;max-height:min(360px,70dvh);display:grid;gap:8px}
        .currency-select-root[dir="rtl"] .currency-popover{inset-inline-start:auto;inset-inline-end:0}
        .currency-search{min-height:44px;border:1px solid var(--border);border-radius:var(--radius-control);background:var(--surface-muted);display:flex;align-items:center;gap:8px;padding:0 10px;color:var(--foreground-muted)}
        .currency-search input{border:0;background:transparent;color:var(--foreground);width:100%;height:44px;font:400 14px var(--font-ui);min-width:0}
        .currency-list{display:grid;gap:4px;overflow:auto;max-height:278px;padding-inline-end:2px}
        .currency-list button{width:100%;border:1px solid transparent;border-radius:var(--radius-control);background:transparent;color:var(--foreground);display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;min-height:48px;padding:9px 10px;font:500 13px var(--font-ui);cursor:pointer;text-align:start;transition:background .18s ease,color .18s ease,border-color .18s ease}
        .currency-list button.active,.currency-list button:hover,.currency-list button:focus-visible{background:var(--surface-hover);border-color:color-mix(in srgb,var(--primary) 28%,var(--border));color:var(--primary-hover);outline:2px solid var(--focus-ring);outline-offset:1px}
        .currency-list button[aria-selected="true"]{background:var(--primary-soft);border-color:color-mix(in srgb,var(--primary) 36%,var(--border));box-shadow:var(--active-indicator-shadow)}
        .currency-option-main{display:grid;grid-template-columns:auto auto minmax(0,1fr);align-items:center;gap:8px;min-width:0}
        .currency-name{min-width:0;color:var(--foreground-secondary);line-height:1.35;overflow-wrap:anywhere}
        .currency-check{color:var(--primary)}
        .currency-empty{padding:18px;text-align:center;color:var(--foreground-muted);font-size:13px}
        @media(max-width:680px){
          .currency-select-root{min-width:0}
          .currency-popover{position:fixed;inset-inline:16px;inset-block:auto 16px;width:auto;min-width:0;max-height:min(460px,76dvh)}
          .currency-trigger{min-height:52px}
          .currency-list button{min-height:54px}
        }
        @media(prefers-reduced-motion:reduce){.currency-trigger,.currency-chevron,.currency-list button{transition:none}}
      `}</style>
    </div>
  );
}
