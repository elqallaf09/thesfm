'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, RotateCcw, Search } from 'lucide-react';
import { AppModal } from '@/components/ui/AppModal';
import {
  GLOBAL_MARKETS_SELECTION_SIZE,
  reorderSelectedMarket,
} from '@/lib/market/globalMarketPreferences';
import {
  GLOBAL_MARKET_STRIPS,
  type GlobalMarketStripConfig,
  type GlobalMarketStripId,
} from '@/lib/market/globalMarketStrips';

type SupportedLanguage = 'ar' | 'en' | 'fr';

type Props = {
  open: boolean;
  lang: SupportedLanguage;
  selectedIds: GlobalMarketStripId[];
  onClose: () => void;
  onSave: (ids: GlobalMarketStripId[]) => void;
  onRestoreDefaults: () => void;
};

const COPY = {
  ar: { title: 'تخصيص الأسواق', close: 'إغلاق', search: 'ابحث في الأسواق', selected: 'الأسواق المختارة', save: 'حفظ الأسواق', restore: 'استعادة الافتراضي', unavailable: 'التغطية غير متاحة حالياً', up: 'تحريك لأعلى', down: 'تحريك لأسفل', hint: 'اختر أربعة أسواق للوحة الرئيسية.' },
  en: { title: 'Customize markets', close: 'Close', search: 'Search markets', selected: 'Selected markets', save: 'Save markets', restore: 'Restore defaults', unavailable: 'Coverage is currently unavailable', up: 'Move up', down: 'Move down', hint: 'Choose four markets for the main dashboard.' },
  fr: { title: 'Personnaliser les marchés', close: 'Fermer', search: 'Rechercher des marchés', selected: 'Marchés sélectionnés', save: 'Enregistrer', restore: 'Rétablir les valeurs par défaut', unavailable: 'Couverture indisponible actuellement', up: 'Monter', down: 'Descendre', hint: 'Choisissez quatre marchés pour le tableau principal.' },
} as const;

function labelFor(strip: GlobalMarketStripConfig, lang: SupportedLanguage) {
  return lang === 'ar' ? strip.labelAr : lang === 'fr' ? strip.labelFr : strip.labelEn;
}

export function GlobalMarketsPicker({ open, lang, selectedIds, onClose, onSave, onRestoreDefaults }: Props) {
  const copy = COPY[lang];
  const [draft, setDraft] = useState(selectedIds);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(selectedIds);
      setQuery('');
    }
  }, [open, selectedIds]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(lang);
    if (!normalized) return GLOBAL_MARKET_STRIPS;
    return GLOBAL_MARKET_STRIPS.filter(strip =>
      `${strip.labelAr} ${strip.labelEn} ${strip.labelFr}`.toLocaleLowerCase(lang).includes(normalized),
    );
  }, [lang, query]);

  function toggle(id: GlobalMarketStripId, enabled: boolean) {
    setDraft(current => {
      if (!enabled) return current;
      if (current.includes(id)) return current.length > 1 ? current.filter(item => item !== id) : current;
      if (current.length >= GLOBAL_MARKETS_SELECTION_SIZE) return current;
      return [...current, id];
    });
  }

  return (
    <AppModal
      open={open}
      title={copy.title}
      subtitle={copy.hint}
      closeLabel={copy.close}
      onClose={onClose}
      className="gm-picker"
      bodyClassName="gm-picker-body"
      footer={(
        <div className="gm-picker-footer">
          <button type="button" className="gm-picker-restore" onClick={onRestoreDefaults}>
            <RotateCcw size={16} aria-hidden="true" /> {copy.restore}
          </button>
          <button
            type="button"
            className="gm-picker-save"
            disabled={draft.length !== GLOBAL_MARKETS_SELECTION_SIZE}
            onClick={() => { onSave(draft); onClose(); }}
          >
            {copy.save} · {draft.length}/{GLOBAL_MARKETS_SELECTION_SIZE}
          </button>
        </div>
      )}
    >
      <label className="gm-picker-search">
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">{copy.search}</span>
        <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.search} />
      </label>

      <p className="gm-picker-count" aria-live="polite">
        {copy.selected}: {draft.length} / {GLOBAL_MARKETS_SELECTION_SIZE}
      </p>

      <ol className="gm-picker-order" aria-label={copy.selected}>
        {draft.map((id, index) => {
          const strip = GLOBAL_MARKET_STRIPS.find(item => item.id === id);
          if (!strip) return null;
          return (
            <li key={id}>
              <span>{index + 1}. {labelFor(strip, lang)}</span>
              <span className="gm-picker-order-actions">
                <button type="button" disabled={index === 0} aria-label={`${copy.up}: ${labelFor(strip, lang)}`} onClick={() => setDraft(current => reorderSelectedMarket(current, index, index - 1))}><ArrowUp size={16} /></button>
                <button type="button" disabled={index === draft.length - 1} aria-label={`${copy.down}: ${labelFor(strip, lang)}`} onClick={() => setDraft(current => reorderSelectedMarket(current, index, index + 1))}><ArrowDown size={16} /></button>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="gm-picker-options">
        {filtered.map(strip => {
          const available = strip.items.length > 0;
          const checked = draft.includes(strip.id);
          return (
            <label key={strip.id} className={`gm-picker-option${available ? '' : ' is-disabled'}`}>
              <input type="checkbox" checked={checked} disabled={!available} onChange={() => toggle(strip.id, available)} />
              <span>{labelFor(strip, lang)}</span>
              {!available ? <small>{copy.unavailable}</small> : null}
            </label>
          );
        })}
      </div>
    </AppModal>
  );
}
