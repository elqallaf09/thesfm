import { ExternalLink } from 'lucide-react';
import { BOUBYAN_REFERENCE } from '@/lib/market/boubyanReferenceMetadata';
import type { SecurityRow } from './shariahStockPresentation';
import styles from './ShariahStocksNewsPage.module.css';
import disclosureStyles from './PublishedShariahDisclosure.module.css';

const COPY = {
  ar: {
    title: 'تصنيف بوبيان كابيتال المنشور',
    source: 'المصدر', period: 'فترة القائمة', issued: 'تاريخ الإصدار',
    checked: 'آخر تحقق من المصدر', next: 'المراجعة التالية', location: 'الصفحة · السطر',
    listed: 'مدرج ضمن الأسهم المتوافقة في الإصدار المذكور', excluded: 'إشارة خروج صريحة من القائمة',
    open: 'فتح المصدر الرسمي PDF', newTab: 'يفتح في نافذة جديدة',
    independent: 'نتيجة الفحص المستقلة', status: 'نتيجة الفحص', method: 'منهجية الفحص', reviewed: 'تاريخ الفحص',
    independentNote: 'تظل هذه النتيجة منفصلة عن تصنيف بوبيان المنشور.',
    noIndependent: 'لم تُرفق نتيجة فحص مستقلة لهذا السجل؛ اعتماد القائمة لا يعني احتساب النسب المالية داخل THE SFM.',
    conflict: 'اختلاف بين النتائج الموثقة', unavailable: 'غير متاح',
    compliant: 'متوافق مع المنهجية', non_compliant: 'غير متوافق مع المنهجية', needs_review: 'يحتاج مراجعة', unclassified: 'غير مصنف',
  },
  en: {
    title: 'Published Boubyan Capital classification',
    source: 'Source', period: 'Reporting period', issued: 'Issue date',
    checked: 'Source last checked', next: 'Next review', location: 'Page · row',
    listed: 'Listed as compliant in the stated edition', excluded: 'Explicit exit from the list',
    open: 'Open official PDF source', newTab: 'Opens in a new window',
    independent: 'Independent screening result', status: 'Screening result', method: 'Screening methodology', reviewed: 'Screening date',
    independentNote: 'This result remains separate from Boubyan’s published classification.',
    noIndependent: 'No independent screening result accompanies this record. Adopting the list does not mean THE SFM calculated its financial ratios.',
    conflict: 'Documented results differ', unavailable: 'Unavailable',
    compliant: 'Aligned with methodology', non_compliant: 'Not aligned with methodology', needs_review: 'Needs review', unclassified: 'Unclassified',
  },
  fr: {
    title: 'Classification publiée par Boubyan Capital',
    source: 'Source', period: 'Période de référence', issued: 'Date de publication',
    checked: 'Dernière vérification de la source', next: 'Prochaine révision', location: 'Page · ligne',
    listed: 'Répertorié comme conforme dans l’édition indiquée', excluded: 'Sortie explicitement signalée dans la liste',
    open: 'Ouvrir le PDF officiel', newTab: 'S’ouvre dans une nouvelle fenêtre',
    independent: 'Résultat de l’analyse indépendante', status: 'Résultat de l’analyse', method: 'Méthode d’analyse', reviewed: 'Date de l’analyse',
    independentNote: 'Ce résultat reste distinct de la classification publiée par Boubyan.',
    noIndependent: 'Aucune analyse indépendante n’accompagne ce titre. L’adoption de la liste ne signifie pas que THE SFM a calculé ses ratios financiers.',
    conflict: 'Les résultats documentés diffèrent', unavailable: 'Indisponible',
    compliant: 'Conforme à la méthode', non_compliant: 'Non conforme à la méthode', needs_review: 'À réviser', unclassified: 'Non classé',
  },
} as const;

function officialPdfUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['boubyancapital.com', 'www.boubyancapital.com'].includes(url.hostname)
      && !url.username && !url.password && url.pathname.toLowerCase().endsWith('.pdf') ? url.href : null;
  } catch { return null; }
}

export function PublishedShariahDisclosure({ row, locale }: { row: SecurityRow; locale: keyof typeof COPY }) {
  const copy = COPY[locale];
  const reference = row.publishedShariahReference;
  const independent = row.independentScreening;
  if (!reference && !row.boubyanReferenceReason) return null;
  const date = (value: string | null) => {
    const timestamp = Date.parse(value ?? '');
    return Number.isFinite(timestamp) ? new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
      timeZone: BOUBYAN_REFERENCE.reviewTimezone, year: 'numeric', month: 'short', day: '2-digit',
    }).format(timestamp) : copy.unavailable;
  };
  const sourceUrl = reference ? officialPdfUrl(reference.sourceUrl) : null;
  const metadata = reference ? [
    [copy.source, reference.sourceName], [copy.period, reference.reportingPeriod],
    [copy.issued, date(reference.issuedAt)], [copy.checked, date(reference.checkedAt)],
    [copy.next, date(reference.nextReviewAt)], [copy.location, `${reference.page} · ${reference.row}`],
  ] : [];

  return (
    <>
      <section data-testid="published-shariah-reference">
        <h3>{copy.title}</h3>
        {reference && (row.boubyanReferenceState === 'listed' || row.boubyanReferenceState === 'review_due')
          ? <p>{reference.publishedStatus === 'compliant' ? copy.listed : copy.excluded}</p> : null}
        {row.boubyanReferenceReason ? <p>{row.boubyanReferenceReason[locale]}</p> : null}
        {metadata.length ? <dl className={disclosureStyles.metadata}>
          {metadata.map(([label, value]) => <div key={label}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}
        </dl> : null}
        {sourceUrl ? <a className={styles.linkButton} href={`${sourceUrl}#page=${reference!.page}`} target="_blank" rel="noopener noreferrer" aria-label={`${copy.open} · ${copy.newTab}`}>
          {copy.open}<ExternalLink size={15} aria-hidden="true" />
        </a> : null}
      </section>
      {reference ? <section data-testid="independent-shariah-screening">
        <h3>{copy.independent}</h3>
        {independent ? <>
          <p>{copy.independentNote}</p>
          <dl className={disclosureStyles.metadata}>
            <div><dt>{copy.status}</dt><dd>{copy[independent.shariahStatus]}</dd></div>
            <div><dt>{copy.source}</dt><dd>{independent.screeningSource || copy.unavailable}</dd></div>
            <div><dt>{copy.reviewed}</dt><dd>{date(independent.lastScreenedAt)}</dd></div>
          </dl>
          <p>{independent.reason[locale]}</p>
          <p>{copy.method}: {independent.methodology[locale]}</p>
        </> : <p>{copy.noIndependent}</p>}
        {row.sourceConflict ? <div className={styles.inlineWarning}><p><strong>{copy.conflict}. </strong>{row.sourceConflict.reason[locale]}</p></div> : null}
      </section> : null}
    </>
  );
}
