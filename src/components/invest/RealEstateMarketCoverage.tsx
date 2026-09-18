'use client';

import React, { useState } from 'react';
import { CheckCircle2, Clock3, ExternalLink, Globe2, Search, ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { REAL_ESTATE_MARKET_COVERAGE, type RealEstateMarketCoverageState } from '@/lib/investments/intelligence/market-center-coverage';
import styles from './RealEstateMarketCoverage.module.css';

const STATE_CLASS: Record<RealEstateMarketCoverageState, string> = {
  CONNECTED_CONTEXT: styles.connected,
  LIVE_VERIFICATION: styles.testing,
  RIGHTS_REVIEW: styles.rights,
  SOURCE_REVIEW: styles.review,
};

export function RealEstateMarketCoverage() {
  const { lang, dir } = useLanguage();
  const L = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;
  const [filter, setFilter] = useState<'all' | 'connected' | 'review'>('all');
  const [query, setQuery] = useState('');
  const connected = REAL_ESTATE_MARKET_COVERAGE.filter(item => item.state === 'CONNECTED_CONTEXT').length;

  const visibleSources = REAL_ESTATE_MARKET_COVERAGE.filter(item => (filter === 'all' || (filter === 'connected' ? item.state === 'CONNECTED_CONTEXT' : item.state !== 'CONNECTED_CONTEXT')) && [item.sourceName, ...Object.values(item.jurisdiction)].join(' ').toLowerCase().includes(query.trim().toLowerCase()));

  function stateLabel(state: RealEstateMarketCoverageState) {
    if (state === 'CONNECTED_CONTEXT') return L('مصدر رسمي متصل', 'Official context connected', 'Source officielle connectée');
    if (state === 'LIVE_VERIFICATION') return L('تحقق حي جارٍ', 'Live verification', 'Vérification en direct');
    if (state === 'RIGHTS_REVIEW') return L('مراجعة حقوق الاستخدام', 'Reuse rights review', 'Vérification des droits');
    return L('مراجعة المصدر', 'Source review', 'Vérification de la source');
  }

  function StateIcon({ state }: { state: RealEstateMarketCoverageState }) {
    if (state === 'CONNECTED_CONTEXT') return <CheckCircle2 size={14} aria-hidden="true" />;
    if (state === 'LIVE_VERIFICATION') return <Clock3 size={14} aria-hidden="true" />;
    if (state === 'RIGHTS_REVIEW') return <ShieldAlert size={14} aria-hidden="true" />;
    return <Search size={14} aria-hidden="true" />;
  }

  return <section className={styles.section} dir={dir} aria-labelledby="real-estate-market-coverage-title">
    <div className={styles.head}>
      <div>
        <h2 id="real-estate-market-coverage-title"><Globe2 size={18} aria-hidden="true" /> {L('تغطية السوق والمصادر', 'Market & source coverage', 'Couverture du marché et des sources')}</h2>
        <p>{L(
          'الحالة هنا تصف اتصال THE SFM بالمصدر فقط. المصدر الرسمي لا يصبح تلقائيًا تقييمًا للعقار؛ الأهلية للتقييم تُفحص بشكل مستقل لكل أصل.',
          'These states describe THE SFM source connectivity only. An official source is not automatically a property valuation; valuation eligibility is assessed separately for each asset.',
          'Ces états décrivent uniquement la connexion de THE SFM aux sources. Une source officielle n’est pas automatiquement une valorisation ; l’éligibilité est vérifiée séparément pour chaque bien.',
        )}</p>
      </div>
      <span className={styles.summary} dir="auto">{connected} · {L('مصادر رسمية متصلة للفحص', 'official contexts connected', 'sources officielles connectées')}</span>
    </div>

    <div className={styles.controls}>
      <div className={styles.filters} role="group" aria-label={L('تصفية المصادر', 'Filter sources', 'Filtrer les sources')}>
        {(['all', 'connected', 'review'] as const).map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'all' ? L('الكل', 'All', 'Toutes') : value === 'connected' ? L('متصلة', 'Connected', 'Connectées') : L('قيد التجهيز', 'In preparation', 'En préparation')}</button>)}
      </div>
      <input type="search" value={query} onChange={event => setQuery(event.target.value)} aria-label={L('بحث الدولة أو المصدر', 'Search country or source', 'Rechercher un pays ou une source')} placeholder={L('بحث الدولة أو المصدر', 'Search country or source', 'Rechercher un pays ou une source')} />
    </div>
    {visibleSources.length === 0 ? <p role="status">{L('لا توجد مصادر تطابق البحث. غيّر الدولة أو التصفية.', 'No sources match. Change the search or filter.', 'Aucune source correspondante. Modifiez la recherche ou le filtre.')}</p> : null}
    <div className={styles.grid}>
      {visibleSources.map(item => {
        const localized = item.jurisdiction[lang === 'ar' || lang === 'fr' ? lang : 'en'];
        const note = item.note[lang === 'ar' || lang === 'fr' ? lang : 'en'];
        return <article className={styles.card} key={item.id}>
          <div className={styles.cardHead}>
            <div className={styles.identity}>
              <strong>{localized}</strong>
              <span>{item.sourceName}</span>
            </div>
            <span className={`${styles.state} ${STATE_CLASS[item.state]}`}><StateIcon state={item.state} />{stateLabel(item.state)}</span>
          </div>
          <details><summary>{L('تفاصيل التغطية', 'Coverage details', 'Détails de couverture')}</summary><p>{note}</p></details>
          <div className={styles.footer}>
            <span>{L('التقييم الحالي: غير جاهز بعد', 'Current valuation: not ready yet', 'Valorisation actuelle : pas encore prête')}</span>
            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{L('المصدر', 'Source', 'Source')} <ExternalLink size={13} aria-hidden="true" /></a>
          </div>
        </article>;
      })}
    </div>
  </section>;
}
