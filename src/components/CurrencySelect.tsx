'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  const rootRef = useRef<HTMLDivElement>(null);
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
      if (event.key === 'Escape') setOpen(false);
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
  }

  return (
    <div className={`currency-select-root ${className ?? ''}`} ref={rootRef} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {label && <span className="currency-label">{label}</span>}
      <button
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
              aria-label={TEXT.searchCurrency[locale]}
              placeholder={TEXT.searchCurrency[locale]}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActiveIndex(index => Math.min(index + 1, filtered.length - 1));
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
          <div className="currency-list" role="listbox" aria-label={TEXT.currency[locale]}>
            {filtered.length === 0 ? (
              <div className="currency-empty">{TEXT.noCurrencies[locale]}</div>
            ) : filtered.slice(0, 80).map((currency, index) => (
              <button
                type="button"
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
        .currency-label{color:var(--sfm-midnight);font-size:13px;font-weight:800}
        .currency-trigger{width:100%;min-height:50px;border:1px solid rgba(29,140,255,.20);border-radius:14px;background:#FFFFFF;color:var(--sfm-midnight);padding:8px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;font:800 14px inherit;cursor:pointer;text-align:start;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease,transform .18s ease}
        .currency-trigger-content{display:grid;grid-template-columns:auto auto minmax(0,1fr);align-items:center;gap:7px;min-width:0;flex:1}
        .currency-trigger-code,.currency-code{direction:ltr;unicode-bidi:isolate;font-weight:900;letter-spacing:.02em;color:var(--sfm-midnight);white-space:nowrap}
        .currency-trigger-symbol,.currency-symbol{unicode-bidi:isolate;color:var(--sfm-primary);font-weight:900;white-space:nowrap}
        .currency-trigger-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--sfm-secondary)}
        .currency-chevron{flex:0 0 auto;color:var(--sfm-primary);transition:transform .18s ease}
        .currency-trigger[aria-expanded="true"] .currency-chevron{transform:rotate(180deg)}
        .currency-trigger:hover{border-color:rgba(24,212,212,.40);background:var(--sfm-surface-hover);box-shadow:0 10px 24px rgba(3,18,37,.08);transform:translateY(-1px)}
        .currency-trigger:focus-visible,.currency-search input:focus{outline:none;box-shadow:0 0 0 3px rgba(24,212,212,.22);border-color:var(--sfm-primary)}
        .currency-popover{position:absolute;z-index:120;inset-block-start:calc(100% + 8px);inset-inline-start:0;background:var(--sfm-card);border:1px solid rgba(29,140,255,.22);border-radius:16px;padding:10px;box-shadow:0 18px 42px rgba(3,18,37,.16);width:max(100%,320px);min-width:min(320px,calc(100vw - 32px));max-width:calc(100vw - 32px);max-height:min(360px,70dvh);display:grid;gap:8px}
        .currency-select-root[dir="rtl"] .currency-popover{inset-inline-start:auto;inset-inline-end:0}
        .currency-search{height:42px;border:1px solid rgba(29,140,255,.16);border-radius:12px;background:var(--sfm-background);display:flex;align-items:center;gap:8px;padding:0 10px;color:var(--sfm-muted)}
        .currency-search input{border:0;background:transparent;color:var(--sfm-midnight);width:100%;height:100%;font:700 14px inherit;min-width:0}
        .currency-list{display:grid;gap:4px;overflow:auto;max-height:278px;padding-inline-end:2px}
        .currency-list button{width:100%;border:1px solid transparent;border-radius:12px;background:transparent;color:var(--sfm-midnight);display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;min-height:48px;padding:9px 10px;font:750 13px inherit;cursor:pointer;text-align:start;transition:background .18s ease,color .18s ease,border-color .18s ease,transform .18s ease}
        .currency-list button.active,.currency-list button:hover,.currency-list button:focus-visible{background:rgba(29,140,255,.10);border-color:rgba(24,212,212,.24);color:var(--sfm-primary-hover);outline:0;transform:translateY(-1px)}
        .currency-list button[aria-selected="true"]{background:linear-gradient(135deg,rgba(29,140,255,.14),rgba(24,212,212,.14));border-color:rgba(24,212,212,.32);box-shadow:inset 0 -2px 0 rgba(24,212,212,.55)}
        .currency-option-main{display:grid;grid-template-columns:auto auto minmax(0,1fr);align-items:center;gap:8px;min-width:0}
        .currency-name{min-width:0;color:var(--sfm-secondary);line-height:1.35;overflow-wrap:anywhere}
        .currency-check{color:var(--sfm-primary);filter:drop-shadow(0 0 6px rgba(24,212,212,.35))}
        .currency-empty{padding:18px;text-align:center;color:var(--sfm-muted);font-size:13px}
        @media(max-width:680px){
          .currency-select-root{min-width:0}
          .currency-popover{position:fixed;inset-inline:16px;inset-block:auto 16px;width:auto;min-width:0;max-width:none;max-height:min(460px,76dvh)}
          .currency-trigger{min-height:52px}
          .currency-list button{min-height:54px}
        }
      `}</style>
    </div>
  );
}
