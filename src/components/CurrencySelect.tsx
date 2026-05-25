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
        onClick={() => setOpen(current => !current)}
      >
        <span>{displayValue(value, locale)}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="currency-popover">
          <label className="currency-search">
            <Search size={15} />
            <input
              ref={searchRef}
              value={query}
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
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(currency.code)}
              >
                <span className="currency-code">{currency.code}</span>
                <span className="currency-symbol">{currencyDisplaySymbol(currency, locale)}</span>
                <span className="currency-name">{currencyDisplayName(currency, locale)}</span>
                {currency.code === value && <Check size={15} />}
              </button>
            ))}
          </div>
        </div>
      )}
      <style jsx>{`
        .currency-select-root{position:relative;display:grid;gap:7px;width:100%;min-width:0}
        .currency-label{color:var(--sfm-midnight);font-size:13px;font-weight:500}
        .currency-trigger{width:100%;min-height:46px;border:1px solid rgba(29,140,255,.18);border-radius:12px;background:var(--sfm-background);color:var(--sfm-midnight);padding:0 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;font:600 14px inherit;cursor:pointer;text-align:start}
        .currency-trigger span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .currency-trigger:focus-visible,.currency-search input:focus{outline:none;box-shadow:0 0 0 3px rgba(29,140,255,.18);border-color:var(--sfm-primary)}
        .currency-popover{position:absolute;z-index:120;inset-block-start:calc(100% + 8px);inset-inline:0;background:var(--sfm-card);border:1px solid rgba(29,140,255,.2);border-radius:16px;padding:10px;box-shadow:0 18px 42px rgba(3,18,37,.16);max-height:min(360px,70dvh);display:grid;gap:8px}
        .currency-search{height:42px;border:1px solid rgba(29,140,255,.16);border-radius:12px;background:var(--sfm-background);display:flex;align-items:center;gap:8px;padding:0 10px;color:var(--sfm-muted)}
        .currency-search input{border:0;background:transparent;color:var(--sfm-midnight);width:100%;height:100%;font:500 14px inherit;min-width:0}
        .currency-list{display:grid;gap:4px;overflow:auto;max-height:278px;padding-inline-end:2px}
        .currency-list button{width:100%;border:0;border-radius:11px;background:transparent;color:var(--sfm-midnight);display:grid;grid-template-columns:auto auto 1fr auto;align-items:center;gap:8px;min-height:42px;padding:8px 10px;font:500 13px inherit;cursor:pointer;text-align:start}
        .currency-list button.active,.currency-list button:hover{background:rgba(29,140,255,.10);color:var(--sfm-primary-hover)}
        .currency-code{font-weight:800;color:var(--sfm-midnight)}.currency-symbol{color:var(--sfm-primary);font-weight:800}.currency-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .currency-empty{padding:18px;text-align:center;color:var(--sfm-muted);font-size:13px}
        @media(max-width:680px){.currency-popover{position:fixed;inset-inline:12px;inset-block:auto 12px;max-height:min(460px,76dvh)}}
      `}</style>
    </div>
  );
}
