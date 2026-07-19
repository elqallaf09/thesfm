'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { loginHrefForCurrentLocation } from '@/lib/auth/redirects';
import styles from './AiAnalystWorkspace.module.css';

type PrivateSurface = 'history' | 'watchlist' | 'portfolio' | 'alerts' | 'recommendations' | 'tradePerformance' | 'settings';

const COPY: Record<'ar' | 'en' | 'fr', Record<PrivateSurface, { title: string; body: string }>> = {
  ar: {
    history: { title: 'السجل الخاص', body: 'سجّل الدخول لعرض التحليلات الخاصة والسجل المرتبط بحسابك.' },
    watchlist: { title: 'قائمة المتابعة', body: 'سجّل الدخول لعرض قائمة المتابعة الخاصة بك وإدارتها.' },
    portfolio: { title: 'المحفظة', body: 'سجّل الدخول لعرض عناصر المحفظة الخاصة بحسابك.' },
    alerts: { title: 'التنبيهات', body: 'سجّل الدخول لعرض تنبيهاتك وإدارتها.' },
    recommendations: { title: 'القراءات الخاصة', body: 'سجّل الدخول لعرض القراءات المسموح بها المرتبطة بحسابك.' },
    tradePerformance: { title: 'أداء المتابعة', body: 'سجّل الدخول لعرض سجلات المتابعة الخاصة بحسابك.' },
    settings: { title: 'إعدادات المحلل', body: 'سجّل الدخول لإدارة تفضيلات المحلل الذكي الخاصة بك.' },
  },
  en: {
    history: { title: 'Private history', body: 'Sign in to view analyses and history associated with your account.' },
    watchlist: { title: 'Watchlist', body: 'Sign in to view and manage your personal watchlist.' },
    portfolio: { title: 'Portfolio', body: 'Sign in to view portfolio items associated with your account.' },
    alerts: { title: 'Alerts', body: 'Sign in to view and manage your alerts.' },
    recommendations: { title: 'Personal readings', body: 'Sign in to view permitted readings associated with your account.' },
    tradePerformance: { title: 'Tracking performance', body: 'Sign in to view tracking records associated with your account.' },
    settings: { title: 'Analyst settings', body: 'Sign in to manage your AI Analyst preferences.' },
  },
  fr: {
    history: { title: 'Historique privé', body: 'Connectez-vous pour consulter les analyses et l’historique associés à votre compte.' },
    watchlist: { title: 'Liste de suivi', body: 'Connectez-vous pour consulter et gérer votre liste de suivi personnelle.' },
    portfolio: { title: 'Portefeuille', body: 'Connectez-vous pour consulter les éléments de portefeuille associés à votre compte.' },
    alerts: { title: 'Alertes', body: 'Connectez-vous pour consulter et gérer vos alertes.' },
    recommendations: { title: 'Lectures personnelles', body: 'Connectez-vous pour consulter les lectures autorisées associées à votre compte.' },
    tradePerformance: { title: 'Performance de suivi', body: 'Connectez-vous pour consulter les enregistrements de suivi associés à votre compte.' },
    settings: { title: 'Paramètres de l’analyste', body: 'Connectez-vous pour gérer vos préférences pour l’Analyste IA.' },
  },
};

function localeFor(language: string | null | undefined): 'ar' | 'en' | 'fr' {
  return language === 'en' || language === 'fr' ? language : 'ar';
}

export function AiAnalystAccessGate({ surface, children }: { surface: PrivateSurface; children: ReactNode }) {
  const { user, isGuest, loading } = useAuth();
  const { lang } = useLanguage();
  const locale = localeFor(lang);
  const copy = COPY[locale][surface];

  if (loading) {
    return <p className={styles.statusRail} role="status">{locale === 'ar' ? 'جارٍ التحقق من الوصول…' : locale === 'fr' ? 'Vérification de l’accès…' : 'Checking access…'}</p>;
  }

  if (user && !isGuest) return <>{children}</>;

  return (
    <section className={`${styles.card} ${styles.spanFull}`} aria-labelledby={`ai-analyst-${surface}-locked-title`} data-testid={`ai-analyst-${surface}-locked`}>
      <header className={styles.cardHeader}>
        <div>
          <p className={styles.sectionEyebrow}>{locale === 'ar' ? 'ميزة شخصية' : locale === 'fr' ? 'Fonction personnelle' : 'Personal feature'}</p>
          <h2 id={`ai-analyst-${surface}-locked-title`}>{copy.title}</h2>
          <p>{copy.body}</p>
        </div>
        <LockKeyhole aria-hidden="true" className={styles.placeholderIcon} />
      </header>
      <Link className={styles.primaryAction} href={loginHrefForCurrentLocation('/ai-analyst/overview')}>
        {locale === 'ar' ? 'تسجيل الدخول' : locale === 'fr' ? 'Se connecter' : 'Sign in'}
      </Link>
    </section>
  );
}

export type { PrivateSurface };
