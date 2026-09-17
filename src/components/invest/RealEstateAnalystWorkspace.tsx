'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DashboardPageShell } from '@/components/DashboardPageShell';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { REAL_ESTATE_ANALYST_PATH, validInvestmentId, type SavedRealEstateContext } from '@/lib/investments/realEstateHandoff';
import { RealEstateLandAnalyst } from './RealEstateLandAnalyst';
import { RealEstateMarketCoverage } from './RealEstateMarketCoverage';
import { RealEstateValuationTimeline } from './RealEstateValuationTimeline';
import styles from '@/components/investments/InvestmentCenter.module.css';
import './RealEstateLandAnalyst.css';

type Selector = { investmentId?: string; positionId?: string };
type Snapshot = Parameters<typeof RealEstateValuationTimeline>[0]['items'][number];

export function RealEstateAnalystWorkspace({ investmentId, positionId }: Selector) {
  const { user, session, isGuest, loading } = useAuth();
  const { lang, dir } = useLanguage();
  const L = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;
  const title = L('مركز السوق العقاري', 'Real Estate Market Center', 'Centre du marché immobilier');
  const next = positionId && validInvestmentId(positionId)
    ? `${REAL_ESTATE_ANALYST_PATH}/${positionId}`
    : investmentId && validInvestmentId(investmentId)
      ? `${REAL_ESTATE_ANALYST_PATH}?investmentId=${investmentId}`
      : REAL_ESTATE_ANALYST_PATH;
  const savedRecordRequested = investmentId !== undefined || positionId !== undefined;
  const accessToken = user && !isGuest ? session?.access_token : undefined;
  const guestGate = !accessToken && !loading ? (
    <section className={styles.guestGate}>
      <p>{L('سجّل الدخول لتشغيل التحليل والوصول إلى سجلاتك الخاصة. يمكنك استعراض الحقول وتغطية المصادر بدون كشف أي بيانات خاصة.', 'Sign in to run analysis and access your private records. You can inspect the input fields and source coverage without exposing private data.', 'Connectez-vous pour lancer l’analyse et accéder à vos données privées. Vous pouvez consulter les champs et la couverture des sources sans exposer de données privées.')}</p>
      <Link href={`/login?next=${encodeURIComponent(next)}`}>{L('تسجيل الدخول', 'Sign in', 'Se connecter')}</Link>
    </section>
  ) : null;

  return <div className={styles.shell} dir={dir}>
    <DashboardPageShell ariaLabel={title} className={styles.main} contentClassName={styles.content}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{L('الأسواق العالمية', 'Global markets', 'Marchés mondiaux')}</p>
          <h1>{title}</h1>
          <p>{L('بحث وتحليل الأراضي والعقار من المصادر الرسمية والسوقية المسموح بها، مع فصل ملكية محفظتك عن بيانات السوق.', 'Research land and property with permitted official and market sources while keeping portfolio ownership separate from market intelligence.', 'Analyse des terrains et biens à partir de sources officielles et de marché autorisées, en séparant la propriété du portefeuille des données de marché.')}</p>
        </div>
        <Link className={styles.secondaryAction} href="/global-markets">{L('العودة إلى مركز الأسواق العالمية', 'Back to Global Markets Hub', 'Retour au centre des marchés mondiaux')}</Link>
      </header>
      <RealEstateMarketCoverage />
      {loading ? <p role="status">{L('جارٍ تحميل الجلسة…', 'Loading session…', 'Chargement de la session…')}</p> : !savedRecordRequested ? <>
        {guestGate}
        <RealEstateLandAnalyst />
      </> : !accessToken || !user ? guestGate : (
        <OwnedPropertyWorkspace key={`${user.id}:${investmentId ?? ''}:${positionId ?? ''}`} investmentId={investmentId} positionId={positionId} token={accessToken} />
      )}
    </DashboardPageShell>
  </div>;
}

