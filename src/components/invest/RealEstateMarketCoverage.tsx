'use client';

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
  const connected = REAL_ESTATE_MARKET_COVERAGE.filter(item => item.state === 'CONNECTED_CONTEXT').length;

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

    <div className={styles.grid}>
      {REAL_ESTATE_MARKET_COVERAGE.map(item => {
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
          <p>{note}</p>
          <div className={styles.footer}>
            <span>{L('التقييم الحالي: غير جاهز بعد', 'Current valuation: not ready yet', 'Valorisation actuelle : pas encore prête')}</span>
            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{L('المصدر', 'Source', 'Source')} <ExternalLink size={13} aria-hidden="true" /></a>
          </div>
        </article>;
      })}
    </div>
  </section>;
}
