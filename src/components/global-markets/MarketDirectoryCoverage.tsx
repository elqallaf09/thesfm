'use client';

import type { Lang } from '@/lib/translations';
import type { GlobalDirectoryCoverage } from '@/lib/market/globalMarketDirectoryTypes';
import { GLOBAL_MARKET_STRIPS } from '@/lib/market/globalMarketStrips';

const COPY = {
  ar: { title: 'تغطية الأسواق وعدد الأصول', directory: 'دليل السوق', snapshot: 'دليل محفوظ', selected: 'قائمة مختارة', unavailable: 'غير مربوط', note: 'الأعداد تخص الدليل المتصل، وليست عدد الشركات الكلي في البورصة أو عدد الأسعار الحية. لا نفترض اكتمال السوق دون عدد مرجعي موثق.', source: 'مصدر الدليل', synced: 'آخر جلب ناجح', unknown: 'وقت المصدر غير معلوم', rate_limited: 'تحديث الدليل متوقف مؤقتًا بسبب حد الطلبات.', access_required: 'المصدر يتطلب صلاحية وصول.', not_configured: 'المصدر غير مهيأ.', source_unavailable: 'تعذر تحديث المصدر؛ نعرض البيانات المتوفرة.', invalid_response: 'تعذر التحقق من اكتمال استجابة المصدر؛ نعرض البيانات المتوفرة.' },
  en: { title: 'Market coverage and asset counts', directory: 'Market directory', snapshot: 'Saved directory', selected: 'Selected list', unavailable: 'Not connected', note: 'Counts describe the connected directory, not all exchange listings or live quotes. Full coverage requires an independently verified exchange total.', source: 'Directory source', synced: 'Last successful retrieval', unknown: 'Source timestamp unknown', rate_limited: 'Directory refresh is paused by a request limit.', access_required: 'Source access is required.', not_configured: 'The source is not configured.', source_unavailable: 'The source could not be refreshed; available records are shown.', invalid_response: 'A complete source response could not be verified; available records are shown.' },
  fr: { title: 'Couverture des marchés et nombre d’actifs', directory: 'Répertoire du marché', snapshot: 'Répertoire enregistré', selected: 'Sélection', unavailable: 'Non connecté', note: 'Les nombres décrivent le répertoire connecté, pas toutes les cotations ni les cours en direct. La couverture complète exige un total de référence vérifié.', source: 'Source du répertoire', synced: 'Dernière récupération réussie', unknown: 'Horodatage source inconnu', rate_limited: 'L’actualisation est suspendue par une limite de requêtes.', access_required: 'Un droit d’accès à la source est nécessaire.', not_configured: 'La source n’est pas configurée.', source_unavailable: 'La source n’a pas pu être actualisée ; les données disponibles sont affichées.', invalid_response: 'La réponse complète de la source n’a pas pu être vérifiée ; les données disponibles sont affichées.' },
};

export function MarketDirectoryCoverage({ coverage, lang, onSelect }: { coverage: GlobalDirectoryCoverage[]; lang: Lang; onSelect: (id: string) => void }) {
  if (!coverage.length) return null;
  const copy = COPY[lang];
  return <details className="market-coverage">
    <summary>{copy.title} · {coverage.length}</summary>
    <p>{copy.note}</p>
    <ul>{coverage.map(item => {
      const strip = GLOBAL_MARKET_STRIPS.find(market => market.id === item.stripId);
      const name = lang === 'ar' ? strip?.labelAr : lang === 'fr' ? strip?.labelFr : strip?.labelEn;
      return <li key={item.stripId}><button type="button" onClick={() => onSelect(item.stripId)}>
        <span>{name || item.stripId}</span><strong>{item.count.toLocaleString(`${lang}-u-nu-latn`)} · {copy[item.status]}</strong>
      </button>
        {item.lastSyncAt ? <p>{copy.synced}: <time dateTime={item.lastSyncAt}>{new Intl.DateTimeFormat(`${lang}-u-nu-latn`, { dateStyle: 'medium' }).format(new Date(item.lastSyncAt))}</time></p> : null}
        {item.lastSyncAt && !item.asOf ? <p>{copy.unknown}</p> : null}
        {item.reason ? <p>{copy[item.reason]}</p> : null}
        {item.source.startsWith('https://') ? <a href={item.source} target="_blank" rel="noreferrer">{copy.source}</a> : null}
      </li>;
    })}</ul>
    <style jsx>{`
      .market-coverage { min-width: 0; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-card); background: var(--surface); }
      summary { min-height: 44px; align-content: center; cursor: pointer; font-weight: 600; }
      p { color: var(--foreground-muted); font-size: 13px; line-height: 1.7; }
      ul { list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 8px; padding: 0; margin: 0; }
      li { min-width: 0; }
      li p { margin: 4px 0; }
      a { display: inline-block; min-height: 44px; align-content: center; color: var(--foreground-secondary); text-decoration: underline; }
      button { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px 12px; min-height: 44px; width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: var(--radius-control); background: var(--surface-muted); color: var(--foreground); text-align: start; cursor: pointer; }
      strong { font-size: 12px; color: var(--foreground-secondary); }
      :is(button, summary):focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
    `}</style>
  </details>;
}
