'use client';

import { ExternalLink, FileText, Landmark } from 'lucide-react';
import { WorkspacePageContainer } from '@/components/layout/WorkspacePageContainer';
import { useLanguage } from '@/hooks/useLanguage';
import { BOUBYAN_REFERENCE } from '@/lib/market/boubyanReferenceMetadata';
import styles from './BoubyanReferencePanel.module.css';

const COPY = {
  ar: {
    primary: 'المرجع الأساسي لتصنيف الأسهم',
    name: 'بوبيان كابيتال',
    description: 'نعتمد قوائم بوبيان كابيتال المنشورة مرجعًا لتصنيف الأسهم، مع توضيح الإصدار ومصدر الحكم.',
    officialPage: 'صفحة المصدر الرسمية',
    period: 'فترة القوائم المعتمدة',
    checked: 'آخر تحقق من المصدر',
    cadence: 'دورية المراجعة',
    quarterly: 'كل 3 أشهر',
    nextReview: 'المراجعة التالية',
    lists: 'قوائم بوبيان كابيتال الرسمية',
    kuwait: 'بورصة الكويت',
    gcc: 'الأسواق الخليجية',
    usa: 'الأسواق الأمريكية',
    issued: 'تاريخ الإصدار',
    openPdf: 'فتح القائمة',
    newTab: 'يفتح في نافذة جديدة',
    interpretation: 'كيف يُعتمد التصنيف؟',
    included: 'عند مطابقة السهم مع إدراج معتمد في القائمة، تُعرض حالته «متوافق وفق بوبيان كابيتال» للفترة المذكورة.',
    missing: 'السهم غير الموجود يُعامل على أنه «غير مدرج في المرجع»؛ غيابه وحده لا يعني أنه غير متوافق شرعيًا.',
    changes: 'تُراعى إشارات الإضافة وتغيير الاسم والخروج الواضحة في المصدر. لا يُعتمد سهم موصوف صراحةً بأنه خرج من القائمة.',
  },
  en: {
    primary: 'Primary reference for stock classification',
    name: 'Boubyan Capital',
    description: 'Stock classifications use Boubyan Capital’s published lists, with the relevant edition and source identified.',
    officialPage: 'Official source page',
    period: 'Adopted reporting period',
    checked: 'Source last checked',
    cadence: 'Review frequency',
    quarterly: 'Every 3 months',
    nextReview: 'Next review',
    lists: 'Official Boubyan Capital lists',
    kuwait: 'Kuwait market',
    gcc: 'GCC markets',
    usa: 'US markets',
    issued: 'Issue date',
    openPdf: 'Open list',
    newTab: 'Opens in a new window',
    interpretation: 'How is the classification applied?',
    included: 'A stock matched to an accepted listing is labelled “Compliant according to Boubyan Capital” for the stated reporting period.',
    missing: 'A stock absent from the source is treated as “Not listed in the reference”. Absence alone does not establish noncompliance.',
    changes: 'Explicit entry, name-change and exit labels in the source are respected. A stock explicitly marked as exited is not accepted.',
  },
  fr: {
    primary: 'Référence principale pour la classification des actions',
    name: 'Boubyan Capital',
    description: 'La classification des actions repose sur les listes publiées par Boubyan Capital, avec indication de l’édition et de la source.',
    officialPage: 'Page officielle de la source',
    period: 'Période de référence retenue',
    checked: 'Dernière vérification de la source',
    cadence: 'Fréquence de révision',
    quarterly: 'Tous les 3 mois',
    nextReview: 'Prochaine révision',
    lists: 'Listes officielles de Boubyan Capital',
    kuwait: 'Marché koweïtien',
    gcc: 'Marchés du Golfe',
    usa: 'Marchés américains',
    issued: 'Date de publication',
    openPdf: 'Ouvrir la liste',
    newTab: 'S’ouvre dans une nouvelle fenêtre',
    interpretation: 'Comment la classification est-elle appliquée ?',
    included: 'Une action correspondant à une inscription acceptée porte la mention « Conforme selon Boubyan Capital » pour la période indiquée.',
    missing: 'Une action absente de la source est considérée comme « Non répertoriée dans la référence ». Son absence ne suffit pas à établir sa non-conformité.',
    changes: 'Les mentions explicites d’entrée, de changement de nom et de sortie sont respectées. Une action explicitement signalée comme sortie n’est pas retenue.',
  },
} as const;

function formatReviewDate(value: string) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: BOUBYAN_REFERENCE.reviewTimezone,
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}

export function BoubyanReferencePanel() {
  const { lang, dir } = useLanguage();
  const locale = lang === 'en' || lang === 'fr' ? lang : 'ar';
  const copy = COPY[locale];

  return (
    <WorkspacePageContainer variant="wide" dir={dir}>
      <section className={styles.panel} aria-labelledby="boubyan-reference-title" data-testid="boubyan-reference-panel">
        <header className={styles.header}>
          <div className={styles.heading}>
            <span className={styles.icon} aria-hidden="true"><Landmark size={23} /></span>
            <div>
              <p className={styles.eyebrow}>{copy.primary}</p>
              <h2 id="boubyan-reference-title">{copy.name}</h2>
            </div>
          </div>
          <a className={styles.sourceLink} href={BOUBYAN_REFERENCE.brokerageUrl} target="_blank" rel="noopener noreferrer" aria-label={`${copy.officialPage} · ${copy.newTab}`}>
            {copy.officialPage}<ExternalLink size={16} aria-hidden="true" />
          </a>
        </header>

        <p className={styles.description}>{copy.description}</p>

        <dl className={styles.metadata}>
          <div><dt>{copy.period}</dt><dd><bdi>{BOUBYAN_REFERENCE.reportingPeriod}</bdi></dd></div>
          <div><dt>{copy.checked}</dt><dd><time dateTime={BOUBYAN_REFERENCE.checkedAt}>{formatReviewDate(BOUBYAN_REFERENCE.checkedAt)}</time></dd></div>
          <div><dt>{copy.cadence}</dt><dd>{copy.quarterly}</dd></div>
          <div><dt>{copy.nextReview}</dt><dd><time dateTime={BOUBYAN_REFERENCE.nextReviewAt}>{formatReviewDate(BOUBYAN_REFERENCE.nextReviewAt)}</time></dd></div>
        </dl>

        <ul className={styles.lists} aria-label={copy.lists}>
          {BOUBYAN_REFERENCE.lists.map(list => (
            <li key={list.id}>
              <a className={styles.document} href={list.url} target="_blank" rel="noopener noreferrer" aria-label={`${copy[list.id]} · PDF · ${copy.newTab}`}>
                <FileText size={23} aria-hidden="true" />
                <span className={styles.documentCopy}>
                  <strong>{copy[list.id]}</strong>
                  <span>{copy.issued} <time dateTime={list.issuedAt}>{list.issuedAt}</time></span>
                </span>
                <span className={styles.documentAction}>{copy.openPdf}<span dir="ltr">PDF <ExternalLink size={13} aria-hidden="true" /></span></span>
              </a>
            </li>
          ))}
        </ul>

        <details className={styles.interpretation}>
          <summary>{copy.interpretation}</summary>
          <ul>
            <li>{copy.included}</li>
            <li>{copy.missing}</li>
            <li>{copy.changes}</li>
          </ul>
        </details>
      </section>
    </WorkspacePageContainer>
  );
}
