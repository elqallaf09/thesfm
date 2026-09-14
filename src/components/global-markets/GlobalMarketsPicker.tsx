'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Globe2, RotateCcw, Search, X } from 'lucide-react';
import { AppModal } from '@/components/ui/AppModal';
import { DEFAULT_GLOBAL_MARKET_STRIPS, GLOBAL_MARKETS_SELECTION_SIZE, reorderSelectedMarket } from '@/lib/market/globalMarketPreferences';
import { GLOBAL_MARKET_STRIPS, type GlobalMarketStripConfig, type GlobalMarketStripId } from '@/lib/market/globalMarketStrips';

type SupportedLanguage = 'ar' | 'en' | 'fr';
type Props = {
  open: boolean;
  lang: SupportedLanguage;
  selectedIds: GlobalMarketStripId[];
  onClose: () => void;
  onSave: (ids: GlobalMarketStripId[]) => void;
};

const COPY = {
  ar: { title: 'تخصيص الأسواق', close: 'إغلاق', cancel: 'إلغاء', search: 'ابحث في الأسواق', selected: 'الأسواق المختارة', save: 'حفظ الأسواق', restore: 'استعادة الافتراضي', unavailable: 'التغطية غير متاحة حالياً', up: 'تحريك لأعلى', down: 'تحريك لأسفل', remove: 'إزالة', hint: 'اختر أربعة أسواق ورتّب ظهورها في الصفحة، ثم احفظ اختياراتك.', full: 'اكتمل اختيار 4 أسواق. أزل سوقاً من قائمتك لإضافة بديل.', remaining: 'أضف أسواقاً حتى تكتمل قائمتك من 4 أسواق.', browse: 'إضافة سوق', none: 'لا توجد أسواق تطابق بحثك.', empty: 'اختر أسواقك من القائمة أدناه.', all: 'الكل', gulf: 'الخليج', world: 'بورصات العالم', assets: 'عملات وسلع ومؤشرات' },
  en: { title: 'Customize markets', close: 'Close', cancel: 'Cancel', search: 'Search markets', selected: 'Selected markets', save: 'Save markets', restore: 'Restore defaults', unavailable: 'Coverage is currently unavailable', up: 'Move up', down: 'Move down', remove: 'Remove', hint: 'Choose four markets, arrange their order, then save your selection.', full: 'All 4 slots are filled. Remove a market from your list to add a replacement.', remaining: 'Add markets to complete your list of 4.', browse: 'Add a market', none: 'No markets match your search.', empty: 'Choose your markets from the list below.', all: 'All', gulf: 'Gulf', world: 'World exchanges', assets: 'Currencies, commodities & indices' },
  fr: { title: 'Personnaliser les marchés', close: 'Fermer', cancel: 'Annuler', search: 'Rechercher des marchés', selected: 'Marchés sélectionnés', save: 'Enregistrer', restore: 'Rétablir les valeurs par défaut', unavailable: 'Couverture indisponible actuellement', up: 'Monter', down: 'Descendre', remove: 'Retirer', hint: 'Choisissez quatre marchés, classez-les, puis enregistrez votre sélection.', full: 'Les 4 places sont occupées. Retirez un marché pour le remplacer.', remaining: 'Ajoutez des marchés pour compléter votre liste de 4.', browse: 'Ajouter un marché', none: 'Aucun marché ne correspond à votre recherche.', empty: 'Choisissez vos marchés dans la liste ci-dessous.', all: 'Tous', gulf: 'Golfe', world: 'Bourses mondiales', assets: 'Devises, matières premières et indices' },
} as const;

function labelFor(strip: GlobalMarketStripConfig, lang: SupportedLanguage) {
  return lang === 'ar' ? strip.labelAr : lang === 'fr' ? strip.labelFr : strip.labelEn;
}