function OwnedPropertyWorkspace({ investmentId, positionId, token }: Selector & { token: string }) {
  const { lang } = useLanguage();
  const L = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;
  const [context, setContext] = useState<SavedRealEstateContext | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [historyRevision, setHistoryRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setContext(null);
    if (investmentId === undefined && positionId === undefined) { setState('ready'); return () => controller.abort(); }
    if ((investmentId !== undefined && positionId !== undefined) || !validInvestmentId(investmentId ?? positionId)) {
      setState('error'); return () => controller.abort();
    }
    setState('loading');
    const query = new URLSearchParams(investmentId ? { investmentId } : { positionId: positionId! });
    void (async () => {
      try {
        const response = await fetch(`/api/investments/real-estate/context?${query}`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal,
        });
        const payload = await response.json() as { ok?: boolean; context?: SavedRealEstateContext };
        if (!response.ok || !payload.ok || !payload.context?.asset || typeof payload.context.asset.countryCode !== 'string') throw new Error('CONTEXT_UNAVAILABLE');
        if (!controller.signal.aborted) { setContext(payload.context); setState('ready'); }
      } catch {
        if (!controller.signal.aborted) setState('error');
      }
    })();
    return () => controller.abort();
  }, [investmentId, positionId, token, retry]);

  if (state === 'loading') return <p role="status">{L('جارٍ التحقق من سجل العقار…', 'Checking the saved property…', 'Vérification du bien enregistré…')}</p>;
  if (state === 'error') return <section className={styles.state} role="alert"><p>{L('تعذر فتح سجل العقار. قد يكون غير موجود أو غير متاح لهذا الحساب. لم تُستخدم بيانات بديلة.', 'This property record could not be opened. It may not exist or belong to this account. No substitute data was used.', 'Ce bien n’a pas pu être ouvert. Il peut être absent ou inaccessible à ce compte. Aucune donnée de remplacement n’a été utilisée.')}</p><button type="button" className={styles.secondaryAction} onClick={() => setRetry(value => value + 1)}>{L('إعادة المحاولة', 'Retry', 'Réessayer')}</button></section>;

  return <>
    {context ? <section className={styles.infoCard}><h2>{context.name || L('العقار المسجّل', 'Saved property', 'Bien enregistré')}</h2><p>{L('تم تحميل البيانات المسجلة. أكمل الحقول الناقصة قبل البحث؛ التعديل هنا لا يغيّر سجل الملكية.', 'Recorded facts loaded. Complete missing fields before searching; editing this form does not change the ownership record.', 'Données enregistrées chargées. Complétez les champs manquants ; ce formulaire ne modifie pas l’enregistrement de propriété.')}</p>{context.migrationState !== 'VERIFIED' ? <p>{L('ربط السجل لا يزال في مرحلة التحقق. لا يُعتبر هذا بحد ذاته إثباتًا لقيمة العقار.', 'Record mapping is still in the verification stage. It does not itself prove a property value.', 'La correspondance des données est encore en vérification. Elle ne prouve pas la valeur du bien.')}</p> : null}</section> : null}
    <RealEstateLandAnalyst
      key={context?.positionId ?? context?.investmentId ?? 'new-property'}
      initialAsset={context?.asset}
      positionId={context?.migrationState === 'VERIFIED' ? context.positionId ?? undefined : undefined}
      onSnapshotSaved={() => setHistoryRevision(value => value + 1)}
    />
    {context?.positionId ? <PropertyHistory key={context.positionId} positionId={context.positionId} token={token} revision={historyRevision} /> : null}
  </>;
}

function PropertyHistory({ positionId, token, revision }: { positionId: string; token: string; revision: number }) {
  const { lang } = useLanguage();
  const L = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;
  const [items, setItems] = useState<Snapshot[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    void (async () => {
      try {
        const response = await fetch(`/api/investments/real-estate/history?positionId=${encodeURIComponent(positionId)}`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal,
        });
        const payload = await response.json() as { ok?: boolean; items?: Snapshot[] };
        if (!response.ok || !payload.ok || !Array.isArray(payload.items)) throw new Error('HISTORY_UNAVAILABLE');
        if (!controller.signal.aborted) { setItems(payload.items); setState('ready'); }
      } catch {
        if (!controller.signal.aborted) setState('error');
      }
    })();
    return () => controller.abort();
  }, [positionId, token, revision, retry]);
  return <section className="real-estate-analyst__history-card">
    <h2>{L('سجل التقييمات', 'Valuation history', 'Historique des estimations')}</h2>
    {state === 'loading' ? <p role="status">{L('جارٍ تحميل التاريخ…', 'Loading history…', 'Chargement de l’historique…')}</p> : state === 'error' ? <div role="alert"><p>{L('تعذر تحميل التاريخ؛ هذا لا يعني عدم وجود تقييمات محفوظة.', 'History could not be loaded; this does not mean there are no saved valuations.', 'Impossible de charger l’historique ; cela ne signifie pas qu’aucune estimation n’est enregistrée.')}</p><button type="button" className={styles.secondaryAction} onClick={() => setRetry(value => value + 1)}>{L('إعادة المحاولة', 'Retry', 'Réessayer')}</button></div> : <RealEstateValuationTimeline items={items} />}
  </section>;
}
