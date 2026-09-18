'use client';

import type { Lang } from '@/lib/translations';
import type { GlobalDirectoryCoverage } from '@/lib/market/globalMarketDirectoryTypes';
import { GLOBAL_MARKET_STRIPS } from '@/lib/market/globalMarketStrips';

const COPY = {
  ar: { title: 'تغطية الأسواق وعدد الأصول', directory: 'دليل السوق', snapshot: 'دليل محفوظ', selected: 'قائمة مختارة', unavailable: 'غير مربوط', note: 'الأعداد تخص الدليل المتصل، وليست عدد الشركات الكلي في البورصة أو عدد الأسعار الحية. اختر السوق لعرض أصوله.' },
  en: { title: 'Market coverage and asset counts', directory: 'Market directory', snapshot: 'Saved directory', selected: 'Selected list', unavailable: 'Not connected', note: 'Counts describe the connected directory, not all exchange listings or live quotes. Select a market to browse its assets.' },
  fr: { title: 'Couverture des marchés et nombre d’actifs', directory: 'Répertoire du marché', snapshot: 'Répertoire enregistré', selected: 'Sélection', unavailable: 'Non connecté', note: 'Les nombres décrivent le répertoire connecté, pas toutes les cotations de la bourse ni les cours en direct. Choisissez un marché pour consulter ses actifs.' },
};

export function MarketDirectoryCoverage({ coverage, lang, onSelect }: { coverage: GlobalDirectoryCoverage[]; lang: Lang; onSelect: (id: string) => void }) {
  if (coverage.length < 2) return null;
  const copy = COPY[lang];
  return <details className="market-coverage">
    <summary>{copy.title} · {coverage.length}</summary>
    <p>{copy.note}</p>
    <ul>{coverage.map(item => {
      const strip = GLOBAL_MARKET_STRIPS.find(market => market.id === item.stripId);
      const name = lang === 'ar' ? strip?.labelAr : lang === 'fr' ? strip?.labelFr : strip?.labelEn;
      return <li key={item.stripId}><button type="button" onClick={() => onSelect(item.stripId)}>
        <span>{name || item.stripId}</span><strong>{item.count.toLocaleString(lang)} · {copy[item.status]}</strong>
      </button></li>;
    })}</ul>
    <style jsx>{`
      .market-coverage { min-width: 0; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--surface); }
      summary { min-height: 44px; align-content: center; cursor: pointer; font-weight: 600; }
      p { color: var(--foreground-muted); font-size: 13px; line-height: 1.7; }
      ul { list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 8px; padding: 0; margin: 0; }
      li { min-width: 0; }
      button { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px 12px; min-height: 44px; width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: var(--radius-control); background: var(--surface-muted); color: var(--foreground); text-align: start; cursor: pointer; }
      strong { font-size: 12px; color: var(--foreground-secondary); }
      :is(button, summary):focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
    `}</style>
  </details>;
}