export function GlobalMarketsPicker({ open, lang, selectedIds, onClose, onSave }: Props) {
  const copy = COPY[lang];
  const [draft, setDraft] = useState(selectedIds);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<'all' | 'gulf' | 'world' | 'assets'>('all');
  const full = draft.length === GLOBAL_MARKETS_SELECTION_SIZE;

  useEffect(() => {
    if (open) {
      setDraft(selectedIds);
      setQuery('');
      setGroup('all');
    }
  }, [open, selectedIds]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(lang);
    return GLOBAL_MARKET_STRIPS.filter(strip => {
      const matchesGroup = group === 'all' || (group === 'gulf' ? strip.newsRegion === 'gulf' : group === 'world' ? strip.kind === 'equity' && strip.newsRegion !== 'gulf' : strip.kind !== 'equity');
      return matchesGroup && `${strip.labelAr} ${strip.labelEn} ${strip.labelFr}`.toLocaleLowerCase(lang).includes(normalized);
    });
  }, [group, lang, query]);

  function toggle(id: GlobalMarketStripId) {
    setDraft(current => current.includes(id) ? current.filter(item => item !== id) : current.length < GLOBAL_MARKETS_SELECTION_SIZE ? [...current, id] : current);
  }

  return (
    <AppModal open={open} title={copy.title} subtitle={copy.hint} closeLabel={copy.close} onClose={onClose}
      className="gm-picker" bodyClassName="gm-picker-body"
      footer={(
        <div className="gm-picker-footer">
          <button type="button" className="gm-picker-restore" onClick={() => setDraft([...DEFAULT_GLOBAL_MARKET_STRIPS])}>
            <RotateCcw size={16} aria-hidden="true" /> {copy.restore}
          </button>
          <div className="gm-picker-footer-actions">
            <button type="button" className="gm-picker-cancel" onClick={onClose}>{copy.cancel}</button>
            <button type="button" className="gm-picker-save" disabled={!full} onClick={() => { onSave(draft); onClose(); }}>
              <Check size={17} aria-hidden="true" /> {copy.save} · <bdi>{draft.length}/{GLOBAL_MARKETS_SELECTION_SIZE}</bdi>
            </button>
          </div>
        </div>
      )}>
      <section className="gm-picker-selected" aria-label={copy.selected}>
        <p className="gm-picker-count" aria-live="polite">{copy.selected}: <bdi>{draft.length} / {GLOBAL_MARKETS_SELECTION_SIZE}</bdi></p>
        <ol className="gm-picker-order" aria-label={copy.selected}>
          {draft.map((id, index) => {
            const strip = GLOBAL_MARKET_STRIPS.find(item => item.id === id);
            if (!strip) return null;
            const label = labelFor(strip, lang);
            return (
              <li key={id}>
                <span className="gm-picker-rank" aria-hidden="true">{index + 1}</span>
                <span className="gm-picker-order-name">{label}</span>
                <span className="gm-picker-order-actions">
                  <button type="button" disabled={index === 0} title={copy.up} aria-label={`${copy.up}: ${label}`} onClick={() => setDraft(current => reorderSelectedMarket(current, index, index - 1))}><ArrowUp size={16} aria-hidden="true" /></button>
                  <button type="button" disabled={index === draft.length - 1} title={copy.down} aria-label={`${copy.down}: ${label}`} onClick={() => setDraft(current => reorderSelectedMarket(current, index, index + 1))}><ArrowDown size={16} aria-hidden="true" /></button>
                  <button type="button" className="gm-picker-remove" title={copy.remove} aria-label={`${copy.remove}: ${label}`} onClick={() => toggle(id)}><X size={16} aria-hidden="true" /></button>
                </span>
              </li>
            );
          })}
        </ol>
        {!draft.length ? <p className="gm-picker-hint">{copy.empty}</p> : null}
        <p className="gm-picker-hint" id="gm-picker-limit" role="status">{full ? copy.full : copy.remaining}</p>
      </section>
      <section className="gm-picker-browse" aria-label={copy.browse}>
        <h3>{copy.browse}</h3>
        <label className="gm-picker-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">{copy.search}</span>
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.search} />
        </label>
        <div className="gm-picker-groups" role="group" aria-label={copy.browse}>
          {(['all', 'gulf', 'world', 'assets'] as const).map(value => <button type="button" key={value} aria-pressed={group === value} onClick={() => setGroup(value)}>{copy[value]}</button>)}
        </div>
        <div className="gm-picker-options">
          {filtered.map(strip => {
            const available = strip.items.length > 0;
            const checked = draft.includes(strip.id);
            const disabled = !available || (full && !checked);
            return (
              <button type="button" key={strip.id} role="checkbox" aria-checked={checked} disabled={disabled}
                aria-label={labelFor(strip, lang)} aria-describedby={available && disabled ? 'gm-picker-limit' : undefined}
                className={`gm-picker-option${checked ? ' is-selected' : ''}`} onClick={() => toggle(strip.id)}>
                <span className="gm-picker-check" aria-hidden="true">{checked ? <Check size={16} /> : <Globe2 size={16} />}</span>
                <span>{labelFor(strip, lang)}{!available ? <small>{copy.unavailable}</small> : null}</span>
              </button>
            );
          })}
        </div>
        {!filtered.length ? <p className="gm-picker-hint" role="status">{copy.none}</p> : null}
      </section>
    </AppModal>
  );
}
